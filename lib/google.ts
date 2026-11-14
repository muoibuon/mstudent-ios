// Google Sign-In gốc (native). Thư viện chỉ có trong development/production build —
// trong Expo Go hoặc bản web thì `available` = false và app dùng đăng nhập email/mật khẩu.

import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { googleIosSetupError } from './googleIosConfig';
import type { PublicConfig } from './types';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
// Google Classroom chỉ đọc: lớp, bài tập + bài nộp của chính mình, thông báo lớp (002 US2).
export const CLASSROOM_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/classroom.announcements.readonly',
];

type Lib = typeof import('@react-native-google-signin/google-signin');

let lib: Lib | null = null;
try {
  // require trong try/catch: module native thiếu sẽ ném lỗi ngay khi import.
  lib = require('@react-native-google-signin/google-signin') as Lib;
} catch {
  lib = null;
}

export const googleAvailable = lib !== null;

export interface GoogleResult {
  idToken: string;
  serverAuthCode: string | null;
  email: string;
}

async function run(cfg: PublicConfig['google'], scopes: string[]): Promise<GoogleResult | null> {
  const offline = scopes.length > 0;
  if (!lib) throw new Error('Bản app này chưa có Google Sign-In (cần development build)');
  if (!cfg.enabled) throw new Error('Server chưa cấu hình Google (GOOGLE_WEB_CLIENT_ID)');
  if (Platform.OS === 'ios') {
    const setupError = googleIosSetupError(cfg.ios_client_id, Constants.expoConfig?.extra?.googleIosUrlScheme);
    if (setupError) throw new Error(setupError);
  }
  const { GoogleSignin } = lib;
  GoogleSignin.configure({
    webClientId: cfg.web_client_id, // server dùng client này để kiểm ID token và đổi mã uỷ quyền
    iosClientId: cfg.ios_client_id || undefined,
    scopes,
    offlineAccess: offline, // xin serverAuthCode để SERVER giữ refresh token, không phải app
    forceCodeForRefreshToken: offline,
  });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const res = await GoogleSignin.signIn();
  if (res.type !== 'success') return null; // người dùng bấm huỷ
  const { idToken, serverAuthCode, user } = res.data;
  if (!idToken) throw new Error('Google không trả ID token — kiểm tra webClientId');
  return { idToken, serverAuthCode: serverAuthCode ?? null, email: user.email };
}

/** Đăng nhập: chỉ xin thông tin cơ bản (email, tên). */
export const googleSignIn = (cfg: PublicConfig['google']) => run(cfg, []);

/** Cấp quyền đọc Gmail: trả về serverAuthCode để gửi cho backend. */
export const googleGrantGmail = (cfg: PublicConfig['google']) => run(cfg, [GMAIL_SCOPE]);

/**
 * Cấp quyền chỉ đọc cho các nguồn Google đã chọn. Máy chủ giữ MỘT refresh token cho mỗi tài khoản, nên khi thêm
 * nguồn mới phải xin lại cả quyền của nguồn đã kết nối (nếu không, token mới sẽ mất quyền cũ).
 */
export const googleGrant = (cfg: PublicConfig['google'], want: { gmail: boolean; classroom: boolean }) =>
  run(cfg, [...(want.gmail ? [GMAIL_SCOPE] : []), ...(want.classroom ? CLASSROOM_SCOPES : [])]);

export async function googleSignOut() {
  try {
    await lib?.GoogleSignin.signOut();
  } catch {
    // không sao: phiên của MStudent đã được xoá ở phía mình
  }
}
