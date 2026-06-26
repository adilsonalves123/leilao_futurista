import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  buildPromotionCheckout,
  formatPromotionPrice,
  promotionDurationLabel,
} from '@/src/lib/promotionFormatters';
import {
  fetchFeaturedPlusSlotsRemaining,
  fetchPromotionPlans,
  getPromotionPlan,
} from '@/src/services/promotionPlans';
import { lightColors } from '@/src/theme/lightTokens';
import type { ListingPromotionSelection, PromotionPlan } from '@/src/types/promotions';

const C = {
  accent: lightColors.accent,
  white: '#FFFFFF',
  textPrimary: '#1A1625',
  textMuted: '#9CA3AF',
  textSecondary: '#6B7280',
  border: '#F3F4F6',
  accentSoft: '#F4F0FF',
  accentBorder: '#E9E0FF',
  warn: '#F59E0B',
  warnSoft: '#FFFBEB',
};

export type PromotionBoostSectionProps = {
  selection: ListingPromotionSelection;
  onSelectionChange: (next: ListingPromotionSelection) => void;
  /** Cards semi-transparentes para o fundo martelo aparecer (etapa 5). */
  glassSurface?: boolean;
};

export function PromotionBoostSection({
  selection,
  onSelectionChange,
  glassSurface = false,
}: PromotionBoostSectionProps) {
  const [plans, setPlans] = useState<PromotionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [plusSlots, setPlusSlots] = useState({ maxSlots: 5, used: 0, remaining: 5 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const lista = await fetchPromotionPlans();
      if (cancelled) return;
      setPlans(lista);
      const slots = await fetchFeaturedPlusSlotsRemaining(lista);
      if (!cancelled) setPlusSlots(slots);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const featuredPlan = getPromotionPlan(plans, 'featured');
  const plusPlan = getPromotionPlan(plans, 'featured_plus');
  const checkout = useMemo(
    () => buildPromotionCheckout(plans, selection),
    [plans, selection],
  );

  const plusFull = plusSlots.remaining <= 0;
  const plusBlocked = plusFull && !selection.featuredPlus;

  function toggleFeatured() {
    onSelectionChange({ ...selection, featured: !selection.featured });
  }

  function toggleFeaturedPlus() {
    if (plusBlocked) return;
    onSelectionChange({ ...selection, featuredPlus: !selection.featuredPlus });
  }

  const wrapStyle = [styles.wrap, glassSurface && styles.wrapGlass];
  const optionGlass = glassSurface ? styles.optionCardGlass : null;

  if (loading) {
    return (
      <View style={wrapStyle}>
        <Text style={styles.sectionTitle}>Impulsionar seu leilão</Text>
        <ActivityIndicator color={C.accent} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={wrapStyle}>
      <Text style={styles.sectionTitle}>Impulsionar seu leilão</Text>
      <Text style={styles.sectionLead}>Opcional — cobrado junto com a publicação</Text>

      {featuredPlan ? (
        <PlanOptionCard
          cardStyle={optionGlass}
          checked={selection.featured}
          onToggle={toggleFeatured}
          title={featuredPlan.name}
          description={featuredPlan.description}
          priceLabel={formatPromotionPrice(featuredPlan.priceCents)}
          durationLabel={promotionDurationLabel(featuredPlan)}
          icon="star-outline"
        />
      ) : null}

      {plusPlan ? (
        <PlanOptionCard
          cardStyle={optionGlass}
          checked={selection.featuredPlus}
          onToggle={toggleFeaturedPlus}
          disabled={plusBlocked}
          title={plusPlan.name}
          description={plusPlan.description}
          priceLabel={formatPromotionPrice(plusPlan.priceCents)}
          durationLabel={promotionDurationLabel(plusPlan)}
          icon="home-outline"
          badge="Home com cronômetro"
          slotsHint={`${plusSlots.remaining} de ${plusSlots.maxSlots} vagas na Home`}
          warn={plusBlocked ? 'Sem vagas no momento. Tente só Destaque ou publique mais tarde.' : undefined}
        />
      ) : null}

      <View style={[styles.summaryBox, glassSurface && styles.summaryBoxGlass]}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Taxa de publicação</Text>
          <Text style={styles.summaryValue}>R$ 0,00</Text>
        </View>
        {checkout.lines.map((line) => (
          <View key={line.slug} style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{line.label}</Text>
            <Text style={styles.summaryValueHighlight}>
              {formatPromotionPrice(line.priceCents)}
            </Text>
          </View>
        ))}
        <View style={[styles.summaryRow, styles.summaryTotalRow]}>
          <Text style={styles.summaryTotalLabel}>Total ao publicar</Text>
          <Text style={styles.summaryTotalValue}>
            {formatPromotionPrice(checkout.totalCents)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function PlanOptionCard({
  cardStyle,
  checked,
  onToggle,
  disabled,
  title,
  description,
  priceLabel,
  durationLabel,
  icon,
  badge,
  slotsHint,
  warn,
}: {
  cardStyle?: object | null;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  title: string;
  description: string;
  priceLabel: string;
  durationLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
  slotsHint?: string;
  warn?: string;
}) {
  return (
    <Pressable
      style={[
        styles.optionCard,
        cardStyle,
        checked && styles.optionCardActive,
        disabled && styles.optionCardDisabled,
      ]}
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
      </View>

      <View style={styles.optionBody}>
        <View style={styles.optionTitleRow}>
          <Ionicons name={icon} size={18} color={checked ? C.accent : C.textMuted} />
          <Text style={styles.optionTitle}>{title}</Text>
          {badge ? (
            <View style={styles.optionBadge}>
              <Text style={styles.optionBadgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.optionDesc}>{description}</Text>
        <Text style={styles.optionMeta}>
          {priceLabel} · {durationLabel}
        </Text>
        {slotsHint ? <Text style={styles.slotsHint}>{slotsHint}</Text> : null}
        {warn ? <Text style={styles.warnText}>{warn}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 16,
  },
  wrapGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderColor: 'rgba(124, 58, 237, 0.16)',
  },
  optionCardGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderColor: 'rgba(124, 58, 237, 0.14)',
  },
  summaryBoxGlass: {
    backgroundColor: 'rgba(250, 250, 254, 0.75)',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  sectionLead: { fontSize: 12, color: C.textMuted, marginBottom: 14 },
  loader: { marginVertical: 20 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    backgroundColor: '#FAFAFE',
  },
  optionCardActive: {
    borderColor: C.accentBorder,
    backgroundColor: C.accentSoft,
  },
  optionCardDisabled: { opacity: 0.55 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  optionBody: { flex: 1 },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  optionTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  optionBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  optionBadgeText: { fontSize: 9, fontWeight: '800', color: '#92400E' },
  optionDesc: { fontSize: 12, color: C.textSecondary, lineHeight: 17, marginBottom: 6 },
  optionMeta: { fontSize: 13, fontWeight: '700', color: C.accent },
  slotsHint: { fontSize: 11, color: C.textMuted, marginTop: 4 },
  warnText: { fontSize: 11, color: C.warn, marginTop: 6, fontWeight: '600' },
  summaryBox: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 13, color: C.textSecondary },
  summaryValue: { fontSize: 13, color: C.textPrimary, fontWeight: '600' },
  summaryValueHighlight: { fontSize: 13, color: C.accent, fontWeight: '700' },
  summaryTotalRow: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  summaryTotalLabel: { fontSize: 14, fontWeight: '800', color: C.textPrimary },
  summaryTotalValue: { fontSize: 16, fontWeight: '800', color: C.accent },
});
