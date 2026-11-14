// Client gọi backend MStudent.
// - Access token (15 phút) chỉ nằm trong bộ nhớ.
// - Refresh token nằm trong Keychain (iOS) / Keystore (Android) qua expo-secure-store.
// - Không bao giờ chứa API key của LLM hay client secret của Google — những thứ đó chỉ ở server.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type {
  AiCheck,
  ChatResponse,
  ChatFile,
  ChatTurn,
  GmailStatus,
  GmailSyncResult,
  Health,
  IngestResult,
  PublicConfig,
  Profile,
  Source,
  SourceConnection,
  Stats,
  Task,
  TokenResponse,
  User,
} from './types';

const REFRESH_KEY = 'mstudent.refresh';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number, // 0 = không kết nối được
  ) {
    super(message);
  }
}

// ---------- Lưu refresh token an toàn ----------

async function storeRefresh(value: string | null) {
  if (Platform.OS === 'web') {
    // Bản web chỉ dùng khi phát triển.
    if (value) await AsyncStorage.setItem(REFRESH_KEY, value);
    else await AsyncStorage.removeItem(REFRESH_KEY);
    return;
  }
  if (value) {
    await SecureStore.setItemAsync(REFRESH_KEY, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  } else {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  }
}

async function loadRefresh(): Promise<string | null> {
  try {
    return Platform.OS === 'web' ? await AsyncStorage.getItem(REFRESH_KEY) : await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
}

// ---------- Trạng thái phiên ----------

let baseUrl = '';
let accessToken = '';
let refreshToken: string | null = null;
let refreshing: Promise<TokenResponse> | null = null;
let onSignedOut: (() => void) | null = null;

export function setBaseUrl(url: string) {
  baseUrl = url.trim().replace(/\/+$/, '');
}
export function getBaseUrl() {
  return baseUrl;
}
export function onSessionExpired(fn: () => void) {
  onSignedOut = fn;
}

async function adopt(t: TokenResponse): Promise<TokenResponse> {
  accessToken = t.access_token;
  refreshToken = t.refresh_token;
  await storeRefresh(t.refresh_token);
  return t;
}

async function clearSession() {
  accessToken = '';
  refreshToken = null;
  await storeRefresh(null).catch(() => {});
}

// ---------- HTTP ----------

async function raw<T>(path: string, init: RequestInit, timeoutMs: number, withAuth: boolean): Promise<T> {
  if (!baseUrl) throw new ApiError('Chưa nhập địa chỉ server', 0);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const headers: Record<string, string> = init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' };
  if (withAuth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let res: Response;
  try {
    res = await fetch(baseUrl + path, { ...init, headers, signal: ctrl.signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new ApiError('Server không phản hồi (quá thời gian)', 0);
    throw new ApiError(`Không kết nối được ${baseUrl}`, 0);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const d = (body as { detail?: unknown }).detail;
    const msg = Array.isArray(d) ? d.map((x: { msg?: string }) => x.msg).join('; ') : String(d ?? `Lỗi ${res.status}`);
    throw new ApiError(msg, res.status);
  }
  return (await res.json()) as T;
}

/** Đổi refresh token lấy cặp token mới. Nhiều lời gọi đồng thời dùng chung một request. */
function rotate(): Promise<TokenResponse> {
  if (!refreshToken) return Promise.reject(new ApiError('Chưa đăng nhập', 401));
  refreshing ??= raw<TokenResponse>(
    '/api/auth/refresh',
    { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) },
    15000,
    false,
  )
    .then(adopt)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function call<T>(path: string, init: RequestInit = {}, timeoutMs = 30000): Promise<T> {
  try {
    return await raw<T>(path, init, timeoutMs, true);
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401) throw e;
  }
  // Access token hết hạn → làm mới rồi thử lại đúng một lần.
  try {
    await rotate();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      await clearSession();
      onSignedOut?.();
      throw new ApiError('Phiên đã hết hạn, hãy đăng nhập lại', 401);
    }
    throw e; // lỗi mạng: giữ phiên, lần sau thử lại
  }
  return raw<T>(path, init, timeoutMs, true);
}

const post = (body?: unknown): RequestInit => ({ method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

// ---------- Tài khoản ----------

export const authApi = {
  /** Khôi phục phiên khi mở app: 'ok' | 'none' (chưa đăng nhập/hết hạn) | 'offline' (không gọi được server). */
  async restore(): Promise<{ state: 'ok'; user: User } | { state: 'none' } | { state: 'offline' }> {
    refreshToken = await loadRefresh();
    if (!refreshToken) return { state: 'none' };
    try {
      return { state: 'ok', user: (await rotate()).user };
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) return { state: 'offline' };
      await clearSession();
      return { state: 'none' };
    }
  },
  async login(email: string, password: string, device: string) {
    return (await adopt(await raw<TokenResponse>('/api/auth/login', post({ email, password, device }), 20000, false))).user;
  },
  async register(email: string, password: string, name: string, device: string) {
    return (await adopt(await raw<TokenResponse>('/api/auth/register', post({ email, password, name, device }), 20000, false))).user;
  },
  async google(idToken: string, serverAuthCode: string | null, device: string) {
    const body = { id_token: idToken, server_auth_code: serverAuthCode, device };
    return (await adopt(await raw<TokenResponse>('/api/auth/google', post(body), 30000, false))).user;
  },
  async logout() {
    const rt = refreshToken;
    await clearSession();
    if (rt) await raw('/api/auth/logout', post({ refresh_token: rt }), 8000, false).catch(() => {});
  },
  me: () => call<User>('/api/auth/me'),
  async changePassword(oldPassword: string, newPassword: string) {
    const t = await call<TokenResponse>('/api/auth/change-password', post({ old_password: oldPassword, new_password: newPassword }));
    return (await adopt(t)).user;
  },
  async deleteAccount(confirmEmail: string) {
    await call('/api/auth/me', { method: 'DELETE', body: JSON.stringify({ confirm_email: confirmEmail }) });
    await clearSession();
  },
};

// ---------- Nghiệp vụ ----------

export const api = {
  health: () => raw<Health>('/api/health', {}, 8000, false),
  publicConfig: () => raw<PublicConfig>('/api/public-config', {}, 8000, false),
  tasks: () => call<Task[]>('/api/tasks'),
  done: (id: number) => call<Task>(`/api/tasks/${id}/done`, post()),
  patch: (id: number, body: Partial<Pick<Task, 'title' | 'due_at' | 'status'>>) =>
    call<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  ingest: (body: string, source: Source) => call<IngestResult>('/api/ingest', post({ body, source }), 60000),
  chat: (message: string, history: ChatTurn[]) => call<ChatResponse>('/api/chat', post({ message, history }), 90000),
  chatFile: (file: ChatFile, message: string, history: ChatTurn[]) => {
    const form = new FormData();
    form.append('message', message);
    form.append('history', JSON.stringify(history));
    if (Platform.OS === 'web' && file.file) form.append('file', file.file, file.name);
    else form.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as unknown as Blob);
    return call<ChatResponse>('/api/chat/file', { method: 'POST', body: form }, 90000);
  },
  digest: () => call<{ mode: string; text: string }>('/api/digest', {}, 60000),
  stats: () => call<Stats>('/api/stats'),
  seed: () => call<IngestResult[]>('/api/demo/seed', post(), 120000),
  aiCheck: () => call<AiCheck>('/api/ai/check', post(), 60000),
  gmailStatus: () => call<GmailStatus>('/api/google/status'),
  gmailConnect: (serverAuthCode: string) => call<GmailStatus>('/api/google/connect', post({ server_auth_code: serverAuthCode })),
  gmailSync: (days = 7) => call<GmailSyncResult>('/api/google/gmail/sync', post({ days }), 180000),
  gmailDisconnect: () => call<GmailStatus>('/api/google/disconnect', { method: 'DELETE' }),
  // Nguồn tự động (002)
  sources: () => call<SourceConnection[]>('/api/sources'),
  addSource: (kind: 'ics' | 'sheet', url: string, label = '') =>
    call<SourceConnection>('/api/sources', post({ kind, url, label }), 45000),
  setSourceEnabled: (id: number, enabled: boolean) =>
    call<SourceConnection>(`/api/sources/${id}`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
  deleteSource: (id: number) => call<{ ok: boolean }>(`/api/sources/${id}`, { method: 'DELETE' }),
  syncSourceNow: (id: number) => call<{ queued: boolean }>(`/api/sources/${id}/sync`, post()),
  // 003: hồ sơ học tập + lời mời sự kiện
  catalog: () => call<import('./catalog').Catalog>('/api/catalog', {}, 45000),
  profile: () => call<Profile>('/api/profile'),
  saveProfile: (p: Omit<Profile, 'needs_profile'>) => call<Profile>('/api/profile', { method: 'PUT', body: JSON.stringify(p) }),
  snoozeProfile: () => call<{ ok: boolean }>('/api/profile/snooze', post()),
  events: (state: 'pending' | 'going' | 'declined') => call<Task[]>(`/api/events?state=${state}`),
  rsvp: (id: number, going: boolean) => call<Task>(`/api/tasks/${id}/rsvp`, post({ going })),
  pushRegister: (token: string, platform: 'ios' | 'android', notify: boolean) =>
    call<{ ok: boolean }>('/api/push/register', post({ token, platform, notify })),
  pushUnregister: (token: string, platform: 'ios' | 'android') =>
    call<{ ok: boolean }>('/api/push/register', { method: 'DELETE', body: JSON.stringify({ token, platform, notify: false }) }),
};
