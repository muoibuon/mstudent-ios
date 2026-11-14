// Tab Cài đặt: tài khoản, Gmail, thống kê, nhắc việc, dữ liệu demo.

import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Display, Muted, T } from '@/components/ui';
import { BRAND, FONT, SCREEN_PAD, TAB_BAR_SPACE, usePalette } from '@/constants/theme';
import { api, authApi } from '@/lib/api';
import { fmtDue } from '@/lib/dates';
import { gmailGrantErrorMessage } from '@/lib/errors';
import { googleAvailable, googleGrantGmail } from '@/lib/google';
import { scheduledCount, sendTest, supported as notifSupported } from '@/lib/notifications';
import { useStore } from '@/lib/store';
import type { GmailStatus, PublicConfig, Stats } from '@/lib/types';

export default function SettingsScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { user, settings, updateSettings, refresh, scheduled, signOut, reloadUser, tasks } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [gmail, setGmail] = useState<GmailStatus | null>(null);
  const [cfg, setCfg] = useState<PublicConfig | null>(null);
  const [gmailMsg, setGmailMsg] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  const load = useCallback(() => {
    api.stats().then(setStats).catch(() => {});
    api.gmailStatus().then(setGmail).catch(() => {});
    api.publicConfig().then(setCfg).catch(() => {});
  }, []);

  useEffect(load, [load, tasks.length]);
  useEffect(() => {
    scheduledCount().then(setPending).catch(() => setPending(null));
  }, [scheduled]);

  /** Chạy một việc có trạng thái bận + báo lỗi thống nhất. */
  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Lỗi', (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const connectGmail = () =>
    run('gmail', async () => {
      if (!cfg) throw new Error('Chưa tải được cấu hình server');
      let g;
      try {
        g = await googleGrantGmail(cfg.google);
      } catch (e) {
        // Google từ chối người chưa nằm trong danh sách test user → báo rõ thay vì mã lỗi khó hiểu.
        throw new Error(gmailGrantErrorMessage(e));
      }
      if (!g) return;
      if (!g.serverAuthCode) throw new Error('Google không trả mã uỷ quyền — kiểm tra webClientId và quyền Gmail');
      setGmail(await api.gmailConnect(g.serverAuthCode));
      await reloadUser();
      setGmailMsg('Đã kết nối. Bấm “Quét Gmail” để AI đọc thư mới.');
    });

  const syncGmail = () =>
    run('sync', async () => {
      const r = await api.gmailSync(7);
      setGmailMsg(
        `Đã quét ${r.scanned} thư, ${r.new} thư mới → tạo ${r.tasks_created} việc, cập nhật ${r.tasks_updated}, lọc ${r.noise_filtered} thư không liên quan.`,
      );
      await refresh();
      load();
    });

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom + 8 }}
      keyboardShouldPersistTaps="handled">
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <Display size={32}>Cài đặt</Display>
        <View style={[styles.account, { backgroundColor: BRAND.pink }]} accessibilityLabel="Tài khoản">
          <T v="title" color={BRAND.ink}>
            {user?.name || user?.email}
          </T>
          <T v="small" color={BRAND.ink}>
            {user?.email}
            {user?.google_linked ? ' · đăng nhập bằng Google' : ' · đăng nhập bằng mật khẩu'}
            {user?.is_admin ? ' · quản trị viên' : ''}
          </T>
          <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
            <Button small variant="dark" label="Đăng xuất" busy={busy === 'out'} onPress={() => run('out', signOut)} />
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: SCREEN_PAD, gap: 14, marginTop: 16 }}>
        {stats && (
          <View style={{ gap: 8 }}>
            <T v="label" color={c.muted}>
              MSTUDENT ĐÃ GIÚP BẠN
            </T>
            <View style={styles.statGrid}>
              <Stat value={stats.messages_read} label="thông báo đã đọc" tone={BRAND.lime} />
              <Stat value={stats.noise_filtered} label="tin nhiễu đã lọc" tone={BRAND.pink} />
              <Stat value={stats.tasks_created} label="việc tìm được" tone={BRAND.periwinkle} />
              <Stat value={stats.changes_caught} label="lần đổi hạn bắt kịp" tone={BRAND.mint} />
              <Stat value={stats.tasks_done} label="việc đã xong" />
              <Stat value={stats.ai_runs} label="lượt AI chạy" />
            </View>
          </View>
        )}

        <Card>
          <T v="title">Hồ sơ học tập</T>
          <Muted style={{ marginTop: 4 }}>Trường, bậc và ngành giúp MStudent đánh giá sự kiện nào có ích cho bạn.</Muted>
          <View style={{ marginTop: 12 }}>
            <Button variant="outline" label="Sửa trường / ngành" onPress={() => router.push('/profile')} />
          </View>
        </Card>

        <Card>
          <T v="title">Nguồn tự động</T>
          <Muted style={{ marginTop: 4 }}>
            Bảng deadline của lớp, lịch LMS, Gmail, Classroom: kết nối một lần, MStudent tự tạo việc kể cả khi bạn không mở app.
          </Muted>
          <View style={{ marginTop: 12 }}>
            <Button label="Quản lý nguồn tự động" onPress={() => router.push('/sources')} />
          </View>
        </Card>

        <Card>
          <T v="title">Gmail</T>
          {gmail?.connected ? (
            <>
              <T v="small" color={c.ok} style={{ marginTop: 4 }}>
                Đã kết nối · {gmail.email}
              </T>
              <Muted>Chỉ đọc. Lần quét gần nhất: {gmail.last_sync_at ? fmtDue(gmail.last_sync_at) : 'chưa quét'}</Muted>
              <View style={styles.rowButtons}>
                <View style={{ flex: 1 }}>
                  <Button small label="Quét Gmail" busy={busy === 'sync'} onPress={syncGmail} />
                </View>
                <Button
                  small
                  variant="outline"
                  label="Ngắt"
                  busy={busy === 'gdis'}
                  onPress={() =>
                    run('gdis', async () => {
                      setGmail(await api.gmailDisconnect());
                      setGmailMsg(null);
                      await reloadUser();
                    })
                  }
                />
              </View>
            </>
          ) : !cfg?.google.gmail ? (
            <Muted style={{ marginTop: 4 }}>Máy chủ chưa cấu hình Google Cloud (GOOGLE_WEB_CLIENT_ID, GOOGLE_CLIENT_SECRET).</Muted>
          ) : !googleAvailable ? (
            <Muted style={{ marginTop: 4 }}>Bản app này chưa có Google Sign-In (Expo Go/web). Hãy dùng bản build.</Muted>
          ) : (
            <>
              <Muted style={{ marginTop: 4, marginBottom: 12 }}>
                Cho MStudent quyền CHỈ ĐỌC hộp thư để AI tự tìm hạn nộp, lịch thi trong email của trường. Mã truy cập được mã hoá và chỉ lưu trên máy chủ.
              </Muted>
              <Button label="Kết nối Gmail" busy={busy === 'gmail'} onPress={connectGmail} />
            </>
          )}
          {gmailMsg && <T v="small" style={{ marginTop: 8 }}>{gmailMsg}</T>}
        </Card>

        <Card>
          <T v="title">Nhắc việc trên máy</T>
          {notifSupported ? (
            <>
              <View style={styles.switchRow}>
                <T v="small" style={{ flex: 1 }}>
                  Nhắc trước hạn 3 ngày, 1 ngày, 2 giờ và đúng giờ
                </T>
                <Switch
                  value={settings.remindersOn}
                  onValueChange={(v) => updateSettings({ remindersOn: v })}
                  trackColor={{ true: BRAND.lime, false: c.line }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel="Nhắc việc trên máy"
                />
              </View>
              <Muted>Đang hẹn {pending ?? scheduled} thông báo. Không cần mạng khi đến giờ nhắc.</Muted>
              {Platform.OS === 'ios' && (
                <Muted style={{ marginTop: 4 }}>
                  iPhone: việc mới do máy chủ tự tạo có ngay khi mở app; khi app đóng, iOS quyết định lúc cập nhật nền.
                </Muted>
              )}
              <View style={{ marginTop: 12 }}>
                <Button
                  small
                  variant="outline"
                  label="Gửi thông báo thử sau 5 giây"
                  onPress={async () => {
                    if (!(await sendTest(5))) Alert.alert('Chưa có quyền', 'Hãy cho phép MStudent gửi thông báo trong Cài đặt của máy.');
                  }}
                />
              </View>
            </>
          ) : (
            <Muted style={{ marginTop: 4 }}>Bản web không hỗ trợ nhắc việc. Hãy dùng app trên iOS/Android.</Muted>
          )}
        </Card>

        <Card>
          <T v="title">Dữ liệu demo</T>
          <Muted style={{ marginTop: 4, marginBottom: 12 }}>
            Xoá dữ liệu của bạn trên máy chủ và nạp 9 thông báo mẫu (email, LMS, Zalo, có cả spam).
          </Muted>
          <Button
            small
            variant="dark"
            label="Nạp dữ liệu demo"
            busy={busy === 'seed'}
            onPress={() =>
              run('seed', async () => {
                const rs = await api.seed();
                const made = rs.reduce((a, r) => a + r.created.length, 0);
                const skip = rs.filter((r) => !r.relevant).length;
                await refresh();
                Alert.alert('Đã nạp', `${rs.length} thông báo → ${made} việc, bỏ qua ${skip} tin không liên quan.`);
              })
            }
          />
        </Card>

        {showDelete ? (
          <Card>
            <T v="title" color={c.bad}>
              Xoá tài khoản
            </T>
            <Muted style={{ marginTop: 4, marginBottom: 8 }}>
              Xoá vĩnh viễn tài khoản, mọi việc, thông báo và quyền Gmail. Nhập email của bạn để xác nhận.
            </Muted>
            <TextInput
              value={confirmEmail}
              onChangeText={setConfirmEmail}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={user?.email}
              placeholderTextColor={c.muted}
              style={[styles.input, { color: c.text, backgroundColor: c.bg, fontFamily: FONT.regular }]}
              accessibilityLabel="Nhập email để xác nhận xoá"
            />
            <View style={styles.rowButtons}>
              <View style={{ flex: 1 }}>
                <Button
                  small
                  variant="dark"
                  label="Xoá vĩnh viễn"
                  busy={busy === 'del'}
                  disabled={confirmEmail.trim().toLowerCase() !== user?.email}
                  onPress={() =>
                    run('del', async () => {
                      await authApi.deleteAccount(confirmEmail.trim());
                      await signOut();
                    })
                  }
                />
              </View>
              <Button
                small
                variant="outline"
                label="Huỷ"
                onPress={() => {
                  setShowDelete(false);
                  setConfirmEmail('');
                }}
              />
            </View>
          </Card>
        ) : (
          <Pressable onPress={() => setShowDelete(true)} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
            <T v="small" color={c.bad} style={{ fontFamily: FONT.semibold }}>
              Xoá tài khoản và dữ liệu…
            </T>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: string }) {
  const c = usePalette();
  const onTone = !!tone;
  return (
    <View style={[styles.stat, { backgroundColor: tone ?? c.soft }]}>
      <T style={{ fontFamily: FONT.bold, fontSize: 24, fontVariant: ['tabular-nums'] }} color={onTone ? BRAND.ink : c.text}>
        {value}
      </T>
      <T style={{ fontSize: 12 }} color={onTone ? BRAND.ink : c.muted}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: BRAND.cobalt, paddingHorizontal: SCREEN_PAD, paddingBottom: 20, gap: 14, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  account: { borderRadius: 28, padding: 18, gap: 2 },
  input: { height: 48, borderRadius: 16, paddingHorizontal: 14, fontSize: 15 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, marginBottom: 6 },
  rowButtons: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { flexBasis: '31%', flexGrow: 1, borderRadius: 20, padding: 12, gap: 2 },
});
