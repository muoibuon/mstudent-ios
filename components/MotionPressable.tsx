import { useEffect, useState } from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useReducedMotion } from '@/lib/useReducedMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
};

/** Phản hồi nhấn ngắn, không đổi bố cục; tắt khi hệ thống bật Giảm chuyển động. */
export function MotionPressable({ style, pressedScale = 0.96, onPressIn, onPressOut, disabled, ...rest }: Props) {
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reduced || disabled) {
      scale.stopAnimation();
      scale.setValue(1);
    }
  }, [reduced, disabled, scale]);

  const spring = (toValue: number) => {
    if (reduced) return;
    if (toValue < 1 && (disabled || (!rest.onPress && !rest.onLongPress))) return;
    Animated.spring(scale, { toValue, friction: 8, tension: 170, useNativeDriver: true }).start();
  };

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(event) => {
        spring(pressedScale);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        spring(1);
        onPressOut?.(event);
      }}
      style={[style, { transform: [{ scale }] }]}
    />
  );
}
