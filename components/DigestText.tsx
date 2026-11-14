import { View } from 'react-native';

import { T } from '@/components/ui';
import { BRAND, FONT } from '@/constants/theme';
import { digestBlocks } from '@/lib/digest';

export function DigestText({ text }: { text: string }) {
  return (
    <View style={{ gap: 8 }}>
      {digestBlocks(text).map((block, index) =>
        block.kind === 'heading' ? (
          <T key={index} accessibilityRole="header" style={{ fontFamily: FONT.bold, fontSize: 15, lineHeight: 22, marginTop: index ? 8 : 0 }} color={BRAND.mintInk}>
            {block.text}
          </T>
        ) : block.kind === 'item' ? (
          <View key={index} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 9, backgroundColor: BRAND.mintInk }} />
            <T style={{ flex: 1, fontSize: 14, lineHeight: 22 }} color={BRAND.mintInkDeep}>{block.text}</T>
          </View>
        ) : (
          <T key={index} style={{ fontSize: 14, lineHeight: 22 }} color={BRAND.mintInkDeep}>{block.text}</T>
        ),
      )}
    </View>
  );
}
