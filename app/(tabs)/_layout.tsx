// Thanh tab nổi theo UI Kit: thẻ trắng bo 34, bóng 0 8 24; mục đang chọn là vòng tròn đen, icon vàng chanh
// (chế độ tối: vòng vàng chanh, icon mực). Mỗi màn tự vẽ tiêu đề của mình nên tắt header mặc định.

import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { MotionPressable } from '@/components/MotionPressable';
import { usePalette } from '@/constants/theme';
import { useReducedMotion } from '@/lib/useReducedMotion';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Trợ lý', icon: 'chat' },
  tasks: { label: 'Việc', icon: 'tasks' },
  calendar: { label: 'Lịch', icon: 'calendar' },
  settings: { label: 'Cài đặt', icon: 'settings' },
};

function TabButton({ tab, focused, onSelect }: { tab: { label: string; icon: IconName }; focused: boolean; onSelect: () => void }) {
  const c = usePalette();
  const reducedMotion = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!focused || reducedMotion) {
      scale.stopAnimation();
      scale.setValue(1);
      return;
    }
    scale.setValue(0.88);
    const animation = Animated.spring(scale, { toValue: 1, friction: 7, tension: 150, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [focused, reducedMotion, scale]);

  return (
    <Animated.View style={{ width: 52, height: 52, transform: [{ scale }] }}>
      <MotionPressable
        pressedScale={0.9}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: focused }}
        onPress={() => {
          if (!focused) onSelect();
        }}
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? c.active : 'transparent',
        }}>
        <Icon name={tab.icon} color={focused ? c.onActive : c.muted} />
      </MotionPressable>
    </Animated.View>
  );
}

function FloatingTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        position: 'absolute',
        left: 24,
        right: 24,
        bottom: Math.max(insets.bottom, 12) + 8,
        height: 68,
        borderRadius: 34,
        backgroundColor: c.surface,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        shadowColor: '#141414',
        shadowOpacity: c.bg === '#FFFFFF' ? 0.12 : 0.5,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }}>
      {state.routes.map((route, i) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        return <TabButton key={route.key} tab={tab} focused={state.index === i} onSelect={() => navigateToTab(route.key)} />;
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Trợ lý' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Việc' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Lịch' }} />
      <Tabs.Screen name="settings" options={{ title: 'Cài đặt' }} />
    </Tabs>
  );
}
