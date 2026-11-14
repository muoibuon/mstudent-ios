import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export type AppIconChoice = 'default' | 'envelope' | 'star';

interface AppIconState {
  selected: string | null;
  isPending: boolean;
}

interface NativeAppIcon {
  supportsAlternateIcons(): boolean;
  getAppIconState(): AppIconState;
  setAppIconAsync(name: string | null, options: { deferUntilBackground?: boolean }): Promise<void>;
}

// Expo Go không có module native; requireOptionalNativeModule giữ màn Cài đặt dùng được ở đó.
const nativeIcon = requireOptionalNativeModule<NativeAppIcon>('AwesomeAppIcon');

export function canChangeAppIcon(): boolean {
  return nativeIcon?.supportsAlternateIcons() ?? false;
}

export function currentAppIcon(): { choice: AppIconChoice; pending: boolean } {
  const state = nativeIcon?.getAppIconState();
  const choice = state?.selected === 'envelope' || state?.selected === 'star' ? state.selected : 'default';
  return { choice, pending: state?.isPending ?? false };
}

export async function changeAppIcon(choice: AppIconChoice): Promise<void> {
  if (!canChangeAppIcon()) throw new Error('Bản cài hiện tại không hỗ trợ đổi biểu tượng.');
  await nativeIcon!.setAppIconAsync(choice === 'default' ? null : choice, {
    deferUntilBackground: Platform.OS === 'android',
  });
}
