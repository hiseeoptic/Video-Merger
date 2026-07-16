// i18n cho Cutflow — đồng bộ 4 ngôn ngữ với extension AutoFlow (vi/en/fr/zh).
// Extension gửi postMessage { source: "CUTFLOW_EXTENSION", type: "SET_LANG", lang }
// vào iframe; app cũng tự nhớ lựa chọn trong localStorage.

export type Lang = "vi" | "en" | "fr" | "zh";

export const LANGS: Lang[] = ["vi", "en", "fr", "zh"];

export function normalizeLang(value: unknown): Lang | null {
  return LANGS.includes(value as Lang) ? (value as Lang) : null;
}

type Messages = {
  // Topbar
  privacy_note: string;
  help_tooltip: string;
  help_label: string;
  // Sidebar
  projects_heading: string;
  add_project: string;
  current_session: string;
  clip_word: string;
  // Status pill / statusText
  status_idle: string;
  status_queued: string;
  status_processing: string;
  status_done: string;
  status_error: string;
  status_changed: string;
  status_reordered: string;
  status_batch_applied: string;
  status_preparing: string;
  status_ready_download: string;
  status_failed: string;
  status_stopped: string;
  status_loading_engine: string;
  status_joining: string;
  status_speed_set: (speed: string) => string;
  status_aspect_set: (aspect: string) => string;
  status_processing_clip: (current: string, total: string) => string;
  // Workspace
  project_name_label: string;
  delete_project: string;
  drop_title: string;
  drop_desc: string;
  choose_videos: string;
  drop_hint: (max: number) => string;
  preview_badge: string;
  trim_title: string;
  trim_start: string;
  trim_end: string;
  seconds_unit: string;
  speed_label: string;
  trim_result: string;
  timeline_hint: string;
  add_clip: string;
  move_left: string;
  move_right: string;
  remove_clip: string;
  // Export panel
  batch_heading: string;
  batch_sub: string;
  batch_speed_label: string;
  speed_original: string;
  speed_slow: string;
  speed_fast: string;
  aspect_label: string;
  aspect_916: string;
  aspect_169: string;
  aspect_11: string;
  quality_label: string;
  quality_720: string;
  quality_1080: string;
  mute_label: string;
  mute_sub: string;
  apply_all: string;
  queue_heading: string;
  projects_word: string;
  total_duration: string;
  total_size: string;
  queue_empty: string;
  download_prefix: string;
  stop_processing: string;
  export_active: string;
  export_all: string;
  export_all_sub: (count: number) => string;
  export_note: string;
  // Toasts
  toast_invalid_files: string;
  toast_max_clips: (max: number) => string;
  toast_reading: (count: number) => string;
  toast_read_failed: string;
  toast_added: (count: number) => string;
  toast_max_projects: (max: number) => string;
  toast_keep_one_project: string;
  toast_batch_applied: (count: number) => string;
  toast_speed_applied: (speed: string, count: number) => string;
  toast_aspect_applied: (aspect: string, count: number) => string;
  toast_ffmpeg_network: string;
  toast_no_clips_active: string;
  toast_no_projects: string;
  toast_batch_done: (ok: number) => string;
  toast_batch_done_failed: (ok: number, failed: number) => string;
  toast_stopped: string;
  default_project_name: (num: string) => string;
  extension_project_name: string;
  cannot_process: string;
  cannot_read_file: (name: string) => string;
};

