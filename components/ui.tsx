// Thành phần dùng chung theo MStudent UI Kit v1: không viền xám, tách khối bằng màu nền, bo 28/20/16/999,
// chữ Lexend (Baloo 2 cho tiêu đề IN HOA), thẻ việc màu theo ưu tiên + nhân vật theo loại việc.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { CategoryCharacter } from '@/components/Mascot';
import { Icon } from '@/components/Icon';
import { MotionPressable } from '@/components/MotionPressable';
import { BRAND, FONT, PRIORITY_BG, PRIORITY_LABEL, RADIUS, TYPE, usePalette } from '@/constants/theme';
import { relativeDay } from '@/lib/dates';
import { taskSourcesLabel } from '@/lib/sources';
import { CATEGORY_LABEL, type Task } from '@/lib/types';
import { useReducedMotion } from '@/lib/useReducedMotion';

type Variant = keyof typeof TYPE;

/** Chữ theo thang của UI Kit. Mặc định body, màu chữ chính của nền hiện tại. */
export function T({ v = 'body', color, style, ...rest }: TextProps & { v?: Variant; color?: string; style?: StyleProp<TextStyle> }) {
  const c = usePalette();
  return <Text {...rest} style={[TYPE[v], { color: color ?? c.text }, style]} />;
}

/** Tiêu đề IN HOA Baloo 2 (màn chào, khối nổi bật). */
export function Display({ children, size = 26, color, style }: { children: ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return (
    // Dấu tiếng Việt trên chữ IN HOA (À, Ô, Ệ…) của Baloo 2 cao hơn hẳn chữ: dòng phải cao ~1.4× để không bị cắt.
    <Text style={[{ fontFamily: FONT.display, fontSize: size, lineHeight: Math.round(size * 1.4), paddingTop: Math.round(size * 0.08), color: color ?? BRAND.lime }, style]}>
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Text>
  );
}

export function Card({ children, style, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: string }) {
  const c = usePalette();
  return <View style={[s.card, { backgroundColor: tone ?? c.soft }, style]}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  return <T v="title" style={{ marginBottom: 8 }}>{children}</T>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  const c = usePalette();
  return (
    <T v="label" color={c.muted} style={{ marginTop: 4 }}>
      {typeof children === 'string' ? children.toUpperCase() : children}
    </T>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<any> }) {
  const c = usePalette();
  return <T v="small" color={c.muted} style={style}>{children}</T>;
}

type ButtonVariant = 'primary' | 'dark' | 'outline' | 'ghost';

/** Nút: chính (vàng chanh) · tối (đen, chữ vàng chanh; ở chế độ tối đổi thành vàng chanh) · viền · nhẹ. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  busy,
  small,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  busy?: boolean;
  small?: boolean;
  icon?: ReactNode;
}) {
  const c = usePalette();
  const look: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: BRAND.lime, fg: BRAND.ink },
    dark: { bg: c.active, fg: c.onActive },
    outline: { bg: c.bg, fg: c.text, border: c.text },
    ghost: { bg: c.soft, fg: c.text },
  };
  const l = look[variant];
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || busy}
      style={[
        s.btn,
        small && s.btnSmall,
        { backgroundColor: l.bg },
        l.border ? { borderWidth: 2, borderColor: l.border } : null,
        (disabled || busy) && { opacity: 0.55 },
      ]}>
      {busy ? (
        <ActivityIndicator color={l.fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon}
          <Text style={{ fontFamily: FONT.semibold, fontSize: small ? 13 : 16, color: l.fg }}>{label}</Text>
        </View>
      )}
    </MotionPressable>
  );
}

/** Chip (viên): đang chọn = nền đen/chữ trắng (tối: vàng chanh/mực); chưa chọn = nền sương. */
export function Chip({ label, onPress, active, tone }: { label: string; onPress?: () => void; active?: boolean; tone?: string }) {
  const c = usePalette();
  const bg = active ? c.active : (tone ?? c.soft);
  const fg = active ? (c.active === BRAND.ink ? '#FFFFFF' : BRAND.ink) : tone ? BRAND.ink : c.text;
  return (
    <MotionPressable
      onPress={onPress}
      style={[s.chip, { backgroundColor: bg }]}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected: !!active } : undefined}>
      <Text style={{ color: fg, fontSize: 13, fontFamily: active ? FONT.semibold : FONT.medium }}>{label}</Text>
    </MotionPressable>
  );
}

