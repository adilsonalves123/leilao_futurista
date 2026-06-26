import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { JarvisGeminiIcon } from '@/components/ai/JarvisGeminiIcon';
import { jarvisModern as m } from '@/components/ai/jarvisModernTheme';

type Props = {
  size?: number;
};

export function JarvisAiAvatar({ size = 32 }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <JarvisGeminiIcon size={size * 0.58} />
    </View>
  );
}

export function JarvisAiAvatarIcon({ size = 18, color = m.purple }: { size?: number; color?: string }) {
  return <Ionicons name="sparkles" size={size} color={color} />;
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: m.purpleLight,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
});