export const MESSAGES: Record<Lang, Messages> = {
  vi: {
    privacy_note: "Video được xử lý trong trình duyệt của bạn",
    help_tooltip: "Kéo video vào dự án, chỉnh thông số rồi xuất",
    help_label: "Trợ giúp",
    projects_heading: "DỰ ÁN",
    add_project: "Thêm dự án",
    current_session: "Phiên làm việc hiện tại",
    clip_word: "clip",
    status_idle: "Sẵn sàng",
    status_queued: "Đang chờ",
    status_processing: "Đang xuất",
    status_done: "Hoàn tất",
    status_error: "Có lỗi",
    status_changed: "Đã thay đổi",
    status_reordered: "Đã đổi thứ tự",
    status_batch_applied: "Đã áp dụng thiết lập chung",
    status_preparing: "Đang chuẩn bị…",
    status_ready_download: "Sẵn sàng tải xuống",
    status_failed: "Xử lý thất bại",
    status_stopped: "Đã dừng",
    status_loading_engine: "Đang tải bộ máy xử lý video…",
    status_joining: "Đang nối và hoàn thiện video…",
    status_speed_set: (speed) => `Đã đặt tốc độ ${speed}×`,
    status_aspect_set: (aspect) => `Đã đặt khung hình ${aspect}`,
    status_processing_clip: (current, total) => `Đang xử lý clip ${current}/${total}`,
    project_name_label: "TÊN DỰ ÁN",
    delete_project: "Xóa dự án",
    drop_title: "Thả video để bắt đầu",
    drop_desc: "Nạp nhiều clip, cắt đoạn cần dùng rồi sắp xếp để nối thành một video.",
    choose_videos: "Chọn video",
    drop_hint: (max) => `MP4, MOV, WebM, MKV · tối đa ${max} clip/dự án`,
    preview_badge: "XEM TRƯỚC",
    trim_title: "Cắt clip đang chọn",
    trim_start: "Bắt đầu",
    trim_end: "Kết thúc",
    seconds_unit: "giây",
    speed_label: "Tốc độ",
    trim_result: "Thành phẩm",
    timeline_hint: "Kéo thả hoặc dùng mũi tên để sắp xếp",
    add_clip: "Thêm clip",
    move_left: "Đưa clip sang trái",
    move_right: "Đưa clip sang phải",
    remove_clip: "Xóa clip",
    batch_heading: "THIẾT LẬP HÀNG LOẠT",
    batch_sub: "Áp dụng cho mọi dự án",
    batch_speed_label: "Tốc độ chung",
    speed_original: "GỐC",
    speed_slow: "CHẬM",
    speed_fast: "NHANH",
    aspect_label: "Tỉ lệ khung hình",
    aspect_916: "9:16 — Dọc (mặc định)",
    aspect_169: "16:9 — Ngang",
    aspect_11: "1:1 — Vuông",
    quality_label: "Chất lượng",
    quality_720: "720p — Nhanh",
    quality_1080: "1080p — Đẹp",
    mute_label: "Tắt âm thanh",
    mute_sub: "Áp dụng cho toàn bộ clip",
    apply_all: "Áp dụng cho tất cả dự án",
    queue_heading: "HÀNG ĐỢI XUẤT",
    projects_word: "dự án",
    total_duration: "TỔNG THỜI LƯỢNG",
    total_size: "DUNG LƯỢNG GỐC",
    queue_empty: "Nạp video vào dự án để tạo hàng đợi.",
    download_prefix: "Tải",
    stop_processing: "Dừng xử lý",
    export_active: "Xuất dự án này",
    export_all: "Xuất tất cả",
    export_all_sub: (count) => `${count} dự án · xử lý tuần tự`,
    export_note: "Video không được tải lên máy chủ",
    toast_invalid_files: "Hãy chọn tệp video hợp lệ.",
    toast_max_clips: (max) => `Mỗi dự án hỗ trợ tối đa ${max} clip.`,
    toast_reading: (count) => `Đang đọc ${count} video…`,
    toast_read_failed: "Không thể đọc các video đã chọn.",
    toast_added: (count) => `Đã thêm ${count} video vào dự án.`,
    toast_max_projects: (max) => `Bạn có thể mở tối đa ${max} dự án cùng lúc.`,
    toast_keep_one_project: "Cần giữ lại ít nhất một dự án.",
    toast_batch_applied: (count) => `Đã áp dụng cho ${count} dự án.`,
    toast_speed_applied: (speed, count) => `Đã áp dụng tốc độ ${speed}× cho ${count} dự án.`,
    toast_aspect_applied: (aspect, count) => `Đã áp dụng khung hình ${aspect} cho ${count} dự án.`,
    toast_ffmpeg_network: "Không tải được bộ xử lý FFmpeg. Hãy kiểm tra kết nối mạng.",
    toast_no_clips_active: "Hãy nạp ít nhất một video trước khi xuất.",
    toast_no_projects: "Chưa có dự án nào chứa video.",
    toast_batch_done: (ok) => `Đã xử lý thành công ${ok} dự án.`,
    toast_batch_done_failed: (ok, failed) => `Hoàn tất: ${ok} thành công, ${failed} thất bại.`,
    toast_stopped: "Đã dừng hàng đợi xuất.",
    default_project_name: (num) => `Dự án ${num}`,
    extension_project_name: "Dự án từ Extension",
    cannot_process: "Không thể xử lý video.",
    cannot_read_file: (name) => `Không đọc được ${name}`,
  },
  en: {
    privacy_note: "Videos are processed in your browser",
    help_tooltip: "Drag videos into a project, adjust settings, then export",
    help_label: "Help",
    projects_heading: "PROJECTS",
    add_project: "Add project",
    current_session: "Current session",
    clip_word: "clips",
    status_idle: "Ready",
    status_queued: "Queued",
    status_processing: "Exporting",
    status_done: "Done",
    status_error: "Error",
    status_changed: "Changed",
    status_reordered: "Reordered",
    status_batch_applied: "Batch settings applied",
    status_preparing: "Preparing…",
    status_ready_download: "Ready to download",
    status_failed: "Processing failed",
    status_stopped: "Stopped",
    status_loading_engine: "Loading video engine…",
    status_joining: "Joining and finalizing video…",
    status_speed_set: (speed) => `Speed set to ${speed}×`,
    status_aspect_set: (aspect) => `Aspect set to ${aspect}`,
    status_processing_clip: (current, total) => `Processing clip ${current}/${total}`,
    project_name_label: "PROJECT NAME",
    delete_project: "Delete project",
    drop_title: "Drop videos to start",
    drop_desc: "Load multiple clips, trim what you need, then arrange them into one video.",
    choose_videos: "Choose videos",
    drop_hint: (max) => `MP4, MOV, WebM, MKV · up to ${max} clips/project`,
    preview_badge: "PREVIEW",
    trim_title: "Trim selected clip",
    trim_start: "Start",
    trim_end: "End",
    seconds_unit: "sec",
    speed_label: "Speed",
    trim_result: "Result",
    timeline_hint: "Drag & drop or use arrows to reorder",
    add_clip: "Add clip",
    move_left: "Move clip left",
    move_right: "Move clip right",
    remove_clip: "Remove clip",
    batch_heading: "BATCH SETTINGS",
    batch_sub: "Apply to all projects",
    batch_speed_label: "Global speed",
    speed_original: "ORIGINAL",
    speed_slow: "SLOW",
    speed_fast: "FAST",
    aspect_label: "Aspect ratio",
    aspect_916: "9:16 — Portrait (default)",
    aspect_169: "16:9 — Landscape",
    aspect_11: "1:1 — Square",
    quality_label: "Quality",
    quality_720: "720p — Fast",
    quality_1080: "1080p — Best",
    mute_label: "Mute audio",
    mute_sub: "Applies to all clips",
    apply_all: "Apply to all projects",
    queue_heading: "EXPORT QUEUE",
    projects_word: "projects",
    total_duration: "TOTAL DURATION",
    total_size: "SOURCE SIZE",
    queue_empty: "Load videos into a project to build the queue.",
    download_prefix: "Download",
    stop_processing: "Stop processing",
    export_active: "Export this project",
    export_all: "Export all",
    export_all_sub: (count) => `${count} projects · sequential`,
    export_note: "Videos are never uploaded to a server",
    toast_invalid_files: "Please choose valid video files.",
    toast_max_clips: (max) => `Each project supports up to ${max} clips.`,
    toast_reading: (count) => `Reading ${count} videos…`,
    toast_read_failed: "Could not read the selected videos.",
    toast_added: (count) => `Added ${count} videos to the project.`,
    toast_max_projects: (max) => `You can open up to ${max} projects at once.`,
    toast_keep_one_project: "At least one project must remain.",
    toast_batch_applied: (count) => `Applied to ${count} projects.`,
    toast_speed_applied: (speed, count) => `Applied ${speed}× speed to ${count} projects.`,
    toast_aspect_applied: (aspect, count) => `Applied ${aspect} aspect to ${count} projects.`,
    toast_ffmpeg_network: "Could not load the FFmpeg engine. Check your connection.",
    toast_no_clips_active: "Load at least one video before exporting.",
    toast_no_projects: "No project contains videos yet.",
    toast_batch_done: (ok) => `Successfully processed ${ok} projects.`,
    toast_batch_done_failed: (ok, failed) => `Finished: ${ok} succeeded, ${failed} failed.`,
    toast_stopped: "Export queue stopped.",
    default_project_name: (num) => `Project ${num}`,
    extension_project_name: "Project from Extension",
    cannot_process: "Could not process the video.",
    cannot_read_file: (name) => `Could not read ${name}`,
  },
  fr: {
    privacy_note: "Les vidéos sont traitées dans votre navigateur",
    help_tooltip: "Glissez des vidéos dans un projet, réglez les paramètres puis exportez",
    help_label: "Aide",
    projects_heading: "PROJETS",
    add_project: "Ajouter un projet",
    current_session: "Session actuelle",
    clip_word: "clips",
    status_idle: "Prêt",
    status_queued: "En attente",
    status_processing: "Export en cours",
    status_done: "Terminé",
    status_error: "Erreur",
    status_changed: "Modifié",
    status_reordered: "Réordonné",
    status_batch_applied: "Réglages groupés appliqués",
    status_preparing: "Préparation…",
    status_ready_download: "Prêt à télécharger",
    status_failed: "Échec du traitement",
    status_stopped: "Arrêté",
    status_loading_engine: "Chargement du moteur vidéo…",
    status_joining: "Assemblage et finalisation…",
    status_speed_set: (speed) => `Vitesse réglée à ${speed}×`,
    status_aspect_set: (aspect) => `Format réglé à ${aspect}`,
    status_processing_clip: (current, total) => `Traitement du clip ${current}/${total}`,
    project_name_label: "NOM DU PROJET",
    delete_project: "Supprimer le projet",
    drop_title: "Déposez des vidéos pour commencer",
    drop_desc: "Chargez plusieurs clips, coupez ce qu'il faut, puis arrangez-les en une seule vidéo.",
    choose_videos: "Choisir des vidéos",
    drop_hint: (max) => `MP4, MOV, WebM, MKV · jusqu'à ${max} clips/projet`,
    preview_badge: "APERÇU",
    trim_title: "Couper le clip sélectionné",
    trim_start: "Début",
    trim_end: "Fin",
    seconds_unit: "sec",
    speed_label: "Vitesse",
    trim_result: "Résultat",
    timeline_hint: "Glissez-déposez ou utilisez les flèches pour réordonner",
    add_clip: "Ajouter un clip",
    move_left: "Déplacer à gauche",
    move_right: "Déplacer à droite",
    remove_clip: "Retirer le clip",
    batch_heading: "RÉGLAGES GROUPÉS",
    batch_sub: "Appliquer à tous les projets",
    batch_speed_label: "Vitesse globale",
    speed_original: "ORIGINAL",
    speed_slow: "LENT",
    speed_fast: "RAPIDE",
    aspect_label: "Format d'image",
    aspect_916: "9:16 — Vertical (défaut)",
    aspect_169: "16:9 — Horizontal",
    aspect_11: "1:1 — Carré",
    quality_label: "Qualité",
    quality_720: "720p — Rapide",
    quality_1080: "1080p — Optimal",
    mute_label: "Couper le son",
    mute_sub: "S'applique à tous les clips",
    apply_all: "Appliquer à tous les projets",
    queue_heading: "FILE D'EXPORT",
    projects_word: "projets",
    total_duration: "DURÉE TOTALE",
    total_size: "TAILLE SOURCE",
    queue_empty: "Chargez des vidéos dans un projet pour créer la file.",
    download_prefix: "Télécharger",
    stop_processing: "Arrêter le traitement",
    export_active: "Exporter ce projet",
    export_all: "Tout exporter",
    export_all_sub: (count) => `${count} projets · séquentiel`,
    export_note: "Les vidéos ne sont jamais envoyées à un serveur",
    toast_invalid_files: "Veuillez choisir des fichiers vidéo valides.",
    toast_max_clips: (max) => `Chaque projet accepte jusqu'à ${max} clips.`,
    toast_reading: (count) => `Lecture de ${count} vidéos…`,
    toast_read_failed: "Impossible de lire les vidéos sélectionnées.",
    toast_added: (count) => `${count} vidéos ajoutées au projet.`,
    toast_max_projects: (max) => `Vous pouvez ouvrir jusqu'à ${max} projets à la fois.`,
    toast_keep_one_project: "Au moins un projet doit rester.",
    toast_batch_applied: (count) => `Appliqué à ${count} projets.`,
    toast_speed_applied: (speed, count) => `Vitesse ${speed}× appliquée à ${count} projets.`,
    toast_aspect_applied: (aspect, count) => `Format ${aspect} appliqué à ${count} projets.`,
    toast_ffmpeg_network: "Impossible de charger FFmpeg. Vérifiez votre connexion.",
    toast_no_clips_active: "Chargez au moins une vidéo avant d'exporter.",
    toast_no_projects: "Aucun projet ne contient de vidéos.",
    toast_batch_done: (ok) => `${ok} projets traités avec succès.`,
    toast_batch_done_failed: (ok, failed) => `Terminé : ${ok} réussis, ${failed} échoués.`,
    toast_stopped: "File d'export arrêtée.",
    default_project_name: (num) => `Projet ${num}`,
    extension_project_name: "Projet depuis l'extension",
    cannot_process: "Impossible de traiter la vidéo.",
    cannot_read_file: (name) => `Impossible de lire ${name}`,
  },
  zh: {
    privacy_note: "视频在您的浏览器中处理",
    help_tooltip: "将视频拖入项目，调整参数后导出",
    help_label: "帮助",
    projects_heading: "项目",
    add_project: "添加项目",
    current_session: "当前会话",
    clip_word: "个片段",
    status_idle: "就绪",
    status_queued: "排队中",
    status_processing: "导出中",
    status_done: "已完成",
    status_error: "出错",
    status_changed: "已更改",
    status_reordered: "已调整顺序",
    status_batch_applied: "已应用批量设置",
    status_preparing: "准备中…",
    status_ready_download: "可以下载",
    status_failed: "处理失败",
    status_stopped: "已停止",
    status_loading_engine: "正在加载视频引擎…",
    status_joining: "正在拼接并完成视频…",
    status_speed_set: (speed) => `速度已设为 ${speed}×`,
    status_aspect_set: (aspect) => `画幅已设为 ${aspect}`,
    status_processing_clip: (current, total) => `正在处理片段 ${current}/${total}`,
    project_name_label: "项目名称",
    delete_project: "删除项目",
    drop_title: "拖入视频开始",
    drop_desc: "加载多个片段，剪出所需部分，再排列拼接成一个视频。",
    choose_videos: "选择视频",
    drop_hint: (max) => `MP4、MOV、WebM、MKV · 每个项目最多 ${max} 个片段`,
    preview_badge: "预览",
    trim_title: "剪辑所选片段",
    trim_start: "开始",
    trim_end: "结束",
    seconds_unit: "秒",
    speed_label: "速度",
    trim_result: "成品",
    timeline_hint: "拖放或使用箭头调整顺序",
    add_clip: "添加片段",
    move_left: "向左移动",
    move_right: "向右移动",
    remove_clip: "移除片段",
    batch_heading: "批量设置",
    batch_sub: "应用到所有项目",
    batch_speed_label: "全局速度",
    speed_original: "原速",
    speed_slow: "慢速",
    speed_fast: "快速",
    aspect_label: "画幅比例",
    aspect_916: "9:16 — 竖屏（默认）",
    aspect_169: "16:9 — 横屏",
    aspect_11: "1:1 — 方形",
    quality_label: "质量",
    quality_720: "720p — 快速",
    quality_1080: "1080p — 高清",
    mute_label: "静音",
    mute_sub: "应用到所有片段",
    apply_all: "应用到所有项目",
    queue_heading: "导出队列",
    projects_word: "个项目",
    total_duration: "总时长",
    total_size: "源文件大小",
    queue_empty: "将视频加载到项目中以创建队列。",
    download_prefix: "下载",
    stop_processing: "停止处理",
    export_active: "导出此项目",
    export_all: "全部导出",
    export_all_sub: (count) => `${count} 个项目 · 依次处理`,
    export_note: "视频不会上传到服务器",
    toast_invalid_files: "请选择有效的视频文件。",
    toast_max_clips: (max) => `每个项目最多支持 ${max} 个片段。`,
    toast_reading: (count) => `正在读取 ${count} 个视频…`,
    toast_read_failed: "无法读取所选视频。",
    toast_added: (count) => `已向项目添加 ${count} 个视频。`,
    toast_max_projects: (max) => `最多可同时打开 ${max} 个项目。`,
    toast_keep_one_project: "至少需保留一个项目。",
    toast_batch_applied: (count) => `已应用到 ${count} 个项目。`,
    toast_speed_applied: (speed, count) => `已将 ${speed}× 速度应用到 ${count} 个项目。`,
    toast_aspect_applied: (aspect, count) => `已将 ${aspect} 画幅应用到 ${count} 个项目。`,
    toast_ffmpeg_network: "无法加载 FFmpeg 引擎，请检查网络连接。",
    toast_no_clips_active: "导出前请至少加载一个视频。",
    toast_no_projects: "还没有包含视频的项目。",
    toast_batch_done: (ok) => `已成功处理 ${ok} 个项目。`,
    toast_batch_done_failed: (ok, failed) => `完成：${ok} 个成功，${failed} 个失败。`,
    toast_stopped: "已停止导出队列。",
    default_project_name: (num) => `项目 ${num}`,
    extension_project_name: "来自扩展的项目",
    cannot_process: "无法处理视频。",
    cannot_read_file: (name) => `无法读取 ${name}`,
  },
};

