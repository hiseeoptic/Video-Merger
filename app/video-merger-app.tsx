"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { videoEngine, type EngineProject } from "./lib/video-engine";

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

const SPEEDS = [0.5, 1, 1.25, 1.5, 2, 3, 4];
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
    aspect: "16:9",
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

function StatusPill({ status }: { status: ProjectStatus }) {
  const labels: Record<ProjectStatus, string> = {
    idle: "Sẵn sàng",
    queued: "Đang chờ",
    processing: "Đang xuất",
    done: "Hoàn tất",
    error: "Có lỗi",
  };
  return <span className={`status-pill status-${status}`}><i />{labels[status]}</span>;
}

export function VideoMergerApp() {
  const [projects, setProjects] = useState<Project[]>([emptyProject("project-01", 1, "Reels tháng 7")]);
  const [activeProjectId, setActiveProjectId] = useState("project-01");
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isBatching, setIsBatching] = useState(false);
  const [batchSpeed, setBatchSpeed] = useState(1.5);
  const [batchQuality, setBatchQuality] = useState<Project["quality"]>("720p");
  const [batchAspect, setBatchAspect] = useState<Project["aspect"]>("16:9");
  const [batchMuted, setBatchMuted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectsRef = useRef(projects);
  const cancelledRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

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

  const updateProject = useCallback((projectId: string, updater: (project: Project) => Project) => {
    setProjects((current) => current.map((project) => project.id === projectId ? updater(project) : project));
  }, []);

  const ingestFiles = useCallback(async (files: File[], projectId = activeProjectId) => {
    const videoFiles = files.filter((file) => file.type.startsWith("video/") || /\.(mp4|mov|mkv|webm|m4v|avi)$/i.test(file.name));
    if (!videoFiles.length) {
      showToast("Hãy chọn tệp video hợp lệ.");
      return;
    }
    const target = projectsRef.current.find((project) => project.id === projectId);
    if (!target) return;
    const remaining = Math.max(0, MAX_CLIPS - target.clips.length);
    if (!remaining) {
      showToast(`Mỗi dự án hỗ trợ tối đa ${MAX_CLIPS} clip.`);
      return;
    }

    const accepted = videoFiles.slice(0, remaining);
    showToast(`Đang đọc ${accepted.length} video…`);
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
      showToast("Không thể đọc các video đã chọn.");
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
    showToast(`Đã thêm ${clips.length} video vào dự án.`);
  }, [activeProjectId, showToast, updateProject]);

  useEffect(() => {
    const receiveExtensionMessage = (event: MessageEvent) => {
      if (event.source !== window || event.data?.source !== "CUTFLOW_EXTENSION") return;
      if (event.data.type === "CREATE_PROJECT") {
        if (projectsRef.current.length >= MAX_PROJECTS) {
          window.postMessage({ source: "CUTFLOW_WEB", type: "PROJECT_REJECTED", reason: "MAX_PROJECTS" }, window.location.origin);
          showToast(`Bạn có thể mở tối đa ${MAX_PROJECTS} dự án cùng lúc.`);
          return;
        }
        const project = emptyProject(newId("project"), projectsRef.current.length + 1, event.data.name || "Dự án từ Extension");
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
      showToast(`Bạn có thể mở tối đa ${MAX_PROJECTS} dự án cùng lúc.`);
      return;
    }
    const project = emptyProject(newId("project"), projects.length + 1);
    setProjects((current) => [...current, project]);
    setActiveProjectId(project.id);
    setSelectedClipId(null);
  };

  const removeProject = (projectId: string) => {
    if (projects.length === 1) {
      showToast("Cần giữ lại ít nhất một dự án.");
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
    setProjects((current) => current.map((project) => ({
      ...project,
      quality: batchQuality,
      aspect: batchAspect,
      muted: batchMuted,
      clips: project.clips.map((clip) => ({ ...clip, speed: batchSpeed })),
      status: project.clips.length ? "idle" : project.status,
      progress: 0,
      statusText: project.clips.length ? "Đã áp dụng thiết lập chung" : project.statusText,
    })));
    showToast(`Đã áp dụng cho ${projectCountWithClips || projects.length} dự án.`);
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
      showToast(message.includes("fetch") ? "Không tải được bộ xử lý FFmpeg. Hãy kiểm tra kết nối mạng." : message);
      return false;
    }
  }, [showToast, updateProject]);

  const exportActive = async () => {
    if (!activeProject.clips.length) {
      showToast("Hãy nạp ít nhất một video trước khi xuất.");
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
      showToast("Chưa có dự án nào chứa video.");
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
        ? `Hoàn tất: ${completedCount} thành công, ${failedCount} thất bại.`
        : `Đã xử lý thành công ${completedCount} dự án.`);
    }
  };

  const stopExport = () => {
    cancelledRef.current = true;
    videoEngine.cancel();
    setIsBatching(false);
    setProjects((current) => current.map((project) => project.status === "processing" || project.status === "queued"
      ? { ...project, status: "idle", progress: 0, statusText: "Đã dừng" }
      : project));
    showToast("Đã dừng hàng đợi xuất.");
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
          Video được xử lý trong trình duyệt của bạn
        </div>
        <div className="topbar-actions">
          <span className="extension-chip"><i>↗</i> Extension ready</span>
          <button className="icon-button" type="button" aria-label="Trợ giúp" title="Kéo video vào dự án, chỉnh thông số rồi xuất">?</button>
        </div>
      </header>

      <div className="studio-grid">
        <aside className="project-sidebar">
          <div className="sidebar-heading">
            <div>
              <span>DỰ ÁN</span>
              <small>{projects.length}/{MAX_PROJECTS}</small>
            </div>
            <button type="button" onClick={addProject} aria-label="Thêm dự án">＋</button>
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
                  <small>{project.clips.length} clip · {formatTime(totalDuration(project))}</small>
                  {project.status === "processing" || project.status === "queued" ? (
                    <span className="mini-progress"><i style={{ width: `${project.progress}%` }} /></span>
                  ) : null}
                </span>
                <StatusPill status={project.status} />
              </button>
            ))}
          </div>

          <div className="sidebar-foot">
            <span><i className="storage-icon" />Phiên làm việc hiện tại</span>
            <small>{formatBytes(queueSummary.totalSize)} · {queueSummary.totalClips} clip</small>
          </div>
        </aside>

        <section className="workspace">
          <div className="workspace-head">
            <div>
              <label htmlFor="project-name">TÊN DỰ ÁN</label>
              <input
                id="project-name"
                value={activeProject.name}
                onChange={(event) => updateProject(activeProject.id, (project) => ({ ...project, name: event.target.value }))}
                aria-label="Tên dự án"
              />
            </div>
            <div className="workspace-meta">
              <span>{activeProject.clips.length} clip</span>
              <i />
              <span>{formatTime(totalDuration(activeProject))}</span>
              <button type="button" className="more-button" onClick={() => removeProject(activeProject.id)} aria-label="Xóa dự án">Xóa dự án</button>
            </div>
          </div>

          <div className="editor-stage">
            {selectedClip ? (
              <div className={`video-preview ${activeAspectClass}`}>
                <video key={selectedClip.url} src={selectedClip.url} controls playsInline preload="metadata" />
                <span className="preview-badge">XEM TRƯỚC · {selectedClip.speed}×</span>
              </div>
            ) : (
              <div
                className={`drop-zone ${isDragging ? "dragging" : ""}`}
                onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
              >
                <div className="drop-icon"><i>＋</i></div>
                <h1>Thả video để bắt đầu</h1>
                <p>Nạp nhiều clip, cắt đoạn cần dùng rồi sắp xếp để nối thành một video.</p>
                <button type="button" className="primary-button" onClick={() => fileInputRef.current?.click()}>Chọn video</button>
                <small>MP4, MOV, WebM, MKV · tối đa {MAX_CLIPS} clip/dự án</small>
              </div>
            )}

            {selectedClip ? (
              <div className="clip-editor">
                <div className="editor-label">
                  <span>✂</span>
                  <div><b>Cắt clip đang chọn</b><small>{selectedClip.name}</small></div>
                </div>
                <label>
                  Bắt đầu
                  <div className="input-with-unit">
                    <input
                      type="number"
                      min="0"
                      max={Math.max(0, selectedClip.trimEnd - 0.05)}
                      step="0.1"
                      value={Number(selectedClip.trimStart.toFixed(2))}
                      onChange={(event) => updateClip(selectedClip.id, { trimStart: Math.min(Number(event.target.value), selectedClip.trimEnd - 0.05) })}
                    />
                    <span>giây</span>
                  </div>
                </label>
                <label>
                  Kết thúc
                  <div className="input-with-unit">
                    <input
                      type="number"
                      min={selectedClip.trimStart + 0.05}
                      max={selectedClip.duration}
                      step="0.1"
                      value={Number(selectedClip.trimEnd.toFixed(2))}
                      onChange={(event) => updateClip(selectedClip.id, { trimEnd: Math.max(selectedClip.trimStart + 0.05, Math.min(Number(event.target.value), selectedClip.duration)) })}
                    />
                    <span>giây</span>
                  </div>
                </label>
                <label>
                  Tốc độ
                  <select value={selectedClip.speed} onChange={(event) => updateClip(selectedClip.id, { speed: Number(event.target.value) })}>
                    {SPEEDS.map((speed) => <option key={speed} value={speed}>{speed}×</option>)}
                  </select>
                </label>
                <div className="trim-result">
                  <span>Thành phẩm</span>
                  <strong>{formatTime((selectedClip.trimEnd - selectedClip.trimStart) / selectedClip.speed)}</strong>
                </div>
              </div>
            ) : null}
          </div>

          <div className="timeline-panel">
            <div className="timeline-head">
              <div><span>TIMELINE</span><small>Kéo thả hoặc dùng mũi tên để sắp xếp</small></div>
              <button type="button" onClick={() => fileInputRef.current?.click()}>＋ Thêm clip</button>
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
                    <button type="button" onClick={(event) => { event.stopPropagation(); moveClip(clip.id, -1); }} disabled={index === 0} aria-label="Đưa clip sang trái">‹</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); moveClip(clip.id, 1); }} disabled={index === activeProject.clips.length - 1} aria-label="Đưa clip sang phải">›</button>
                    <button type="button" className="remove-clip" onClick={(event) => { event.stopPropagation(); removeClip(clip.id); }} aria-label="Xóa clip">×</button>
                  </div>
                </article>
              ))}
              <button type="button" className="add-clip-card" onClick={() => fileInputRef.current?.click()}>
                <i>＋</i><span>Thêm clip</span>
              </button>
            </div>
          </div>
        </section>

        <aside className="export-panel">
          <div className="panel-title">
            <div><span>THIẾT LẬP HÀNG LOẠT</span><small>Áp dụng cho mọi dự án</small></div>
            <span className="batch-badge">BATCH</span>
          </div>

          <div className="setting-group">
            <label htmlFor="batch-speed">Tốc độ chung</label>
            <div className="speed-control">
              <select id="batch-speed" value={batchSpeed} onChange={(event) => setBatchSpeed(Number(event.target.value))}>
                {SPEEDS.map((speed) => <option key={speed} value={speed}>{speed}×</option>)}
              </select>
              <span>NHANH</span>
            </div>
            <div className="speed-presets">
              {[1, 1.5, 2, 3].map((speed) => (
                <button type="button" key={speed} className={batchSpeed === speed ? "active" : ""} onClick={() => setBatchSpeed(speed)}>{speed}×</button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <label>
              Tỉ lệ khung hình
              <select value={batchAspect} onChange={(event) => setBatchAspect(event.target.value as Project["aspect"])}>
                <option value="16:9">16:9 — Ngang</option>
                <option value="9:16">9:16 — Dọc</option>
                <option value="1:1">1:1 — Vuông</option>
              </select>
            </label>
            <label>
              Chất lượng
              <select value={batchQuality} onChange={(event) => setBatchQuality(event.target.value as Project["quality"])}>
                <option value="720p">720p — Nhanh</option>
                <option value="1080p">1080p — Đẹp</option>
              </select>
            </label>
          </div>

          <label className="toggle-row">
            <span><b>Tắt âm thanh</b><small>Áp dụng cho toàn bộ clip</small></span>
            <input type="checkbox" checked={batchMuted} onChange={(event) => setBatchMuted(event.target.checked)} />
            <i />
          </label>

          <button type="button" className="apply-button" onClick={applyBatchSettings}>Áp dụng cho tất cả dự án</button>

          <div className="queue-box">
            <div className="queue-heading"><span>HÀNG ĐỢI XUẤT</span><small>{projectCountWithClips} dự án</small></div>
            <div className="queue-stats">
              <div><small>TỔNG THỜI LƯỢNG</small><strong>{formatTime(totalQueueDuration)}</strong></div>
              <div><small>DUNG LƯỢNG GỐC</small><strong>{formatBytes(queueSummary.totalSize)}</strong></div>
            </div>
            <div className="queue-items">
              {projects.filter((project) => project.clips.length > 0).map((project) => (
                <div key={project.id}>
                  <span><i className={`queue-dot ${project.status}`} />{project.name}</span>
                  <small>{project.status === "processing" ? `${project.progress}%` : formatTime(totalDuration(project))}</small>
                </div>
              ))}
              {!projectCountWithClips ? <p>Nạp video vào dự án để tạo hàng đợi.</p> : null}
            </div>
          </div>

          {activeProject.status === "processing" ? (
            <div className="active-progress">
              <div><span>{activeProject.statusText}</span><b>{activeProject.progress}%</b></div>
              <span><i style={{ width: `${activeProject.progress}%` }} /></span>
            </div>
          ) : null}

          {activeProject.status === "error" ? <p className="error-message">{activeProject.error}</p> : null}

          {activeProject.outputUrl ? (
            <a className="download-button" href={activeProject.outputUrl} download={activeOutputName}>↓ Tải {activeProject.name}</a>
          ) : null}

          <div className="export-actions">
            {isBatching ? (
              <button type="button" className="stop-button" onClick={stopExport}>Dừng xử lý</button>
            ) : (
              <>
                <button type="button" className="secondary-button" onClick={exportActive} disabled={!activeProject.clips.length}>Xuất dự án này</button>
                <button type="button" className="export-button" onClick={exportAll} disabled={!projectCountWithClips}>
                  <span>▶</span>
                  <div><b>Xuất tất cả</b><small>{projectCountWithClips} dự án · xử lý tuần tự</small></div>
                </button>
              </>
            )}
          </div>
          <p className="export-note"><i>✓</i> Video không được tải lên máy chủ</p>
        </aside>
      </div>

      <input ref={fileInputRef} className="visually-hidden" type="file" accept="video/*,.mkv" multiple onChange={onFilesSelected} />
      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </main>
  );
}
