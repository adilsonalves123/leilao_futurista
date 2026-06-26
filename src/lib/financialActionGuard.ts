import { Alert, Platform } from 'react-native';

import { usuarioEstaAutenticado } from '@/src/lib/sessionUser';

type ConfirmarAcaoFinanceiraOpts = {
  motivo: string;
  solicitarBiometria: (motivo: string) => Promise<boolean>;
  hardwareDisponivel: boolean;
  biometriaCadastrada: boolean;
  tituloLogin?: string;
  mensagemLogin?: string;
  tituloFalha?: string;
  mensagemFalha?: string;
  onReauth?: () => void;
};

/**
 * Exige sessão ativa + biometria (ou re-login) antes de lance, pagamento ou movimentação na carteira.
 */
export async function confirmarAcaoFinanceira({
  motivo,
  solicitarBiometria,
  hardwareDisponivel,
  biometriaCadastrada,
  tituloLogin = 'Login necessário',
  mensagemLogin = 'Entre na sua conta para continuar.',
  tituloFalha = 'Confirmação necessária',
  mensagemFalha = 'Não foi possível confirmar sua identidade. O lance ou pagamento não foi enviado.',
  onReauth,
}: ConfirmarAcaoFinanceiraOpts): Promise<boolean> {
  const autenticado = await usuarioEstaAutenticado();
  if (!autenticado) {
    Alert.alert(tituloLogin, mensagemLogin, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Entrar', onPress: () => onReauth?.() },
    ]);
    return false;
  }

  if (hardwareDisponivel && biometriaCadastrada) {
    const ok = await solicitarBiometria(motivo);
    if (!ok) {
      Alert.alert(tituloFalha, mensagemFalha);
    }
    return ok;
  }

  if (Platform.OS === 'web') {
    Alert.alert(
      tituloFalha,
      'Por segurança, confirme sua identidade entrando novamente com e-mail e senha.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Entrar', onPress: () => onReauth?.() },
      ],
    );
    return false;
  }

  Alert.alert(
    tituloFalha,
    'Cadastre biometria no aparelho ou entre novamente com sua senha antes de continuar.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Entrar com senha', onPress: () => onReauth?.() },
    ],
  );
  return false;
}