// Dịch statusText đang lưu trong state (nội bộ luôn là tiếng Việt) sang ngôn
// ngữ hiển thị — nhờ đó đổi ngôn ngữ là status đang hiện cũng đổi theo ngay.
const STATUS_EXACT: Record<string, keyof Messages> = {
  "Sẵn sàng": "status_idle",
  "Đang chờ": "status_queued",
  "Hoàn tất": "status_done",
  "Có lỗi": "status_error",
  "Đã thay đổi": "status_changed",
  "Đã đổi thứ tự": "status_reordered",
  "Đã áp dụng thiết lập chung": "status_batch_applied",
  "Đang chuẩn bị…": "status_preparing",
  "Sẵn sàng tải xuống": "status_ready_download",
  "Xử lý thất bại": "status_failed",
  "Đã dừng": "status_stopped",
  "Đang tải bộ máy xử lý video…": "status_loading_engine",
  "Đang nối và hoàn thiện video…": "status_joining",
};

export function translateStatus(text: string, lang: Lang): string {
  if (!text) return text;
  const t = MESSAGES[lang];
  const exact = STATUS_EXACT[text];
  if (exact) return t[exact] as string;
  let match = text.match(/^Đang xử lý clip (\d+)\/(\d+)$/);
  if (match) return t.status_processing_clip(match[1], match[2]);
  match = text.match(/^Đã đặt tốc độ (.+)×$/);
  if (match) return t.status_speed_set(match[1]);
  match = text.match(/^Đã đặt khung hình (.+)$/);
  if (match) return t.status_aspect_set(match[1]);
  return text;
}
