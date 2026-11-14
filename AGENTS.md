# AGENTS.md — MStudent app iOS (Expo)

Hướng dẫn cho mọi coding agent (Codex, Claude Code, Cursor, Copilot) làm việc trong repo này.

> Repo này là **app iOS** (bản Android: https://github.com/muoibuon/mstudent-android). Máy chủ, agent AI, tài liệu chung và spec ở repo backend: https://github.com/muoibuon/mstudent-backend

## Sản phẩm

MStudent là AI inbox cho sinh viên: thông báo từ Gmail, Classroom, bảng lớp, LMS, Zalo → việc có hạn, nhắc việc, lời mời
sự kiện. Mọi agent chạy trên máy chủ; app chỉ gọi API. Ưu tiên số 1: app chạy được trên điện thoại thật, đóng hẳn rồi mở
lại vẫn còn phiên và dữ liệu.

## Lệnh

```bash
npm install
npm test && npm run typecheck && npx expo lint     # phải xanh trước khi push
npx expo start                                     # Expo Go (không có Google, share, push)
```

Build cài máy: xem [`README.md`](README.md) và [`docs/BUILD_IOS.md`](docs/BUILD_IOS.md).

## Cấu trúc

```
app/            màn hình (expo-router): (tabs)/ index · tasks · calendar · settings; login · profile · share · sources
components/     ui.tsx (T, Button, Card, TaskCard…) · InviteCard · Mascot · Icon
constants/      theme.ts (màu, font, bo góc của UI Kit)
lib/            api.ts · types.ts · store.tsx · logic thuần (dates, reminders, catalog, events, prefill, sync…)
lib/__tests__/  test node:test cho logic thuần
```

## Quy tắc bắt buộc

1. Không bao giờ đưa khoá API (OpenAI, Gemini), client secret Google hay khoá ký vào repo này. Refresh token chỉ lưu bằng
   expo-secure-store; access token chỉ trong RAM.
2. Mọi lời gọi máy chủ đi qua `lib/api.ts`; kiểu dữ liệu trong `lib/types.ts` phải khớp `app/models.py` của repo backend.
   **Backend đổi API → cập nhật hai file này trong cùng đợt** (ghi link PR backend trong PR app).
3. Logic thuần đặt trong `lib/` và có test; màn hình chỉ gọi lib.
4. Cài gói bằng `npx expo install`; không sửa tay `ios/`, `android/` (sinh bởi `expo prebuild`, không commit); đọc docs Expo
   đúng phiên bản SDK trước khi dùng API.
5. Kết quả từ bộ luật (`mode`/`fit_mode` = `offline`) phải hiện rõ trên UI, không trình bày là AI.
6. Link mở từ dữ liệu máy chủ chỉ nhận http(s) (`lib/events.ts`); link Google Form điền sẵn dựng trên máy
   (`lib/prefill.ts`) và app không bao giờ tự gửi form.
7. Chữ hiển thị tiếng Việt, hỗ trợ dark mode qua `usePalette()`; tên biến, hàm, commit tiếng Anh.
8. Mã màn hình và `lib/` giống repo Android: thay đổi dùng chung phải được mang sang repo kia (ghi link PR).
9. Nhánh riêng cho mỗi việc, mỗi PR một việc, tạo từ `dev`, PR vào `dev`; không push thẳng vào `master`. Báo cáo ngắn: làm gì, file nào, test ra sao,
   **chưa kiểm tra được gì** (Expo Go hay cần bản build).
