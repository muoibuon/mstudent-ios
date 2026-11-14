// Nhân vật theo UI Kit: "Meme" (phong thư vàng chanh) và nhân vật theo loại việc. Nét đen 2.5px, không emoji.

import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import { BRAND, usePalette } from '@/constants/theme';
import { useReducedMotion } from '@/lib/useReducedMotion';
import type { Category } from '@/lib/types';

const INK = BRAND.ink;

export type MemeMood = 'happy' | 'thinking' | 'sleepy' | 'worried' | 'celebrating' | 'offline';

/** Meme đổi nét mặt theo trạng thái; chuyển động ngừng hẳn khi bật Giảm chuyển động. */
export function Meme({ size = 120, wave = false, mood = 'happy' }: { size?: number; wave?: boolean; mood?: MemeMood }) {
  const c = usePalette();
  const reducedMotion = useReducedMotion();
  const [motion] = useState(() => new Animated.Value(0));
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    motion.stopAnimation();
    motion.setValue(0);
    if (reducedMotion) return;
    const ease = Easing.inOut(Easing.ease);
    const to = (value: number, duration: number) => Animated.timing(motion, { toValue: value, duration, easing: ease, useNativeDriver: true });
    let animation: Animated.CompositeAnimation | null = null;
    if (mood === 'happy') animation = Animated.loop(Animated.sequence([to(1, 1200), to(0, 1200)]));
    if (mood === 'sleepy' || mood === 'offline') animation = Animated.loop(Animated.sequence([to(1, 1500), to(0, 1500)]));
    if (mood === 'worried') {
      animation = Animated.loop(Animated.sequence([
        Animated.delay(880), to(-5, 120), to(5, 120), to(-3, 120), to(2, 120), to(0, 120), Animated.delay(120),
      ]));
    }
    if (mood === 'celebrating') {
      animation = Animated.loop(Animated.sequence([to(2, 165), to(-18, 330), to(0, 605)]), { iterations: 2 });
    }
    animation?.start();
    return () => animation?.stop();
  }, [mood, reducedMotion, motion]);

  useEffect(() => {
    if (reducedMotion || mood !== 'happy') return;
    let close: ReturnType<typeof setTimeout> | undefined;
    const timer = setInterval(() => {
      setBlink(true);
      close = setTimeout(() => setBlink(false), 120);
    }, 4000);
    return () => {
      clearInterval(timer);
      if (close) clearTimeout(close);
      setBlink(false);
    };
  }, [mood, reducedMotion]);

  const bob = motion.interpolate({ inputRange: [0, 1], outputRange: [0, -6], extrapolate: 'clamp' });
  const breath = motion.interpolate({ inputRange: [0, 1], outputRange: [0, 3], extrapolate: 'clamp' });
  const tilt = motion.interpolate({ inputRange: [-5, 0, 5], outputRange: ['-5deg', '0deg', '5deg'], extrapolate: 'clamp' });
  const armsDown = mood === 'sleepy' || mood === 'offline';
  const armsUp = mood === 'worried' || mood === 'celebrating';
  const translateY = mood === 'happy' ? bob : armsDown ? breath : mood === 'celebrating' ? motion : 0;

  return (
    <View style={{ width: size, height: (size * 112) / 120 }}>
      <Animated.View style={{ width: size, height: (size * 112) / 120, transform: [{ translateY }, { rotate: mood === 'worried' ? tilt : '0deg' }] }}>
      <Svg width={size} height={(size * 112) / 120} viewBox="0 0 120 112" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {mood === 'thinking' && <Rect x={74} y={2} width={44} height={22} rx={11} fill="#FFFFFF" stroke={INK} strokeWidth={2} />}
        {mood === 'offline' && <><Path d="M85 15 Q98 3 111 15 M91 21 Q98 15 105 21" fill="none" stroke={c.limbs} strokeWidth={3} strokeLinecap="round" /><Path d="M87 7 L109 27" stroke={c.bad} strokeWidth={3} /></>}
        <Path d={armsDown ? 'M22 62 Q14 72 16 82' : armsUp ? 'M22 50 Q10 40 8 26' : 'M22 56 Q10 58 6 68'} fill="none" stroke={c.limbs} strokeWidth={3} strokeLinecap="round" />
        <Circle cx={armsDown ? 16 : armsUp ? 8 : 6} cy={armsDown ? 82 : armsUp ? 26 : 68} r={4} fill={c.limbs} />
        <Path d={armsDown ? 'M98 62 Q106 72 104 82' : armsUp ? 'M98 50 Q110 40 112 26' : mood === 'thinking' ? 'M98 58 Q112 70 88 82' : wave ? 'M98 50 Q112 40 110 26' : 'M98 56 Q110 50 112 40'} fill="none" stroke={c.limbs} strokeWidth={3} strokeLinecap="round" />
        <Circle cx={armsDown ? 104 : armsUp ? 112 : mood === 'thinking' ? 88 : wave ? 110 : 112} cy={armsDown ? 82 : armsUp ? 26 : mood === 'thinking' ? 82 : wave ? 26 : 40} r={4} fill={c.limbs} />
        <Path d="M46 84 L42 100 M74 84 L78 100" stroke={c.limbs} strokeWidth={3} strokeLinecap="round" />
        <Ellipse cx={40} cy={102} rx={6} ry={3.5} fill={c.limbs} />
        <Ellipse cx={80} cy={102} rx={6} ry={3.5} fill={c.limbs} />
        <Rect x={20} y={24} width={80} height={62} rx={12} fill={BRAND.lime} />
        <Path d="M24 30 L60 56 L96 30" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {mood === 'sleepy' || mood === 'offline' ? <Path d="M43 66 Q49 71 55 66 M65 66 Q71 71 77 66" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" /> : mood === 'celebrating' ? <Path d="M44 68 L49 63 L54 68 M66 68 L71 63 L76 68" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" /> : mood === 'worried' ? <><Path d="M42 58 L53 61 M78 58 L67 61" stroke={INK} strokeWidth={2.6} /><Circle cx={49} cy={67} r={3.2} fill={INK} /><Circle cx={71} cy={67} r={3.2} fill={INK} /></> : blink ? <Path d="M45 67 L53 67 M67 67 L75 67" stroke={INK} strokeWidth={3} strokeLinecap="round" /> : <><Circle cx={49} cy={67} r={3.2} fill={INK} /><Circle cx={71} cy={67} r={3.2} fill={INK} /></>}
        {mood === 'thinking' ? <Circle cx={60} cy={76} r={2.6} fill="none" stroke={INK} strokeWidth={2.6} /> : mood === 'sleepy' ? <Path d="M56 77 Q60 79 64 77" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" /> : mood === 'worried' ? <Path d="M51 78 Q55.5 74 60 78 Q64.5 82 69 78" fill="none" stroke={INK} strokeWidth={2.8} strokeLinecap="round" /> : mood === 'offline' ? <Path d="M54 79 Q60 73 66 79" fill="none" stroke={INK} strokeWidth={2.8} strokeLinecap="round" /> : mood === 'celebrating' ? <Path d="M51 72 Q60 86 69 72 Z" fill={INK} /> : <Path d="M54 73 Q60 79 66 73" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />}
        {(mood === 'happy' || mood === 'celebrating') && <><Circle cx={40} cy={74} r={3.2} fill={BRAND.pink} /><Circle cx={80} cy={74} r={3.2} fill={BRAND.pink} /></>}
      </Svg>
      </Animated.View>
      {mood === 'thinking' && <ThinkingDots size={size} />}
      <MemeAccents mood={mood} size={size} reducedMotion={reducedMotion} />
    </View>
  );
}

