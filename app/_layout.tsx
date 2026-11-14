import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { ShareIntentModule, ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import { Lexend_400Regular, Lexend_500Medium, Lexend_600SemiBold, Lexend_700Bold, useFonts } from '@expo-google-fonts/lexend';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';

import { api } from '@/lib/api';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { FONT, PALETTES } from '@/constants/theme';
import { configureNotifications, inviteAnswer } from '@/lib/notifications';
import { StoreProvider, useStore } from '@/lib/store';
import { ReducedMotionProvider } from '@/lib/useReducedMotion';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = { anchor: '(tabs)' };

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotifications();

// Native module chỉ có trong development/production build; Expo Go và web → tắt nhận chia sẻ thay vì crash.
const SHARE_ENABLED = !!ShareIntentModule;

export default function RootLayout() {
  return (
    <ShareIntentProvider options={{ disabled: !SHARE_ENABLED, resetOnBackground: false }}>
      <ReducedMotionProvider>
        <StoreProvider>
          <RootNav />
        </StoreProvider>
      </ReducedMotionProvider>
    </ShareIntentProvider>
  );
}

/** Có nội dung chia sẻ từ Zalo/app khác và đã đăng nhập → mở màn hình xử lý. */
function ShareRedirect() {
  const { hasShareIntent } = useShareIntentContext();
  const { status } = useStore();
  useEffect(() => {
    if (hasShareIntent && status === 'signedIn') router.push('/share');
  }, [hasShareIntent, status]);
  return null;
}

/** Đăng nhập xong mà chưa có trường/ngành (và chưa bấm "Để sau" gần đây) → mở màn "Bạn học ở đâu?" một lần. */
function ProfileRedirect() {
  const { status } = useStore();
  useEffect(() => {
    if (status !== 'signedIn') return;
    api
      .profile()
      .then((p) => {
        if (p.needs_profile) router.push('/profile');
      })
      .catch(() => {});
  }, [status]);
  return null;
}

function RootNav() {
  const scheme = useColorScheme();
  const { status, respond } = useStore();
  const respondRef = useRef(respond);
  useEffect(() => {
    respondRef.current = respond;
  }, [respond]);
  // Font của UI Kit: Lexend (mọi chữ) + Baloo 2 ExtraBold (tiêu đề IN HOA). Lỗi tải font → vẫn chạy bằng font hệ thống.
  const [fontsLoaded, fontError] = useFonts({
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
    Lexend_700Bold,
    Baloo2_800ExtraBold,
  });
  const ready = status !== 'loading' && (fontsLoaded || !!fontError);
  const c = PALETTES[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: c.accent, background: c.bg, card: c.bg, text: c.text, border: c.bg },
  };

  // Giữ splash cho tới khi biết đã đăng nhập hay chưa → không nháy màn hình đăng nhập khi mở lại app.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Bấm thông báo "việc mới" → mở tab Việc (FR-077). Bấm nút Tham gia / Không trên lời mời (003) → trả lời rồi mở tab Việc.
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (status !== 'signedIn') return;
    const handle = (r: Notifications.NotificationResponse | null) => {
      if (!r) return;
      const key = `${r.notification.request.identifier}:${r.actionIdentifier}`;
      if (handled.current === key) return; // cùng một lần bấm có thể tới qua cả hai đường dưới
      handled.current = key;
      const data = r.notification.request.content.data as { type?: string; task_id?: number } | undefined;
      if (data?.type === 'invite') {
        const going = inviteAnswer(r.actionIdentifier);
        if (going !== null && typeof data.task_id === 'number') respondRef.current(data.task_id, going).catch(() => {});
        router.navigate('/tasks');
      } else if (data?.type === 'tasks') router.navigate('/tasks');
    };
    // App bị đóng hẳn rồi được mở bằng nút trên thông báo: lần bấm đó chỉ lấy được qua "phản hồi gần nhất".
    try {
      const last = Notifications.getLastNotificationResponse();
      if (last) {
        Notifications.clearLastNotificationResponse();
        handle(last);
      }
    } catch {
      // Expo Go / web không có API này
    }
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [status]);
  if (!ready) return null;

  const signedIn = status === 'signedIn';
  return (
    <ThemeProvider value={theme}>
      {SHARE_ENABLED && <ShareRedirect />}
      <ProfileRedirect />
      <Stack>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="share" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="profile" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen
            name="sources"
            options={{
              title: 'Nguồn tự động',
              headerShadowVisible: false,
              headerTitleStyle: { fontFamily: FONT.semibold, fontSize: 17 },
              headerBackTitle: 'Cài đặt',
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
