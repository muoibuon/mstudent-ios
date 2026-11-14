import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing } from 'react-native';

import { useReducedMotion } from '@/lib/useReducedMotion';

const EASE = Easing.out(Easing.cubic);

function enter(progress: Animated.Value, reducedMotion: boolean, delay: number, duration: number) {
  progress.stopAnimation();
  progress.setValue(reducedMotion ? 1 : 0);
  if (reducedMotion) return () => {};
  const animation = Animated.sequence([
    Animated.delay(delay),
    Animated.timing(progress, { toValue: 1, duration, easing: EASE, useNativeDriver: true }),
  ]);
  animation.start();
  return () => animation.stop();
}

function content(progress: Animated.Value, distance: number) {
  return {
    opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  };
}

/** Chạy lại khi tab nhận focus, kể cả khi màn vẫn được giữ trong bộ nhớ. */
export function MotionScreen({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(reducedMotion ? 1 : 0));

  useFocusEffect(useCallback(() => enter(progress, reducedMotion, 0, 260), [progress, reducedMotion]));

  return <Animated.View style={[{ flex: 1 }, content(progress, 18)]}>{children}</Animated.View>;
}

/** Dùng cho nội dung mới xuất hiện sau khi đổi ngày hoặc tải dữ liệu. */
export function MotionAppear({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(reducedMotion ? 1 : 0));

  useEffect(() => enter(progress, reducedMotion, delay, 220), [progress, reducedMotion, delay]);

  return <Animated.View style={content(progress, 12)}>{children}</Animated.View>;
}
