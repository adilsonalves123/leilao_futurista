import { Ionicons } from '@expo/vector-icons';

import { useRouter } from 'expo-router';

import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { KYC_STATUS_LABELS } from '@/src/types/kyc';

import type { StatusVerificacao } from '@/src/types/kyc';

import { lightColors } from '@/src/theme/lightTokens';

import { fonts, radii, spacing } from '@/src/theme/tokens';



export type KycRequiredMotivo = 'lance' | 'publicar';



type Props = {

  visible: boolean;

  onClose: () => void;

  status: StatusVerificacao;

  motivo?: KycRequiredMotivo;

};



const COPY: Record<

  KycRequiredMotivo,

  { titulo: string; corpo: string; acao: string; secundario: string }

> = {

  lance: {

    titulo: 'Cadastro completo necessário',

    corpo:

      'Você pode assistir e navegar pelos leilões normalmente. Para dar lances, é obrigatório concluir a verificação de identidade (KYC) e ter status aprovado.',

    acao: 'Completar cadastro',

    secundario: 'Continuar apenas assistindo',

  },

  publicar: {

    titulo: 'Cadastro completo para vender',

    corpo:

      'Para publicar um leilão na plataforma, use o mesmo cadastro de verificação (KYC) exigido para dar lances: CPF, documentos, selfie e aprovação do admin.',

    acao: 'Completar cadastro',

    secundario: 'Voltar',

  },

};



export function KycRequiredModal({ visible, onClose, status, motivo = 'lance' }: Props) {

  const router = useRouter();

  const textos = COPY[motivo];



  return (

    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>

      <Pressable style={styles.backdrop} onPress={onClose}>

        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>

          <View style={styles.iconWrap}>

            <Ionicons name="shield-outline" size={28} color={lightColors.accent} />

          </View>

          <Text style={styles.title}>{textos.titulo}</Text>

          <Text style={styles.body}>{textos.corpo}</Text>

          <Text style={styles.status}>Status atual: {KYC_STATUS_LABELS[status]}</Text>

          <Pressable

            style={styles.primaryBtn}

            onPress={() => {

              onClose();

              router.push('/kyc/cadastro' as never);

            }}>

            <Text style={styles.primaryBtnText}>{textos.acao}</Text>

          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={onClose}>

            <Text style={styles.secondaryBtnText}>{textos.secundario}</Text>

          </Pressable>

        </Pressable>

      </Pressable>

    </Modal>

  );

}



const styles = StyleSheet.create({

  backdrop: {

    flex: 1,

    backgroundColor: 'rgba(26, 22, 37, 0.55)',

    justifyContent: 'center',

    padding: spacing.lg,

  },

  card: {

    backgroundColor: '#FFFFFF',

    borderRadius: radii.lg,

    padding: spacing.lg,

    borderWidth: 1,

    borderColor: lightColors.inputBorder,

  },

  iconWrap: {

    width: 52,

    height: 52,

    borderRadius: 26,

    backgroundColor: 'rgba(124, 58, 237, 0.12)',

    alignItems: 'center',

    justifyContent: 'center',

    marginBottom: spacing.md,

  },

  title: {

    fontFamily: fonts.timerRegular,

    fontSize: 17,

    color: lightColors.textPrimary,

    marginBottom: spacing.sm,

  },

  body: {

    fontSize: 14,

    lineHeight: 21,

    color: lightColors.textSecondary,

    marginBottom: spacing.sm,

  },

  status: {

    fontSize: 12,

    color: lightColors.accent,

    fontWeight: '600',

    marginBottom: spacing.lg,

  },

  primaryBtn: {

    backgroundColor: lightColors.accent,

    borderRadius: radii.md,

    paddingVertical: 14,

    alignItems: 'center',

    marginBottom: spacing.sm,

  },

  primaryBtnText: {

    color: '#FFFFFF',

    fontWeight: '700',

    fontSize: 15,

  },

  secondaryBtn: { paddingVertical: 10, alignItems: 'center' },

  secondaryBtnText: { fontSize: 13, color: lightColors.textMuted },

});

