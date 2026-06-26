import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { jarvis, jarvisMono } from '@/components/ai/jarvisTheme';
import { formatBRL } from '@/src/lib/bids';
import {
  calculateDisplayDiscountPct,
  computeMarketDealVerdict,
  type MarketDealVerdict,
} from '@/src/lib/marketDealMath';

const C = {
  textPrimary: '#111111',
  textMuted: '#8A8A8A',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  goodBg: '#ECFDF5',
  goodBorder: '#A7F3D0',
  goodText: '#047857',
  goodAccent: '#10B981',
  fairBg: '#FFFBEB',
  fairBorder: '#FDE68A',
  fairText: '#B45309',
  fairAccent: '#F59E0B',
  badBg: '#FEF2F2',
  badBorder: '#FECACA',
  badText: '#B91C1C',
  badAccent: '#EF4444',
  unknownBg: '#F9FAFB',
  unknownBorder: '#E5E7EB',
  unknownText: '#6B7280',
};

type VerdictTheme = {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  border: string;
  text: string;
  accent: string;
};

function themeForVerdict(
  verdict: MarketDealVerdict,
  discountPct: number | null,
  jarvisMode: boolean,
): VerdictTheme {
  if (jarvisMode) {
    switch (verdict) {
      case 'good':
        return {
          label: 'COMPENSA',
          subtitle:
            discountPct != null
              ? `${discountPct}% abaixo do mercado estimado`
              : 'Abaixo do valor de mercado',
          icon: 'checkmark-circle',
          bg: 'rgba(16, 185, 129, 0.08)',
          border: 'rgba(16, 185, 129, 0.35)',
          text: '#6EE7B7',
          accent: jarvis.emerald,
        };
      case 'fair':
        return {
          label: 'ATENÇÃO',
          subtitle:
            discountPct != null
              ? `Desconto moderado de ${discountPct}%`
              : 'Desconto moderado em relação ao mercado',
          icon: 'alert-circle',
          bg: 'rgba(251, 191, 36, 0.06)',
          border: 'rgba(251, 191, 36, 0.3)',
          text: '#FCD34D',
          accent: '#FBBF24',
        };
      case 'bad':
        return {
          label: 'ACIMA_MERCADO',
          subtitle:
            discountPct != null && discountPct < 0
              ? `Lance ${Math.abs(discountPct)}% acima da referência`
              : 'Desconto baixo — próximo ou acima do mercado',
          icon: 'trending-up',
          bg: 'rgba(248, 113, 113, 0.06)',
          border: 'rgba(248, 113, 113, 0.3)',
          text: '#FCA5A5',
          accent: '#F87171',
        };
      default:
        return {
          label: 'SEM_REF',
          subtitle: 'Sem valor de mercado informado para este lote',
          icon: 'help-circle-outline',
          bg: jarvis.slate900,
          border: jarvis.borderCyan,
          text: jarvis.textSecondary,
          accent: jarvis.cyan,
        };
    }
  }

  switch (verdict) {
    case 'good':
      return {
        label: 'Compensa',
        subtitle:
          discountPct != null
            ? `${discountPct}% abaixo do mercado estimado`
            : 'Abaixo do valor de mercado',
        icon: 'checkmark-circle',
        bg: C.goodBg,
        border: C.goodBorder,
        text: C.goodText,
        accent: C.goodAccent,
      };
    case 'fair':
      return {
        label: 'Atenção',
        subtitle:
          discountPct != null
            ? `Desconto moderado de ${discountPct}%`
            : 'Desconto moderado em relação ao mercado',
        icon: 'alert-circle',
        bg: C.fairBg,
        border: C.fairBorder,
        text: C.fairText,
        accent: C.fairAccent,
      };
    case 'bad':
      return {
        label: 'Acima do mercado',
        subtitle:
          discountPct != null && discountPct < 0
            ? `Lance ${Math.abs(discountPct)}% acima da referência`
            : discountPct != null && discountPct === 0
              ? 'Lance igual à referência de mercado'
              : 'Desconto baixo — próximo ou acima do mercado',
        icon: 'trending-up',
        bg: C.badBg,
        border: C.badBorder,
        text: C.badText,
        accent: C.badAccent,
      };
    default:
      return {
        label: 'Sem referência',
        subtitle: 'O vendedor não informou valor de mercado para este lote',
        icon: 'help-circle-outline',
        bg: C.unknownBg,
        border: C.unknownBorder,
        text: C.unknownText,
        accent: C.unknownText,
      };
  }
}

export type MarketDealVerdictCardProps = {
  bidCents: number;
  marketCents: number | null;
  compact?: boolean;
  variant?: 'default' | 'jarvis';
};

