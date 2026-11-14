// Lời mời sự kiện (003 US2): thẻ màu theo mức phù hợp với ngành, giờ / địa điểm, nhãn Bắt buộc, lý do phù hợp
// (ghi rõ khi do bộ luật offline đánh giá), hai nút Tham gia (vàng chanh / đen) và Không (viền).
// EventActions: nút "Đăng ký (đã điền sẵn)" / "Mở link" cho sự kiện đã chọn Tham gia.

import { Linking, StyleSheet, Text, View } from 'react-native';

import { Button, timeLabel } from '@/components/ui';
import { BRAND, FONT, RADIUS, TYPE } from '@/constants/theme';
import { relativeDay } from '@/lib/dates';
import { FIT_LABEL, openableUrl } from '@/lib/events';
import { prefillCount, prefillUrl, type PrefillValues } from '@/lib/prefill';
import type { Task } from '@/lib/types';

const FIT_BG = { high: BRAND.lime, medium: BRAND.mint, low: BRAND.cloud } as const;

function open(url: string | null) {
  if (url) Linking.openURL(url).catch(() => {});
}

function Pill({ label, dark }: { label: string; dark?: boolean }) {
  return (
    <View style={[s.pill, { backgroundColor: dark ? BRAND.ink : 'rgba(20,20,20,0.1)' }]}>
      <Text style={{ fontFamily: FONT.semibold, fontSize: 12, color: dark ? '#FFFFFF' : BRAND.ink }}>{label}</Text>
    </View>
  );
}

export function InviteCard({
  task,
  now,
  busy,
  onAnswer,
}: {
  task: Task;
  now: Date;
  busy?: boolean;
  onAnswer: (going: boolean) => void;
}) {
  const bg = task.fit_level ? FIT_BG[task.fit_level] : BRAND.periwinkle;
  const when = task.due_at ? `${relativeDay(task.due_at, now)} · ${timeLabel(task.due_at, now)}` : 'Chưa rõ giờ';
  return (
    <View style={[s.card, { backgroundColor: bg }]} accessibilityLabel={`Lời mời sự kiện: ${task.title}`}>
      <View style={s.pills}>
        {task.fit_level && <Pill dark label={FIT_LABEL[task.fit_level]} />}
        {task.mandatory && <Pill label="Bắt buộc" />}
        {task.fit_mode === 'offline' && <Pill label="Không dùng AI" />}
      </View>
      <Text style={[TYPE.title, { color: BRAND.ink }]} numberOfLines={3}>
        {task.title}
      </Text>
      <Text style={s.meta} numberOfLines={2}>
        {when}
        {task.location ? ` · ${task.location}` : ''}
      </Text>
      {task.fit_reason ? <Text style={s.reason}>{task.fit_reason}</Text> : null}
      {task.register_deadline ? <Text style={s.meta}>Hạn đăng ký: {relativeDay(task.register_deadline, now)} {timeLabel(task.register_deadline, now)}</Text> : null}
      <View style={s.actions}>
        <View style={{ flex: 1 }}>
          <Button small variant="dark" label="Tham gia" busy={busy} onPress={() => onAnswer(true)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button small variant="outline" label="Không" disabled={busy} onPress={() => onAnswer(false)} />
        </View>
      </View>
    </View>
  );
}

/** Nút cho sự kiện đã Tham gia: mở form đã điền sẵn (người dùng tự bấm Gửi) hoặc link gốc, và link sự kiện. */
export function EventActions({ task, values }: { task: Task; values: PrefillValues }) {
  const filled = prefillUrl(task.form_meta, values);
  const register = filled ?? openableUrl(task.register_url);
  const page = openableUrl(task.event_url);
  if (!register && !page) return null;
  const n = prefillCount(task.form_meta, values);
  return (
    <View style={s.eventActions}>
      {register && (
        <View style={{ flex: 1 }}>
          <Button small label={filled ? `Đăng ký (điền sẵn ${n} câu)` : 'Mở form đăng ký'} onPress={() => open(register)} />
        </View>
      )}
      {page && (
        <View style={{ flex: register ? 0 : 1 }}>
          <Button small variant="ghost" label="Mở link" onPress={() => open(page)} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: RADIUS.card, padding: 18, gap: 6 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 2 },
  pill: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  meta: { fontFamily: FONT.regular, fontSize: 13, lineHeight: 18, color: BRAND.ink },
  reason: { fontFamily: FONT.medium, fontSize: 13, lineHeight: 19, color: BRAND.ink },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  eventActions: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 4 },
});