function ThinkingDots({ size }: { size: number }) {
  const reducedMotion = useReducedMotion();
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(0)));

  useEffect(() => {
    if (reducedMotion) {
      dots.forEach((dot) => dot.setValue(0));
      return;
    }
    const animations = dots.map((dot, index) => Animated.loop(Animated.sequence([
      Animated.delay(index * 150),
      Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.delay(600 - index * 150),
    ])));
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [dots, reducedMotion]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: size, height: (size * 112) / 120 }}>
      {dots.map((dot, index) => (
        <Animated.View
          key={index}
          style={{
            position: 'absolute',
            left: ((83 + index * 10) * size) / 120,
            top: (10 * size) / 120,
            width: (6 * size) / 120,
            height: (6 * size) / 120,
            borderRadius: (3 * size) / 120,
            backgroundColor: INK,
            transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, (-4 * size) / 120] }) }],
          }}
        />
      ))}
    </View>
  );
}

function MemeAccents({ mood, size, reducedMotion }: { mood: MemeMood; size: number; reducedMotion: boolean }) {
  const c = usePalette();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    progress.stopAnimation();
    progress.setValue(0);
    if (reducedMotion || !['sleepy', 'worried', 'celebrating', 'offline'].includes(mood)) return;
    const duration = mood === 'worried' ? 1600 : mood === 'celebrating' ? 1100 : mood === 'offline' ? 3000 : 2400;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 1, useNativeDriver: true }),
      ]),
      { iterations: mood === 'celebrating' ? 2 : -1 },
    );
    animation.start();
    return () => animation.stop();
  }, [mood, reducedMotion, progress]);

  if (mood === 'happy' || mood === 'thinking') return null;
  const opacity = reducedMotion ? 1 : progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 0] });
  const travel = mood === 'worried' || mood === 'offline' ? 16 : mood === 'celebrating' ? -24 : -28;
  const translateY = reducedMotion ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [0, travel] });

  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, opacity, transform: [{ translateY }] }}>
      <Svg width={size} height={(size * 112) / 120} viewBox="0 0 120 112" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {mood === 'sleepy' && <><SvgText x={96} y={14} fill={c.limbs} fontSize={16} fontWeight="bold">z</SvgText><SvgText x={106} y={25} fill={c.limbs} fontSize={12} fontWeight="bold">z</SvgText></>}
        {mood === 'worried' && <Path d="M100 20 Q105 29 100 34 Q95 29 100 20 Z" fill="#FFFFFF" stroke={INK} strokeWidth={2} />}
        {mood === 'celebrating' && <><Circle cx={20} cy={13} r={4} fill={BRAND.pink} /><Rect x={82} y={8} width={7} height={7} rx={1.5} fill={BRAND.periwinkle} /><Circle cx={102} cy={19} r={4} fill={BRAND.mint} /></>}
        {mood === 'offline' && <Path d="M42 73 Q45 78 42 82 Q39 78 42 73 Z" fill={BRAND.periwinkle} />}
      </Svg>
    </Animated.View>
  );
}

