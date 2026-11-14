import { useState } from 'react';
import { Alert, Image, Platform, Pressable, View } from 'react-native';

import { Card, Muted, T } from '@/components/ui';
import { BRAND, FONT, usePalette } from '@/constants/theme';
import { canChangeAppIcon, changeAppIcon, currentAppIcon, type AppIconChoice } from '@/lib/appIcon';

const ICONS = [
  { choice: 'default', label: 'A · Meme', image: require('@/assets/icons/logo-a.png') },
  { choice: 'envelope', label: 'B · Chữ M', image: require('@/assets/icons/logo-b.png') },
  { choice: 'star', label: 'C · Ngôi sao', image: require('@/assets/icons/logo-c.png') },
] as const;

export function AppIconPicker() {
  const c = usePalette();
  const supported = canChangeAppIcon();
  const [selected, setSelected] = useState(currentAppIcon);
  const [busy, setBusy] = useState(false);

  async function choose(choice: AppIconChoice) {
    if (!supported || busy || selected.choice === choice) return;
    setBusy(true);
    try {
      await changeAppIcon(choice);
      setSelected(currentAppIcon());
    } catch (error) {
      Alert.alert('Không đổi được biểu tượng', (error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <T v="title">Biểu tượng ứng dụng</T>
      <Muted style={{ marginTop: 4 }}>Chọn hình hiển thị trên màn hình chính.</Muted>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        {ICONS.map(({ choice, label, image }) => {
          const active = selected.choice === choice;
          return (
            <Pressable
              key={choice}
              accessibilityRole="button"
              accessibilityLabel={`Biểu tượng ${label}`}
              accessibilityState={{ selected: active, disabled: !supported || busy }}
              disabled={!supported || busy}
              onPress={() => choose(choice)}
              style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 6, opacity: pressed ? 0.6 : 1 })}>
              <View style={{ padding: 3, borderRadius: 22, borderWidth: 2, borderColor: active ? c.active : 'transparent' }}>
                <Image source={image} style={{ width: 72, height: 72, borderRadius: 17 }} />
              </View>
              <T v="small" numberOfLines={1} style={{ fontFamily: active ? FONT.semibold : FONT.regular, fontSize: 11 }}>
                {label}
              </T>
              <T v="small" color={active ? BRAND.cobalt : c.muted} style={{ fontSize: 10 }}>
                {active ? 'Đang dùng' : 'Chọn'}
              </T>
            </Pressable>
          );
        })}
      </View>
      {!supported && <Muted style={{ marginTop: 10 }}>Đổi biểu tượng chỉ hoạt động trong bản ứng dụng đã cài trên điện thoại.</Muted>}
      {selected.pending && Platform.OS === 'android' && (
        <Muted style={{ marginTop: 10 }}>Biểu tượng mới sẽ hiện sau khi đóng ứng dụng.</Muted>
      )}
    </Card>
  );
}
