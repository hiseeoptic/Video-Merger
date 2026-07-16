"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type Project = {
  id: string;
  name: string;
  clips: Clip[];
  quality: "720p" | "1080p";
  aspect: "16:9" | "9:16" | "1:1";
  muted: boolean;
  status: ProjectStatus;
  progress: number;
  statusText: string;
  outputUrl?: string;
  error?: string;
};

const SPEEDS = [0.5, 0.75, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.75, 2, 2.5, 3, 4];
const SPEED_PRESETS = [1, 1.1, 1.2, 1.3];
const MAX_PROJECTS = 5;
const MAX_CLIPS = 12;

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyProject(id = newId("project"), index = 1, name?: string): Project {
  return {
    id,
    name: name || `Dự án ${String(index).padStart(2, "0")}`,
    clips: [],
    quality: "720p",
    aspect: "9:16",
    muted: false,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const projectsRef = useRef(projects);
  const cancelledRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  // Bảng chuỗi theo ngôn ngữ hiện tại. tRef để các useCallback dùng bản mới
  // nhất mà không phải thêm dependency.
  const t = MESSAGES[uiLang];
  const tRef = useRef(t);
  tRef.current = t;

  // Đồng bộ ngôn ngữ: nhớ lựa chọn cũ trong localStorage, và nhận lệnh
  // SET_LANG do extension AutoFlow gửi vào iframe khi người dùng đổi ngôn ngữ.
  useEffect(() => {
    const saved = normalizeLang(window.localStorage.getItem("cutflow-lang"));
    if (saved) setUiLang(saved);
    const onLangMessage = (event: MessageEvent) => {
      if (event.data?.type !== "SET_LANG" || event.data?.source !== "CUTFLOW_EXTENSION") return;
      const next = normalizeLang(event.data.lang);
      if (!next) return;
      setUiLang(next);
      try { window.localStorage.setItem("cutflow-lang", next); } catch { /* private mode */ }
    };
    window.addEventListener("message", onLangMessage);
    return () => window.removeEventListener("message", onLangMessage);
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

    updateProject(projectId, (current) => ({ ...current, status: "processing", progress: 1, statusText: "Đang chuẩn bị…", error: undefined, outputUrl: undefined }));
    try {
      const engineProject: EngineProject = {
        id: project.id.replace(/[^a-z0-9_-]/gi, "_"),
        name: project.name,
        quality: project.quality,
        aspect: project.aspect,
        muted: project.muted,
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
      const completed = { ...project, outputUrl };
      updateProject(projectId, (current) => ({ ...current, status: "done", progress: 100, statusText: "Sẵn sàng tải xuống", outputUrl }));
      notifyExtension(completed);
      return true;
    } catch (error) {
      const message = readableError(error);
      updateProject(projectId, (current) => ({ ...current, status: "error", statusText: "Xử lý thất bại", error: message }));
      showToast(message.includes("fetch") ? tRef.current.toast_ffmpeg_network : message);
      return false;
    }
  }, [showToast, updateProject]);

  const exportActive = async () => {
    if (!activeProject.clips.length) {
      showToast(t.toast_no_clips_active);
      return;
    }
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

  const activeOutputName = `${activeProject.name.trim().replace(/\s+/g, "-").toLowerCase() || "cutflow"}.mp4`;
  const activeAspectClass = `ratio-${activeProject.aspect.replace(":", "x")}`;

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
                  onLoadedMetadata={(event) => { event.currentTarget.playbackRate = selectedClip.speed; }}
                />
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

          {activeProject.outputUrl ? (
            <a className="download-button" href={activeProject.outputUrl} download={activeOutputName}>↓ {t.download_prefix} {activeProject.name}</a>
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
