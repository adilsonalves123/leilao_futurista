import { Ionicons } from '@expo/vector-icons';

import { useRouter } from 'expo-router';

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { KYC_STATUS_LABELS } from '@/src/types/kyc';

import type { StatusVerificacao } from '@/src/types/kyc';

import { lightColors } from '@/src/theme/lightTokens';

import { fonts, radii, spacing } from '@/src/theme/tokens';



type Props = {

  carregando?: boolean;

  motivo: 'publicar' | 'login';

  status?: StatusVerificacao;

};



export function KycRequiredGate({ carregando, motivo, status = 'pendente' }: Props) {

  const router = useRouter();



  if (carregando) {

    return (

      <View style={styles.center}>

        <ActivityIndicator size="large" color={lightColors.accent} />

        <Text style={styles.loadingText}>Verificando seu cadastro…</Text>

      </View>

    );

  }



  if (motivo === 'login') {

    return (

      <View style={styles.center}>

        <View style={styles.iconWrap}>

          <Ionicons name="log-in-outline" size={32} color={lightColors.accent} />

        </View>

        <Text style={styles.title}>Entre na sua conta</Text>

        <Text style={styles.body}>

          Para cadastrar um leilão, faça login ou crie uma conta. Depois, conclua a verificação de

          identidade (mesmo fluxo usado para dar lances).

        </Text>

        <Pressable style={styles.primaryBtn} onPress={() => router.push('/(auth)/login' as never)}>

          <Text style={styles.primaryBtnText}>Ir para login</Text>

        </Pressable>

      </View>

    );

  }



  return (

    <View style={styles.center}>

      <View style={styles.iconWrap}>

        <Ionicons name="shield-outline" size={32} color={lightColors.accent} />

      </View>

      <Text style={styles.title}>Cadastro completo para vender</Text>

      <Text style={styles.body}>

        Quem já completou o KYC para arrematar pode usar o mesmo cadastro aqui — não precisa enviar

        documentos de novo. Basta aguardar aprovação se ainda estiver em análise.

      </Text>

      <Text style={styles.status}>Status atual: {KYC_STATUS_LABELS[status]}</Text>

      <Pressable

        style={styles.primaryBtn}

        onPress={() => router.push('/kyc/cadastro' as never)}>

        <Text style={styles.primaryBtnText}>Completar cadastro KYC</Text>

      </Pressable>

    </View>

  );

}



const styles = StyleSheet.create({

  center: {

    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',

    paddingHorizontal: spacing.lg,

    paddingVertical: spacing.xl,

    gap: spacing.sm,

  },

  loadingText: { fontSize: 14, color: lightColors.textMuted, marginTop: spacing.sm },

  iconWrap: {

    width: 64,

    height: 64,

    borderRadius: 32,

    backgroundColor: 'rgba(124, 58, 237, 0.12)',

    alignItems: 'center',

    justifyContent: 'center',

    marginBottom: spacing.sm,

  },

  title: {

    fontFamily: fonts.timerRegular,

    fontSize: 20,

    color: lightColors.textPrimary,

    textAlign: 'center',

  },

  body: {

    fontSize: 14,

    lineHeight: 22,

    color: lightColors.textSecondary,

    textAlign: 'center',

    maxWidth: 360,

  },

  status: {

    fontSize: 12,

    color: lightColors.accent,

    fontWeight: '700',

    marginTop: spacing.xs,

  },

  primaryBtn: {

    backgroundColor: lightColors.accent,

    borderRadius: radii.md,

    paddingVertical: 14,

    paddingHorizontal: 24,

    marginTop: spacing.md,

  },

  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

});

