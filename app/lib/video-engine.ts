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
  blur: {
    enabled: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    strength: number;
  };
};

type EngineProgress = (progress: number, message: string) => void;

const CORE_BASE = "/ffmpeg";

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

function unknownErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === "string" && error.trim()) return error.trim().replace(/^Error:\s*/i, "");
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message.trim();
  }
  return "Lỗi không xác định.";
}

function audioTempoFilter(speed: number) {
  const filters: string[] = [];
  let remaining = speed;
  while (remaining > 2) {
    filters.push("atempo=2");
    remaining /= 2;
  }
  filters.push(`atempo=${remaining.toFixed(4)}`);
  return filters.join(",");
}

function evenPixel(value: number) {
  return Math.max(2, Math.floor(value / 2) * 2);
}

function blurFilterGraph(project: EngineProject, width: number, height: number, baseFilter: string) {
  const blurWidth = Math.min(width, evenPixel(width * project.blur.width / 100));
  const blurHeight = Math.min(height, evenPixel(height * project.blur.height / 100));
  const blurX = Math.min(width - blurWidth, evenPixel(width * project.blur.x / 100));
  const blurY = Math.min(height - blurHeight, evenPixel(height * project.blur.y / 100));
  const maximumRadius = Math.max(2, Math.floor(Math.min(blurWidth, blurHeight) / 2) - 1);
  const radius = Math.max(2, Math.min(Math.round(project.blur.strength), maximumRadius));
  const chromaRadius = Math.max(1, Math.floor(radius / 2));
  return [
    `[0:v:0]${baseFilter}[base]`,
    "[base]split=2[clean][blur_source]",
    `[blur_source]crop=${blurWidth}:${blurHeight}:${blurX}:${blurY},boxblur=luma_radius=${radius}:luma_power=2:chroma_radius=${chromaRadius}:chroma_power=2[blurred]`,
    `[clean][blurred]overlay=${blurX}:${blurY}:shortest=1[video_out]`,
  ].join(";");
}

class BrowserVideoEngine {
  private ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg | null = null;
  private progressListener: ((event: { progress: number; time: number }) => void) | null = null;
  private logListener: ((event: { type: string; message: string }) => void) | null = null;
  private progressSink: ((progress: number) => void) | null = null;
  private recentLogs: string[] = [];

  private latestFailureLog() {
    const useful = [...this.recentLogs].reverse().find((line) => /error|failed|invalid|unknown|not found|cannot|unable/i.test(line));
    return useful || this.recentLogs.at(-1) || "";
  }

  private failureMessage(error: unknown) {
    const message = unknownErrorMessage(error);
    const log = this.latestFailureLog();
    return log && !message.includes(log) ? `${message} ${log}` : message;
  }

  async load(onStatus?: (message: string) => void) {
    if (this.ffmpeg?.loaded) return this.ffmpeg;

    onStatus?.("Đang tải bộ máy xử lý video…");
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const ffmpeg = new FFmpeg();
    this.recentLogs = [];
    this.progressListener = ({ progress }) => this.progressSink?.(Math.max(0, Math.min(1, progress)));
    this.logListener = ({ message }) => {
      if (!message.trim()) return;
      this.recentLogs.push(message.trim());
      if (this.recentLogs.length > 100) this.recentLogs.shift();
    };
    ffmpeg.on("progress", this.progressListener);
    ffmpeg.on("log", this.logListener);

    try {
      await ffmpeg.load({
        coreURL: `${CORE_BASE}/ffmpeg-core.js`,
        wasmURL: `${CORE_BASE}/ffmpeg-core.wasm`,
      });
    } catch (error) {
      ffmpeg.terminate();
      this.progressListener = null;
      this.logListener = null;
      throw new Error(`Không thể khởi động bộ xử lý video: ${this.failureMessage(error)}`);
    }
    this.ffmpeg = ffmpeg;
    return ffmpeg;
  }

  cancel() {
    if (this.ffmpeg && this.progressListener) this.ffmpeg.off("progress", this.progressListener);
    if (this.ffmpeg && this.logListener) this.ffmpeg.off("log", this.logListener);
    this.ffmpeg?.terminate();
    this.ffmpeg = null;
    this.progressListener = null;
    this.logListener = null;
    this.progressSink = null;
    this.recentLogs = [];
  }

  private async inputHasAudio(
    ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg,
    inputName: string,
  ) {
    const inspectionLogs: string[] = [];
    const inspectionListener = ({ message }: { type: string; message: string }) => {
      if (message.trim()) inspectionLogs.push(message.trim());
    };
    ffmpeg.on("log", inspectionListener);
    try {
      await ffmpeg.exec([
        "-hide_banner",
        "-i", inputName,
        "-map", "0:a:0?",
        "-frames:a", "1",
        "-f", "null",
        "-",
      ]);
    } catch {
      // Stream information is still available in the captured FFmpeg log.
    } finally {
      ffmpeg.off("log", inspectionListener);
      this.recentLogs = [];
    }
    return inspectionLogs.some((line) => /Stream #\d+:\d+.*\bAudio:/i.test(line));
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
        this.progressSink = null;
        const hasAudio = !project.muted && await this.inputHasAudio(ffmpeg, inputName);

        const duration = Math.max(0.05, clip.trimEnd - clip.trimStart);
        const baseVideoFilter = [
          `setpts=PTS/${clip.speed}`,
          `scale=${width}:${height}:force_original_aspect_ratio=increase`,
          `crop=${width}:${height}:(iw-ow)/2:(ih-oh)/2`,
          "setsar=1",
        ].join(",");

        const args = [
          "-ss", clip.trimStart.toFixed(3),
          "-t", duration.toFixed(3),
          "-i", inputName,
        ];

        if (!project.muted && !hasAudio) {
          args.push("-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000");
        }

        if (project.blur.enabled) {
          args.push("-filter_complex", blurFilterGraph(project, width, height, baseVideoFilter), "-map", "[video_out]");
        } else {
          args.push("-map", "0:v:0", "-vf", baseVideoFilter);
        }

        if (project.muted) {
          args.push("-an");
        } else if (hasAudio) {
          args.push("-map", "0:a:0", "-af", `${audioTempoFilter(clip.speed)},apad`, "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "160k", "-shortest");
        } else {
          args.push("-map", "1:a:0", "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "160k", "-shortest");
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
        if (exitCode !== 0) throw new Error(`Không thể xử lý clip ${index + 1}. ${this.latestFailureLog()}`.trim());
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
      if (concatExitCode !== 0) throw new Error(`Không thể nối các clip. ${this.latestFailureLog()}`.trim());

      const data = await ffmpeg.readFile(outputName);
      if (typeof data === "string") throw new Error("Dữ liệu video đầu ra không hợp lệ.");
      const copy = Uint8Array.from(data);
      onProgress(1, "Đã hoàn tất");
      return new Blob([copy.buffer], { type: "video/mp4" });
    } catch (error) {
      if (error instanceof Error && /^(Không thể|Dữ liệu)/.test(error.message)) throw error;
      throw new Error(`Không thể xử lý video: ${this.failureMessage(error)}`);
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
