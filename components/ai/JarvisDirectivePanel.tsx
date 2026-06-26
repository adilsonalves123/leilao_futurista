import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { jarvisModern as m } from '@/components/ai/jarvisModernTheme';
import { jarvis, jarvisMono } from '@/components/ai/jarvisTheme';

type UiVariant = 'modern' | 'terminal';

type Props = {
  title?: string;
  suggestions: readonly string[];
  icons?: Record<string, keyof typeof Ionicons.glyphMap>;
  onSelect: (text: string) => void;
  disabled?: boolean;
  compact?: boolean;
  variant?: UiVariant;
};

function ModernChip({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled: boolean;
}) {
  const short = label.length > 36 ? `${label.slice(0, 34)}…` : label;

  return (
    <Pressable
      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
      onPress={onPress}
      disabled={disabled}>
      <Ionicons name={icon} size={14} color={m.purple} />
      <Text style={styles.chipText} numberOfLines={2}>
        {short}
      </Text>
    </Pressable>
  );
}

function DirectiveButton({
  label,
  index,
  icon,
  onPress,
  disabled,
  compact,
}: {
  label: string;
  index: number;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled: boolean;
  compact: boolean;
}) {
  const short = label.length > 34 ? `${label.slice(0, 32)}…` : label;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.cmdBtn,
        compact && styles.cmdBtnCompact,
        pressed && styles.cmdBtnPressed,
      ]}
      onPress={onPress}
      disabled={disabled}>
      <View style={styles.cmdTop}>
        <Text style={styles.cmdIndex}>{String(index + 1).padStart(2, '0')}</Text>
        <Ionicons name={icon} size={11} color={jarvis.cyan} />
      </View>
      <Text style={[styles.cmdLabel, compact && styles.cmdLabelCompact]} numberOfLines={2}>
        {short}
      </Text>
    </Pressable>
  );
}

export function JarvisDirectivePanel({
  title = 'Sugestões para você',
  suggestions,
  icons = {},
  onSelect,
  disabled = false,
  compact = false,
  variant = 'modern',
}: Props) {
  if (variant === 'modern') {
    return (
      <View style={styles.modernPanel}>
        <Text style={styles.modernTitle}>{title}</Text>
        <View style={styles.modernGrid}>
          {suggestions.map((s) => (
            <ModernChip
              key={s}
              label={s}
              icon={icons[s] ?? 'chatbubble-ellipses-outline'}
              onPress={() => onSelect(s)}
              disabled={disabled}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Ionicons name="code-slash" size={12} color={jarvis.emerald} />
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerLine} />
      </View>
      <View style={styles.grid}>
        {suggestions.map((s, i) => (
          <DirectiveButton
            key={s}
            label={s}
            index={i}
            icon={icons[s] ?? 'terminal-outline'}
            onPress={() => onSelect(s)}
            disabled={disabled}
            compact={compact}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modernPanel: { gap: 12 },
  modernTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: m.text,
    paddingHorizontal: 4,
  },
  modernGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: m.surface,
    borderWidth: 1,
    borderColor: m.border,
    minWidth: '47%',
    flexGrow: 1,
    maxWidth: '100%',
    shadowColor: m.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  chipPressed: { backgroundColor: m.purpleSoft, borderColor: '#E9D5FF' },
  chipText: { flex: 1, fontSize: 14, lineHeight: 19, color: m.text, fontWeight: '500' },
  panel: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: {
    fontSize: 7,
    fontWeight: '800',
    color: jarvis.emerald,
    letterSpacing: 1.2,
    fontFamily: jarvisMono,
  },
  headerLine: { flex: 1, height: 1, backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cmdBtn: {
    width: '48%',
    minWidth: 130,
    flexGrow: 1,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 3,
    backgroundColor: jarvis.slate950,
    borderWidth: 1,
    borderColor: jarvis.borderEmerald,
    gap: 4,
  },
  cmdBtnCompact: { paddingVertical: 6, minWidth: 120 },
  cmdBtnPressed: {
    borderColor: 'rgba(6, 182, 212, 0.55)',
    backgroundColor: 'rgba(6, 182, 212, 0.06)',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 0 10px rgba(6,182,212,0.2)' } as object)
      : {}),
  },
  cmdTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cmdIndex: { fontSize: 7, fontWeight: '800', color: jarvis.textMuted, fontFamily: jarvisMono },
  cmdLabel: { fontSize: 10, fontWeight: '600', color: '#CBD5E1', lineHeight: 14 },
  cmdLabelCompact: { fontSize: 9, lineHeight: 13 },
});
