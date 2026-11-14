// Tab Lịch (UI Kit, artboard "4 · Lịch"): dải 7 ngày (có việc = vàng chanh, đang chọn = đen), việc của ngày
// đang chọn dạng thẻ màu xếp chồng; nhấn giữ một việc để dời sang ngày khác.

import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Meme } from '@/components/Mascot';
import { MotionAppear, MotionScreen } from '@/components/MotionEntrance';
import { MotionPressable } from '@/components/MotionPressable';
import { Button, Muted, T, TaskCard } from '@/components/ui';
import { BRAND, FONT, SCREEN_PAD, TAB_BAR_SPACE, usePalette } from '@/constants/theme';
import { addDays, dayKey, fmtDayLong, fmtDayShort, fmtTime, moveToDay, startOfDay } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { useReducedMotion } from '@/lib/useReducedMotion';
import type { Task } from '@/lib/types';

const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function CalendarScreen() {
  return <MotionScreen><CalendarContent /></MotionScreen>;
}

function CalendarContent() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { tasks, now, markDone, moveTask } = useStore();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(() => dayKey(now));
  const [moving, setMoving] = useState<Task | null>(null);

  const start = useMemo(() => addDays(startOfDay(now), offset * 7), [now, offset]);
  const days = useMemo(() => [...Array(7)].map((_, i) => addDays(start, i)), [start]);
  const byDay = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) if (t.due_at) m.set(dayKey(t.due_at), [...(m.get(dayKey(t.due_at)) ?? []), t]);
    return m;
  }, [tasks]);
  const todayKey = dayKey(now);
  const dayTasks = byDay.get(selected) ?? [];

  function shiftWeek(n: number) {
    const next = offset + n;
    setOffset(next);
    setSelected(dayKey(addDays(startOfDay(now), next * 7)));
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 12 }}>
      <View style={styles.header}>
        <T v="h1" accessibilityRole="header">
          Lịch
        </T>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <RoundButton label="Tuần trước" icon="left" onPress={() => shiftWeek(-1)} />
          <T style={{ fontFamily: FONT.semibold, fontSize: 14 }}>
            {fmtDayShort(days[0])} – {fmtDayShort(days[6])}
          </T>
          <RoundButton label="Tuần sau" icon="right" onPress={() => shiftWeek(1)} />
        </View>
      </View>

      <View style={styles.strip}>
        {days.map((d) => {
          const k = dayKey(d);
          const n = byDay.get(k)?.length ?? 0;
          const sel = k === selected;
          const bg = sel ? c.active : n ? BRAND.lime : c.soft;
          const fg = sel ? (c.active === BRAND.ink ? '#FFFFFF' : BRAND.ink) : n ? BRAND.ink : c.muted;
          return (
            <MotionPressable
              key={k}
              onPress={() => setSelected(k)}
              accessibilityRole="button"
              accessibilityState={{ selected: sel }}
              accessibilityLabel={`${fmtDayLong(d)}, ${n} việc`}
              style={[styles.day, { backgroundColor: bg }]}>
              <T style={{ fontFamily: FONT.bold, fontSize: 17 }} color={fg}>
                {k.slice(8)}
              </T>
              <T style={{ fontSize: 12, fontFamily: k === todayKey ? FONT.semibold : FONT.regular }} color={fg}>
                {DOW[new Date(d.getTime() + 7 * 3600e3).getUTCDay()]}
              </T>
            </MotionPressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: SCREEN_PAD, paddingTop: 16, paddingBottom: TAB_BAR_SPACE + insets.bottom }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <T style={{ fontFamily: FONT.semibold, fontSize: 18, textTransform: 'capitalize' }}>
            {fmtDayLong(selected + 'T12:00:00+07:00')}
            {selected === todayKey ? ' · Hôm nay' : ''}
          </T>
          {!!dayTasks.length && <Muted>{dayTasks.length} việc</Muted>}
        </View>
        <MotionAppear key={selected}>
          {dayTasks.length ? (
            <>
              {dayTasks.map((t, i) => (
                <TaskCard key={t.id} task={t} now={now} entranceDelay={Math.min(i, 3) * 80} onDone={() => markDone(t.id)} onLongPress={() => setMoving(t)} />
              ))}
              <Muted style={{ marginTop: 12 }}>Nhấn giữ một việc để dời sang ngày khác.</Muted>
            </>
          ) : (
            <View style={{ borderRadius: 28, backgroundColor: c.soft, paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center', gap: 8 }}>
              <Meme size={80} mood="sleepy" />
              <T style={{ fontFamily: FONT.semibold }}>Ngày này rảnh rồi!</T>
              <Muted>Không có việc nào trong ngày này.</Muted>
            </View>
          )}
        </MotionAppear>
      </ScrollView>

      <MoveSheet
        task={moving}
        from={startOfDay(now)}
        onClose={() => setMoving(null)}
        onPick={async (k) => {
          const t = moving;
          setMoving(null);
          if (t?.due_at) {
            await moveTask(t.id, moveToDay(t.due_at, k));
            setSelected(k);
          }
        }}
      />
    </View>
  );
}

function RoundButton({ label, icon, onPress }: { label: string; icon: 'left' | 'right'; onPress: () => void }) {
  const c = usePalette();
  return (
    <MotionPressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[styles.round, { backgroundColor: c.soft }]}>
      <Icon name={icon} color={c.text} size={20} stroke={2.4} />
    </MotionPressable>
  );
}

function MoveSheet({
  task,
  from,
  onClose,
  onPick,
}: {
  task: Task | null;
  from: Date;
  onClose: () => void;
  onPick: (dayKey: string) => void;
}) {
  const c = usePalette();
  const reducedMotion = useReducedMotion();
  const options = [...Array(14)].map((_, i) => addDays(from, i));
  return (
    <Modal visible={!!task} transparent animationType={reducedMotion ? 'none' : 'slide'} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Đóng" />
      <View style={[styles.sheet, { backgroundColor: c.surface }]}>
        <T v="title" numberOfLines={2}>
          Dời “{task?.title}”
        </T>
        <Muted style={{ marginBottom: 12 }}>Giữ nguyên giờ {task?.due_at ? fmtTime(task.due_at) : ''}</Muted>
        <View style={styles.grid}>
          {options.map((d) => {
            const k = dayKey(d);
            const current = !!task?.due_at && dayKey(task.due_at) === k;
            return (
              <Pressable
                key={k}
                onPress={() => onPick(k)}
                disabled={current}
                accessibilityRole="button"
                style={[styles.opt, { backgroundColor: current ? c.active : c.soft }]}>
                <T style={{ fontSize: 14 }} color={current ? c.onActive : c.text}>
                  {fmtDayShort(d)}
                </T>
              </Pressable>
            );
          })}
        </View>
        <Button variant="outline" label="Huỷ" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: SCREEN_PAD, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  strip: { flexDirection: 'row', gap: 6, paddingHorizontal: 14, marginTop: 16 },
  day: { flex: 1, height: 68, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 2 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,20,20,0.4)' },
  sheet: { padding: 20, paddingBottom: 36, borderTopLeftRadius: 36, borderTopRightRadius: 36, gap: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  opt: { borderRadius: 14, paddingVertical: 10, paddingHorizontal: 10, minWidth: '22%', alignItems: 'center' },
});
