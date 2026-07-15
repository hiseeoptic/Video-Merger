# Cutflow Video Studio

Cutflow là web app cắt, nối và thay đổi tốc độ video hàng loạt. Bản MVP xử lý video ngay trong trình duyệt bằng FFmpeg WebAssembly, nên video gốc không được tải lên máy chủ.

## Chức năng hiện có

- Mở tối đa 5 dự án cùng lúc, tối đa 12 clip mỗi dự án.
- Nạp nhiều video bằng hộp chọn tệp hoặc kéo thả.
- Cắt đầu/cuối từng clip theo giây.
- Đổi tốc độ từng clip từ 0.5× đến 4×.
- Sắp xếp thứ tự clip để nối thành một video.
- Áp dụng tốc độ, tỉ lệ, chất lượng và thiết lập âm thanh cho toàn bộ dự án.
- Xử lý nhiều dự án tuần tự để tránh quá tải bộ nhớ trình duyệt.
- Xuất MP4 H.264 ở 720p hoặc 1080p.
- Bridge `window.postMessage` dành cho Chrome extension.

## Chạy trên máy

Yêu cầu Node.js 22 trở lên.

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`.

Kiểm tra bản production:

```bash
npm run lint
npm run build
```

## Đưa lên GitHub và Vercel

1. Tạo repository GitHub và push toàn bộ thư mục này.
2. Trong Vercel chọn **Add New → Project** rồi import repository.
3. Framework được nhận diện là **Next.js**; giữ nguyên Build Command `npm run build`.
4. Nếu dùng domain chính thức, đặt biến môi trường `NEXT_PUBLIC_SITE_URL=https://ten-mien-cua-ban`.
5. Mỗi lần push lên nhánh chính, Vercel sẽ tự động triển khai phiên bản mới.

FFmpeg core được tải từ jsDelivr khi người dùng xuất video lần đầu. Nếu muốn vận hành hoàn toàn độc lập, có thể đưa hai tệp core vào `public/ffmpeg` ở giai đoạn production.

## Bridge cho Chrome Extension

Extension/content script tạo dự án bằng cách gửi:

```js
window.postMessage(
  {
    source: "CUTFLOW_EXTENSION",
    type: "CREATE_PROJECT",
    name: "Video từ Extension",
    files: [file1, file2],
  },
  window.location.origin,
);
```

Web app phản hồi các sự kiện:

- `CUTFLOW_WEB / PROJECT_ACCEPTED`
- `CUTFLOW_WEB / PROJECT_REJECTED`
- `CUTFLOW_WEB / PROJECT_COMPLETE`

Khi triển khai extension thật, content script nên xác thực `event.origin`, `event.source` và giới hạn domain Cutflow được phép kết nối.

## Giới hạn của bản MVP

- Tốc độ xử lý phụ thuộc CPU/RAM của máy người dùng.
- Không nên đóng tab trong khi đang xuất video.
- Dự án và tệp video chỉ tồn tại trong phiên trình duyệt hiện tại.
- Video rất lớn hoặc 4K nên được chuyển sang worker FFmpeg trên Cloud Run/Railway trong giai đoạn cloud processing.
