import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { JarvisGeminiIcon } from '@/components/ai/JarvisGeminiIcon';
import { jarvisModern as m } from '@/components/ai/jarvisModernTheme';

type Props = {
  onPress: () => void;
  bottomOffset: number;
  hidden?: boolean;
  label?: string;
};

/** Chip compacto — flutua acima da tab bar sem reservar espaço no conteúdo */
export function JarvisAssistChip({
  onPress,
  bottomOffset,
  hidden = false,
  label = 'Jarvis',
}: Props) {
  if (hidden) return null;

  return (
    <View pointerEvents="box-none" style={[styles.anchor, { bottom: bottomOffset }]}>
      <Pressable
        style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Abrir assistente Jarvis">
        <JarvisGeminiIcon size={18} />
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Ionicons name="sparkles" size={14} color={m.purpleBrand} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    right: 14,
    zIndex: 9998,
    elevation: 20,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
    }),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    shadowColor: m.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  chipPressed: {
    backgroundColor: m.purpleSoft,
    transform: [{ scale: 0.97 }],
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: m.purpleDeep,
    maxWidth: 160,
  },
});
