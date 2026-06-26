import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SubScreenLayout } from '@/src/components/SubScreenLayout';
import { usePushNotifications } from '@/src/components/PushNotificationProvider';
import { useTranslation } from '@/src/i18n/useTranslation';
import {
  atualizarPreferenciaNotificacao,
  desativarPushDispositivo,
  isPushConfigurado,
  listarPreferenciasNotificacao,
  lerStatusSyncPush,
  sincronizarTokenPushUsuario,
  verificarPushAtivoDispositivo,
} from '@/src/services/pushNotifications';
import type { TranslationKey } from '@/src/i18n/translations';
import type { PushSyncMotivo, PushSyncStatus } from '@/src/types/pushNotifications';
import {
  NOTIFICATION_CATEGORY_LABELS,
  type NotificationCategory,
  type NotificationPreference,
} from '@/src/types/pushNotifications';
import { lightColors } from '@/src/theme/lightTokens';

const MOTIVO_LABEL_KEYS: Record<PushSyncMotivo, TranslationKey> = {
  registrado: 'settings.pushDebugMotivoRegistrado',
  sem_sessao: 'settings.pushDebugMotivoSemSessao',
  sem_permissao: 'settings.pushDebugMotivoSemPermissao',
  sem_config: 'settings.pushDebugMotivoSemConfig',
  nao_dispositivo: 'settings.pushDebugMotivoNaoDispositivo',
  falha_registro: 'settings.pushDebugMotivoFalhaRegistro',
  erro: 'settings.pushDebugMotivoErro',
};

const CATEGORY_ORDER: NotificationCategory[] = [
  'auction',
  'order',
  'chat',
  'account',
  'marketing',
];

