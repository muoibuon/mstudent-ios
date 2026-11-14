# Build và cài lên iPhone

Cần máy Mac có Node.js và Xcode, iPhone cắm cáp (đã bật Developer Mode và tin cậy máy tính).
Thêm Apple ID trong **Xcode → Settings → Accounts** và lấy Team ID tại đó. Chạy các lệnh trong thư mục gốc repo:

```bash
export EXPO_PUBLIC_API_URL=https://mstudent.tailec1929.ts.net
export MSTUDENT_TEAM_ID=YOUR_TEAM_ID
# Chỉ dùng với Apple ID miễn phí (Personal Team):
export MSTUDENT_IOS_FREE_SIGNING=1
npm ci
npx expo prebuild --platform ios --clean
xcodebuild -workspace ios/MStudent.xcworkspace -scheme MStudent -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath ios/build -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$MSTUDENT_TEAM_ID" CODE_SIGN_STYLE=Automatic build

# Lấy mã thiết bị iPhone rồi thay DEVICE_ID ở lệnh tiếp theo:
xcrun devicectl list devices
xcrun devicectl device install app --device DEVICE_ID ios/build/Build/Products/Release-iphoneos/MStudent.app
```

Thay `YOUR_TEAM_ID` và `DEVICE_ID` bằng giá trị của bạn. Với Apple Developer trả phí, **bỏ dòng**
`export MSTUDENT_IOS_FREE_SIGNING=1` để giữ Share Extension. Nếu dùng backend khác, đổi
`EXPO_PUBLIC_API_URL` trước khi prebuild và build. Sau khi cài, mở MStudent từ màn hình chính iPhone.

Giới hạn của Apple ID miễn phí: không có thông báo đẩy (app dùng làm mới nền + nhắc việc trên máy), không có share
extension (dán thông báo hoặc dùng Phím tắt), bản cài hết hạn sau 7 ngày — build lại để gia hạn.

Google Sign-In đã có URL scheme mặc định của MStudent. Nếu đổi Google iOS OAuth client, đặt
`GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.<iOS client ID đảo ngược>` **khi prebuild** và kiểm tra
giá trị này khớp `ios_client_id` từ máy chủ — xem
[GOOGLE_CLOUD_SETUP.md](https://github.com/muoibuon/mstudent-backend/blob/master/docs/GOOGLE_CLOUD_SETUP.md).
