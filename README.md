# MStudent — app iOS (Expo SDK 58)

> Repo này là bản **iOS** của app MStudent. Bản Android: https://github.com/muoibuon/mstudent-android · Backend (FastAPI, agent AI), tài liệu chung và spec: https://github.com/muoibuon/mstudent-backend
> Hai repo app cùng xuất phát từ một bộ mã: màn hình và `lib/` giống nhau. **Sửa lỗi hay thêm tính năng dùng chung thì
> mở PR tương ứng ở repo Android** để hai bản không lệch nhau; backend đổi API thì cập nhật `lib/types.ts` + `lib/api.ts`.
> Quy tắc: [`AGENTS.md`](AGENTS.md). Trước khi push: `npm test && npm run typecheck && npx expo lint`.
> Nhánh: việc tạo từ `dev`, PR vào `dev`; `master` là bản ổn định.

App gọi backend FastAPI; mọi agent chạy trên server. App **không chứa** khoá LLM hay client secret.

| Màn hình | Làm gì |
|---|---|
| Đăng nhập | Nhập địa chỉ server → đăng ký / đăng nhập bằng email, hoặc "Tiếp tục với Google" |
| 💬 Trợ lý | Chat với agent; xem từng lần gọi tool; chấm xanh "AI trực tiếp" khi server đang dùng LLM |
| ✅ Việc | Nhóm theo hạn + bản tin; nút ＋ Thêm |
| 🗓️ Lịch | Dải 7 ngày; nhấn giữ một việc để dời hạn |
| ⚙️ Cài đặt | Tài khoản, **Kiểm tra AI**, **Gmail** (kết nối / quét), thống kê "MStudent đã giúp bạn", nhắc việc, dữ liệu demo, xoá tài khoản |
| Chia sẻ | Zalo (hoặc app khác) → Chia sẻ → MStudent → agent phân tích, hiện các agent đã chạy |

**Đóng hẳn rồi mở lại:** refresh token nằm trong Keychain/Keystore; app tự khôi phục phiên, hiện ngay việc đã lưu rồi tải
mới. Server tạm mất kết nối cũng không bị đẩy ra màn hình đăng nhập.

## 2 cách chạy

| Cách | Lệnh | Có gì | Dùng khi |
|---|---|---|---|
| **Expo Go** | `npx expo start` → quét QR | Chat, việc, lịch, nhắc việc. Không có Google, Gmail, Share | Thử nhanh khi code |
| **Build cài máy (Release)** | `npx expo prebuild --platform ios --clean` rồi build bằng Xcode / `xcodebuild` — xem [`docs/BUILD_IOS.md`](docs/BUILD_IOS.md) | Đầy đủ, chạy độc lập không cần máy tính bật Metro | **Demo chấm điểm** |

Biến môi trường khi build:

| Biến | Ý nghĩa |
|---|---|
| `EXPO_PUBLIC_API_URL` | Địa chỉ server điền sẵn ở màn hình đăng nhập (tuỳ chọn) |
| `GOOGLE_IOS_URL_SCHEME` | Bắt buộc cho Google Sign-In trên iOS: `com.googleusercontent.apps.<iOS client ID đảo ngược>` |
| `MSTUDENT_HTTPS_ONLY=1` | Cấm HTTP thường. Mặc định cho phép HTTP **trong mạng nội bộ** để gọi backend localhost |

Không commit `ios/` và `android/` (sinh ra bởi `expo prebuild`). Bundle id / package: `vn.muoibuon.mstudent`.

## Kết nối tới backend chạy trên máy tính

1. Trên máy tính: `python run_local.py` → in ra `http://<IP-LAN>:8000`.
2. Điện thoại cùng Wi-Fi hoặc máy tính vào hotspot của điện thoại.
3. Nhập địa chỉ vào bước "1 · MÁY CHỦ" (gõ `192.168.1.5:8000` là đủ, app tự thêm `http://`).

Android emulator dùng `10.0.2.2:8000`; iOS simulator dùng `localhost:8000`. iPhone thật sẽ hỏi quyền "mạng cục bộ" lần đầu.

## Kiểm tra

```bash
npm test              # ngày giờ, kế hoạch nhắc việc, chuẩn hoá URL (node:test, không cần máy ảo)
npm run typecheck
npx expo lint
```

## Cấu trúc

```
app/
  _layout.tsx         StoreProvider; Stack.Protected: chưa đăng nhập → /login, đã đăng nhập → (tabs)
  login.tsx           server + đăng nhập/đăng ký/Google
  (tabs)/             index (Trợ lý) · tasks · calendar · settings
  share.tsx           nhận chia sẻ / dán tay → /api/ingest
  +native-intent.tsx  link từ iOS Share Extension → /share
lib/
  api.ts              HTTP + phiên: access token trong RAM, refresh token trong SecureStore, tự làm mới khi 401
  store.tsx           trạng thái đăng nhập, cài đặt, việc (có lưu đệm theo người dùng), đồng bộ nhắc việc
  google.ts           Google Sign-In gốc (nạp lười để Expo Go không crash)
  notifications.ts    local notification
  reminders.ts        việc → danh sách mốc nhắc (≤ 60; iOS giới hạn 64)
  dates.ts · url.ts   hàm thuần, có test
app.config.js         cấu hình theo môi trường: HTTP nội bộ, plugin Google cho iOS
eas.json              profile preview (APK) và production
```