export function MarketDealVerdictCard({
  bidCents,
  marketCents,
  compact = false,
  variant = 'default',
}: MarketDealVerdictCardProps) {
  const result = useMemo(() => {
    if (marketCents == null || marketCents <= 0) {
      return computeMarketDealVerdict(bidCents, 0);
    }
    return computeMarketDealVerdict(bidCents, marketCents);
  }, [bidCents, marketCents]);

  const displayDiscount = useMemo(() => {
    if (marketCents == null || marketCents <= 0) return null;
    return calculateDisplayDiscountPct(bidCents, marketCents);
  }, [bidCents, marketCents]);

  const jarvisMode = variant === 'jarvis';
  const theme = themeForVerdict(result.verdict, result.discountPct, jarvisMode);
  const hasMarket = marketCents != null && marketCents > 0;

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        jarvisMode && styles.cardJarvis,
        { backgroundColor: theme.bg, borderColor: theme.border },
      ]}>
      {jarvisMode ? (
        <Text style={styles.jarvisModuleTag}>MOD_VERDICT · TELEMETRIA</Text>
      ) : null}
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: `${theme.accent}18` }]}>
          <Ionicons name={theme.icon} size={compact ? 16 : 18} color={theme.accent} />
          <Text style={[styles.badgeLabel, { color: theme.text }]}>{theme.label}</Text>
        </View>
        {hasMarket && displayDiscount != null && result.verdict !== 'unknown' ? (
          <Text style={[styles.discountPill, { color: theme.text }]}>
            {displayDiscount > 0 ? `−${displayDiscount}%` : '0%'}
          </Text>
        ) : null}
      </View>

      <Text style={[styles.subtitle, { color: theme.text }]}>{theme.subtitle}</Text>

      {hasMarket ? (
        <View style={[styles.compareRow, compact && styles.compareRowCompact, jarvisMode && styles.compareRowJarvis]}>
          <View style={styles.compareCol}>
            <Text style={[styles.compareLabel, jarvisMode && styles.compareLabelJarvis]}>Lance atual</Text>
            <Text style={[styles.compareValue, jarvisMode && styles.compareValueJarvis]}>
              {formatBRL(result.bidCents)}
            </Text>
          </View>
          <View style={[styles.compareDivider, jarvisMode && styles.compareDividerJarvis]} />
          <View style={styles.compareCol}>
            <Text style={[styles.compareLabel, jarvisMode && styles.compareLabelJarvis]}>Mercado est.</Text>
            <Text style={[styles.compareValue, jarvisMode && styles.compareValueJarvis]}>
              {formatBRL(result.marketCents)}
            </Text>
          </View>
        </View>
      ) : null}

      {hasMarket && result.savingsCents != null && result.savingsCents > 0 ? (
        <Text style={[styles.savingsText, jarvisMode && styles.savingsTextJarvis]}>
          Economia estimada: {formatBRL(result.savingsCents)} em relação ao mercado
        </Text>
      ) : null}
      {jarvisMode ? <Text style={styles.monitoringTag}>MONITORING_ACTIVE</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardCompact: {
    padding: 12,
    gap: 8,
  },
  cardJarvis: {
    borderRadius: 4,
  },
  jarvisModuleTag: {
    fontSize: 6,
    fontWeight: '800',
    color: 'rgba(6, 182, 212, 0.65)',
    letterSpacing: 1,
    fontFamily: jarvisMono,
    marginBottom: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  discountPill: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  compareRowCompact: {
    paddingVertical: 8,
  },
  compareRowJarvis: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.15)',
  },
  compareCol: {
    flex: 1,
    gap: 2,
  },
  compareDivider: {
    width: 1,
    backgroundColor: C.border,
    marginHorizontal: 10,
  },
  compareDividerJarvis: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
  },
  compareLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  compareLabelJarvis: {
    color: jarvis.textMuted,
    fontFamily: jarvisMono,
    fontSize: 8,
  },
  compareValue: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  compareValueJarvis: {
    color: jarvis.textPrimary,
    fontFamily: jarvisMono,
  },
  savingsText: {
    fontSize: 11,
    color: C.textSecondary,
    fontWeight: '500',
  },
  savingsTextJarvis: {
    color: jarvis.textSecondary,
    fontFamily: jarvisMono,
    fontSize: 10,
  },
  monitoringTag: {
    fontSize: 6,
    fontWeight: '800',
    color: 'rgba(6, 182, 212, 0.55)',
    letterSpacing: 1,
    fontFamily: jarvisMono,
    marginTop: 2,
  },
});
