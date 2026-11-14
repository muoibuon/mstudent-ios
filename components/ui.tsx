// Thành phần dùng chung theo MStudent UI Kit v1: không viền xám, tách khối bằng màu nền, bo 28/20/16/999,
// chữ Lexend (Baloo 2 cho tiêu đề IN HOA), thẻ việc màu theo ưu tiên + nhân vật theo loại việc.

import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
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
import { BRAND, FONT, PRIORITY_BG, PRIORITY_LABEL, RADIUS, TYPE, usePalette } from '@/constants/theme';
import { relativeDay } from '@/lib/dates';
import { taskSourcesLabel } from '@/lib/sources';
import { CATEGORY_LABEL, type Task } from '@/lib/types';

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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        { backgroundColor: l.bg },
        l.border ? { borderWidth: 2, borderColor: l.border } : null,
        (pressed || disabled) && { opacity: 0.55 },
      ]}>
      {busy ? (
        <ActivityIndicator color={l.fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon}
          <Text style={{ fontFamily: FONT.semibold, fontSize: small ? 13 : 16, color: l.fg }}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Chip (viên): đang chọn = nền đen/chữ trắng (tối: vàng chanh/mực); chưa chọn = nền sương. */
export function Chip({ label, onPress, active, tone }: { label: string; onPress?: () => void; active?: boolean; tone?: string }) {
  const c = usePalette();
  const bg = active ? c.active : (tone ?? c.soft);
  const fg = active ? (c.active === BRAND.ink ? '#FFFFFF' : BRAND.ink) : tone ? BRAND.ink : c.text;
  return (
    <Pressable
      onPress={onPress}
      style={[s.chip, { backgroundColor: bg }]}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected: !!active } : undefined}>
      <Text style={{ color: fg, fontSize: 13, fontFamily: active ? FONT.semibold : FONT.medium }}>{label}</Text>
    </Pressable>
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

/** Báo rõ khi kết quả đến từ quy tắc cơ bản thay vì AI. */
export function OfflineNotice() {
  return (
    <View style={[s.pill, { backgroundColor: BRAND.amber }]} accessibilityLabel="Không dùng AI">
      <Text style={{ color: BRAND.amberInk, fontSize: 13, fontFamily: FONT.semibold }}>
        Không dùng AI
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
 * nút tròn đen "xong" ở góc phải. Nội dung dài được hiển thị trọn vẹn và có khoảng cách giữa các thẻ.
 */
export function TaskCard({
  task,
  now,
  onDone,
  onLongPress,
}: {
  task: Task;
  now: Date;
  onDone?: () => void;
  onLongPress?: () => void;
}) {
  const bg = PRIORITY_BG[task.priority];
  const meta = [
    PRIORITY_LABEL[task.priority],
    CATEGORY_LABEL[task.category],
    task.due_at ? relativeDay(task.due_at, now) : 'Không có hạn',
    taskSourcesLabel(task.sources ?? [], task.source),
  ].join(' · ');
  return (
    <Pressable
      onLongPress={onLongPress}
      accessibilityHint={onLongPress ? 'Nhấn giữ để đổi hạn' : undefined}
      style={[s.taskCard, { backgroundColor: bg }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <Text style={[TYPE.title, { color: BRAND.ink, flex: 1 }]}>
          {task.title}
        </Text>
        <Text style={{ fontFamily: FONT.semibold, fontSize: 15, color: BRAND.ink }}>{timeLabel(task.due_at, now)}</Text>
      </View>
      <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: BRAND.ink, paddingRight: 56 }}>
        {meta}
        {task.location ? ` · ${task.location}` : ''}
        {task.updated_from.length ? ' · đã cập nhật' : ''}
      </Text>
      {task.note ? (
        <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: BRAND.ink, fontStyle: 'italic' }}>{task.note}</Text>
      ) : null}
      <View pointerEvents="none" style={s.character}>
        <CategoryCharacter category={task.category} cardBg={bg} size={72} />
      </View>
      {onDone && (
        <Pressable
          onPress={onDone}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Đánh dấu xong: ${task.title}`}
          style={s.done}>
          <Icon name="check" color="#FFFFFF" size={20} stroke={2.6} />
        </Pressable>
      )}
    </Pressable>
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
    minHeight: 152,
    marginBottom: 12,
    borderRadius: RADIUS.card,
    paddingTop: 22,
    paddingHorizontal: 18,
    paddingBottom: 72,
    overflow: 'hidden',
    gap: 4,
  },
  character: { position: 'absolute', left: '40%', bottom: -10, opacity: 0.95 },
  done: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
