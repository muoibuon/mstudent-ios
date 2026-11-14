// Tab Việc (UI Kit, artboard "3 · Việc"): tiêu đề + nút Thêm, Bản tin sáng (bạc hà), nhóm theo thời hạn,
// thẻ việc màu theo ưu tiên xếp chồng nhau.

import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { EventActions, InviteCard } from '@/components/InviteCard';
import { Meme } from '@/components/Mascot';
import { MotionScreen } from '@/components/MotionEntrance';
import { MotionPressable } from '@/components/MotionPressable';
import { Display, ErrorBanner, Muted, T, TaskCard } from '@/components/ui';
import { BRAND, FONT, SCREEN_PAD, TAB_BAR_SPACE, usePalette } from '@/constants/theme';
import { cleanDigest } from '@/lib/digest';
import { api } from '@/lib/api';
import { BUCKET_ORDER, bucketOf } from '@/lib/dates';
import { sortInvites } from '@/lib/events';
import type { PrefillValues } from '@/lib/prefill';
import type { Task } from '@/lib/types';
import { useStore } from '@/lib/store';

export default function TasksScreen() {
  return <MotionScreen><TasksContent /></MotionScreen>;
}

function TasksContent() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { tasks, invites, profile, user, respond, now, loading, error, refresh, markDone, health } = useStore();
  const [answering, setAnswering] = useState<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [declined, setDeclined] = useState<Task[] | null>(null); // null = chưa mở mục "Đã bỏ qua"
  const pending = useMemo(() => sortInvites(invites, now), [invites, now]);
  const todayCount = tasks.filter((t) => bucketOf(t.due_at, now) === 'Hôm nay').length;

  useEffect(() => {
    if (!celebrating) return;
    const timer = setTimeout(() => setCelebrating(false), 2200);
    return () => clearTimeout(timer);
  }, [celebrating]);
  // Dữ liệu điền sẵn form: lấy từ hồ sơ + tài khoản trên máy, chỉ dùng để dựng link mở form.
  const prefill = useMemo<PrefillValues>(
    () => ({
      name: user?.name,
      email: user?.email,
      student_id: profile?.student_id,
      class_name: profile?.class_name,
      phone: profile?.phone,
      school: profile?.school_name,
      major: profile?.major_name,
    }),
    [user, profile],
  );

  const answer = useCallback(
    async (id: number, going: boolean) => {
      setAnswering(id);
      try {
        await respond(id, going);
        if (declined) setDeclined(await api.events('declined').catch(() => declined));
      } catch {
        // lỗi mạng: lời mời vẫn còn đó, người dùng bấm lại
      } finally {
        setAnswering(null);
      }
    },
    [respond, declined],
  );

  const toggleDeclined = useCallback(() => {
    if (declined) setDeclined(null);
    else api.events('declined').then(setDeclined).catch(() => setDeclined([]));
  }, [declined]);
  const [digest, setDigest] = useState<string | null>(null);
  const [showDigest, setShowDigest] = useState(true);

  const loadDigest = useCallback(() => {
    api
      .digest()
      .then((d) => setDigest(d.text))
      .catch(() => setDigest(null));
  }, []);

  useEffect(() => {
    if (health) loadDigest();
  }, [health, tasks.length, loadDigest]);

  const sections = useMemo(() => {
    const groups = new Map<string, typeof tasks>();
    for (const t of tasks) {
      const b = bucketOf(t.due_at, now);
      groups.set(b, [...(groups.get(b) ?? []), t]);
    }
    return BUCKET_ORDER.filter((b) => groups.has(b)).map((b) => ({ title: b, data: groups.get(b)! }));
  }, [tasks, now]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: SCREEN_PAD, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <T v="h1" accessibilityRole="header">
          Việc của bạn
        </T>
        <MotionPressable
          onPress={() => router.push('/share')}
          accessibilityRole="button"
          accessibilityLabel="Thêm thông báo"
          style={{ height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: c.active, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="plus" color={c.onActive} size={18} stroke={2.6} />
          <T style={{ fontFamily: FONT.semibold, fontSize: 14 }} color={c.onActive}>
            Thêm
          </T>
        </MotionPressable>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(t) => String(t.id)}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              refresh();
              loadDigest();
            }}
          />
        }
        contentContainerStyle={{ paddingHorizontal: SCREEN_PAD, paddingBottom: TAB_BAR_SPACE + insets.bottom }}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            {celebrating && (
              <View style={{ borderRadius: 24, backgroundColor: BRAND.mint, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Meme size={72} mood="celebrating" />
                <T v="title" color={BRAND.mintInk}>Hôm nay xong rồi!</T>
              </View>
            )}
            {error && <ErrorBanner message={error} onRetry={refresh} />}
            {pending.length > 0 && (
              <View style={{ gap: 10 }}>
                <T v="label" color={c.muted}>
                  SỰ KIỆN MỚI · {pending.length}
                </T>
                {pending.map((t) => (
                  <InviteCard key={t.id} task={t} now={now} busy={answering === t.id} onAnswer={(going) => answer(t.id, going)} />
                ))}
              </View>
            )}
            {digest && (
              <View style={{ borderRadius: 24, backgroundColor: BRAND.mint, paddingVertical: 14, paddingHorizontal: 16, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Display size={20} color={BRAND.mintInk}>
                    Bản tin sáng
                  </Display>
                  <Pressable onPress={() => setShowDigest((v) => !v)} hitSlop={12} accessibilityRole="button">
                    <T style={{ fontFamily: FONT.semibold, fontSize: 12 }} color={BRAND.mintInk}>
                      {showDigest ? 'Thu gọn' : 'Mở'}
                    </T>
                  </Pressable>
                </View>
                {showDigest && (
                  <T style={{ fontSize: 14, lineHeight: 20 }} color={BRAND.mintInkDeep}>
                    {cleanDigest(digest)}
                  </T>
                )}
              </View>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={{ marginTop: 14, marginBottom: 8 }}>
            <T v="label" color={section.title === 'Quá hạn' ? c.bad : c.muted}>
              {section.title.toUpperCase()} · {section.data.length}
            </T>
          </View>
        )}
        renderItem={({ item, index, section }) => {
          // Thẻ ngay sau một sự kiện đã tham gia không xếp chồng (để lộ nút Đăng ký / Mở link của sự kiện đó).
          const prev = index > 0 ? section.data[index - 1] : null;
          return (
            <View>
              <TaskCard
                task={item}
                now={now}
                overlap={index > 0 && prev?.rsvp !== 'going'}
                entranceDelay={Math.min(index, 3) * 80}
                onDone={() => {
                  if (todayCount === 1 && bucketOf(item.due_at, now) === 'Hôm nay') setCelebrating(true);
                  return markDone(item.id);
                }}
              />
              {item.rsvp === 'going' && <EventActions task={item} values={prefill} />}
            </View>
          );
        }}
        ListFooterComponent={
          <View style={{ marginTop: 18, gap: 8 }}>
            <Pressable onPress={toggleDeclined} accessibilityRole="button" hitSlop={8}>
              <T style={{ fontFamily: FONT.semibold, fontSize: 13 }} color={c.muted}>
                {declined ? 'Ẩn sự kiện đã bỏ qua' : 'Xem sự kiện đã bỏ qua'}
              </T>
            </Pressable>
            {declined?.length === 0 && <Muted>Chưa bỏ qua sự kiện nào.</Muted>}
            {declined?.map((t) => (
              <View key={t.id} style={{ borderRadius: 20, backgroundColor: c.soft, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <T style={{ flex: 1, fontSize: 14 }} numberOfLines={2}>
                  {t.title}
                </T>
                <Pressable onPress={() => answer(t.id, true)} accessibilityRole="button" accessibilityLabel={`Tham gia: ${t.title}`} hitSlop={8}>
                  <T style={{ fontFamily: FONT.semibold, fontSize: 13 }}>Tham gia</T>
                </Pressable>
              </View>
            ))}
          </View>
        }
        ListEmptyComponent={
          !loading && !error && pending.length === 0 ? (
            <View style={{ borderRadius: 28, backgroundColor: c.soft, padding: 24, alignItems: 'center', gap: 8, marginTop: 12 }}>
              <Meme size={110} mood={celebrating ? 'celebrating' : 'sleepy'} />
              <T v="title">Chưa có việc nào</T>
              <Muted style={{ textAlign: 'center' }}>
                Chia sẻ một thông báo từ Zalo sang MStudent, bấm “Thêm”, hoặc kết nối nguồn tự động trong Cài đặt.
              </Muted>
            </View>
          ) : undefined
        }
      />
    </View>
  );
}
