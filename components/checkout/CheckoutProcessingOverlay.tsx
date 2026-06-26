import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { checkoutC } from './checkoutTheme';

type Step = 'pagamento' | 'custodia' | 'etiqueta';

const STEP_META: Record<
  Step,
  { label: string; icon: import('react').ComponentProps<typeof Ionicons>['name'] }
> = {
  pagamento: { label: 'Validando pagamento', icon: 'card-outline' },
  custodia: { label: 'Ativando custódia Levou', icon: 'shield-checkmark-outline' },
  etiqueta: { label: 'Notificando vendedor', icon: 'cube-outline' },
};

type Props = {
  visible: boolean;
  step: Step;
};

export function CheckoutProcessingOverlay({ visible, step }: Props) {
  const steps: Step[] = ['pagamento', 'custodia', 'etiqueta'];
  const currentIndex = steps.indexOf(step);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={checkoutC.accent} />
          <Text style={styles.title}>Processando arremate</Text>
          <Text style={styles.sub}>Seu pagamento está sendo protegido em custódia.</Text>
          <View style={styles.steps}>
            {steps.map((s, i) => {
              const meta = STEP_META[s];
              const done = i < currentIndex;
              const active = i === currentIndex;
              return (
                <View key={s} style={styles.stepRow}>
                  <Ionicons
                    name={done ? 'checkmark-circle' : meta.icon}
                    size={18}
                    color={done ? checkoutC.success : active ? checkoutC.accent : checkoutC.textMuted}
                  />
                  <Text
                    style={[
                      styles.stepLabel,
                      done && styles.stepDone,
                      active && styles.stepActive,
                    ]}>
                    {meta.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 46, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: checkoutC.text, marginTop: 8 },
  sub: { fontSize: 13, color: checkoutC.textMuted, textAlign: 'center', lineHeight: 20 },
  steps: { alignSelf: 'stretch', gap: 10, marginTop: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepLabel: { fontSize: 13, color: checkoutC.textMuted, fontWeight: '600' },
  stepActive: { color: checkoutC.accent, fontWeight: '800' },
  stepDone: { color: checkoutC.success },
});
