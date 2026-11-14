// Tab Trợ lý (UI Kit, artboard "2 · Trợ lý"): lời chào, khối "N VIỆC HÔM NAY", chat với agent (agent tự gọi tool),
// gợi ý nhanh, ô nhập + nút gửi tròn.

import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Meme, MemeAvatar } from '@/components/Mascot';
import { MotionScreen } from '@/components/MotionEntrance';
import { MotionPressable } from '@/components/MotionPressable';
import { Chip, Display, ErrorBanner, OfflineNotice, T, timeLabel } from '@/components/ui';
import { BRAND, FONT, SCREEN_PAD, TAB_BAR_SPACE, usePalette } from '@/constants/theme';
import { api } from '@/lib/api';
import { validateChatFile } from '@/lib/chatFile';
import { bucketOf } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { useReducedMotion } from '@/lib/useReducedMotion';
import type { ChatFile, ChatTurn } from '@/lib/types';

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  mode?: string;
  context?: string;
}

const SUGGESTIONS = ['Hôm nay cần làm gì?', 'Tuần này có gì?', 'Lịch thi sắp tới', 'Bản tin', 'Thêm: thứ 6 tuần sau nộp đồ án OOP'];
const TZ = 'Asia/Ho_Chi_Minh';

function greeting(now: Date): string {
  const h = Number(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: TZ }));
  return h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
}

export default function ChatScreen() {
  return <MotionScreen><ChatContent /></MotionScreen>;
}