/** Nhãn nhỏ trên nền sương (loại việc, v.v.). */
export function Tag({ label }: { label: string }) {
  const c = usePalette();
  return (
    <View style={[s.tag, { backgroundColor: c.soft }]}>
      <Text style={{ color: c.text, fontSize: 12, fontFamily: FONT.semibold }}>{label}</Text>
    </View>
  );
}

/** Nhãn ưu tiên: luôn có chữ, không chỉ dựa vào màu. */
export function PriorityTag({ priority }: { priority: Task['priority'] }) {
  return (
    <View style={[s.tag, { backgroundColor: PRIORITY_BG[priority] }]}>
      <Text style={{ color: BRAND.ink, fontSize: 12, fontFamily: FONT.semibold }}>{PRIORITY_LABEL[priority]}</Text>
    </View>
  );
}

export function Dot({ priority }: { priority: Task['priority'] }) {
  return <View style={[s.dot, { backgroundColor: PRIORITY_BG[priority] }]} />;
}

/** "AI trực tiếp" (bạc hà, chấm xanh) hoặc "Bộ luật (offline)" (vàng) — kết quả luật không được gọi là AI. */
export function ModePill({ live, label }: { live: boolean; label?: string }) {
  return (
    <View style={[s.pill, { backgroundColor: live ? BRAND.mint : BRAND.amber }]} accessibilityLabel={label ?? (live ? 'AI trực tiếp' : 'Bộ luật offline')}>
      {live && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#1A9E6A' }} />}
      <Text style={{ color: live ? BRAND.mintInk : BRAND.amberInk, fontSize: 13, fontFamily: FONT.semibold }}>
        {label ?? (live ? 'AI trực tiếp' : 'Bộ luật (offline)')}
      </Text>
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const c = usePalette();
  return (
    <View style={[s.error, { backgroundColor: c.soft }]} accessibilityRole="alert">
      <T v="small" color={c.bad} style={{ flex: 1 }}>
        {message}
      </T>
      {onRetry && <Button small variant="ghost" label="Thử lại" onPress={onRetry} />}
    </View>
  );
}

const TZ = 'Asia/Ho_Chi_Minh';
const DOW: Record<string, string> = { Mon: 'T2', Tue: 'T3', Wed: 'T4', Thu: 'T5', Fri: 'T6', Sat: 'T7', Sun: 'CN' };

/** "23:59" nếu hôm nay, ngược lại "08:00 T2" (giờ Việt Nam). */
export function timeLabel(due: string | null, now: Date): string {
  if (!due) return '';
  const d = new Date(due);
  const hm = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
  const day = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: TZ });
  if (day(d) === day(now)) return hm;
  return `${hm} ${DOW[d.toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ })] ?? ''}`.trim();
}

/**
 * Thẻ việc: nền theo ưu tiên (giữ nguyên ở chế độ tối), chữ mực, nhân vật theo loại việc ló ở góc dưới,
 * nút tròn đen "xong" ở góc phải. `overlap` để xếp chồng thẻ sau lên thẻ trước (-24).
 */
