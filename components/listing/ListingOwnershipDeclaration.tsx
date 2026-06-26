import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  LISTING_LEGAL_ACCEPTANCE_LABEL,
  LISTING_LEGAL_CP_ARTICLES,
  LISTING_LEGAL_DECLARATION_INTRO,
  LISTING_LEGAL_DECLARATION_TITLE,
  LISTING_LEGAL_INTERMEDIATION,
  LISTING_LEGAL_SHIELD_CLAUSES,
  LISTING_LEGAL_SHIELD_TITLE,
} from '@/src/constants/listingLegalDeclaration';
import { lightColors } from '@/src/theme/lightTokens';

const C = {
  accent: lightColors.accent,
  textPrimary: '#1A1625',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  accentSoft: '#F4F0FF',
  accentBorder: '#E9E0FF',
  error: '#EF4444',
  errorSoft: '#FEF2F2',
  legalBg: '#FAFAFE',
  shieldBg: '#FFF7ED',
  shieldBorder: '#FED7AA',
};

const TERMS_MAX_HEIGHT = 280;

type Props = {
  checked: boolean;
  onToggle: () => void;
  showError?: boolean;
};

function LegalParagraph({ children }: { children: string }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

function CrimeLine({
  crime,
  article,
  penalty,
}: {
  crime: string;
  article: string;
  penalty: string;
}) {
  return (
    <Text style={styles.crimeLine}>
      <Text style={styles.crimeName}>{crime} </Text>
      <Text style={styles.articleBold}>({article})</Text>
      <Text style={styles.crimeName}>: {penalty}.</Text>
    </Text>
  );
}

export function ListingOwnershipDeclaration({ checked, onToggle, showError }: Props) {
  return (
    <View style={[styles.wrap, showError && !checked && styles.wrapError]}>
      <View style={styles.headerRow}>
        <Ionicons name="shield-checkmark-outline" size={20} color={C.accent} />
        <Text style={styles.headerTitle}>Termo jurídico obrigatório</Text>
      </View>
      <Text style={styles.headerHint}>
        Leia integralmente antes de publicar. A aceitação é registrada para segurança da
        plataforma.
      </Text>

      <View style={styles.termsBox}>
        <ScrollView
          style={styles.termsScroll}
          contentContainerStyle={styles.termsScrollContent}
          showsVerticalScrollIndicator
          nestedScrollEnabled>
          <Text style={styles.docTitle}>{LISTING_LEGAL_DECLARATION_TITLE}</Text>

          {LISTING_LEGAL_DECLARATION_INTRO.map((paragraph) => (
            <LegalParagraph key={paragraph.slice(0, 40)}>{paragraph}</LegalParagraph>
          ))}

          <View style={styles.crimesBlock}>
            {LISTING_LEGAL_CP_ARTICLES.map((item) => (
              <CrimeLine
                key={item.article}
                crime={item.crime}
                article={item.article}
                penalty={item.penalty}
              />
            ))}
          </View>

          <LegalParagraph>{LISTING_LEGAL_INTERMEDIATION}</LegalParagraph>

          <View style={styles.shieldBlock}>
            <Text style={styles.shieldTitle}>{LISTING_LEGAL_SHIELD_TITLE}</Text>
            {LISTING_LEGAL_SHIELD_CLAUSES.map((clause) => (
              <View key={clause.title} style={styles.clauseItem}>
                <Text style={styles.clauseTitle}>{clause.title}</Text>
                <Text style={styles.clauseBody}>{clause.body}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <Pressable
        style={styles.acceptRow}
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={LISTING_LEGAL_ACCEPTANCE_LABEL}>
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
        </View>
        <Text style={styles.acceptText}>{LISTING_LEGAL_ACCEPTANCE_LABEL}</Text>
      </Pressable>

      {showError && !checked ? (
        <Text style={styles.errorText}>
          É obrigatório aceitar o termo para publicar o leilão.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 16,
  },
  wrapError: {
    borderColor: '#FECACA',
    backgroundColor: C.errorSoft,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  headerHint: { fontSize: 11, color: C.textMuted, lineHeight: 16, marginBottom: 12 },
  termsBox: {
    maxHeight: TERMS_MAX_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.accentBorder,
    backgroundColor: C.legalBg,
    marginBottom: 14,
    overflow: 'hidden',
  },
  termsScroll: { maxHeight: TERMS_MAX_HEIGHT },
  termsScrollContent: { padding: 14, paddingBottom: 20 },
  docTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: 0.3,
    lineHeight: 17,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  paragraph: {
    fontSize: 12,
    lineHeight: 18,
    color: C.textSecondary,
    marginBottom: 10,
    fontWeight: '500',
  },
  crimesBlock: {
    marginBottom: 10,
    paddingLeft: 4,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
    paddingVertical: 4,
  },
  crimeLine: { fontSize: 12, lineHeight: 18 },
  crimeName: { color: C.textSecondary, fontWeight: '600' },
  articleBold: {
    color: C.textPrimary,
    fontWeight: '800',
  },
  shieldBlock: {
    backgroundColor: C.shieldBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.shieldBorder,
    padding: 12,
    marginTop: 4,
  },
  shieldTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9A3412',
    letterSpacing: 0.4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  clauseItem: { marginBottom: 10 },
  clauseTitle: { fontSize: 12, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  clauseBody: { fontSize: 11, lineHeight: 17, color: C.textSecondary, fontWeight: '500' },
  acceptRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: C.accent, borderColor: C.accent },
  acceptText: { flex: 1, fontSize: 12, lineHeight: 18, color: C.textPrimary, fontWeight: '700' },
  errorText: { fontSize: 11, color: C.error, marginTop: 10, fontWeight: '600' },
});