function ChatContent() {
  const c = usePalette();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { refresh, error, health, user, tasks, now } = useStore();
  const name = (user?.name || user?.email?.split('@')[0] || '').split(' ').slice(-1)[0];
  const welcome: Msg = useMemo(
    () => ({
      id: 'welcome',
      role: 'assistant',
      text: `Chào ${name || 'bạn'}! Hỏi mình về việc sắp tới, hoặc dán một thông báo để mình ghi lại nhé.`,
    }),
    [name],
  );
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState<ChatFile | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const list = useRef<FlatList<Msg>>(null);

  const today = useMemo(() => tasks.filter((t) => bucketOf(t.due_at, now) === 'Hôm nay'), [tasks, now]);
  const urgent = today.filter((t) => t.priority === 'high').length;
  const soonest = [...today].sort((a, b) => (a.due_at ?? '').localeCompare(b.due_at ?? ''))[0];
  const overdue = tasks.some((t) => bucketOf(t.due_at, now) === 'Quá hạn');
  const nearUrgent = today.some((t) => t.priority === 'high' && t.due_at && new Date(t.due_at).getTime() - now.getTime() < 2 * 60 * 60 * 1000);
  const mood = busy ? 'thinking' : error || health?.mode === 'offline' ? 'offline' : overdue || nearUrgent ? 'worried' : 'happy';

  async function pickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const selected = result.assets[0];
      const validation = validateChatFile(selected);
      setChatError(validation);
      setFile(validation ? null : selected);
    } catch {
      setChatError('Không mở được tệp. Hãy thử chọn lại.');
    }
  }

  async function send(text = input) {
    const message = text.trim();
    if ((!message && !file) || busy) return;
    const attachment = text === input ? file : null;
    const history: ChatTurn[] = msgs.slice(-20).map((m) => ({ role: m.role, content: m.context ?? m.text }));
    setChatError(null);
    setBusy(true);
    try {
      const r = attachment ? await api.chatFile(attachment, message, history) : await api.chat(message, history);
      setMsgs((m) => [
        ...m,
        { id: `u${Date.now()}`, role: 'user', text: attachment ? `📎 ${attachment.name}${message ? `\n${message}` : ''}` : message, context: r.document_context ?? undefined },
        { id: `a${Date.now()}`, role: 'assistant', text: r.reply, mode: r.mode },
      ]);
      if (!attachment || text === input) setInput('');
      if (attachment) setFile(null);
      if (r.tool_calls.some((t) => t.tool !== 'list_tasks')) refresh();
    } catch (e) {
      setChatError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const dateLabel = now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: TZ });
  const data = [welcome, ...msgs, ...(busy ? [{ id: 'typing', role: 'assistant', text: '' } as Msg] : [])];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 12 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingHorizontal: SCREEN_PAD, gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T v="small" color={c.muted} style={{ textTransform: 'capitalize' }}>
            {dateLabel}
          </T>
          {health?.mode === 'offline' && <OfflineNotice />}
        </View>
        <T v="h1" accessibilityRole="header">
          {greeting(now)}
          {name ? `, ${name}` : ''}
        </T>
      </View>

      <MotionPressable
        onPress={() => router.navigate('/tasks')}
        accessibilityRole="button"
        accessibilityLabel={`${today.length} việc hôm nay. Mở danh sách việc`}
        style={[styles.todayCard, { marginHorizontal: SCREEN_PAD }]}>
        <View style={{ gap: 4, flex: 1 }}>
          <Display size={26}>{`${today.length} việc hôm nay`}</Display>
          <T v="small" color="#FFFFFF">
            {today.length
              ? `${urgent} việc gấp${soonest?.due_at ? ` · gần nhất ${timeLabel(soonest.due_at, now)}` : ''}`
              : 'Hôm nay rảnh — xem việc tuần này'}
          </T>
        </View>
        <View style={{ marginRight: -6, marginBottom: -30 }}>
          <Meme size={96} mood={mood} />
        </View>
      </MotionPressable>

      {error && (
        <View style={{ paddingHorizontal: SCREEN_PAD, paddingTop: 10 }}>
          <ErrorBanner message={error} onRetry={refresh} />
        </View>
      )}

      <FlatList
        ref={list}
        data={data}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PAD, paddingTop: 16, gap: 10 }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: !reducedMotion })}
        renderItem={({ item }) => (item.id === 'typing' ? <Typing /> : <Bubble msg={item} />)}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ gap: 8, paddingHorizontal: SCREEN_PAD, paddingBottom: 10 }}
        keyboardShouldPersistTaps="handled">
        {SUGGESTIONS.map((s, i) => (
          <Chip key={s} label={s} tone={i === 0 ? BRAND.lime : undefined} onPress={() => send(s)} />
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: SCREEN_PAD, paddingBottom: TAB_BAR_SPACE + insets.bottom - 8, gap: 8 }}>
        {file && (
          <View style={[styles.fileChip, { backgroundColor: c.soft }]}>
            <T v="small" numberOfLines={1} style={{ flex: 1 }}>📎 {file.name}</T>
            <MotionPressable onPress={() => setFile(null)} accessibilityRole="button" accessibilityLabel={`Bỏ tệp ${file.name}`} style={styles.removeFile}>
              <Icon name="close" color={c.text} size={18} />
            </MotionPressable>
          </View>
        )}
        {chatError && <T v="small" color={c.bad} accessibilityRole="alert">{chatError}</T>}
        <View style={styles.inputRow}>
          <MotionPressable
            onPress={pickFile}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Thêm tệp vào trò chuyện"
            accessibilityHint="Chọn tệp PDF, Word, Excel, CSV hoặc TXT, tối đa 5 MB"
            style={[styles.addFile, { backgroundColor: c.soft, opacity: busy ? 0.5 : 1 }]}>
            <Icon name="plus" color={c.text} size={26} stroke={2.4} />
          </MotionPressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={file ? 'Hỏi về tệp này…' : 'Hỏi hoặc dán thông báo…'}
            placeholderTextColor={c.muted}
            multiline
            style={[styles.input, { color: c.text, backgroundColor: c.soft, fontFamily: FONT.regular }]}
            accessibilityLabel="Tin nhắn cho trợ lý"
          />
          <MotionPressable
            onPress={() => send()}
            disabled={busy || (!input.trim() && !file)}
            accessibilityRole="button"
            accessibilityLabel="Gửi"
            style={[styles.send, { backgroundColor: c.active, opacity: busy || (!input.trim() && !file) ? 0.5 : 1 }]}>
            <Icon name="send" color={c.onActive} size={22} stroke={2.4} />
          </MotionPressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const c = usePalette();
  if (msg.role === 'user') {
    return (
      <View style={[styles.bubble, styles.mine]}>
        <T color="#FFFFFF">{msg.text}</T>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', maxWidth: '92%' }}>
      <MemeAvatar />
      <View style={[styles.bubble, styles.theirs, { backgroundColor: c.soft }]}>
        <T>{msg.text}</T>
        {msg.mode === 'offline' && (
          <View style={{ marginTop: 8 }}>
            <OfflineNotice />
          </View>
        )}
      </View>
    </View>
  );
}

/** Ba chấm nảy "đang trả lời" (tắt chuyển động khi máy bật Giảm chuyển động). */
function Typing() {
  const c = usePalette();
  const reducedMotion = useReducedMotion();
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(0)));
  useEffect(() => {
    if (reducedMotion) {
      dots.forEach((v) => v.setValue(0.5));
      return;
    }
    const anims = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - i * 150),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [dots, reducedMotion]);
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }} accessibilityLabel="Trợ lý đang trả lời" accessibilityRole="progressbar">
      <MemeAvatar thinking />
      <View style={[styles.bubble, styles.theirs, { backgroundColor: c.soft, flexDirection: 'row', gap: 6, paddingVertical: 16 }]}>
        {dots.map((v, i) => (
          <Animated.View
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: c.text,
              opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
              transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  todayCard: {
    marginTop: 16,
    height: 104,
    borderRadius: 28,
    backgroundColor: BRAND.cobalt,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bubble: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20 },
  mine: { alignSelf: 'flex-end', maxWidth: '80%', backgroundColor: BRAND.cobalt, borderBottomRightRadius: 6 },
  theirs: { borderBottomLeftRadius: 6, flexShrink: 1 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  addFile: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  fileChip: { alignSelf: 'flex-start', maxWidth: '100%', minHeight: 40, borderRadius: 20, paddingLeft: 14, paddingRight: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  removeFile: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 52, maxHeight: 120, borderRadius: 26, paddingHorizontal: 18, paddingTop: 15, paddingBottom: 15, fontSize: 15 },
  send: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