function formatarSyncEm(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function NotificacoesSettingsScreen() {
  const { t } = useTranslation();
  const { pushHabilitado, sincronizar, desativar, statusSync, sincronizando } =
    usePushNotifications();
  const [prefs, setPrefs] = useState<NotificationPreference[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [pushAtivo, setPushAtivo] = useState(false);
  const [salvando, setSalvando] = useState<NotificationCategory | null>(null);
  const [salvandoPush, setSalvandoPush] = useState(false);
  const [statusLocal, setStatusLocal] = useState<PushSyncStatus | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [lista, ativo] = await Promise.all([
        listarPreferenciasNotificacao(),
        pushHabilitado ? verificarPushAtivoDispositivo() : Promise.resolve(false),
      ]);
      setPrefs(lista);
      setPushAtivo(ativo);
    } finally {
      setCarregando(false);
    }
  }, [pushHabilitado]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const atualizarStatusDebug = useCallback(async () => {
    const salvo = await lerStatusSyncPush();
    setStatusLocal(salvo);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void atualizarStatusDebug();
    }, [atualizarStatusDebug]),
  );

  useEffect(() => {
    if (statusSync) {
      setStatusLocal(statusSync);
    }
  }, [statusSync]);

  const statusExibicao = statusSync ?? statusLocal;

  const togglePushDispositivo = useCallback(
    async (enabled: boolean) => {
      if (!pushHabilitado) {
        Alert.alert(t('settings.notifications'), t('settings.pushUnavailable'));
        return;
      }

      if (!isPushConfigurado()) {
        Alert.alert(t('settings.notifications'), t('settings.pushConfigMissing'));
        return;
      }

      setSalvandoPush(true);
      try {
        if (enabled) {
          const resultado = await sincronizarTokenPushUsuario();
          setStatusLocal(resultado);
          if (!resultado.ok) {
            Alert.alert(t('settings.notifications'), resultado.mensagem);
            return;
          }
          setPushAtivo(true);
          await sincronizar();
          return;
        }

        await desativarPushDispositivo();
        await desativar();
        setPushAtivo(false);
      } catch {
        Alert.alert(t('settings.error'), t('settings.pushEnableError'));
      } finally {
        setSalvandoPush(false);
      }
    },
    [desativar, pushHabilitado, sincronizar, t],
  );

  const toggleCategoria = useCallback(
    async (category: NotificationCategory, enabled: boolean) => {
      const meta = NOTIFICATION_CATEGORY_LABELS[category];
      if (meta.locked && !enabled) {
        Alert.alert(t('settings.notifications'), t('settings.pushCategoryLocked'));
        return;
      }

      setSalvando(category);
      const ok = await atualizarPreferenciaNotificacao(category, enabled);
      setSalvando(null);

      if (!ok) {
        Alert.alert(t('settings.error'), t('settings.pushSaveError'));
        return;
      }

      setPrefs((prev) =>
        prev.map((p) => (p.category === category ? { ...p, enabled } : p)),
      );
    },
    [t],
  );

  const prefsOrdenadas = CATEGORY_ORDER.map((category) => {
    const found = prefs.find((p) => p.category === category);
    return found ?? { category, enabled: category !== 'marketing' };
  });

  return (
    <SubScreenLayout title={t('settings.notifications')} subtitle={t('settings.pushSubtitle')}>
      {carregando ? (
        <ActivityIndicator color={lightColors.accent} style={styles.loader} />
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.pushDevice')}</Text>
            <View style={styles.card}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <Text style={styles.toggleLabel}>{t('settings.pushMobile')}</Text>
                  <Text style={styles.toggleHint}>
                    {!pushHabilitado
                      ? t('settings.pushUnavailable')
                      : !isPushConfigurado()
                        ? t('settings.pushConfigMissing')
                        : t('settings.pushDeviceHint')}
                  </Text>
                </View>
                {salvandoPush ? (
                  <ActivityIndicator size="small" color={lightColors.accent} />
                ) : (
                  <Switch
                    value={pushAtivo}
                    onValueChange={(v) => void togglePushDispositivo(v)}
                    disabled={!pushHabilitado || !isPushConfigurado()}
                    trackColor={{ false: '#E5E7EB', true: '#E9E0FF' }}
                    thumbColor={pushAtivo ? lightColors.accent : '#F3F4F6'}
                  />
                )}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.pushDebug')}</Text>
            <View style={styles.debugCard}>
              {statusExibicao ? (
                <>
                  <View style={styles.debugRow}>
                    <View
                      style={[
                        styles.debugBadge,
                        statusExibicao.ok ? styles.debugBadgeOk : styles.debugBadgeErro,
                      ]}>
                      <Text
                        style={[
                          styles.debugBadgeText,
                          statusExibicao.ok ? styles.debugBadgeTextOk : styles.debugBadgeTextErro,
                        ]}>
                        {statusExibicao.ok
                          ? t('settings.pushDebugOk')
                          : t('settings.pushDebugError')}
                      </Text>
                    </View>
                    <Text style={styles.debugMotivo}>
                      {t(MOTIVO_LABEL_KEYS[statusExibicao.motivo])}
                    </Text>
                  </View>

                  <Text style={styles.debugLabel}>{t('settings.pushDebugSyncedAt')}</Text>
                  <Text style={styles.debugValue}>
                    {formatarSyncEm(statusExibicao.atualizadoEm)}
                  </Text>

                  <Text style={styles.debugLabel}>{t('settings.pushDebugMessage')}</Text>
                  <Text style={styles.debugValue}>{statusExibicao.mensagem}</Text>

                  {statusExibicao.tokenResumo ? (
                    <>
                      <Text style={styles.debugLabel}>{t('settings.pushDebugToken')}</Text>
                      <Text style={styles.debugToken} selectable>
                        {statusExibicao.tokenResumo}
                      </Text>
                    </>
                  ) : null}
                </>
              ) : (
                <Text style={styles.debugEmpty}>{t('settings.pushDebugEmpty')}</Text>
              )}

              <Pressable
                style={[styles.debugBtn, sincronizando && styles.debugBtnBusy]}
                onPress={() => void sincronizar().then(() => atualizarStatusDebug())}
                disabled={sincronizando || !pushHabilitado}>
                {sincronizando ? (
                  <ActivityIndicator size="small" color={lightColors.accent} />
                ) : (
                  <Ionicons name="sync-outline" size={16} color={lightColors.accent} />
                )}
                <Text style={styles.debugBtnText}>{t('settings.pushDebugSyncNow')}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.pushCategories')}</Text>
            <View style={styles.card}>
              {prefsOrdenadas.map((pref, index) => {
                const meta = NOTIFICATION_CATEGORY_LABELS[pref.category];
                const locked = Boolean(meta.locked);
                return (
                  <View
                    key={pref.category}
                    style={[styles.toggleRow, index > 0 && styles.toggleRowBorder]}>
                    <View style={styles.toggleCopy}>
                      <View style={styles.titleRow}>
                        <Text style={styles.toggleLabel}>{meta.title}</Text>
                        {locked ? (
                          <View style={styles.lockBadge}>
                            <Ionicons name="lock-closed" size={10} color="#6B7280" />
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.toggleHint}>{meta.description}</Text>
                    </View>
                    {salvando === pref.category ? (
                      <ActivityIndicator size="small" color={lightColors.accent} />
                    ) : (
                      <Switch
                        value={pref.enabled}
                        onValueChange={(v) => void toggleCategoria(pref.category, v)}
                        disabled={locked}
                        trackColor={{ false: '#E5E7EB', true: '#E9E0FF' }}
                        thumbColor={pref.enabled ? lightColors.accent : '#F3F4F6'}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          <Pressable style={styles.refreshBtn} onPress={() => void carregar()}>
            <Ionicons name="refresh-outline" size={16} color={lightColors.accent} />
            <Text style={styles.refreshText}>{t('settings.pushRefresh')}</Text>
          </Pressable>
        </>
      )}
    </SubScreenLayout>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 24 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  toggleRowBorder: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  toggleCopy: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#1A1625' },
  toggleHint: { fontSize: 12, color: '#9CA3AF', marginTop: 4, lineHeight: 17 },
  lockBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  refreshText: { fontSize: 14, fontWeight: '600', color: lightColors.accent },
  debugCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 14,
    gap: 8,
  },
  debugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  debugBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  debugBadgeOk: { backgroundColor: '#D1FAE5' },
  debugBadgeErro: { backgroundColor: '#FEE2E2' },
  debugBadgeText: { fontSize: 11, fontWeight: '800' },
  debugBadgeTextOk: { color: '#047857' },
  debugBadgeTextErro: { color: '#B91C1C' },
  debugMotivo: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  debugLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
  },
  debugValue: { fontSize: 13, color: '#1A1625', lineHeight: 18 },
  debugToken: {
    fontSize: 12,
    color: '#4B5563',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 17,
  },
  debugEmpty: { fontSize: 13, color: '#9CA3AF', lineHeight: 18 },
  debugBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    backgroundColor: '#FAF5FF',
  },
  debugBtnBusy: { opacity: 0.7 },
  debugBtnText: { fontSize: 13, fontWeight: '700', color: lightColors.accent },
});
