import { Ionicons } from '@expo/vector-icons';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AdminAiAlert, AdminAiResumo } from '@/src/types/adminAi';
import { jarvisModern as m } from '@/components/ai/jarvisModernTheme';

type Props = {
  alertas: AdminAiAlert[];
  resumo: AdminAiResumo | null;
};

const METRIC_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'KYC análise': 'id-card-outline',
  Disputas: 'scale-outline',
  'Erros Pix': 'flash-outline',
  Críticos: 'alert-circle-outline',
};

function severityStyle(severity: AdminAiAlert['severity']) {
  if (severity === 'critical') {
    return { color: '#F87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.28)' };
  }
  if (severity === 'warning') {
    return { color: '#FBBF24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)' };
  }
  return { color: m.purpleBrand, bg: 'rgba(124, 58, 237, 0.08)', border: 'rgba(124, 58, 237, 0.22)' };
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const hot = value > 0;

  return (
    <View style={[styles.metricCard, hot && styles.metricCardHot]}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, hot && styles.metricIconHot]}>
          <Ionicons name={icon} size={15} color={hot ? m.purple : '#94A3B8'} />
        </View>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={[styles.metricValue, hot && styles.metricValueHot]}>{value}</Text>
      {hot ? <Text style={styles.metricHint}>Requer atenção</Text> : null}
    </View>
  );
}

export function AdminAiAlertsStrip({ alertas, resumo }: Props) {
  const chips = resumo
    ? [
        { label: 'KYC análise', value: resumo.kyc_em_analise },
        { label: 'Disputas', value: resumo.disputas_abertas },
        { label: 'Erros Pix', value: resumo.erros_pix_periodo },
        { label: 'Críticos', value: resumo.erros_criticos_periodo },
      ]
    : [];

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Resumo operacional</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.metricsRow}>
        {chips.map((chip) => (
          <MetricCard
            key={chip.label}
            label={chip.label}
            value={chip.value}
            icon={METRIC_ICONS[chip.label] ?? 'pulse-outline'}
          />
        ))}
      </ScrollView>

      {alertas.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.alertRow}>
          {alertas.map((alerta) => {
            const tone = severityStyle(alerta.severity);
            return (
              <View
                key={`${alerta.kind}-${alerta.title}`}
                style={[
                  styles.alertCard,
                  { backgroundColor: tone.bg, borderColor: tone.border },
                ]}>
                <View style={styles.alertHeader}>
                  <Ionicons
                    name={
                      alerta.severity === 'critical'
                        ? 'alert-circle'
                        : alerta.severity === 'warning'
                          ? 'warning'
                          : 'information-circle'
                    }
                    size={16}
                    color={tone.color}
                  />
                  <Text style={[styles.alertTitle, { color: tone.color }]}>{alerta.title}</Text>
                </View>
                <Text style={styles.alertDetail}>{alerta.detail}</Text>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.stableRow}>
          <Ionicons name="checkmark-circle" size={16} color="#34D399" />
          <Text style={styles.stableText}>Operação estável — sem alertas automáticos</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, marginBottom: 14 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E2E8F0',
    letterSpacing: -0.2,
  },
  metricsRow: { gap: 10, paddingVertical: 2 },
  metricCard: {
    minWidth: 124,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricCardHot: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderColor: 'rgba(124, 58, 237, 0.28)',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconHot: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
  },
  metricLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F1F5F9',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  metricValueHot: { color: m.purpleBrand },
  metricHint: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: m.purpleBrand,
  },
  alertRow: { gap: 10, paddingBottom: 2 },
  alertCard: {
    width: 280,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  alertDetail: { fontSize: 12, lineHeight: 18, color: '#CBD5E1', fontWeight: '500' },
  stableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.22)',
  },
  stableText: { fontSize: 12, fontWeight: '600', color: '#A7F3D0' },
});
