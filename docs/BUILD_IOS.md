# Build và cài lên iPhone

Cần máy Mac có Xcode, iPhone cắm cáp (đã bật Developer Mode và tin cậy máy tính).

```bash
npm install
npx expo prebuild --platform ios --clean          # sinh thư mục ios/ (không commit)

# Apple ID miễn phí (Personal Team): thêm MSTUDENT_IOS_FREE_SIGNING=1 — tắt share extension vì không có App Groups
MSTUDENT_IOS_FREE_SIGNING=1 EXPO_PUBLIC_API_URL=https://<địa-chỉ-máy-chủ> \
xcodebuild -workspace ios/MStudent.xcworkspace -scheme MStudent -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath ios/build -allowProvisioningUpdates \
  DEVELOPMENT_TEAM=<Team ID của bạn> CODE_SIGN_STYLE=Automatic build

xcrun devicectl list devices                       # lấy mã thiết bị
xcrun devicectl device install app --device <mã thiết bị> ios/build/Build/Products/Release-iphoneos/MStudent.app
```

Giới hạn của Apple ID miễn phí: không có thông báo đẩy (app dùng làm mới nền + nhắc việc trên máy), không có share
extension (dán thông báo hoặc dùng Phím tắt), bản cài hết hạn sau 7 ngày — build lại để gia hạn.

Google Sign-In trên iOS cần `GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.<iOS client ID đảo ngược>` khi prebuild —
xem [GOOGLE_CLOUD_SETUP.md](https://github.com/muoibuon/mstudent-backend/blob/master/docs/GOOGLE_CLOUD_SETUP.md).
