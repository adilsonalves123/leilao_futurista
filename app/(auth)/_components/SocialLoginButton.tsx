import FontAwesome from '@expo/vector-icons/FontAwesome';

import type { ComponentProps } from 'react';

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { GoogleLogoIcon } from '@/components/icons/GoogleLogoIcon';
import { lightColors } from '@/src/theme/lightTokens';

import { radii, spacing } from '@/src/theme/tokens';



type SocialProvider = 'google' | 'apple' | 'facebook';



type SocialLoginButtonProps = {

  provider: SocialProvider;

  onPress: () => void;

  loading?: boolean;

  disabled?: boolean;

};



const CONFIG: Record<

  SocialProvider,

  {

    label: string;

    shortLabel: string;

    icon: ComponentProps<typeof FontAwesome>['name'];

    backgroundColor: string;

    textColor: string;

    iconBg: string;

    border?: string;

    glow?: string;

  }

> = {

  google: {

    label: 'Continuar com Google',

    shortLabel: 'Google',

    icon: 'google',

    backgroundColor: '#FFFFFF',

    textColor: lightColors.textPrimary,

    iconBg: '#FFFFFF',

    border: lightColors.inputBorder,

    glow: 'rgba(66, 133, 244, 0.15)',

  },

  apple: {

    label: 'Continuar com Apple',

    shortLabel: 'Apple',

    icon: 'apple',

    backgroundColor: '#1E1B2E',

    textColor: '#FFFFFF',

    iconBg: 'rgba(255, 255, 255, 0.12)',

    glow: 'rgba(0, 0, 0, 0.2)',

  },

  facebook: {

    label: 'Continuar com Facebook',

    shortLabel: 'Facebook',

    icon: 'facebook',

    backgroundColor: '#1877F2',

    textColor: '#FFFFFF',

    iconBg: 'rgba(255, 255, 255, 0.18)',

    glow: 'rgba(24, 119, 242, 0.35)',

  },

};



export function SocialLoginButton({

  provider,

  onPress,

  loading,

  disabled,

}: SocialLoginButtonProps) {

  const cfg = CONFIG[provider];



  return (

    <Pressable

      style={({ pressed }) => [

        styles.btn,

        {

          backgroundColor: cfg.backgroundColor,

          borderColor: cfg.border ?? 'transparent',

          shadowColor: cfg.glow ?? lightColors.accent,

        },

        pressed && styles.pressed,

        disabled && styles.disabled,

      ]}

      onPress={onPress}

      disabled={disabled || loading}>

      {loading ? (

        <ActivityIndicator color={cfg.textColor} />

      ) : (

        <>

          <View style={[styles.iconCircle, { backgroundColor: cfg.iconBg }]}>
            {provider === 'google' ? (
              <GoogleLogoIcon size={20} />
            ) : (
              <FontAwesome name={cfg.icon} size={20} color={cfg.textColor} />
            )}
          </View>

          <View style={styles.textCol}>

            <Text style={[styles.label, { color: cfg.textColor }]}>{cfg.label}</Text>

            <Text style={[styles.meta, { color: cfg.textColor, opacity: 0.65 }]}>

              OAuth · {cfg.shortLabel}

            </Text>

          </View>

          <FontAwesome name="angle-right" size={18} color={cfg.textColor} style={styles.chevron} />

        </>

      )}

    </Pressable>

  );

}



const styles = StyleSheet.create({

  btn: {

    flexDirection: 'row',

    alignItems: 'center',

    borderWidth: 1,

    borderRadius: radii.md,

    paddingVertical: 12,

    paddingHorizontal: spacing.md,

    gap: spacing.md,

    shadowOffset: { width: 0, height: 6 },

    shadowOpacity: 0.25,

    shadowRadius: 10,

    elevation: 3,

  },

  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },

  disabled: { opacity: 0.55 },

  iconCircle: {

    width: 40,

    height: 40,

    borderRadius: 20,

    alignItems: 'center',

    justifyContent: 'center',

  },

  textCol: { flex: 1 },

  label: { fontSize: 14, fontWeight: '700' },

  meta: { fontSize: 10, marginTop: 2, letterSpacing: 0.4 },

  chevron: { opacity: 0.7 },

});

