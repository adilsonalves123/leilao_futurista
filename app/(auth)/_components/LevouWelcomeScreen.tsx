import type { ReactNode } from 'react';
import {
  Award,
  ChevronRight,
  Lock,
  Mail,
  Shield,
  UserCheck,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WelcomeBannerSlice } from '@/components/welcome/WelcomeBannerSlice';
import { GoogleLogoIcon } from '@/components/icons/GoogleLogoIcon';
import { LevouLogo } from '@/src/components/LevouLogo';
import type { SocialProvider } from '@/src/lib/auth';

type Props = {
  onGoogle: () => void;
  onApple: () => void;
  onEmail: () => void;
  onRegister: () => void;
  socialLoading?: SocialProvider | null;
  disabled?: boolean;
};

function LoginDivider() {
  return (
    <View className="flex-row items-center my-4">
      <View className="flex-1 h-px bg-gray-800" />
      <Text className="text-gray-500 text-[10px] font-bold tracking-widest px-4 uppercase">
        Login
      </Text>
      <View className="flex-1 h-px bg-gray-800" />
    </View>
  );
}

function SocialButton({
  variant,
  label,
  onPress,
  loading,
  disabled,
  icon,
  chevronColor = '#ffffff',
}: {
  variant: 'google' | 'apple' | 'email';
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  chevronColor?: string;
}) {
  const variantClass =
    variant === 'google'
      ? 'bg-levou-purple-deep shadow-lg shadow-levou-purple-deep/35'
      : variant === 'apple'
        ? 'bg-levou-card border border-gray-800'
        : 'bg-transparent border border-levou-email';

  return (
    <Pressable
      className={`w-full h-14 rounded-xl flex-row items-center justify-between px-4 ${variantClass} ${disabled ? 'opacity-55' : ''}`}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => (pressed ? { opacity: 0.88, transform: [{ scale: 0.995 }] } : undefined)}>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#ffffff" />
        </View>
      ) : (
        <>
          <View className="flex-row items-center min-w-[36px]">{icon}</View>
          <Text className="flex-1 text-white font-bold text-base ml-3">{label}</Text>
          <ChevronRight color={chevronColor} size={20} strokeWidth={2.5} />
        </>
      )}
    </Pressable>
  );
}

function TrustBadge({ icon, lines }: { icon: ReactNode; lines: [string, string] }) {
  return (
    <View className="items-center flex-1 gap-1">
      {icon}
      <Text className="text-gray-400 text-[10px] text-center leading-[13px] mt-1">
        {lines[0]}
        {'\n'}
        {lines[1]}
      </Text>
    </View>
  );
}

export function LevouWelcomeScreen({
  onGoogle,
  onApple,
  onEmail,
  onRegister,
  socialLoading = null,
  disabled = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const isBusy = disabled || socialLoading !== null;

  return (
    <View
      className="flex-1 bg-levou-bg"
      style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}>
      <StatusBar barStyle="light-content" backgroundColor="#09071c" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow px-6 pb-6 justify-between"
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {/* Logo e slogan nativos — sempre no topo, fora do banner */}
        <View className="items-center mt-2 mb-5">
          <LevouLogo size="auth" style={{ alignSelf: 'center' }} />
          <Text className="text-gray-400 font-semibold tracking-widest text-[11px] uppercase text-center mt-3 leading-[17px]">
            Os melhores leilões.{'\n'}
            <Text className="text-levou-purple">Por menos.</Text>
          </Text>
        </View>

        {/* Card central — apenas produtos (sem textos na imagem) */}
        <View className="w-full rounded-3xl overflow-hidden bg-levou-card border border-levou-border shadow-2xl mb-6">
          <WelcomeBannerSlice />
        </View>

        {/* Chamada para login */}
        <View className="items-center mb-6">
          <Text className="text-white text-3xl font-extrabold text-center tracking-tight leading-9">
            Entre e comece{'\n'}a <Text className="text-levou-purple">arrematar</Text>
          </Text>
        </View>

        {/* 4. SEÇÃO DE LOGIN */}
        <View className="w-full gap-3">
          <LoginDivider />

          <SocialButton
            variant="google"
            label="Continuar com Google"
            onPress={onGoogle}
            loading={socialLoading === 'google'}
            disabled={isBusy}
            icon={
              <View className="w-8 h-8 bg-white rounded-full items-center justify-center">
                <GoogleLogoIcon size={18} />
              </View>
            }
          />

          <SocialButton
            variant="apple"
            label="Continuar com Apple"
            onPress={onApple}
            loading={socialLoading === 'apple'}
            disabled={isBusy}
            icon={<Text className="text-white font-bold text-xl px-1"></Text>}
          />

          <SocialButton
            variant="email"
            label="Entrar com e-mail"
            onPress={onEmail}
            disabled={isBusy}
            chevronColor="#3b2d8f"
            icon={
              <View className="px-1">
                <Mail color="#a855f7" size={18} strokeWidth={2.2} />
              </View>
            }
          />
        </View>

        <Pressable
          className="mt-5 py-2 items-center"
          onPress={onRegister}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="Criar conta">
          <Text className="text-gray-400 text-sm text-center">
            Ainda não tem conta?{' '}
            <Text className="text-levou-purple font-bold">Criar conta</Text>
          </Text>
        </Pressable>

        {/* 5. RODAPÉ: BADGES DE SEGURANÇA */}
        <View className="mt-8 border-t border-gray-900 pt-4">
          <View className="flex-row justify-around items-center mb-4">
            <TrustBadge
              icon={<Shield color="#a855f7" size={20} strokeWidth={2} />}
              lines={['Ambiente', 'seguro']}
            />
            <View className="w-px h-6 bg-gray-800" />
            <TrustBadge
              icon={<Award color="#a855f7" size={20} strokeWidth={2} />}
              lines={['Leilões', 'verificados']}
            />
            <View className="w-px h-6 bg-gray-800" />
            <TrustBadge
              icon={<UserCheck color="#a855f7" size={20} strokeWidth={2} />}
              lines={['Identidade', 'validada']}
            />
          </View>

          <View className="flex-row items-center justify-center gap-1.5 mt-2">
            <Lock color="#9ca3af" size={12} strokeWidth={2.2} />
            <Text className="text-gray-400 text-[10px]">
              Seus dados protegidos com segurança
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
