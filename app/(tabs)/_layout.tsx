// Thanh tab nổi theo UI Kit: thẻ trắng bo 34, bóng 0 8 24; mục đang chọn là vòng tròn đen, icon vàng chanh
// (chế độ tối: vòng vàng chanh, icon mực). Mỗi màn tự vẽ tiêu đề của mình nên tắt header mặc định.

import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Tabs } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
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

function FloatingTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [indicatorX] = useState(() => new Animated.Value(0));
  const positioned = useRef(false);
  const slotWidth = width / state.routes.length;

  useEffect(() => {
    if (!slotWidth) return;
    const target = state.index * slotWidth;
    if (!positioned.current || reducedMotion) {
      indicatorX.stopAnimation();
      indicatorX.setValue(target);
      positioned.current = true;
      return;
    }
    const animation = Animated.spring(indicatorX, {
      toValue: target,
      damping: 18,
      stiffness: 220,
      mass: 1,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [state.index, slotWidth, reducedMotion, indicatorX]);

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        position: 'absolute',
        left: 24,
        right: 24,
        bottom: Math.max(insets.bottom, 12) + 8,
        height: 68,
        borderRadius: 34,
        backgroundColor: c.surface,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#141414',
        shadowOpacity: c.bg === '#FFFFFF' ? 0.12 : 0.5,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }}>
      {slotWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 8,
            left: (slotWidth - 52) / 2,
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: c.active,
            transform: [{ translateX: indicatorX }],
          }}
        />
      )}
      {state.routes.map((route, i) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const activeOpacity = slotWidth
          ? indicatorX.interpolate({
              inputRange: [(i - 1) * slotWidth, i * slotWidth, (i + 1) * slotWidth],
              outputRange: [0, 1, 0],
              extrapolate: 'clamp',
            })
          : state.index === i ? 1 : 0;
        return (
          <View key={route.key} style={{ flex: 1, alignItems: 'center' }}>
            <MotionPressable
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: state.index === i }}
              onPress={() => {
                if (state.index !== i) navigateToTab(route.key);
              }}
              style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={tab.icon} color={c.muted} />
              <Animated.View pointerEvents="none" style={{ position: 'absolute', opacity: activeOpacity }}>
                <Icon name={tab.icon} color={c.onActive} />
              </Animated.View>
            </MotionPressable>
          </View>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const reducedMotion = useReducedMotion();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: reducedMotion ? 'none' : 'shift',
        transitionSpec: {
          animation: 'timing',
          config: { duration: 220, easing: Easing.out(Easing.cubic) },
        },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Trợ lý' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Việc' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Lịch' }} />
      <Tabs.Screen name="settings" options={{ title: 'Cài đặt' }} />
    </Tabs>
  );
}