/** Mặt Meme thu nhỏ trong vòng tròn (ảnh đại diện của trợ lý trong chat). */
export function MemeAvatar({ size = 32, thinking = false }: { size?: number; thinking?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={16} cy={16} r={16} fill={BRAND.lime} />
      <Path d="M7 10 L16 17 L25 10" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={thinking ? 14 : 12.5} cy={21} r={1.4} fill={INK} />
      <Circle cx={thinking ? 21 : 19.5} cy={21} r={1.4} fill={INK} />
      {thinking && <Circle cx={17} cy={27} r={1.2} fill="none" stroke={INK} strokeWidth={1} />}
    </Svg>
  );
}

/** Nhân vật theo loại việc, ló ra ở góc dưới thẻ. `cardBg` để đổi màu khi trùng nền thẻ. */
export function CategoryCharacter({ category, cardBg, size = 80 }: { category: Category; cardBg?: string; size?: number }) {
  const h = (size * 72) / 80;
  const eyes = (y: number) => (
    <>
      <Circle cx={33} cy={y} r={2.6} fill={INK} />
      <Circle cx={47} cy={y} r={2.6} fill={INK} />
    </>
  );
  let body;
  switch (category) {
    case 'deadline':
      body = (
        <>
          <Rect x={10} y={12} width={60} height={48} rx={10} fill={cardBg === BRAND.lime ? BRAND.pinkDeep : cardBg === BRAND.pink ? BRAND.pinkDeep : BRAND.lime} />
          <Path d="M13 17 L40 37 L67 17" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {eyes(46)}
          <Path d="M36 51 Q40 55 44 51" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        </>
      );
      break;
    case 'exam':
      body = (
        <>
          <Path d="M8 60 A32 32 0 0 1 72 60 Z" fill={BRAND.pinkDeep} />
          <Path d="M29 44 Q32 41 35 44 M45 44 Q48 41 51 44" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
          <Path d="M36 51 Q40 54 44 51" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        </>
      );
      break;
    case 'class_change':
      body = (
        <>
          <Polygon points="40,8 68,24 68,52 40,68 12,52 12,24" fill={cardBg === BRAND.periwinkle ? BRAND.mint : BRAND.periwinkle} />
          <Path d="M30 38 Q33 41 36 38 M44 38 Q47 41 50 38" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
          <Path d="M36 46 Q40 50 44 46" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        </>
      );
      break;
    case 'event':
      body = (
        <>
          <Circle cx={40} cy={38} r={28} fill={BRAND.mint} />
          {eyes(34)}
          <Path d="M33 43 Q40 50 47 43" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        </>
      );
      break;
    case 'admin':
      body = (
        <>
          <Polygon
            points="40,4 47,22 66,14 58,32 76,40 58,46 66,64 47,56 40,72 33,56 14,64 22,46 4,40 22,32 14,14 33,22"
            fill={cardBg === BRAND.lime ? BRAND.mint : BRAND.lime}
          />
          <Circle cx={34} cy={38} r={2.4} fill={INK} />
          <Circle cx={46} cy={38} r={2.4} fill={INK} />
          <Path d="M37 45 Q40 47 43 45" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
        </>
      );
      break;
    default:
      body = (
        <>
          <Rect x={14} y={14} width={52} height={52} rx={26} fill={BRAND.cloud} />
          <Circle cx={33} cy={38} r={2.4} fill={INK} />
          <Circle cx={47} cy={38} r={2.4} fill={INK} />
          <Path d="M35 47 L45 47" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        </>
      );
  }
  return (
    <Svg width={size} height={h} viewBox="0 0 80 72" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {body}
    </Svg>
  );
}
