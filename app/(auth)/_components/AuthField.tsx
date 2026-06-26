import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { lightColors } from '@/src/theme/lightTokens';
import { effects, fonts, radii, spacing } from '@/src/theme/tokens';

type AuthFieldProps = TextInputProps & {
  label: string;
};

export function AuthField({ label, style, ...props }: AuthFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {focused ? <View style={styles.focusGlow} pointerEvents="none" /> : null}
      <TextInput
        placeholderTextColor={lightColors.textMuted}
        style={[styles.input, focused && styles.inputFocused, style]}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
    position: 'relative',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: lightColors.textSecondary,
    marginBottom: spacing.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: fonts.timerRegular,
  },
  focusGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: effects.hudGlowSoft,
  },
  input: {
    backgroundColor: lightColors.inputBg,
    borderWidth: 1,
    borderColor: lightColors.inputBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: lightColors.textPrimary,
  },
  inputFocused: {
    borderColor: lightColors.inputFocus,
    borderWidth: 1.5,
    shadowColor: lightColors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
});