export function TaskCard({
  task,
  now,
  onDone,
  onLongPress,
  overlap,
  entranceDelay = 0,
}: {
  task: Task;
  now: Date;
  onDone?: () => void | Promise<void>;
  onLongPress?: () => void;
  overlap?: boolean;
  entranceDelay?: number;
}) {
  const reducedMotion = useReducedMotion();
  const [initialDelay] = useState(entranceDelay);
  const [entryY] = useState(() => new Animated.Value(reducedMotion ? 0 : 16));
  const [entryOpacity] = useState(() => new Animated.Value(reducedMotion ? 1 : 0));
  const [tickScale] = useState(() => new Animated.Value(1));
  const [exitX] = useState(() => new Animated.Value(0));
  const [exitOpacity] = useState(() => new Animated.Value(1));
  const [doneFeedback, setDoneFeedback] = useState(false);
  const cardWidth = useRef(400);
  const finishing = useRef(false);
  const entered = useRef(false);

  useEffect(() => {
    if (reducedMotion) {
      entryY.stopAnimation();
      entryOpacity.stopAnimation();
      entryY.setValue(0);
      entryOpacity.setValue(1);
      entered.current = true;
      return;
    }
    if (entered.current) return;
    entered.current = true;
    const animation = Animated.sequence([
      Animated.delay(initialDelay),
      Animated.parallel([
        Animated.timing(entryY, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(entryOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [reducedMotion, initialDelay, entryY, entryOpacity]);
  const bg = PRIORITY_BG[task.priority];
  const meta = [
    PRIORITY_LABEL[task.priority],
    CATEGORY_LABEL[task.category],
    task.due_at ? relativeDay(task.due_at, now) : 'Không có hạn',
    taskSourcesLabel(task.sources ?? [], task.source),
  ].join(' · ');

  const commitDone = () => {
    try {
      Promise.resolve(onDone?.()).catch(() => {});
    } catch {
      // Lần tải mới của store sẽ khôi phục thẻ nếu máy chủ từ chối.
    }
  };

  const complete = () => {
    if (!onDone || finishing.current) return;
    finishing.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (reducedMotion) {
      commitDone();
      return;
    }
    setDoneFeedback(true);
    Animated.spring(tickScale, { toValue: 1.25, damping: 12, stiffness: 220, useNativeDriver: true }).start(() => {
      Animated.parallel([
        Animated.timing(exitX, { toValue: -cardWidth.current - 24, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(exitOpacity, { toValue: 0, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(commitDone);
    });
  };

  return (
    <Animated.View
      onLayout={(event) => {
        cardWidth.current = event.nativeEvent.layout.width;
      }}
      style={[overlap && { marginTop: 10 }, { opacity: exitOpacity, transform: [{ translateX: exitX }] }]}>
      <Animated.View style={{ opacity: entryOpacity, transform: [{ translateY: entryY }] }}>
      <MotionPressable
        onLongPress={onLongPress}
        accessibilityHint={onLongPress ? 'Nhấn giữ để đổi hạn' : undefined}
        style={[s.taskCard, { backgroundColor: bg }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text style={[TYPE.title, { color: BRAND.ink, flex: 1 }]} numberOfLines={2}>
            {task.title}
          </Text>
          <Text style={{ fontFamily: FONT.semibold, fontSize: 15, color: BRAND.ink }}>{timeLabel(task.due_at, now)}</Text>
        </View>
        <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: BRAND.ink }} numberOfLines={2}>
          {meta}
          {task.location ? ` · ${task.location}` : ''}
          {task.updated_from.length ? ' · đã cập nhật' : ''}
        </Text>
        {task.note ? (
          <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: BRAND.ink, fontStyle: 'italic' }} numberOfLines={2}>
            {task.note}
          </Text>
        ) : null}
        {/* Dòng cuối: nhân vật theo loại việc + nút xong, nằm dưới chữ nên không bao giờ che nội dung. */}
        <View style={s.footer}>
          <View pointerEvents="none" style={s.character}>
            <CategoryCharacter category={task.category} cardBg={bg} size={60} />
          </View>
          {onDone && (
          <Animated.View style={[s.done, { backgroundColor: doneFeedback ? '#1A9E6A' : BRAND.ink, transform: [{ scale: tickScale }] }]}>
            <MotionPressable
              onPress={complete}
              disabled={doneFeedback}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Đánh dấu xong: ${task.title}`}
              style={s.doneHit}>
              <Icon name="check" color="#FFFFFF" size={20} stroke={2.6} />
            </MotionPressable>
          </Animated.View>
          )}
        </View>
      </MotionPressable>
      </Animated.View>
    </Animated.View>
  );
}

/** Giữ tên cũ cho các màn chưa đổi. */
export const TaskRow = TaskCard;

const s = StyleSheet.create({
  card: { borderRadius: 24, padding: 16 },
  btn: { borderRadius: RADIUS.button, height: 52, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { height: 40, paddingHorizontal: 14, borderRadius: 14 },
  chip: { borderRadius: RADIUS.pill, height: 36, paddingHorizontal: 14, justifyContent: 'center' },
  tag: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: RADIUS.tile, marginBottom: 10 },
  taskCard: {
    borderRadius: RADIUS.card,
    paddingTop: 22,
    paddingHorizontal: 18,
    paddingBottom: 14,
    overflow: 'hidden',
    gap: 4,
  },
  footer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 44, marginTop: 6 },
  character: { marginBottom: -22, opacity: 0.95 },
  done: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneHit: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
