import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { lightColors } from '@/src/theme/lightTokens';
import { fonts, radii, spacing } from '@/src/theme/tokens';

type AuthPrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function AuthPrimaryButton({
  label,
  onPress,
  loading,
  disabled,
}: AuthPrimaryButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}>
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.text}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: lightColors.accent,
    borderRadius: radii.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
    shadowColor: lightColors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 5,
  },
  pressed: { opacity: 0.92 },
  disabled: { opacity: 0.6 },
  text: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: fonts.timerRegular,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
