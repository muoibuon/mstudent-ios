// Màn Dán / chia sẻ thông báo (UI Kit, artboard "5 · Dán / chia sẻ thông báo"): nền coban + tấm trắng; nhận nội dung
// chia sẻ từ Zalo/app khác, deep link Phím tắt iOS, hoặc dán tay → chạy pipeline agent → xem kết quả.

import { router, useLocalSearchParams } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Button, Chip, Display, Muted, OfflineNotice, T, TaskCard } from '@/components/ui';
import { BRAND, FONT, SCREEN_PAD, usePalette } from '@/constants/theme';
import { api } from '@/lib/api';
import { parseShareLink } from '@/lib/sharelink';
import { useStore } from '@/lib/store';
import { type IngestResult, type Source } from '@/lib/types';

const SOURCES: { key: Source; label: string }[] = [
  { key: 'zalo', label: 'Zalo' },
  { key: 'email', label: 'Email' },
  { key: 'lms', label: 'LMS' },
  { key: 'manual', label: 'Khác' },
];

export default function ShareScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { refresh, now } = useStore();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  // Nguồn 2: deep link mstudent://share?text=… từ Phím tắt iOS (bản không có share extension).
  const params = useLocalSearchParams<{ text?: string; source?: string }>();
  const link = parseShareLink(params);
  // Mở từ ô "Zalo" ở màn Nguồn tự động: chọn sẵn nguồn, chưa có nội dung.
  const preset = SOURCES.find((s) => s.key === params.source)?.key ?? null;
  const shared = hasShareIntent ? [shareIntent.text, shareIntent.webUrl].filter(Boolean).join('\n') : (link?.text ?? '');
  const [text, setText] = useState(shared);
  const [source, setSource] = useState<Source>(hasShareIntent ? 'zalo' : (link?.source ?? preset ?? 'manual'));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [lastShared, setLastShared] = useState(shared);
  if (shared && shared !== lastShared) {
    // Nội dung chia sẻ mới đến khi màn hình đang mở → thay thế (pattern "derive state from props").
    setLastShared(shared);
    setText(shared);
    setSource(hasShareIntent ? 'zalo' : (link?.source ?? 'zalo'));
    setResult(null);
  }

  function close() {
    resetShareIntent();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function analyze() {
    setBusy(true);
    setErr(null);
    try {
      setResult(await api.ingest(text.trim(), source));
      refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const tasks = result ? [...result.created, ...result.updated] : [];
  const status = !result
    ? null
    : result.duplicate
      ? 'Đã xử lý tin này rồi'
      : !result.relevant
        ? 'Không cần làm gì'
        : result.updated.length && !result.created.length
          ? 'Đã cập nhật việc có sẵn'
          : 'Đã tạo việc';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BRAND.cobalt }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Display size={32}>{hasShareIntent ? 'Chia sẻ thông báo' : 'Dán thông báo'}</Display>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Đóng" style={styles.close}>
          <Icon name="close" color="#FFFFFF" size={20} stroke={2.4} />
        </Pressable>
      </View>

      <ScrollView
        style={[styles.sheet, { backgroundColor: c.surface }]}
        contentContainerStyle={{ padding: SCREEN_PAD, paddingTop: 22, paddingBottom: insets.bottom + 28, gap: 14 }}
        keyboardShouldPersistTaps="handled">
        <T v="label" color={c.muted}>
          {hasShareIntent || link ? 'NỘI DUNG ĐƯỢC CHIA SẺ' : 'NỘI DUNG THÔNG BÁO'}
        </T>
        <TextInput
          value={text}
          onChangeText={(v) => {
            setText(v);
            setResult(null);
          }}
          multiline
          placeholder="vd: Thứ 6 tuần này nộp bài tập tuần 9 nhé"
          placeholderTextColor={c.muted}
          style={[styles.input, { color: c.text, backgroundColor: c.soft, fontFamily: FONT.regular }]}
          accessibilityLabel="Nội dung thông báo"
        />
        <View style={styles.sources} accessibilityRole="radiogroup" accessibilityLabel="Nguồn">
          {SOURCES.map((s) => (
            <Chip key={s.key} label={s.label} active={source === s.key} onPress={() => setSource(s.key)} />
          ))}
        </View>
        <Button label="Tìm việc trong thông báo" busy={busy} disabled={!text.trim()} onPress={analyze} />
        {err && <T v="small" color={c.bad}>{err}</T>}

        {result && (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <View style={[styles.status, { backgroundColor: c.active }]}>
                <Icon name="check" color={c.onActive} size={14} stroke={2.6} />
                <T style={{ fontFamily: FONT.semibold, fontSize: 12 }} color={c.onActive}>
                  {status}
                </T>
              </View>
              {result.mode === 'offline' && <OfflineNotice />}
            </View>
            {tasks.map((t, i) => (
              <TaskCard key={`${t.id}-${i}`} task={t} now={now} />
            ))}
            {!tasks.length && <Muted>{result.reason}</Muted>}
            {result.updated.length > 0 && <Muted>Đã cập nhật việc có sẵn thay vì tạo trùng.</Muted>}

          </View>
        )}

        <View style={{ marginTop: 8 }}>
          <Button variant={result ? 'dark' : 'outline'} label={result ? 'Xong' : 'Đóng'} onPress={close} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: SCREEN_PAD, paddingBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  sheet: { flex: 1, borderTopLeftRadius: 36, borderTopRightRadius: 36 },
  input: { minHeight: 110, borderRadius: 20, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, fontSize: 15, lineHeight: 22, textAlignVertical: 'top' },
  sources: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
});
