# GAMEREXI — Luật làm việc với agent

## 1. Mục tiêu và nền tảng

- Game **Cánh Đồng**, chơi chính bằng `game.html`.
- Chạy trực tiếp trên web desktop/mobile; đóng gói PWA để cài trên Android, iOS và desktop.
- Nếu cần shell native, ưu tiên **Tauri/Rust** dùng lại frontend hiện có. Không tạo shell Electron mới.
- Game phải hoạt động offline; mọi asset runtime phải được nhúng hoặc cache đúng cơ chế.

## 2. Ngôn ngữ và công nghệ

- Three.js/JavaScript cho renderer, input và UI hiện có.
- **Backend mới ưu tiên Rust** (Axum/Tauri command); không tạo backend nếu tính năng offline không cần.
- Python chỉ dùng cho build/tooling, không đưa vào runtime game.
- Comment trong code dùng **tiếng Việt**, giữ thuật ngữ chuyên ngành/định danh API bằng English khi cần.
- Text người chơi mặc định tiếng Việt; chuẩn bị tách chuỗi để thêm English, không hardcode ngôn ngữ vào logic.

## 3. Tổ chức file bắt buộc

- Không chất thêm tính năng lớn vào file cũ. Mỗi hệ thống mới nằm trong module riêng:
  - `src/core/`: renderer, scene, terrain và world runtime.
  - `src/game/region-model.js`: biome/height/color dùng chung, deterministic.
  - `src/game/`: player, quest, underwater, cave, minimap và gameplay systems.
  - `src/shells/`: HTML/CSS/service-worker templates.
  - `src/platform/`: PWA/native bridge khi cần.
  - `tools/probes/`: kiểm thử headless thật.
- Mỗi module có đầu vào/đầu ra rõ ràng; không dùng biến global mới nếu có thể truyền qua context.
- `__hillY(x,z)` chỉ garden-local; `__hillYWorld(x,z)` nhận world-space. Không trộn hai hệ tọa độ.
- `game.html`, `index.html`, `invite.html`, `done.html`, `sw.js` là output build, **cấm sửa tay**.
- File text luôn UTF-8 không BOM; tiếng Việt phải hiển thị đúng dấu.

## 4. Build và kiểm thử

- Sửa source rồi chạy `python build.py`; không chỉnh trực tiếp output.
- Thay đổi gameplay phải có probe phù hợp: input thật, progression, collision, mobile và ảnh active-play.
- Không tin FPS SwiftShader để kết luận hiệu năng GPU thật; phải ghi rõ backend khi đo.
- Sau thay đổi UI phải reload tab Opera liên quan và verify bản mới bằng DOM/render thật.
- Không commit khi còn U+FFFD, mojibake, lỗi runtime hoặc probe liên quan chưa pass.

## 5. Quy tắc gameplay/đồ họa

- Không bãi trống lặp ngẫu nhiên vô tận; vùng chơi phải có biome, landmark, lộ trình và mục tiêu rõ ràng.
- Physics dùng dynamic body thật (cannon-es/Rapier), collider tách visual và đăng ký/dọn theo lifecycle chunk.
- Không vá lệch tọa độ bằng `hillY2`/`ell` tự tính; sửa nguồn dùng chung.
- Asset sinh vật ưu tiên GLB/FBX rig và material thật; procedural chỉ dùng cho terrain, prop kit, VFX phù hợp.
- **Cấm dùng khối primitive/placeholder để thay cây, cỏ, hoa, sinh vật hoặc công trình rồi giao như bản hoàn thiện.** Thiếu asset phải tự nghiên cứu và tải model/texture phù hợp từ thư viện mở (Poly Haven, Sketchfab có giấy phép, Poly Pizza, Quaternius/Kenney khi phù hợp), ghi nguồn + license vào `assets/ASSET-SOURCES.md`, rồi mới tích hợp. Không hỏi lại user những gì có thể tự tìm.
- Model phải có hình dáng/material chi tiết phù hợp cận cảnh; cây có tán lá thật, sinh vật có rig/texture, công trình có cấu trúc và vân bề mặt. Nếu asset không đạt thì thay asset, không che bằng glow hay billboard khối.
- Mọi biome phải khác cao độ, vật liệu, vegetation, landmark và ít nhất một điểm tương tác.

## 6. Kế hoạch triển khai từ bundle

- Nguồn kế hoạch cần đọc và triển khai: `D:/Downloads_Moi/CanhDong_Master_Spec_Consolidated_Draft_2026-11-20.zip`.
- Bổ sung closure/QA: `D:/Downloads_Moi/CanhDong_Game_Project_Closure_Work_and_QA_Update_2026-11-20.zip`; đã lưu giải nén tại `docs/closure-2026-11-20/`.
- Đây là bản kế hoạch cho dev, không phải source game hoàn chỉnh. Làm theo vertical slice: web-first, biome có identity, quest/camera/input/save/mobile thật, rồi mới mở rộng.
- **Khi hoàn thành toàn bộ phần phù hợp của kế hoạch này, tự xóa mục này khỏi `AGENTS.md`** để tránh giữ lại việc đã xong.

## 7. Bản đồ dự án, bảo mật, dữ liệu

- Thêm/sửa/xóa file, route hoặc hệ thống phải cập nhật bản đồ bằng script trong cùng lượt; không sửa tay output map.
- Trước khi xong phải audit SEO/PWA, secret/XSS/quyền API và backup dữ liệu nếu có.
- Không lưu API key/token trong source, manifest, service worker hoặc output build.
- Push đúng repo `th-ming3/GAMEREXI`, PAT chỉ đưa thẳng vào URL lúc push, không lưu vào git config.
