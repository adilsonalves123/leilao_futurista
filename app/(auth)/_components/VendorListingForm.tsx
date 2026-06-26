import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOperationsStore } from '@/src/hooks/useOperationsStore';
import type { ListingDraft } from '@/src/types/operations';
import { lightColors } from '@/src/theme/lightTokens';
import { spacing } from '@/src/theme/tokens';
import { ComplianceService } from '@/src/complianceService';

const C = {
  accent: lightColors.accent,
  white: '#FFFFFF',
  textPrimary: '#1A1625',
  textMuted: '#9CA3AF',
  textSecondary: '#6B7280',
  border: '#F3F4F6',
  inputBg: '#F3F4F6',
  error: '#EF4444',
  success: '#10B981',
};

const emptyDraft = (): ListingDraft => ({
  title: '',
  priceCents: 0,
  weightKg: 0,
  dimensions: { comprimento: 0, largura: 0, altura: 0 },
});

type VendorListingFormProps = {
  onPublished?: () => void;
};

export function VendorListingForm({ onPublished }: VendorListingFormProps) {
  const { publishListing } = useOperationsStore();
  const [draft, setDraft] = useState<ListingDraft>(emptyDraft());
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [nfConfirmed, setNfConfirmed] = useState(false);

  function updateField<K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setSuccess(false);
  }

  function handlePublish() {
    if (!nfConfirmed) {
      Alert.alert('Confirmação obrigatória', 'Marque a declaração sobre a NF-e antes de publicar.');
      return;
    }

    const complianceInput = {
      weightKg: draft.weightKg,
      dimensions: {
        lengthCm: draft.dimensions.comprimento,
        widthCm: draft.dimensions.largura,
        heightCm: draft.dimensions.altura,
      },
      nfKey: draft.nfAccessKey,
      nfPdfUrl: draft.nfPdfUri,
    };

    const validation = ComplianceService.validateItemRegistration(complianceInput);

    if (!validation.valid) {
      Alert.alert('Erro de Compliance', validation.error || 'Dados inválidos no formulário');
      return;
    }

    const result = publishListing({
      ...draft,
      priceCents: Math.round(parseFloat(String(draft.priceCents)) || 0) * 100 || draft.priceCents,
    });
    if (!result.ok) {
      setErrors(result.errors ?? []);
      setSuccess(false);
      return;
    }
    setErrors([]);
    setSuccess(true);
    setDraft(emptyDraft());
    setNfConfirmed(false);
    onPublished?.();
  }

  function mockPdfUpload() {
    updateField('nfPdfUri', `mock://nf/${Date.now()}.pdf`);
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.formTitle}>Cadastrar leilão</Text>
      <Text style={styles.hint}>
        NF-e obrigatória (chave 44 dígitos ou PDF) + peso e dimensões para frete.
      </Text>

      <Field label="Título">
        <TextInput
          style={styles.input}
          placeholder="Ex: MacBook Pro M3 Max"
          placeholderTextColor={C.textMuted}
          value={draft.title}
          onChangeText={(t) => updateField('title', t)}
        />
      </Field>

      <Field label="Preço inicial (R$)">
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="18990.00"
          placeholderTextColor={C.textMuted}
          value={draft.priceCents ? String(draft.priceCents / 100) : ''}
          onChangeText={(t) =>
            updateField('priceCents', Math.round(parseFloat(t.replace(',', '.')) * 100) || 0)
          }
        />
      </Field>

      <Field label="Chave NF-e (44 dígitos)">
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          maxLength={44}
          placeholder="35260123456789012345678901234567890123456"
          placeholderTextColor={C.textMuted}
          value={draft.nfAccessKey ?? ''}
          onChangeText={(t) => updateField('nfAccessKey', t)}
        />
        <Text style={styles.nfHelp}>
          🔒 Seus dados estão protegidos. O leilão passará por análise de autenticidade antes de ir ao ar.
        </Text>
      </Field>

      <Pressable style={styles.secondaryBtn} onPress={mockPdfUpload}>
        <Text style={styles.secondaryBtnText}>
          {draft.nfPdfUri ? '✓ PDF anexado (mock)' : 'Anexar PDF da NF-e (mock)'}
        </Text>
      </Pressable>

      <Field label="Peso (kg)">
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="1.5"
          placeholderTextColor={C.textMuted}
          value={draft.weightKg ? String(draft.weightKg) : ''}
          onChangeText={(t) => updateField('weightKg', parseFloat(t.replace(',', '.')) || 0)}
        />
      </Field>

      <Text style={styles.dimLabel}>Dimensões (cm) — C × L × A</Text>
      <View style={styles.dimRow}>
        <Field label="Comp.">
          <TextInput
            style={styles.inputSmall}
            keyboardType="decimal-pad"
            placeholderTextColor={C.textMuted}
            value={draft.dimensions.comprimento ? String(draft.dimensions.comprimento) : ''}
            onChangeText={(t) =>
              updateField('dimensions', {
                ...draft.dimensions,
                comprimento: parseFloat(t) || 0,
              })
            }
          />
        </Field>
        <Field label="Larg.">
          <TextInput
            style={styles.inputSmall}
            keyboardType="decimal-pad"
            placeholderTextColor={C.textMuted}
            value={draft.dimensions.largura ? String(draft.dimensions.largura) : ''}
            onChangeText={(t) =>
              updateField('dimensions', {
                ...draft.dimensions,
                largura: parseFloat(t) || 0,
              })
            }
          />
        </Field>
        <Field label="Alt.">
          <TextInput
            style={styles.inputSmall}
            keyboardType="decimal-pad"
            placeholderTextColor={C.textMuted}
            value={draft.dimensions.altura ? String(draft.dimensions.altura) : ''}
            onChangeText={(t) =>
              updateField('dimensions', {
                ...draft.dimensions,
                altura: parseFloat(t) || 0,
              })
            }
          />
        </Field>
      </View>

      {errors.length > 0 ? (
        <View style={styles.errorBox}>
          {errors.map((e, i) => (
            <Text key={i} style={styles.errorText}>
              • {e}
            </Text>
          ))}
        </View>
      ) : null}

      {success ? (
        <Text style={styles.success}>Leilão publicado com sucesso!</Text>
      ) : null}

      <Pressable style={styles.checkboxRow} onPress={() => setNfConfirmed((v) => !v)}>
        <Ionicons
          name={nfConfirmed ? 'checkbox' : 'square-outline'}
          size={22}
          color={nfConfirmed ? C.accent : C.textMuted}
        />
        <Text style={styles.checkboxText}>
          Declaro que as informações da NF-e são verdadeiras e estou ciente de que o saldo do leilão
          ficará retido em custódia até a confirmação de entrega do comprador.
        </Text>
      </Pressable>

      <Pressable
        style={[styles.primaryBtn, !nfConfirmed && styles.primaryBtnDisabled]}
        onPress={handlePublish}
        disabled={!nfConfirmed}>
        <Text style={styles.primaryBtnText}>Publicar leilão</Text>
      </Pressable>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      {children}
    </>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: spacing.xs },
  hint: { fontSize: 12, color: C.textSecondary, marginBottom: spacing.sm, lineHeight: 18 },
  label: { fontSize: 12, color: C.textSecondary, marginTop: spacing.sm, marginBottom: 4, fontWeight: '600' },
  dimLabel: { fontSize: 12, color: C.textSecondary, marginTop: spacing.sm, fontWeight: '600' },
  dimRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: spacing.sm,
    color: C.textPrimary,
    fontSize: 14,
  },
  inputSmall: {
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: spacing.sm,
    color: C.textPrimary,
    fontSize: 14,
    flex: 1,
  },
  nfHelp: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 6,
    lineHeight: 16,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
    backgroundColor: '#F4F0FF',
  },
  secondaryBtnText: { color: C.accent, fontSize: 13, fontWeight: '600' },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: '#F4F0FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9E0FF',
  },
  checkboxText: {
    flex: 1,
    fontSize: 12,
    color: C.textPrimary,
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { color: C.error, fontSize: 12, lineHeight: 18 },
  success: { color: C.success, marginTop: spacing.sm, fontSize: 13, fontWeight: '600' },
});
