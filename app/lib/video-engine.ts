export type EngineClip = {
  id: string;
  file: File;
  trimStart: number;
  trimEnd: number;
  speed: number;
};

export type EngineProject = {
  id: string;
  name: string;
  clips: EngineClip[];
  quality: "720p" | "1080p";
  aspect: "16:9" | "9:16" | "1:1";
  muted: boolean;
};

type EngineProgress = (progress: number, message: string) => void;

const CORE_BASE = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

function outputSize(quality: EngineProject["quality"], aspect: EngineProject["aspect"]) {
  const longEdge = quality === "1080p" ? 1920 : 1280;
  const shortEdge = quality === "1080p" ? 1080 : 720;

  if (aspect === "9:16") return [shortEdge, longEdge] as const;
  if (aspect === "1:1") return [shortEdge, shortEdge] as const;
  return [longEdge, shortEdge] as const;
}

function safeExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "mp4";
  return /^[a-z0-9]{2,5}$/.test(extension) ? extension : "mp4";
}

class BrowserVideoEngine {
  private ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg | null = null;
  private progressListener: ((event: { progress: number; time: number }) => void) | null = null;
  private progressSink: ((progress: number) => void) | null = null;

  async load(onStatus?: (message: string) => void) {
    if (this.ffmpeg?.loaded) return this.ffmpeg;

    onStatus?.("Đang tải bộ máy xử lý video…");
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
      import("@ffmpeg/ffmpeg"),
      import("@ffmpeg/util"),
    ]);
    const ffmpeg = new FFmpeg();
    this.progressListener = ({ progress }) => this.progressSink?.(Math.max(0, Math.min(1, progress)));
    ffmpeg.on("progress", this.progressListener);

    const [coreURL, wasmURL] = await Promise.all([
      toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    ]);
    await ffmpeg.load({ coreURL, wasmURL });
    this.ffmpeg = ffmpeg;
    return ffmpeg;
  }

  cancel() {
    this.ffmpeg?.terminate();
    this.ffmpeg = null;
    this.progressListener = null;
    this.progressSink = null;
  }

  async process(project: EngineProject, onProgress: EngineProgress) {
    if (!project.clips.length) throw new Error("Dự án chưa có video.");
    const ffmpeg = await this.load((message) => onProgress(0.02, message));
    const createdFiles: string[] = [];
    const segmentNames: string[] = [];
    const [width, height] = outputSize(project.quality, project.aspect);

    try {
      for (let index = 0; index < project.clips.length; index += 1) {
        const clip = project.clips[index];
        const inputName = `input_${project.id}_${index}.${safeExtension(clip.file.name)}`;
        const segmentName = `segment_${project.id}_${index}.mp4`;
        createdFiles.push(inputName, segmentName);
        segmentNames.push(segmentName);

        onProgress(0.05 + (index / project.clips.length) * 0.76, `Đang xử lý clip ${index + 1}/${project.clips.length}`);
        await ffmpeg.writeFile(inputName, new Uint8Array(await clip.file.arrayBuffer()));

        const duration = Math.max(0.05, clip.trimEnd - clip.trimStart);
        const videoFilter = [
          `setpts=PTS/${clip.speed}`,
          `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
          `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
          "setsar=1",
        ].join(",");

        const args = [
          "-ss", clip.trimStart.toFixed(3),
          "-t", duration.toFixed(3),
          "-i", inputName,
          "-map", "0:v:0",
          "-map", "0:a:0?",
          "-vf", videoFilter,
        ];

        if (project.muted) {
          args.push("-an");
        } else {
          args.push("-af", `atempo=${clip.speed}`, "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "160k");
        }

        args.push(
          "-c:v", "libx264",
          "-preset", "ultrafast",
          "-crf", "23",
          "-pix_fmt", "yuv420p",
          "-movflags", "+faststart",
          segmentName,
        );

        this.progressSink = (clipProgress) => {
          const base = 0.05 + (index / project.clips.length) * 0.76;
          onProgress(base + clipProgress * (0.76 / project.clips.length), `Đang xử lý clip ${index + 1}/${project.clips.length}`);
        };
        const exitCode = await ffmpeg.exec(args);
        if (exitCode !== 0) throw new Error(`Không thể xử lý clip ${index + 1}.`);
        await ffmpeg.deleteFile(inputName);
      }

      const listName = `concat_${project.id}.txt`;
      const outputName = `cutflow_${project.id}.mp4`;
      createdFiles.push(listName, outputName);
      await ffmpeg.writeFile(listName, new TextEncoder().encode(segmentNames.map((name) => `file '${name}'`).join("\n")));

      this.progressSink = (concatProgress) => onProgress(0.83 + concatProgress * 0.16, "Đang nối và hoàn thiện video…");
      const concatExitCode = await ffmpeg.exec([
        "-f", "concat",
        "-safe", "0",
        "-i", listName,
        "-c", "copy",
        "-movflags", "+faststart",
        outputName,
      ]);
      if (concatExitCode !== 0) throw new Error("Không thể nối các clip.");

      const data = await ffmpeg.readFile(outputName);
      if (typeof data === "string") throw new Error("Dữ liệu video đầu ra không hợp lệ.");
      const copy = Uint8Array.from(data);
      onProgress(1, "Đã hoàn tất");
      return new Blob([copy.buffer], { type: "video/mp4" });
    } finally {
      this.progressSink = null;
      for (const fileName of createdFiles) {
        try {
          await ffmpeg.deleteFile(fileName);
        } catch {
          // The file may have already been removed after a successful segment.
        }
      }
    }
  }
}

export const videoEngine = new BrowserVideoEngine();
