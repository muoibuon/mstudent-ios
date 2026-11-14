// Trạng thái dùng chung: phiên đăng nhập + cài đặt + danh sách việc + đồng bộ nhắc việc.
//
// Mở lại app (kể cả sau khi đóng hẳn): khôi phục phiên từ refresh token trong Keychain/Keystore,
// hiện ngay danh sách việc đã lưu, rồi tải mới từ server. Người dùng không phải đăng nhập lại.

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { api, ApiError, authApi, onSessionExpired, setBaseUrl } from './api';
import { registerBackgroundRefresh, saveSeenInvites, saveSnapshot, SETTINGS_KEY } from './background';
import { googleSignIn, googleSignOut } from './google';
import { clearReminders, ensurePermission, syncReminders } from './notifications';
import { registerPush, unregisterPush } from './push';
import type { Health, Profile, PublicConfig, Task, User } from './types';


const USER_KEY = 'mstudent.user.v1';
const tasksKey = (userId: number) => `mstudent.tasks.v1.${userId}`;

export const DEFAULT_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const DEVICE = `${Constants.deviceName ?? 'thiết bị'} (${Platform.OS})`.slice(0, 100);

export interface Settings {
  baseUrl: string;
  remindersOn: boolean;
}

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface Store {
  status: AuthStatus;
  user: User | null;
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => Promise<void>;
  health: Health | null;
  now: Date; // giờ của server (để demo với MSTUDENT_NOW) hoặc giờ máy
  tasks: Task[];
  invites: Task[]; // 003: lời mời sự kiện chưa trả lời
  profile: Profile | null; // 003: trường / ngành (+ MSSV, lớp, SĐT để điền sẵn form trên máy)
  respond: (id: number, going: boolean) => Promise<void>;
  loading: boolean;
  error: string | null;
  scheduled: number;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: (cfg: PublicConfig['google']) => Promise<boolean>;
  signOut: () => Promise<void>;
  reloadUser: () => Promise<void>;
  refresh: () => Promise<void>;
  markDone: (id: number) => Promise<void>;
  moveTask: (id: number, dueAt: string) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings>({ baseUrl: DEFAULT_URL, remindersOn: true });
  const [health, setHealth] = useState<Health | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invites, setInvites] = useState<Task[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState(0);
  const nowOffset = useRef(0); // chênh lệch giữa giờ server và giờ máy
  const userRef = useRef<User | null>(null);
  // Bỏ kết quả tải về của phiên cũ hoặc của lần làm mới bị lần mới hơn vượt qua.
  const sessionVersion = useRef(0);
  const refreshVersion = useRef(0);

  const enter = useCallback(async (u: User) => {
    const version = ++sessionVersion.current;
    userRef.current = u;
    setUser(u);
    setTasks([]);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(u)).catch(() => {});
    const cached = await readJson<Task[]>(tasksKey(u.id));
    if (sessionVersion.current !== version) return;
    if (cached) setTasks(cached); // có ngay nội dung trước khi mạng trả lời
    setStatus('signedIn');
  }, []);

  const leave = useCallback(async () => {
    ++sessionVersion.current;
    ++refreshVersion.current;
    const u = userRef.current;
    userRef.current = null;
    setUser(null);
    setTasks([]);
    setInvites([]);
    setProfile(null);
    setStatus('signedOut');
    setLoading(false);
    await clearReminders().catch(() => {});
    setScheduled(0);
    await AsyncStorage.multiRemove([USER_KEY, ...(u ? [tasksKey(u.id)] : [])]).catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    const u = userRef.current;
    if (!u) return;
    const session = sessionVersion.current;
    const request = ++refreshVersion.current;
    const isCurrent = () =>
      sessionVersion.current === session && refreshVersion.current === request && userRef.current?.id === u.id;
    setLoading(true);
    try {
      const h = await api.health();
      if (!isCurrent()) return;
      nowOffset.current = new Date(h.now).getTime() - Date.now();
      setHealth(h);
      const list = await api.tasks();
      if (!isCurrent()) return;
      setTasks(list);
      setError(null);
      // 003: lời mời + hồ sơ; máy chủ cũ chưa có các endpoint này → bỏ qua, không làm hỏng danh sách việc.
      api
        .events('pending')
        .then((ev) => {
          if (!isCurrent()) return;
          setInvites(ev);
          saveSeenInvites(ev.map((t) => t.id));
        })
        .catch(() => {});
      api.profile().then((p) => {
        if (isCurrent()) setProfile(p);
      }).catch(() => {});
      AsyncStorage.setItem(tasksKey(u.id), JSON.stringify(list)).catch(() => {});
    } catch (e) {
      if (!isCurrent()) return;
      if (!(e instanceof ApiError && e.status === 401)) {
        setError((e as Error).message);
        setHealth(null);
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, []);

  // Khởi động: nạp cài đặt → khôi phục phiên.
  useEffect(() => {
    onSessionExpired(() => {
      leave();
    });
    (async () => {
      const saved = await readJson<Partial<Settings>>(SETTINGS_KEY);
      const merged = { baseUrl: DEFAULT_URL, remindersOn: true, ...saved };
      setSettings(merged);
      setBaseUrl(merged.baseUrl);
      const r = merged.baseUrl ? await authApi.restore() : ({ state: 'none' } as const);
      if (r.state === 'ok') {
        await enter(r.user);
      } else if (r.state === 'offline') {
        // Server tạm thời không gọi được: vẫn vào app với dữ liệu đã lưu, không bắt đăng nhập lại.
        const cachedUser = await readJson<User>(USER_KEY);
        if (cachedUser) {
          await enter(cachedUser);
          setError('Không kết nối được server — đang hiện dữ liệu đã lưu');
        } else {
          setStatus('signedOut');
        }
      } else {
        setStatus('signedOut');
      }
    })();
  }, [enter, leave]);

  useEffect(() => {
    if (status === 'signedIn') refresh();
  }, [status, refresh]);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    if (patch.baseUrl !== undefined) setBaseUrl(patch.baseUrl);
    setSettings((s) => {
      const next = { ...s, ...patch };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // Mỗi khi danh sách việc đổi → đặt lại thông báo trên máy.
  useEffect(() => {
    if (status !== 'signedIn') return;
    (async () => {
      if (!settings.remindersOn) {
        await clearReminders();
        setScheduled(0);
        return;
      }
      if (await ensurePermission()) setScheduled(await syncReminders(tasks, new Date()));
      await saveSnapshot(tasks); // mốc cho làm mới nền: chỉ báo việc mới hơn những gì đã thấy
    })().catch(() => {});
  }, [status, tasks, settings.remindersOn]);

  // Thông báo khi app đóng: đăng ký push (nếu bản cài hỗ trợ) + làm mới nền; cờ notify theo cài đặt nhắc việc.
  useEffect(() => {
    if (status !== 'signedIn') return;
    registerPush(settings.remindersOn).catch(() => {});
    if (settings.remindersOn) registerBackgroundRefresh().catch(() => {});
  }, [status, settings.remindersOn]);

  const signIn = useCallback(async (email: string, password: string) => enter(await authApi.login(email, password, DEVICE)), [enter]);
  const signUp = useCallback(
    async (email: string, password: string, name: string) => enter(await authApi.register(email, password, name, DEVICE)),
    [enter],
  );
  const signInWithGoogle = useCallback(
    async (cfg: PublicConfig['google']) => {
      const g = await googleSignIn(cfg);
      if (!g) return false;
      await enter(await authApi.google(g.idToken, g.serverAuthCode, DEVICE));
      return true;
    },
    [enter],
  );
  const signOut = useCallback(async () => {
    await unregisterPush();
    await authApi.logout();
    await googleSignOut();
    await leave();
  }, [leave]);
  const reloadUser = useCallback(async () => {
    const u = await authApi.me();
    userRef.current = u;
    setUser(u);
  }, []);

  const markDone = useCallback(
    async (id: number) => {
      setTasks((ts) => ts.filter((t) => t.id !== id)); // cập nhật lạc quan
      try {
        await api.done(id);
      } finally {
        refresh();
      }
    },
    [refresh],
  );

  const respond = useCallback(
    async (id: number, going: boolean) => {
      try {
        await api.rsvp(id, going);
        setInvites((ev) => ev.filter((t) => t.id !== id));
      } finally {
        refresh();
      }
    },
    [refresh],
  );

  const moveTask = useCallback(
    async (id: number, dueAt: string) => {
      await api.patch(id, { due_at: dueAt });
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<Store>(
    () => ({
      status,
      user,
      settings,
      updateSettings,
      health,
      now: new Date(Date.now() + nowOffset.current),
      tasks,
      invites,
      profile,
      respond,
      loading,
      error,
      scheduled,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      reloadUser,
      refresh,
      markDone,
      moveTask,
    }),
    [status, user, settings, updateSettings, health, tasks, invites, profile, respond, loading, error, scheduled, signIn, signUp, signInWithGoogle, signOut, reloadUser, refresh, markDone, moveTask],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore phải nằm trong <StoreProvider>');
  return s;
}
