import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion as useInitialReducedMotion } from 'react-native-reanimated';

const Ctx = createContext(false);

/** Một listener cho toàn app: đọc ngay ở khung hình đầu, rồi theo dõi thay đổi của hệ thống. */
export function ReducedMotionProvider({ children }: { children: ReactNode }) {
  const initial = useInitialReducedMotion();
  const [reduced, setReduced] = useState(initial);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return <Ctx.Provider value={reduced}>{children}</Ctx.Provider>;
}

export function useReducedMotion(): boolean {
  return useContext(Ctx);
}
