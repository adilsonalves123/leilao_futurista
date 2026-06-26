import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { KycValidatedBadge } from '@/components/kyc/KycValidatedBadge';
import { lightColors } from '@/src/theme/lightTokens';
import { fonts, radii, spacing } from '@/src/theme/tokens';

type KycFormFieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  touched?: boolean;
  validated?: boolean;
  hint?: string;
  compact?: boolean;
};

export const KycFormField = forwardRef<TextInput, KycFormFieldProps>(function KycFormField(
  { label, error, touched, validated, hint, compact, style, editable = true, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const showError = Boolean(touched && error);

  return (
    <View
      style={[
        styles.wrap,
        props.multiline && styles.wrapMultiline,
        compact && styles.wrapCompact,
      ]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {validated ? <KycValidatedBadge /> : null}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {focused && editable ? <View style={styles.focusGlow} pointerEvents="none" /> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={lightColors.textMuted}
        editable={editable}
        style={[
          styles.input,
          props.multiline && styles.inputMultiline,
          focused && editable && styles.inputFocused,
          showError && styles.inputError,
          !editable && styles.inputDisabled,
          style,
        ]}
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
      {showError ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
    position: 'relative',
  },
  wrapMultiline: { marginBottom: spacing.sm },
  wrapCompact: { marginBottom: spacing.sm, flex: 1 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  label: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: lightColors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: fonts.timerRegular,
  },
  hint: {
    fontSize: 11,
    color: lightColors.textMuted,
    marginBottom: spacing.xs,
    lineHeight: 15,
  },
  focusGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
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
  inputMultiline: {
    minHeight: 72,
    paddingTop: 12,
    textAlignVertical: 'top',
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
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  inputDisabled: { opacity: 0.65 },
  errorText: {
    marginTop: 4,
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
});
