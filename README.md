# Cánh Đồng — editable project handoff

Đây là project nguồn và các bản HTML đã build. **File chơi chính là `game.html`**; để sửa game, hãy sửa source trong `src/` rồi build lại. Không sửa trực tiếp `game.html` nếu muốn thay đổi còn lưu được sau lần build tiếp theo.

## Build

Chỉ cần Python 3; không cần npm để tạo các file HTML:

```bash
python3 build.py
```

Lệnh tạo/cập nhật `game.html`, `invite.html`, `index.html` và `done.html` ở thư mục gốc. `index.html` và `done.html` hiện là bản thiệp, không phải game.

## Thư mục chính

- `src/core/world.js` — cảnh Three.js chung: địa hình, hồ, cỏ, hoa, cây, sinh vật và chu kỳ ngày/đêm.
- `src/game/player-quest.js` — nhân vật game, điều khiển, camera và nhiệm vụ.
- `src/shells/game.html`, `src/shells/invite.html` — HTML/CSS khung giao diện.
- `assets/` — model, texture và manifest texture dùng lúc build; giữ nguyên đường dẫn tương đối.
- `tools/probes/` — các script kiểm tra/render headless; một số probe cũ có thể dùng cho thử nghiệm riêng.
- `docs/` — ghi chú và tài liệu bổ sung.
- `build.py` — ghép source và nhúng asset để tạo HTML tự chứa.

## Kiểm tra nhanh

```bash
python3 build.py
node tools/probes/shot-lake-from-spawn.js
node tools/probes/verify-night-fireflies.js
node tools/probes/test-garden-changes.js
```

Các probe cần `puppeteer-core` và Chromium; có thể cài dependency bằng `npm ci`. Những probe này là kiểm tra kỹ thuật/headless, không thay thế việc tự xem hình ảnh trong browser mục tiêu.

## Ghi chú bàn giao

- Mọi asset build đang được nhúng vào HTML để game có thể chạy độc lập, kể cả trong preview không có network.
- Phần chỉnh sửa mới nhất nằm trong source, và `game.html` trong gói là bản build mới nhất tại thời điểm đóng gói.
- Một số ảnh kiểm tra gần nhất nằm trong `shots/`; ảnh tham khảo người dùng gửi nằm trong `uploads/`. Chúng không cần để build. Thư mục cache, ảnh tìm kiếm thử nghiệm không dùng và `node_modules/` cài sẵn không được đóng gói; dependency của probe có thể cài lại bằng `npm ci`.
