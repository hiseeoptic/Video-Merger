"use client";

import { ChangeEvent, DragEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { videoEngine, type EngineProject } from "./lib/video-engine";
import { MESSAGES, normalizeLang, translateStatus, type Lang } from "./lib/i18n";

type ProjectStatus = "idle" | "queued" | "processing" | "done" | "error";

type Clip = {
  id: string;
  file: File;
  name: string;
  url: string;
  thumbnail: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  trimStart: number;
  trimEnd: number;
  speed: number;
};

type BlurRegion = {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  strength: number;
};

type SmartCropCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

type SmartCrop = {
  enabled: boolean;
  amount: number;
  corner: SmartCropCorner;
};

type Project = {
  id: string;
  name: string;
  outputName: string;
  clips: Clip[];
  quality: "720p" | "1080p";
  aspect: "16:9" | "9:16" | "1:1";
  muted: boolean;
  blur: BlurRegion;
  smartCrop: SmartCrop;
  status: ProjectStatus;
  progress: number;
  statusText: string;
  outputUrl?: string;
  savedFileName?: string;
  error?: string;
};

type WritableFileLike = {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
};

type FileHandleLike = {
  createWritable(): Promise<WritableFileLike>;
};

type DirectoryHandleLike = {
  name: string;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandleLike>;
  queryPermission?(options: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission?(options: { mode: "readwrite" }): Promise<PermissionState>;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: { id?: string; mode?: "read" | "readwrite" }) => Promise<DirectoryHandleLike>;
};

type DirectoryStatus = "none" | "restoring" | "connected" | "needs-permission" | "blocked" | "unsupported";

const SPEEDS = [0.5, 0.75, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.75, 2, 2.5, 3, 4];
const SPEED_PRESETS = [1, 1.1, 1.2, 1.3];
const MAX_PROJECTS = 5;
const MAX_CLIPS = 12;
const DEFAULT_BLUR: BlurRegion = { enabled: false, x: 78, y: 86, width: 18, height: 9, strength: 24 };
const DEFAULT_SMART_CROP: SmartCrop = { enabled: false, amount: 4, corner: "bottom-right" };
const HANDLE_DB_NAME = "cutflow-file-handles";
const HANDLE_STORE_NAME = "handles";
const EXPORT_DIRECTORY_KEY = "export-directory";

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeBlurRegion(region: BlurRegion): BlurRegion {
  const width = clamp(region.width, 5, 80);
  const height = clamp(region.height, 4, 60);
  return {
    ...region,
    width,
    height,
    x: clamp(region.x, 0, 100 - width),
    y: clamp(region.y, 0, 100 - height),
    strength: clamp(region.strength, 4, 40),
  };
}

function safeOutputBase(value: string, fallback = "cutflow") {
  const cleaned = value
    .replace(/\.mp4$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 120);
  return cleaned || fallback;
}

function defaultOutputBase(projectName: string) {
  return safeOutputBase(projectName).replace(/\s+/g, "-").toLowerCase();
}

function projectOutputFileName(project: Pick<Project, "name" | "outputName">) {
  return `${safeOutputBase(project.outputName, defaultOutputBase(project.name))}.mp4`;
}

async function fileExists(directory: DirectoryHandleLike, fileName: string) {
  try {
    await directory.getFileHandle(fileName);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") return false;
    throw error;
  }
}

async function nextAvailableFileName(directory: DirectoryHandleLike, preferredName: string) {
  const base = preferredName.replace(/\.mp4$/i, "");
  let candidate = `${base}.mp4`;
  let suffix = 2;
  while (await fileExists(directory, candidate)) {
    candidate = `${base} (${suffix}).mp4`;
    suffix += 1;
  }
  return candidate;
}

function openHandleDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(HANDLE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(HANDLE_STORE_NAME)) {
        request.result.createObjectStore(HANDLE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function persistDirectoryHandle(directory: DirectoryHandleLike) {
  const database = await openHandleDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(HANDLE_STORE_NAME, "readwrite");
      transaction.objectStore(HANDLE_STORE_NAME).put(directory, EXPORT_DIRECTORY_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

async function restoreDirectoryHandle() {
  const database = await openHandleDatabase();
  try {
    return await new Promise<DirectoryHandleLike | null>((resolve, reject) => {
      const transaction = database.transaction(HANDLE_STORE_NAME, "readonly");
      const request = transaction.objectStore(HANDLE_STORE_NAME).get(EXPORT_DIRECTORY_KEY);
      request.onsuccess = () => resolve((request.result as DirectoryHandleLike | undefined) || null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

async function directoryHasWritePermission(directory: DirectoryHandleLike, requestAccess = false) {
  if (!directory.queryPermission) return true;
  if (await directory.queryPermission({ mode: "readwrite" }) === "granted") return true;
  if (!requestAccess || !directory.requestPermission) return false;
  return await directory.requestPermission({ mode: "readwrite" }) === "granted";
}

function isCrossOriginFrame() {
  if (window.self === window.top) return false;
  try {
    return window.top?.location.origin !== window.location.origin;
  } catch {
    return true;
  }
}

function emptyProject(id = newId("project"), index = 1, name?: string): Project {
  const projectName = name || `Dự án ${String(index).padStart(2, "0")}`;
  return {
    id,
    name: projectName,
    outputName: defaultOutputBase(projectName),
    clips: [],
    quality: "720p",
    aspect: "9:16",
    muted: false,
    blur: { ...DEFAULT_BLUR },
    smartCrop: { ...DEFAULT_SMART_CROP },
    status: "idle",
    progress: 0,
    statusText: "Sẵn sàng",
  };
}

function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds)) return "00:00";
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remain = seconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function totalDuration(project: Project) {
  return project.clips.reduce((sum, clip) => sum + Math.max(0, clip.trimEnd - clip.trimStart) / clip.speed, 0);
}

function readableError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "Không thể xử lý video.";
}

function videoMetadata(file: File): Promise<Omit<Clip, "id" | "file" | "name" | "size" | "speed" | "trimStart" | "trimEnd">> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const fail = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Không đọc được ${file.name}`));
    };

    video.onerror = fail;
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const capture = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 320;
          canvas.height = 180;
          const context = canvas.getContext("2d");
          if (context) {
            context.fillStyle = "#111118";
            context.fillRect(0, 0, canvas.width, canvas.height);
            const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
            const width = video.videoWidth * scale;
            const height = video.videoHeight * scale;
            context.drawImage(video, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
          }
          resolve({
            url,
            thumbnail: canvas.toDataURL("image/jpeg", 0.78),
            duration,
            width: video.videoWidth,
            height: video.videoHeight,
          });
        } catch {
          resolve({ url, thumbnail: "", duration, width: video.videoWidth, height: video.videoHeight });
        }
      };

      if (duration > 0.15) {
        video.onseeked = capture;
        video.currentTime = Math.min(0.5, duration / 3);
      } else {
        video.onloadeddata = capture;
      }
    };
  });
}

function StatusPill({ status, lang }: { status: ProjectStatus; lang: Lang }) {
  const t = MESSAGES[lang];
  const labels: Record<ProjectStatus, string> = {
    idle: t.status_idle,
    queued: t.status_queued,
    processing: t.status_processing,
    done: t.status_done,
    error: t.status_error,
  };
  return <span className={`status-pill status-${status}`}><i />{labels[status]}</span>;
}

export function VideoMergerApp() {
  const [projects, setProjects] = useState<Project[]>([emptyProject("project-01", 1, "Reels tháng 7")]);
  const [activeProjectId, setActiveProjectId] = useState("project-01");
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isBatching, setIsBatching] = useState(false);
  const [batchSpeed, setBatchSpeed] = useState(1);
  const [batchQuality, setBatchQuality] = useState<Project["quality"]>("720p");
  const [batchAspect, setBatchAspect] = useState<Project["aspect"]>("9:16");
  const [batchMuted, setBatchMuted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [uiLang, setUiLang] = useState<Lang>("vi");
  const [downloadDirectoryName, setDownloadDirectoryName] = useState("");
  const [directoryStatus, setDirectoryStatus] = useState<DirectoryStatus>("restoring");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const downloadDirectoryRef = useRef<DirectoryHandleLike | null>(null);
  const blurDragRef = useRef<{
    mode: "move" | "resize";
    startX: number;
    startY: number;
    frame: DOMRect;
    initial: BlurRegion;
  } | null>(null);
  const projectsRef = useRef(projects);
  const cancelledRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    let cancelled = false;
    if (isCrossOriginFrame()) {
      const blockedTimer = window.setTimeout(() => setDirectoryStatus("blocked"), 0);
      return () => {
        cancelled = true;
        window.clearTimeout(blockedTimer);
      };
    }
    if (typeof (window as DirectoryPickerWindow).showDirectoryPicker !== "function") {
      const unsupportedTimer = window.setTimeout(() => setDirectoryStatus("unsupported"), 0);
      return () => {
        cancelled = true;
        window.clearTimeout(unsupportedTimer);
      };
    }
    void restoreDirectoryHandle()
      .then(async (directory) => {
        if (cancelled) return;
        if (!directory) {
          setDirectoryStatus("none");
          return;
        }
        downloadDirectoryRef.current = directory;
        setDownloadDirectoryName(directory.name);
        const connected = await directoryHasWritePermission(directory);
        if (!cancelled) setDirectoryStatus(connected ? "connected" : "needs-permission");
      })
      .catch(() => {
        if (!cancelled) setDirectoryStatus("none");
      });
    return () => { cancelled = true; };
  }, []);

  // Bảng chuỗi theo ngôn ngữ hiện tại. tRef để các useCallback dùng bản mới
  // nhất mà không phải thêm dependency.
  const t = MESSAGES[uiLang];
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // Đồng bộ ngôn ngữ: nhớ lựa chọn cũ trong localStorage, và nhận lệnh
  // SET_LANG do extension AutoFlow gửi vào iframe khi người dùng đổi ngôn ngữ.
  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const saved = normalizeLang(window.localStorage.getItem("cutflow-lang"));
      if (saved) setUiLang(saved);
    }, 0);
    const onLangMessage = (event: MessageEvent) => {
      if (event.data?.type !== "SET_LANG" || event.data?.source !== "CUTFLOW_EXTENSION") return;
      const next = normalizeLang(event.data.lang);
      if (!next) return;
      setUiLang(next);
      try { window.localStorage.setItem("cutflow-lang", next); } catch { /* private mode */ }
    };
    window.addEventListener("message", onLangMessage);
    return () => {
      window.clearTimeout(restoreTimer);
      window.removeEventListener("message", onLangMessage);
    };
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    projectsRef.current.forEach((project) => {
      project.clips.forEach((clip) => URL.revokeObjectURL(clip.url));
      if (project.outputUrl) URL.revokeObjectURL(project.outputUrl);
    });
    videoEngine.cancel();
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3600);
  }, []);

  const chooseDownloadDirectory = async () => {
    if (isCrossOriginFrame()) {
      setDirectoryStatus("blocked");
      showToast(t.toast_folder_blocked);
      return;
    }
    const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
    if (!picker) {
      setDirectoryStatus("unsupported");
      showToast(t.toast_folder_unsupported);
      return;
    }
    try {
      const directory = await picker.call(window, { id: "cutflow-exports", mode: "readwrite" });
      const connected = await directoryHasWritePermission(directory, true);
      if (!connected) {
        setDirectoryStatus("needs-permission");
        showToast(t.toast_folder_permission_denied);
        return;
      }
      downloadDirectoryRef.current = directory;
      setDownloadDirectoryName(directory.name);
      setDirectoryStatus("connected");
      try { await persistDirectoryHandle(directory); } catch { /* private mode */ }
      showToast(t.toast_folder_selected(directory.name));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (error instanceof DOMException && error.name === "SecurityError") {
        setDirectoryStatus("blocked");
        showToast(t.toast_folder_blocked);
        return;
      }
      setDirectoryStatus("needs-permission");
      showToast(`${t.toast_folder_failed}${error instanceof Error ? ` (${error.name})` : ""}`);
    }
  };

  const reconnectDownloadDirectory = async () => {
    const directory = downloadDirectoryRef.current;
    if (!directory) {
      await chooseDownloadDirectory();
      return;
    }
    if (isCrossOriginFrame()) {
      setDirectoryStatus("blocked");
      showToast(t.toast_folder_blocked);
      return;
    }
    try {
      const connected = await directoryHasWritePermission(directory, true);
      setDirectoryStatus(connected ? "connected" : "needs-permission");
      showToast(connected ? t.toast_folder_selected(directory.name) : t.toast_folder_permission_denied);
    } catch (error) {
      setDirectoryStatus(error instanceof DOMException && error.name === "SecurityError" ? "blocked" : "needs-permission");
      showToast(error instanceof DOMException && error.name === "SecurityError" ? t.toast_folder_blocked : t.toast_folder_permission_denied);
    }
  };

  const openStandaloneApp = () => {
    window.open(`${window.location.origin}${window.location.pathname}?folder-access=1`, "_blank", "noopener,noreferrer");
  };

  const activeProject = projects.find((project) => project.id === activeProjectId) || projects[0];
  const selectedClip = activeProject?.clips.find((clip) => clip.id === selectedClipId) || activeProject?.clips[0] || null;
  const projectCountWithClips = projects.filter((project) => project.clips.length > 0).length;
  const totalQueueDuration = projects.reduce((sum, project) => sum + totalDuration(project), 0);

  useEffect(() => {
    if (!previewVideoRef.current || !selectedClip) return;
    previewVideoRef.current.defaultPlaybackRate = selectedClip.speed;
    previewVideoRef.current.playbackRate = selectedClip.speed;
  }, [selectedClip]);

  const updateProject = useCallback((projectId: string, updater: (project: Project) => Project) => {
    setProjects((current) => {
      const next = current.map((project) => project.id === projectId ? updater(project) : project);
      projectsRef.current = next;
      return next;
    });
  }, []);

  const updateBlurRegion = useCallback((update: Partial<BlurRegion>) => {
    updateProject(activeProject.id, (project) => ({
      ...project,
      blur: normalizeBlurRegion({ ...project.blur, ...update }),
      smartCrop: update.enabled ? { ...project.smartCrop, enabled: false } : project.smartCrop,
      status: "idle",
      progress: 0,
      statusText: "Đã thay đổi",
    }));
  }, [activeProject.id, updateProject]);

  const updateSmartCrop = useCallback((update: Partial<SmartCrop>) => {
    updateProject(activeProject.id, (project) => ({
      ...project,
      smartCrop: {
        ...project.smartCrop,
        ...update,
        amount: clamp(update.amount ?? project.smartCrop.amount, 2, 8),
      },
      blur: update.enabled ? { ...project.blur, enabled: false } : project.blur,
      status: "idle",
      progress: 0,
      statusText: "Đã thay đổi",
    }));
  }, [activeProject.id, updateProject]);

  const applySmartCropToAll = () => {
    setProjects((current) => {
      const next = current.map((project) => ({
        ...project,
        smartCrop: { ...activeProject.smartCrop },
        blur: activeProject.smartCrop.enabled ? { ...project.blur, enabled: false } : project.blur,
        status: project.clips.length ? "idle" as const : project.status,
        progress: project.clips.length ? 0 : project.progress,
        statusText: project.clips.length ? "Đã thay đổi" : project.statusText,
      }));
      projectsRef.current = next;
      return next;
    });
    showToast(t.toast_smart_crop_applied(projectCountWithClips || projects.length));
  };

  const setBlurCorner = (horizontal: "left" | "right", vertical: "top" | "bottom") => {
    const { width, height } = activeProject.blur;
    updateBlurRegion({
      enabled: true,
      x: horizontal === "left" ? 3 : 97 - width,
      y: vertical === "top" ? 3 : 97 - height,
    });
  };

  const applyBlurToAll = () => {
    setProjects((current) => {
      const next = current.map((project) => ({
        ...project,
        blur: { ...activeProject.blur },
        status: project.clips.length ? "idle" as const : project.status,
        progress: project.clips.length ? 0 : project.progress,
        statusText: project.clips.length ? "Đã thay đổi" : project.statusText,
      }));
      projectsRef.current = next;
      return next;
    });
    showToast(t.toast_blur_applied(projectCountWithClips || projects.length));
  };

  const startBlurDrag = (event: ReactPointerEvent<HTMLElement>, mode: "move" | "resize") => {
    if (!activeProject.blur.enabled) return;
    event.preventDefault();
    event.stopPropagation();
    const frame = event.currentTarget.closest(".video-preview")?.getBoundingClientRect();
    if (!frame) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    blurDragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      frame,
      initial: { ...activeProject.blur },
    };
  };

  const moveBlurRegion = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = blurDragRef.current;
    if (!drag) return;
    event.preventDefault();
    const deltaX = ((event.clientX - drag.startX) / drag.frame.width) * 100;
    const deltaY = ((event.clientY - drag.startY) / drag.frame.height) * 100;
    if (drag.mode === "move") {
      updateBlurRegion({ x: drag.initial.x + deltaX, y: drag.initial.y + deltaY });
    } else {
      updateBlurRegion({ width: drag.initial.width + deltaX, height: drag.initial.height + deltaY });
    }
  };

  const stopBlurDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (!blurDragRef.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    blurDragRef.current = null;
  };

  const saveOutputToDirectory = useCallback(async (project: Project, output: Blob) => {
    const directory = downloadDirectoryRef.current;
    if (!directory) return null;
    if (!await directoryHasWritePermission(directory)) {
      throw new DOMException("Write permission is not granted", "NotAllowedError");
    }
    const fileName = await nextAvailableFileName(directory, projectOutputFileName(project));
    const fileHandle = await directory.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(output);
    await writable.close();
    return fileName;
  }, []);

  const ingestFiles = useCallback(async (files: File[], projectId = activeProjectId) => {
    const videoFiles = files.filter((file) => file.type.startsWith("video/") || /\.(mp4|mov|mkv|webm|m4v|avi)$/i.test(file.name));
    if (!videoFiles.length) {
      showToast(tRef.current.toast_invalid_files);
      return;
    }
    const target = projectsRef.current.find((project) => project.id === projectId);
    if (!target) return;
    const remaining = Math.max(0, MAX_CLIPS - target.clips.length);
    if (!remaining) {
      showToast(tRef.current.toast_max_clips(MAX_CLIPS));
      return;
    }

    const accepted = videoFiles.slice(0, remaining);
    showToast(tRef.current.toast_reading(accepted.length));
    const settled = await Promise.allSettled(accepted.map(async (file) => {
      const metadata = await videoMetadata(file);
      return {
        id: newId("clip"),
        file,
        name: file.name,
        size: file.size,
        speed: 1,
        trimStart: 0,
        trimEnd: metadata.duration,
        ...metadata,
      } satisfies Clip;
    }));
    const clips = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    if (!clips.length) {
      showToast(tRef.current.toast_read_failed);
      return;
    }
    updateProject(projectId, (project) => ({
      ...project,
      clips: [...project.clips, ...clips],
      status: "idle",
      progress: 0,
      statusText: "Sẵn sàng",
      error: undefined,
    }));
    setSelectedClipId(clips[0].id);
    showToast(tRef.current.toast_added(clips.length));
  }, [activeProjectId, showToast, updateProject]);

  useEffect(() => {
    const receiveExtensionMessage = (event: MessageEvent) => {
      if (event.source !== window || event.data?.source !== "CUTFLOW_EXTENSION") return;
      if (event.data.type === "CREATE_PROJECT") {
        if (projectsRef.current.length >= MAX_PROJECTS) {
          window.postMessage({ source: "CUTFLOW_WEB", type: "PROJECT_REJECTED", reason: "MAX_PROJECTS" }, window.location.origin);
          showToast(tRef.current.toast_max_projects(MAX_PROJECTS));
          return;
        }
        const project = emptyProject(newId("project"), projectsRef.current.length + 1, event.data.name || tRef.current.extension_project_name);
        const nextProjects = [...projectsRef.current, project];
        projectsRef.current = nextProjects;
        setProjects(nextProjects);
        setActiveProjectId(project.id);
        const files = Array.isArray(event.data.files) ? event.data.files.filter((file: unknown) => file instanceof File) : [];
        if (files.length) void ingestFiles(files, project.id);
        window.postMessage({ source: "CUTFLOW_WEB", type: "PROJECT_ACCEPTED", projectId: project.id }, window.location.origin);
      }
    };
    window.addEventListener("message", receiveExtensionMessage);
    return () => window.removeEventListener("message", receiveExtensionMessage);
  }, [ingestFiles, showToast]);

  const addProject = () => {
    if (projects.length >= MAX_PROJECTS) {
      showToast(t.toast_max_projects(MAX_PROJECTS));
      return;
    }
    const project = emptyProject(newId("project"), projects.length + 1, t.default_project_name(String(projects.length + 1).padStart(2, "0")));
    setProjects((current) => [...current, project]);
    setActiveProjectId(project.id);
    setSelectedClipId(null);
  };

  const removeProject = (projectId: string) => {
    if (projects.length === 1) {
      showToast(t.toast_keep_one_project);
      return;
    }
    const removed = projects.find((project) => project.id === projectId);
    removed?.clips.forEach((clip) => URL.revokeObjectURL(clip.url));
    if (removed?.outputUrl) URL.revokeObjectURL(removed.outputUrl);
    const nextProjects = projects.filter((project) => project.id !== projectId);
    setProjects(nextProjects);
    if (activeProjectId === projectId) setActiveProjectId(nextProjects[0].id);
  };

  const updateClip = (clipId: string, update: Partial<Clip>) => {
    updateProject(activeProject.id, (project) => ({
      ...project,
      clips: project.clips.map((clip) => clip.id === clipId ? { ...clip, ...update } : clip),
      status: "idle",
      progress: 0,
      statusText: "Đã thay đổi",
    }));
  };

  const removeClip = (clipId: string) => {
    const clip = activeProject.clips.find((item) => item.id === clipId);
    if (clip) URL.revokeObjectURL(clip.url);
    updateProject(activeProject.id, (project) => ({ ...project, clips: project.clips.filter((item) => item.id !== clipId), status: "idle" }));
  };

  const moveClip = (clipId: string, direction: -1 | 1) => {
    updateProject(activeProject.id, (project) => {
      const index = project.clips.findIndex((clip) => clip.id === clipId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= project.clips.length) return project;
      const clips = [...project.clips];
      [clips[index], clips[target]] = [clips[target], clips[index]];
      return { ...project, clips, status: "idle", statusText: "Đã đổi thứ tự" };
    });
  };

  const applyBatchSettings = () => {
    setProjects((current) => {
      const next = current.map((project) => ({
        ...project,
        quality: batchQuality,
        aspect: batchAspect,
        muted: batchMuted,
        clips: project.clips.map((clip) => ({ ...clip, speed: batchSpeed })),
        status: project.clips.length ? "idle" as const : project.status,
        progress: 0,
        statusText: project.clips.length ? "Đã áp dụng thiết lập chung" : project.statusText,
      }));
      projectsRef.current = next;
      return next;
    });
    showToast(t.toast_batch_applied(projectCountWithClips || projects.length));
  };

  const applyBatchSpeed = (speed: number) => {
    setBatchSpeed(speed);
    setProjects((current) => {
      const next = current.map((project) => ({
        ...project,
        clips: project.clips.map((clip) => ({ ...clip, speed })),
        status: project.clips.length ? "idle" as const : project.status,
        progress: project.clips.length ? 0 : project.progress,
        statusText: project.clips.length ? `Đã đặt tốc độ ${speed}×` : project.statusText,
      }));
      projectsRef.current = next;
      return next;
    });
    showToast(t.toast_speed_applied(String(speed), projectCountWithClips || projects.length));
  };

  const applyBatchAspect = (aspect: Project["aspect"]) => {
    setBatchAspect(aspect);
    setProjects((current) => {
      const next = current.map((project) => ({
        ...project,
        aspect,
        status: project.clips.length ? "idle" as const : project.status,
        progress: project.clips.length ? 0 : project.progress,
        statusText: project.clips.length ? `Đã đặt khung hình ${aspect}` : project.statusText,
      }));
      projectsRef.current = next;
      return next;
    });
    showToast(t.toast_aspect_applied(aspect, projectCountWithClips || projects.length));
  };

  const notifyExtension = (project: Project) => {
    window.postMessage({
      source: "CUTFLOW_WEB",
      type: "PROJECT_COMPLETE",
      projectId: project.id,
      projectName: project.name,
    }, window.location.origin);
  };

  const processProject = useCallback(async (projectId: string) => {
    const project = projectsRef.current.find((item) => item.id === projectId);
    if (!project?.clips.length) return false;
    if (project.outputUrl) URL.revokeObjectURL(project.outputUrl);

    updateProject(projectId, (current) => ({ ...current, status: "processing", progress: 1, statusText: "Đang chuẩn bị…", error: undefined, outputUrl: undefined, savedFileName: undefined }));
    try {
      const engineProject: EngineProject = {
        id: project.id.replace(/[^a-z0-9_-]/gi, "_"),
        name: project.name,
        quality: project.quality,
        aspect: project.aspect,
        muted: project.muted,
        blur: project.blur,
        smartCrop: project.smartCrop,
        clips: project.clips.map((clip) => ({
          id: clip.id,
          file: clip.file,
          trimStart: clip.trimStart,
          trimEnd: clip.trimEnd,
          speed: clip.speed,
        })),
      };
      const output = await videoEngine.process(engineProject, (progress, statusText) => {
        updateProject(projectId, (current) => ({ ...current, progress: Math.round(progress * 100), statusText }));
      });
      const outputUrl = URL.createObjectURL(output);
      let savedFileName: string | undefined;
      try {
        savedFileName = await saveOutputToDirectory(project, output) || undefined;
        if (savedFileName) showToast(tRef.current.toast_saved_to_folder(savedFileName));
      } catch {
        setDirectoryStatus("needs-permission");
        showToast(tRef.current.toast_save_failed);
      }
      const completed = { ...project, outputUrl, savedFileName };
      updateProject(projectId, (current) => ({
        ...current,
        status: "done",
        progress: 100,
        statusText: savedFileName ? `Đã lưu ${savedFileName}` : "Sẵn sàng tải xuống",
        outputUrl,
        savedFileName,
      }));
      notifyExtension(completed);
      return true;
    } catch (error) {
      const message = readableError(error);
      updateProject(projectId, (current) => ({ ...current, status: "error", statusText: "Xử lý thất bại", error: message }));
      showToast(message.includes("fetch") ? tRef.current.toast_ffmpeg_network : message);
      return false;
    }
  }, [saveOutputToDirectory, showToast, updateProject]);

  const prepareDownloadDirectory = async () => {
    const directory = downloadDirectoryRef.current;
    if (!directory) return;
    if (isCrossOriginFrame()) {
      setDirectoryStatus("blocked");
      showToast(t.toast_folder_blocked);
      return;
    }
    try {
      const connected = await directoryHasWritePermission(directory, true);
      setDirectoryStatus(connected ? "connected" : "needs-permission");
      if (!connected) showToast(t.toast_folder_permission_denied);
    } catch {
      setDirectoryStatus("needs-permission");
      showToast(t.toast_folder_permission_denied);
    }
  };

  const exportActive = async () => {
    if (!activeProject.clips.length) {
      showToast(t.toast_no_clips_active);
      return;
    }
    await prepareDownloadDirectory();
    cancelledRef.current = false;
    setIsBatching(true);
    await processProject(activeProject.id);
    setIsBatching(false);
  };

  const exportAll = async () => {
    const ids = projectsRef.current.filter((project) => project.clips.length > 0).map((project) => project.id);
    if (!ids.length) {
      showToast(t.toast_no_projects);
      return;
    }
    await prepareDownloadDirectory();
    cancelledRef.current = false;
    setIsBatching(true);
    setProjects((current) => current.map((project) => ids.includes(project.id) ? { ...project, status: "queued", progress: 0, statusText: "Đang chờ" } : project));
    let completedCount = 0;
    let failedCount = 0;
    for (const id of ids) {
      if (cancelledRef.current) break;
      const completed = await processProject(id);
      if (completed) completedCount += 1;
      else failedCount += 1;
    }
    setIsBatching(false);
    if (!cancelledRef.current) {
      showToast(failedCount
        ? t.toast_batch_done_failed(completedCount, failedCount)
        : t.toast_batch_done(completedCount));
    }
  };

  const stopExport = () => {
    cancelledRef.current = true;
    videoEngine.cancel();
    setIsBatching(false);
    setProjects((current) => current.map((project) => project.status === "processing" || project.status === "queued"
      ? { ...project, status: "idle", progress: 0, statusText: "Đã dừng" }
      : project));
    showToast(t.toast_stopped);
  };

  const onFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    void ingestFiles(Array.from(event.target.files || []));
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void ingestFiles(Array.from(event.dataTransfer.files));
  };

  const activeOutputName = projectOutputFileName(activeProject);
  const activeAspectClass = `ratio-${activeProject.aspect.replace(":", "x")}`;
  const smartCropScale = activeProject.smartCrop.enabled ? 1 / (1 - activeProject.smartCrop.amount / 100) : 1;
  const smartCropOrigins: Record<SmartCropCorner, string> = {
    "top-left": "bottom right",
    "top-right": "bottom left",
    "bottom-left": "top right",
    "bottom-right": "top left",
  };

  const queueSummary = useMemo(() => {
    const totalSize = projects.reduce((sum, project) => sum + project.clips.reduce((clipSum, clip) => clipSum + clip.size, 0), 0);
    return { totalSize, totalClips: projects.reduce((sum, project) => sum + project.clips.length, 0) };
  }, [projects]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="Cutflow">
          <span className="brand-mark"><i /><i /></span>
          <span>Cutflow</span>
          <b>STUDIO</b>
        </div>
        <div className="topbar-center">
          <span className="privacy-dot" />
          {t.privacy_note}
        </div>
        <div className="topbar-actions">
          <span className="extension-chip"><i>↗</i> Extension ready</span>
          <button className="icon-button" type="button" aria-label={t.help_label} title={t.help_tooltip}>?</button>
        </div>
      </header>

      <div className="studio-grid">
        <aside className="project-sidebar">
          <div className="sidebar-heading">
            <div>
              <span>{t.projects_heading}</span>
              <small>{projects.length}/{MAX_PROJECTS}</small>
            </div>
            <button type="button" onClick={addProject} aria-label={t.add_project}>＋</button>
          </div>

          <div className="project-list">
            {projects.map((project, index) => (
              <button
                type="button"
                key={project.id}
                className={`project-card ${project.id === activeProject.id ? "active" : ""}`}
                onClick={() => setActiveProjectId(project.id)}
              >
                <span className="project-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="project-copy">
                  <strong>{project.name}</strong>
                  <small>{project.clips.length} {t.clip_word} · {formatTime(totalDuration(project))}</small>
                  {project.status === "processing" || project.status === "queued" ? (
                    <span className="mini-progress"><i style={{ width: `${project.progress}%` }} /></span>
                  ) : null}
                </span>
                <StatusPill status={project.status} lang={uiLang} />
              </button>
            ))}
          </div>

          <div className="sidebar-foot">
            <span><i className="storage-icon" />{t.current_session}</span>
            <small>{formatBytes(queueSummary.totalSize)} · {queueSummary.totalClips} {t.clip_word}</small>
          </div>
        </aside>

        <section className="workspace">
          <div className="workspace-head">
            <div>
              <label htmlFor="project-name">{t.project_name_label}</label>
              <input
                id="project-name"
                value={activeProject.name}
                onChange={(event) => updateProject(activeProject.id, (project) => ({ ...project, name: event.target.value }))}
                aria-label={t.project_name_label}
              />
            </div>
            <div className="workspace-meta">
              <span>{activeProject.clips.length} {t.clip_word}</span>
              <i />
              <span>{formatTime(totalDuration(activeProject))}</span>
              <button type="button" className="more-button" onClick={() => removeProject(activeProject.id)} aria-label={t.delete_project}>{t.delete_project}</button>
            </div>
          </div>

          <div className="editor-stage">
            {selectedClip ? (
              <div className={`video-preview ${activeAspectClass}`}>
                <video
                  ref={previewVideoRef}
                  key={selectedClip.url}
                  src={selectedClip.url}
                  controls
                  playsInline
                  preload="metadata"
                  className={activeProject.smartCrop.enabled ? "smart-crop-preview" : undefined}
                  style={activeProject.smartCrop.enabled ? {
                    transform: `scale(${smartCropScale})`,
                    transformOrigin: smartCropOrigins[activeProject.smartCrop.corner],
                  } : undefined}
                  onLoadedMetadata={(event) => { event.currentTarget.playbackRate = selectedClip.speed; }}
                />
                {activeProject.blur.enabled ? (
                  <div
                    className="blur-preview-region"
                    style={{
                      left: `${activeProject.blur.x}%`,
                      top: `${activeProject.blur.y}%`,
                      width: `${activeProject.blur.width}%`,
                      height: `${activeProject.blur.height}%`,
                      backdropFilter: `blur(${Math.max(5, activeProject.blur.strength / 2)}px)`,
                    }}
                    onPointerDown={(event) => startBlurDrag(event, "move")}
                    onPointerMove={moveBlurRegion}
                    onPointerUp={stopBlurDrag}
                    onPointerCancel={stopBlurDrag}
                    title={t.blur_drag_hint}
                  >
                    <span>{t.blur_region_label}</span>
                    <i onPointerDown={(event) => startBlurDrag(event, "resize")} />
                  </div>
                ) : null}
                {activeProject.smartCrop.enabled ? (
                  <span className="smart-crop-badge">SMART CROP · {activeProject.smartCrop.amount}%</span>
                ) : null}
                <span className="preview-badge">{t.preview_badge} · {activeProject.aspect} · {selectedClip.speed}×</span>
              </div>
            ) : (
              <div
                className={`drop-zone ${isDragging ? "dragging" : ""}`}
                onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
              >
                <div className="drop-icon"><i>＋</i></div>
                <h1>{t.drop_title}</h1>
                <p>{t.drop_desc}</p>
                <button type="button" className="primary-button" onClick={() => fileInputRef.current?.click()}>{t.choose_videos}</button>
                <small>{t.drop_hint(MAX_CLIPS)}</small>
              </div>
            )}

            {selectedClip ? (
              <div className="clip-editor">
                <div className="editor-label">
                  <span>✂</span>
                  <div><b>{t.trim_title}</b><small>{selectedClip.name}</small></div>
                </div>
                <label>
                  {t.trim_start}
                  <div className="input-with-unit">
                    <input
                      type="number"
                      min="0"
                      max={Math.max(0, selectedClip.trimEnd - 0.05)}
                      step="0.1"
                      value={Number(selectedClip.trimStart.toFixed(2))}
                      onChange={(event) => updateClip(selectedClip.id, { trimStart: Math.min(Number(event.target.value), selectedClip.trimEnd - 0.05) })}
                    />
                    <span>{t.seconds_unit}</span>
                  </div>
                </label>
                <label>
                  {t.trim_end}
                  <div className="input-with-unit">
                    <input
                      type="number"
                      min={selectedClip.trimStart + 0.05}
                      max={selectedClip.duration}
                      step="0.1"
                      value={Number(selectedClip.trimEnd.toFixed(2))}
                      onChange={(event) => updateClip(selectedClip.id, { trimEnd: Math.max(selectedClip.trimStart + 0.05, Math.min(Number(event.target.value), selectedClip.duration)) })}
                    />
                    <span>{t.seconds_unit}</span>
                  </div>
                </label>
                <label>
                  {t.speed_label}
                  <select value={selectedClip.speed} onChange={(event) => updateClip(selectedClip.id, { speed: Number(event.target.value) })}>
                    {SPEEDS.map((speed) => <option key={speed} value={speed}>{speed}×</option>)}
                  </select>
                </label>
                <div className="trim-result">
                  <span>{t.trim_result}</span>
                  <strong>{formatTime((selectedClip.trimEnd - selectedClip.trimStart) / selectedClip.speed)}</strong>
                </div>
              </div>
            ) : null}
          </div>

          <div className="timeline-panel">
            <div className="timeline-head">
              <div><span>TIMELINE</span><small>{t.timeline_hint}</small></div>
              <button type="button" onClick={() => fileInputRef.current?.click()}>＋ {t.add_clip}</button>
            </div>
            <div
              className={`clip-strip ${isDragging ? "dragging" : ""}`}
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
            >
              {activeProject.clips.map((clip, index) => (
                <article key={clip.id} className={`clip-card ${clip.id === selectedClip?.id ? "selected" : ""}`} onClick={() => setSelectedClipId(clip.id)}>
                  <div className="clip-thumb" style={clip.thumbnail ? { backgroundImage: `url(${clip.thumbnail})` } : undefined}>
                    <span>{index + 1}</span>
                    <small>{formatTime((clip.trimEnd - clip.trimStart) / clip.speed)}</small>
                  </div>
                  <div className="clip-info">
                    <strong title={clip.name}>{clip.name}</strong>
                    <small>{clip.speed}× · {formatBytes(clip.size)}</small>
                  </div>
                  <div className="clip-actions">
                    <button type="button" onClick={(event) => { event.stopPropagation(); moveClip(clip.id, -1); }} disabled={index === 0} aria-label={t.move_left}>‹</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); moveClip(clip.id, 1); }} disabled={index === activeProject.clips.length - 1} aria-label={t.move_right}>›</button>
                    <button type="button" className="remove-clip" onClick={(event) => { event.stopPropagation(); removeClip(clip.id); }} aria-label={t.remove_clip}>×</button>
                  </div>
                </article>
              ))}
              <button type="button" className="add-clip-card" onClick={() => fileInputRef.current?.click()}>
                <i>＋</i><span>{t.add_clip}</span>
              </button>
            </div>
          </div>
        </section>

        <aside className="export-panel">
          <div className="panel-title">
            <div><span>{t.batch_heading}</span><small>{t.batch_sub}</small></div>
            <span className="batch-badge">BATCH</span>
          </div>

          <div className="setting-group">
            <label htmlFor="batch-speed">{t.batch_speed_label}</label>
            <div className="speed-control">
              <select id="batch-speed" value={batchSpeed} onChange={(event) => applyBatchSpeed(Number(event.target.value))}>
                {SPEEDS.map((speed) => <option key={speed} value={speed}>{speed}×</option>)}
              </select>
              <span>{batchSpeed === 1 ? t.speed_original : batchSpeed < 1 ? t.speed_slow : t.speed_fast}</span>
            </div>
            <div className="speed-presets">
              {SPEED_PRESETS.map((speed) => (
                <button type="button" key={speed} className={batchSpeed === speed ? "active" : ""} onClick={() => applyBatchSpeed(speed)}>{speed}×</button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <label>
              {t.aspect_label}
              <select value={batchAspect} onChange={(event) => applyBatchAspect(event.target.value as Project["aspect"])}>
                <option value="9:16">{t.aspect_916}</option>
                <option value="16:9">{t.aspect_169}</option>
                <option value="1:1">{t.aspect_11}</option>
              </select>
            </label>
            <label>
              {t.quality_label}
              <select value={batchQuality} onChange={(event) => setBatchQuality(event.target.value as Project["quality"])}>
                <option value="720p">{t.quality_720}</option>
                <option value="1080p">{t.quality_1080}</option>
              </select>
            </label>
          </div>

          <label className="toggle-row">
            <span><b>{t.mute_label}</b><small>{t.mute_sub}</small></span>
            <input type="checkbox" checked={batchMuted} onChange={(event) => setBatchMuted(event.target.checked)} />
            <i />
          </label>

          <button type="button" className="apply-button" onClick={applyBatchSettings}>{t.apply_all}</button>

          <div className="smart-crop-settings">
            <label className="toggle-row smart-crop-toggle">
              <span><b>{t.smart_crop_title}</b><small>{t.smart_crop_subtitle}</small></span>
              <input
                type="checkbox"
                checked={activeProject.smartCrop.enabled}
                onChange={(event) => updateSmartCrop({ enabled: event.target.checked })}
              />
              <i />
            </label>
            {activeProject.smartCrop.enabled ? (
              <div className="smart-crop-controls">
                <small>{t.smart_crop_hint}</small>
                <div className="smart-crop-corners" aria-label={t.smart_crop_corner_label}>
                  {([
                    ["top-left", "↖", t.blur_top_left],
                    ["top-right", "↗", t.blur_top_right],
                    ["bottom-left", "↙", t.blur_bottom_left],
                    ["bottom-right", "↘", t.blur_bottom_right],
                  ] as const).map(([corner, icon, label]) => (
                    <button
                      type="button"
                      key={corner}
                      className={activeProject.smartCrop.corner === corner ? "active" : ""}
                      onClick={() => updateSmartCrop({ corner })}
                      aria-label={label}
                      title={label}
                    >{icon}</button>
                  ))}
                </div>
                <label>
                  <span>{t.smart_crop_amount}<b>{activeProject.smartCrop.amount}%</b></span>
                  <input
                    type="range"
                    min="2"
                    max="8"
                    step="0.5"
                    value={activeProject.smartCrop.amount}
                    onChange={(event) => updateSmartCrop({ amount: Number(event.target.value) })}
                  />
                </label>
                <button type="button" className="smart-crop-apply-all" onClick={applySmartCropToAll}>{t.smart_crop_apply_all}</button>
              </div>
            ) : null}
          </div>

          <div className="blur-settings">
            <label className="toggle-row blur-toggle">
              <span><b>{t.blur_title}</b><small>{t.blur_subtitle}</small></span>
              <input
                type="checkbox"
                checked={activeProject.blur.enabled}
                onChange={(event) => updateBlurRegion({ enabled: event.target.checked })}
              />
              <i />
            </label>
            {activeProject.blur.enabled ? (
              <div className="blur-controls">
                <small>{t.blur_drag_hint}</small>
                <div className="blur-corners" aria-label={t.blur_position_label}>
                  <button type="button" onClick={() => setBlurCorner("left", "top")} aria-label={t.blur_top_left}>↖</button>
                  <button type="button" onClick={() => setBlurCorner("right", "top")} aria-label={t.blur_top_right}>↗</button>
                  <button type="button" onClick={() => setBlurCorner("left", "bottom")} aria-label={t.blur_bottom_left}>↙</button>
                  <button type="button" onClick={() => setBlurCorner("right", "bottom")} aria-label={t.blur_bottom_right}>↘</button>
                </div>
                <label>
                  <span>{t.blur_width}<b>{Math.round(activeProject.blur.width)}%</b></span>
                  <input type="range" min="5" max="60" value={activeProject.blur.width} onChange={(event) => updateBlurRegion({ width: Number(event.target.value) })} />
                </label>
                <label>
                  <span>{t.blur_height}<b>{Math.round(activeProject.blur.height)}%</b></span>
                  <input type="range" min="4" max="40" value={activeProject.blur.height} onChange={(event) => updateBlurRegion({ height: Number(event.target.value) })} />
                </label>
                <label>
                  <span>{t.blur_strength}<b>{Math.round(activeProject.blur.strength)}</b></span>
                  <input type="range" min="4" max="40" value={activeProject.blur.strength} onChange={(event) => updateBlurRegion({ strength: Number(event.target.value) })} />
                </label>
                <button type="button" className="blur-apply-all" onClick={applyBlurToAll}>{t.blur_apply_all}</button>
              </div>
            ) : null}
          </div>

          <div className="save-settings">
            <label className="output-name-label" htmlFor="output-file-name">
              <span>{t.output_filename_label}</span>
              <div className="output-name-input">
                <input
                  id="output-file-name"
                  value={activeProject.outputName}
                  placeholder={t.output_filename_placeholder}
                  onChange={(event) => updateProject(activeProject.id, (project) => ({ ...project, outputName: event.target.value }))}
                  onBlur={(event) => updateProject(activeProject.id, (project) => ({
                    ...project,
                    outputName: safeOutputBase(event.target.value, defaultOutputBase(project.name)),
                  }))}
                />
                <i>.mp4</i>
              </div>
            </label>
            <button
              type="button"
              className="folder-button"
              onClick={directoryStatus === "blocked" ? openStandaloneApp : directoryStatus === "needs-permission" ? reconnectDownloadDirectory : chooseDownloadDirectory}
              disabled={directoryStatus === "restoring"}
            >
              <span>⌁</span>
              {directoryStatus === "blocked"
                ? t.open_standalone
                : directoryStatus === "needs-permission"
                  ? t.reconnect_folder
                  : downloadDirectoryName ? t.change_folder : t.choose_folder}
            </button>
            <small className={directoryStatus === "connected" ? "folder-state selected" : directoryStatus === "blocked" || directoryStatus === "needs-permission" ? "folder-state warning" : "folder-state"}>
              {directoryStatus === "restoring"
                ? t.folder_restoring
                : directoryStatus === "connected" && downloadDirectoryName
                  ? t.folder_selected(downloadDirectoryName)
                  : directoryStatus === "needs-permission" && downloadDirectoryName
                    ? t.folder_needs_permission(downloadDirectoryName)
                    : directoryStatus === "blocked"
                      ? t.folder_blocked
                      : directoryStatus === "unsupported"
                        ? t.folder_unsupported
                        : t.folder_default}
            </small>
          </div>

          <div className="queue-box">
            <div className="queue-heading"><span>{t.queue_heading}</span><small>{projectCountWithClips} {t.projects_word}</small></div>
            <div className="queue-stats">
              <div><small>{t.total_duration}</small><strong>{formatTime(totalQueueDuration)}</strong></div>
              <div><small>{t.total_size}</small><strong>{formatBytes(queueSummary.totalSize)}</strong></div>
            </div>
            <div className="queue-items">
              {projects.filter((project) => project.clips.length > 0).map((project) => (
                <div key={project.id}>
                  <span><i className={`queue-dot ${project.status}`} />{project.name}</span>
                  <small>{project.status === "processing" ? `${project.progress}%` : formatTime(totalDuration(project))}</small>
                </div>
              ))}
              {!projectCountWithClips ? <p>{t.queue_empty}</p> : null}
            </div>
          </div>

          {activeProject.status === "processing" ? (
            <div className="active-progress">
              <div><span>{translateStatus(activeProject.statusText, uiLang)}</span><b>{activeProject.progress}%</b></div>
              <span><i style={{ width: `${activeProject.progress}%` }} /></span>
            </div>
          ) : null}

          {activeProject.status === "error" ? <p className="error-message">{activeProject.error}</p> : null}

          {activeProject.savedFileName ? <p className="saved-file">✓ {t.saved_file(activeProject.savedFileName)}</p> : null}

          {activeProject.outputUrl ? (
            <a className="download-button" href={activeProject.outputUrl} download={activeOutputName}>
              ↓ {activeProject.savedFileName ? t.download_again : t.download_prefix} {activeOutputName}
            </a>
          ) : null}

          <div className="export-actions">
            {isBatching ? (
              <button type="button" className="stop-button" onClick={stopExport}>{t.stop_processing}</button>
            ) : (
              <>
                <button type="button" className="secondary-button" onClick={exportActive} disabled={!activeProject.clips.length}>{t.export_active}</button>
                <button type="button" className="export-button" onClick={exportAll} disabled={!projectCountWithClips}>
                  <span>▶</span>
                  <div><b>{t.export_all}</b><small>{t.export_all_sub(projectCountWithClips)}</small></div>
                </button>
              </>
            )}
          </div>
          <p className="export-note"><i>✓</i> {t.export_note}</p>
        </aside>
      </div>

      <input ref={fileInputRef} className="visually-hidden" type="file" accept="video/*,.mkv" multiple onChange={onFilesSelected} />
      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </main>
  );
}
