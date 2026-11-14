/** Google iOS OAuth client ID và URL scheme phải trỏ cùng một client. */
export function googleIosSetupError(iosClientId: string, bundledScheme: unknown): string | null {
  const suffix = '.apps.googleusercontent.com';
  if (!iosClientId?.endsWith(suffix) || iosClientId.length <= suffix.length) {
    return 'Máy chủ chưa cấu hình Google iOS. Vui lòng thử lại sau.';
  }
  const expected = `com.googleusercontent.apps.${iosClientId.slice(0, -suffix.length)}`;
  if (bundledScheme !== expected) {
    return 'Bản iOS này chưa có cấu hình Google phù hợp. Vui lòng cài bản MStudent mới nhất.';
  }
  return null;
}
