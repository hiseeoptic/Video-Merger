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
  status_saved: (name: string) => string;
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
  smart_crop_title: string;
  smart_crop_subtitle: string;
  smart_crop_hint: string;
  smart_crop_corner_label: string;
  smart_crop_amount: string;
  smart_crop_apply_all: string;
  blur_title: string;
  blur_subtitle: string;
  blur_drag_hint: string;
  blur_region_label: string;
  blur_position_label: string;
  blur_top_left: string;
  blur_top_right: string;
  blur_bottom_left: string;
  blur_bottom_right: string;
  blur_width: string;
  blur_height: string;
  blur_strength: string;
  blur_apply_all: string;
  output_filename_label: string;
  output_filename_placeholder: string;
  choose_folder: string;
  change_folder: string;
  reconnect_folder: string;
  open_standalone: string;
  folder_default: string;
  folder_restoring: string;
  folder_selected: (name: string) => string;
  folder_needs_permission: (name: string) => string;
  folder_blocked: string;
  folder_unsupported: string;
  saved_file: (name: string) => string;
  queue_heading: string;
  projects_word: string;
  total_duration: string;
  total_size: string;
  queue_empty: string;
  download_prefix: string;
  download_again: string;
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
  toast_smart_crop_applied: (count: number) => string;
  toast_blur_applied: (count: number) => string;
  toast_folder_unsupported: string;
  toast_folder_selected: (name: string) => string;
  toast_folder_failed: string;
  toast_folder_blocked: string;
  toast_folder_permission_denied: string;
  toast_saved_to_folder: (name: string) => string;
  toast_save_failed: string;
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
    status_saved: (name) => `Đã lưu ${name}`,
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
    smart_crop_title: "Cắt mép thông minh",
    smart_crop_subtitle: "Cắt nhẹ góc và phóng kín khung, không viền đen",
    smart_crop_hint: "Chọn góc cần loại bỏ. Mức 4% thường đủ tự nhiên; tăng dần nếu vùng ở mép còn xuất hiện.",
    smart_crop_corner_label: "Góc cần cắt",
    smart_crop_amount: "Mức cắt hai mép",
    smart_crop_apply_all: "Áp dụng Smart Crop cho tất cả dự án",
    blur_title: "Làm mờ vùng cố định",
    blur_subtitle: "Dùng cho nội dung bạn có quyền chỉnh sửa",
    blur_drag_hint: "Kéo vùng mờ trên preview; kéo nút ở góc để đổi kích thước.",
    blur_region_label: "VÙNG MỜ",
    blur_position_label: "Vị trí vùng mờ",
    blur_top_left: "Góc trên trái",
    blur_top_right: "Góc trên phải",
    blur_bottom_left: "Góc dưới trái",
    blur_bottom_right: "Góc dưới phải",
    blur_width: "Chiều rộng",
    blur_height: "Chiều cao",
    blur_strength: "Độ mờ",
    blur_apply_all: "Áp dụng vùng mờ cho tất cả dự án",
    output_filename_label: "TÊN FILE XUẤT",
    output_filename_placeholder: "Nhập tên video",
    choose_folder: "Chọn thư mục lưu",
    change_folder: "Đổi thư mục lưu",
    reconnect_folder: "Kết nối lại thư mục",
    open_standalone: "Mở app riêng để kết nối",
    folder_default: "Chưa chọn · sẽ tải về thư mục mặc định",
    folder_restoring: "Đang kiểm tra kết nối thư mục…",
    folder_selected: (name) => `Tự động lưu vào: ${name}`,
    folder_needs_permission: (name) => `${name} · cần cấp lại quyền ghi`,
    folder_blocked: "Khung extension bị Chrome chặn truy cập thư mục. Hãy mở app ở tab riêng.",
    folder_unsupported: "Trình duyệt này chưa hỗ trợ chọn thư mục",
    saved_file: (name) => `Đã lưu ${name}`,
    queue_heading: "HÀNG ĐỢI XUẤT",
    projects_word: "dự án",
    total_duration: "TỔNG THỜI LƯỢNG",
    total_size: "DUNG LƯỢNG GỐC",
    queue_empty: "Nạp video vào dự án để tạo hàng đợi.",
    download_prefix: "Tải",
    download_again: "Tải lại",
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
    toast_smart_crop_applied: (count) => `Đã áp dụng Smart Crop cho ${count} dự án.`,
    toast_blur_applied: (count) => `Đã áp dụng vùng mờ cho ${count} dự án.`,
    toast_folder_unsupported: "Trình duyệt này chưa hỗ trợ chọn thư mục. Video vẫn có thể tải theo cách thông thường.",
    toast_folder_selected: (name) => `Đã chọn thư mục ${name}. Video xuất sẽ tự động lưu tại đây.`,
    toast_folder_failed: "Không thể mở thư mục đã chọn.",
    toast_folder_blocked: "Chrome không cho iframe của extension mở thư mục máy tính. Hãy bấm Mở app riêng để kết nối.",
    toast_folder_permission_denied: "Thư mục chưa được cấp quyền ghi. Hãy bấm Kết nối lại thư mục.",
    toast_saved_to_folder: (name) => `Đã lưu ${name} vào thư mục bạn chọn.`,
    toast_save_failed: "Video đã xử lý xong nhưng không thể ghi vào thư mục. Bạn vẫn có thể dùng nút tải xuống.",
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
    status_saved: (name) => `Saved ${name}`,
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
    smart_crop_title: "Smart edge crop",
    smart_crop_subtitle: "Trim a corner and fill the frame without black bars",
    smart_crop_hint: "Choose the corner to remove. Start at 4% and increase only if the edge area remains visible.",
    smart_crop_corner_label: "Corner to crop",
    smart_crop_amount: "Two-edge crop amount",
    smart_crop_apply_all: "Apply Smart Crop to all projects",
    blur_title: "Blur a fixed region",
    blur_subtitle: "For content you have permission to edit",
    blur_drag_hint: "Drag the blur region on the preview; drag its corner to resize.",
    blur_region_label: "BLUR",
    blur_position_label: "Blur position",
    blur_top_left: "Top left",
    blur_top_right: "Top right",
    blur_bottom_left: "Bottom left",
    blur_bottom_right: "Bottom right",
    blur_width: "Width",
    blur_height: "Height",
    blur_strength: "Blur strength",
    blur_apply_all: "Apply blur region to all projects",
    output_filename_label: "OUTPUT FILE NAME",
    output_filename_placeholder: "Enter video name",
    choose_folder: "Choose save folder",
    change_folder: "Change save folder",
    reconnect_folder: "Reconnect folder",
    open_standalone: "Open app to connect",
    folder_default: "Not selected · downloads use the browser default",
    folder_restoring: "Checking folder connection…",
    folder_selected: (name) => `Auto-save to: ${name}`,
    folder_needs_permission: (name) => `${name} · write access required`,
    folder_blocked: "Chrome blocks folder access inside the extension frame. Open the app in its own tab.",
    folder_unsupported: "Folder selection is not supported in this browser",
    saved_file: (name) => `Saved ${name}`,
    queue_heading: "EXPORT QUEUE",
    projects_word: "projects",
    total_duration: "TOTAL DURATION",
    total_size: "SOURCE SIZE",
    queue_empty: "Load videos into a project to build the queue.",
    download_prefix: "Download",
    download_again: "Download again",
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
    toast_smart_crop_applied: (count) => `Applied Smart Crop to ${count} projects.`,
    toast_blur_applied: (count) => `Applied the blur region to ${count} projects.`,
    toast_folder_unsupported: "This browser cannot choose a save folder. You can still use normal downloads.",
    toast_folder_selected: (name) => `Selected ${name}. Exported videos will be saved there automatically.`,
    toast_folder_failed: "Could not open the selected folder.",
    toast_folder_blocked: "Chrome does not allow an extension iframe to open computer folders. Open the app in its own tab to connect.",
    toast_folder_permission_denied: "Write access has not been granted. Reconnect the folder.",
    toast_saved_to_folder: (name) => `Saved ${name} to your selected folder.`,
    toast_save_failed: "The video finished processing but could not be written to the folder. Use the download button instead.",
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
    status_saved: (name) => `${name} enregistré`,
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
    smart_crop_title: "Recadrage intelligent des bords",
    smart_crop_subtitle: "Couper légèrement un coin et remplir le cadre sans bandes noires",
    smart_crop_hint: "Choisissez le coin à retirer. Commencez à 4 % et augmentez seulement si la zone reste visible.",
    smart_crop_corner_label: "Coin à recadrer",
    smart_crop_amount: "Recadrage des deux bords",
    smart_crop_apply_all: "Appliquer Smart Crop à tous les projets",
    blur_title: "Flouter une zone fixe",
    blur_subtitle: "Pour les contenus que vous êtes autorisé à modifier",
    blur_drag_hint: "Déplacez la zone sur l'aperçu ; tirez son coin pour la redimensionner.",
    blur_region_label: "FLOU",
    blur_position_label: "Position de la zone floutée",
    blur_top_left: "En haut à gauche",
    blur_top_right: "En haut à droite",
    blur_bottom_left: "En bas à gauche",
    blur_bottom_right: "En bas à droite",
    blur_width: "Largeur",
    blur_height: "Hauteur",
    blur_strength: "Intensité du flou",
    blur_apply_all: "Appliquer la zone floutée à tous les projets",
    output_filename_label: "NOM DU FICHIER DE SORTIE",
    output_filename_placeholder: "Nom de la vidéo",
    choose_folder: "Choisir le dossier",
    change_folder: "Changer de dossier",
    reconnect_folder: "Reconnecter le dossier",
    open_standalone: "Ouvrir l'app pour connecter",
    folder_default: "Non sélectionné · téléchargement par défaut",
    folder_restoring: "Vérification de la connexion au dossier…",
    folder_selected: (name) => `Enregistrement automatique dans : ${name}`,
    folder_needs_permission: (name) => `${name} · autorisation d'écriture requise`,
    folder_blocked: "Chrome bloque l'accès aux dossiers dans l'iframe de l'extension. Ouvrez l'app dans un onglet séparé.",
    folder_unsupported: "La sélection de dossier n'est pas prise en charge",
    saved_file: (name) => `${name} enregistré`,
    queue_heading: "FILE D'EXPORT",
    projects_word: "projets",
    total_duration: "DURÉE TOTALE",
    total_size: "TAILLE SOURCE",
    queue_empty: "Chargez des vidéos dans un projet pour créer la file.",
    download_prefix: "Télécharger",
    download_again: "Retélécharger",
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
    toast_smart_crop_applied: (count) => `Smart Crop appliqué à ${count} projets.`,
    toast_blur_applied: (count) => `Zone floutée appliquée à ${count} projets.`,
    toast_folder_unsupported: "Ce navigateur ne permet pas de choisir un dossier. Le téléchargement normal reste disponible.",
    toast_folder_selected: (name) => `Dossier ${name} sélectionné. Les vidéos y seront enregistrées automatiquement.`,
    toast_folder_failed: "Impossible d'ouvrir le dossier sélectionné.",
    toast_folder_blocked: "Chrome interdit à l'iframe de l'extension d'ouvrir les dossiers. Ouvrez l'app dans un onglet séparé.",
    toast_folder_permission_denied: "L'autorisation d'écriture n'est pas accordée. Reconnectez le dossier.",
    toast_saved_to_folder: (name) => `${name} a été enregistré dans le dossier sélectionné.`,
    toast_save_failed: "La vidéo est prête, mais l'écriture dans le dossier a échoué. Utilisez le bouton de téléchargement.",
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
    status_saved: (name) => `已保存 ${name}`,
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
    smart_crop_title: "智能边缘裁剪",
    smart_crop_subtitle: "轻微裁剪角落并填满画面，不产生黑边",
    smart_crop_hint: "选择要移除的角落。建议从 4% 开始，仅在边缘区域仍可见时增加。",
    smart_crop_corner_label: "要裁剪的角落",
    smart_crop_amount: "双边裁剪比例",
    smart_crop_apply_all: "将智能裁剪应用到所有项目",
    blur_title: "模糊固定区域",
    blur_subtitle: "仅用于您有权编辑的内容",
    blur_drag_hint: "在预览中拖动模糊区域；拖动角点可调整大小。",
    blur_region_label: "模糊区域",
    blur_position_label: "模糊区域位置",
    blur_top_left: "左上角",
    blur_top_right: "右上角",
    blur_bottom_left: "左下角",
    blur_bottom_right: "右下角",
    blur_width: "宽度",
    blur_height: "高度",
    blur_strength: "模糊强度",
    blur_apply_all: "将模糊区域应用到所有项目",
    output_filename_label: "导出文件名",
    output_filename_placeholder: "输入视频名称",
    choose_folder: "选择保存文件夹",
    change_folder: "更改保存文件夹",
    reconnect_folder: "重新连接文件夹",
    open_standalone: "打开应用进行连接",
    folder_default: "未选择 · 使用浏览器默认下载位置",
    folder_restoring: "正在检查文件夹连接…",
    folder_selected: (name) => `自动保存到：${name}`,
    folder_needs_permission: (name) => `${name} · 需要写入权限`,
    folder_blocked: "Chrome 会阻止扩展 iframe 访问文件夹。请在独立标签页中打开应用。",
    folder_unsupported: "此浏览器不支持选择文件夹",
    saved_file: (name) => `已保存 ${name}`,
    queue_heading: "导出队列",
    projects_word: "个项目",
    total_duration: "总时长",
    total_size: "源文件大小",
    queue_empty: "将视频加载到项目中以创建队列。",
    download_prefix: "下载",
    download_again: "再次下载",
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
    toast_smart_crop_applied: (count) => `已将智能裁剪应用到 ${count} 个项目。`,
    toast_blur_applied: (count) => `已将模糊区域应用到 ${count} 个项目。`,
    toast_folder_unsupported: "此浏览器不支持选择保存文件夹，仍可使用普通下载。",
    toast_folder_selected: (name) => `已选择 ${name}，导出视频将自动保存到该文件夹。`,
    toast_folder_failed: "无法打开所选文件夹。",
    toast_folder_blocked: "Chrome 不允许扩展 iframe 打开电脑文件夹。请在独立标签页中打开应用进行连接。",
    toast_folder_permission_denied: "尚未授予写入权限，请重新连接文件夹。",
    toast_saved_to_folder: (name) => `已将 ${name} 保存到所选文件夹。`,
    toast_save_failed: "视频处理完成，但无法写入文件夹。请使用下载按钮。",
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
  match = text.match(/^Đã lưu (.+)$/);
  if (match) return t.status_saved(match[1]);
  match = text.match(/^Đã đặt tốc độ (.+)×$/);
  if (match) return t.status_speed_set(match[1]);
  match = text.match(/^Đã đặt khung hình (.+)$/);
  if (match) return t.status_aspect_set(match[1]);
  return text;
}
