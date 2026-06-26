import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { confirmarAcaoFinanceira } from '@/src/lib/financialActionGuard';
import { useTranslation } from '@/src/i18n/useTranslation';
import type { TranslationKey } from '@/src/i18n/translations';
import { useSecurity } from '@/src/store/securityContext';

export function useFinancialActionGuard() {
  const router = useRouter();
  const { t } = useTranslation();
  const { solicitarBiometria, hardwareDisponivel, biometriaCadastrada } = useSecurity();

  const irParaReauth = useCallback(() => {
    router.push('/(auth)/login?reauth=1' as never);
  }, [router]);

  const confirmar = useCallback(
    async (motivoKey: TranslationKey) => {
      return confirmarAcaoFinanceira({
        motivo: t(motivoKey),
        solicitarBiometria,
        hardwareDisponivel,
        biometriaCadastrada,
        tituloLogin: t('security.loginRequiredTitle'),
        mensagemLogin: t('security.loginRequiredBody'),
        tituloFalha: t('security.errorTitle'),
        mensagemFalha: t('security.financialBlocked'),
        onReauth: irParaReauth,
      });
    },
    [
      biometriaCadastrada,
      hardwareDisponivel,
      irParaReauth,
      solicitarBiometria,
      t,
    ],
  );

  return { confirmarAcaoFinanceira: confirmar, irParaReauth };
}
