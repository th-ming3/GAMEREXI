# AGENTS.md — GAMEREXI (game Cánh Đồng)

> Rules RIÊNG của dự án này. Rules toàn cục nằm ở `C:\Users\84916\.config\opencode\AGENTS.md` (vẫn áp dụng). File này nằm trong repo, tự nạp theo cwd `D:\GAMEREXI`.

## 0. LUẬT SẮT — TEST CHỈ TRÊN CLOUD, CẤM LOCAL (user lệnh cứng 26/11/2026)
- **MỌI test/verify game BẮT BUỘC chạy trên link cloud**: https://th-ming3.github.io/GAMEREXI/ (root = game) hoặc https://th-ming3.github.io/GAMEREXI/game.html.
- **CẤM TUYỆT ĐỐI** chạy local để test: không `python -m http.server`, không Playwright trỏ `127.0.0.1`/`localhost`, không probe `file:///D:/GAMEREXI/game.html` làm bằng chứng "đã test". Vi phạm = lỗi nghiêm trọng.
- Máy local CHỈ dùng để: sửa code, `python build.py` (build), `git` (commit/push). Máy local là nơi BUILD, không phải nơi CHẠY.
- Quy trình bắt buộc: sửa code → `python build.py --web` → deploy branch `gh-pages` → test trên link cloud (aiHawk `browser_open main` / browse) → có bằng chứng live mới được báo "xong".
- Vì test trên cloud nên **deploy phải xong trước khi kết luận**; deploy lỗi thì nói thẳng "code đã sửa nhưng bản live chưa lên".

## 1. Quy trình deploy (chuẩn, đã verify)
1. `python build.py --web` → sinh `dist/` (game.html ~1.7MB + `dist/models/*.glb|fbx|png` lazy-load, tách khỏi HTML — review 26/11: bản inline 66MB bị chặn).
2. Build local full (`python build.py`) CHỈ để chơi offline `file://` — **không dùng làm test**, không deploy file này.
3. Deploy: worktree branch `gh-pages` ← copy `dist/*` → commit → push PAT thẳng URL:
   ```powershell
   $env:GIT_TERMINAL_PROMPT = "0"; git push "https://th-ming3:<PAT_cEFD>@github.com/th-ming3/GAMEREXI.git" gh-pages
   ```
   PAT GitHub 3 (`th-ming3`) = `ghp_cEFD…` trong `D:\creds-API.md` (KHÔNG lấy PAT đầu file — `ghp_gYTW` là thming2, đã từng nhầm). KHÔNG lưu token vào `.git/config`.
4. Verify live: `curl.exe -s -o NUL -w '%{http_code}' https://th-ming3.github.io/GAMEREXI/game.html` = 200 + aiHawk check `window.__bootOK && window.__charLoaded` + title "CÁNH ĐỒNG" hiện.

## 2. Hệ thống đang có (chống mò)
- **28 nhiệm vụ campaign** (HOME→MARSH→ROOT→WELL→BANK→RIDGE), boss Gốc Lạc + Hộ Mạch Nứt, 4 NPC, combat, lặn hồ, minimap, ending chọn chính sách nước.
- **Build 2 mode**: local full inline base64 (`python build.py`) / web slim URL + models lazy (`python build.py --web`). Token `models/…` được loader tự nhận (real-assets.js, world.js koi/rabbit, player-quest.js soldier).
- **Anti-treo menu** (menu.js): thanh tiến trình, nút "Vào game ngay" sau 6s, "Tải lại trang" sau 10s — không bao giờ giữ người chơi ở màn hình tải.
- **Fix review 26/11/2026**: click đánh quái (`closest` guard), invite không báo thành công giả (world.js `markFailRetry`), a11y live region (`window.__a11ySay`), touch controls cho mọi máy có chạm, first-step hint Q-HOME-001.

## 3. Không được làm
- Không `Set-Content`/PowerShell replace file có tiếng Việt (rule toàn cục 0.5) — chỉ Python UTF-8 hoặc `write`/`edit` tool.
- Không tạo service/repo mới trùng naming; repo đúng: `th-ming3/GAMEREXI` (GitHub 3).
- Không push khi file có U+FFFD/mojibake.