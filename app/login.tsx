// Đăng nhập / đăng ký (UI Kit, artboard "1 · Đăng nhập"): nền coban, tiêu đề Baloo 2, Meme; tấm trắng với tab
// Đăng nhập / Đăng ký. Địa chỉ máy chủ đã điền sẵn (bản build) → ẩn sau "Đổi máy chủ"; lỗi kết nối thì tự mở ra.

import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Meme } from '@/components/Mascot';
import { Button, Display, Muted, T } from '@/components/ui';
import { BRAND, FONT, SCREEN_PAD, usePalette } from '@/constants/theme';
import { api } from '@/lib/api';
import { googleAvailable } from '@/lib/google';
import { useStore } from '@/lib/store';
import type { Health, PublicConfig } from '@/lib/types';
import { normalizeUrl } from '@/lib/url';

export default function LoginScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, signIn, signUp, signInWithGoogle } = useStore();
  const [url, setUrl] = useState(settings.baseUrl);
  const [server, setServer] = useState<{ health: Health; cfg: PublicConfig } | null>(null);
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [editServer, setEditServer] = useState(!settings.baseUrl);
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [probe, setProbe] = useState(0); // tăng lên để kiểm tra lại cùng một địa chỉ

  const check = useCallback(
    async (value: string) => {
      const normalized = normalizeUrl(value);
      if (!normalized) return;
      setChecking(true);
      setServerErr(null);
      await updateSettings({ baseUrl: normalized });
      setProbe((n) => n + 1);
    },
    [updateSettings],
  );

  // Gọi thử server mỗi khi địa chỉ đổi (kể cả địa chỉ đã lưu từ lần mở app trước).
  useEffect(() => {
    if (!settings.baseUrl) return;
    let alive = true;
    Promise.all([api.health(), api.publicConfig()])
      .then(([health, cfg]) => {
        if (!alive) return;
        setServer({ health, cfg });
        setServerErr(null);
      })
      .catch((e: Error) => {
        if (!alive) return;
        setServer(null);
        setServerErr(e.message);
        setEditServer(true);
      })
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
  }, [settings.baseUrl, probe]);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      if (register) await signUp(email.trim(), password, name.trim());
      else await signIn(email.trim(), password);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    if (!server) return;
    setErr(null);
    setBusy(true);
    try {
      await signInWithGoogle(server.cfg.google);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input = [styles.input, { color: c.text, backgroundColor: c.soft, fontFamily: FONT.regular }];
  const canSubmit = !!server && email.includes('@') && password.length >= 8;
  const host = settings.baseUrl.replace(/^https?:\/\//, '');
  const live = server?.health.mode === 'llm';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BRAND.cobalt }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={{ paddingTop: insets.top + 28, paddingHorizontal: 24, minHeight: 360 }}>
          <Display size={42}>{'Mọi thông báo,\ngọn trong\nmột chỗ'}</Display>
          <View style={styles.hero} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={[styles.blob, { backgroundColor: BRAND.pink, right: 24, top: 70, width: 44, height: 44 }]} />
            <View style={[styles.blob, { backgroundColor: BRAND.periwinkle, left: 0, top: 110, width: 48, height: 48 }]} />
            <View style={styles.speech}>
              <T style={{ fontFamily: FONT.display, fontSize: 22, lineHeight: 31 }} color={BRAND.cobalt}>
                Bắt đầu nào!
              </T>
            </View>
            <Meme size={170} wave />
          </View>
        </View>

        <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.segment, { backgroundColor: c.soft }]} accessibilityRole="tablist">
            {(['Đăng nhập', 'Đăng ký'] as const).map((label, i) => {
              const on = (i === 1) === register;
              return (
                <Pressable
                  key={label}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    setRegister(i === 1);
                    setErr(null);
                  }}
                  disabled={i === 1 && server?.cfg.registration_open === false}
                  style={[styles.segBtn, on && { backgroundColor: c.active }]}>
                  <T style={{ fontFamily: on ? FONT.semibold : FONT.medium, fontSize: 14 }} color={on ? (c.active === BRAND.ink ? '#FFFFFF' : BRAND.ink) : c.text}>
                    {label}
                  </T>
                </Pressable>
              );
            })}
          </View>

          {register && (
            <Field label="Tên">
              <TextInput value={name} onChangeText={setName} placeholder="Tên của bạn" placeholderTextColor={c.muted} style={input} maxLength={100} />
            </Field>
          )}
          <Field label="Email">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ban@sv.edu.vn"
              placeholderTextColor={c.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="username"
              style={input}
            />
          </Field>
          <Field label="Mật khẩu">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Ít nhất 8 ký tự"
              placeholderTextColor={c.muted}
              secureTextEntry
              autoComplete={register ? 'new-password' : 'current-password'}
              textContentType={register ? 'newPassword' : 'password'}
              style={input}
              maxLength={128}
              onSubmitEditing={() => canSubmit && submit()}
            />
          </Field>
          {err && <T v="small" color={c.bad}>{err}</T>}
          <Button label={register ? 'Đăng ký' : 'Đăng nhập'} busy={busy} disabled={!canSubmit} onPress={submit} />
          {server?.cfg.google.enabled && googleAvailable && (
            <Button variant="outline" label="Tiếp tục với Google" disabled={busy} onPress={google} />
          )}

          {editServer ? (
            <View style={{ gap: 8, marginTop: 4 }}>
              <T v="label" color={c.muted}>
                MÁY CHỦ
              </T>
              <TextInput
                value={url}
                onChangeText={setUrl}
                onSubmitEditing={() => check(url)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="https://… hoặc 192.168.1.5:8000"
                placeholderTextColor={c.muted}
                style={input}
                accessibilityLabel="Địa chỉ máy chủ"
              />
              <Button variant="ghost" small label={server ? 'Kiểm tra lại' : 'Kết nối'} busy={checking} disabled={!url.trim()} onPress={() => check(url)} />
              {serverErr && <T v="small" color={c.bad}>Không kết nối được: {serverErr}</T>}
              {!server && <Muted>Nhập địa chỉ máy chủ MStudent (bản production đã điền sẵn).</Muted>}
            </View>
          ) : (
            <Pressable onPress={() => setEditServer(true)} accessibilityRole="button" style={styles.serverLine}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: !server ? c.muted : live ? '#1A9E6A' : BRAND.amberInk }} />
              <T style={{ fontSize: 12 }} color={c.muted} numberOfLines={1}>
                {host} · {checking || !server ? 'đang kết nối…' : live ? 'đã kết nối' : 'Bộ luật (offline)'} · Đổi máy chủ
              </T>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const c = usePalette();
  return (
    <View style={{ gap: 4 }}>
      <T style={{ fontFamily: FONT.semibold, fontSize: 12 }} color={c.muted}>
        {label}
      </T>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 230, alignItems: 'center', justifyContent: 'flex-end' },
  blob: { position: 'absolute', borderRadius: 999 },
  speech: {
    position: 'absolute',
    left: 4,
    top: 6,
    backgroundColor: BRAND.mint,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
    transform: [{ rotate: '-8deg' }],
  },
  sheet: { flex: 1, borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingTop: 22, paddingHorizontal: 24, gap: 12 },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 16 },
  segBtn: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  input: { height: 50, borderRadius: 16, paddingHorizontal: 16, fontSize: 15 },
  serverLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6, marginTop: 2, paddingHorizontal: SCREEN_PAD },
});
