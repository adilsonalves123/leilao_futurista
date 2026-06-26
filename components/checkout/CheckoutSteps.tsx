import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { checkoutC } from './checkoutTheme';

const STEPS = [
  { id: 'arremate', label: 'Arremate', icon: 'trophy-outline' as const },
  { id: 'pagamento', label: 'Pagamento', icon: 'card-outline' as const },
  { id: 'custodia', label: 'Custódia', icon: 'shield-checkmark-outline' as const },
];

type Props = {
  activeStep: 'arremate' | 'pagamento' | 'custodia';
};

export function CheckoutSteps({ activeStep }: Props) {
  const activeIndex = STEPS.findIndex((s) => s.id === activeStep);

  return (
    <View style={styles.wrap}>
      {STEPS.map((step, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <View key={step.id} style={styles.stepCol}>
            <View style={styles.stepTop}>
              <View
                style={[
                  styles.dot,
                  done && styles.dotDone,
                  active && styles.dotActive,
                ]}>
                <Ionicons
                  name={done ? 'checkmark' : step.icon}
                  size={14}
                  color={done || active ? '#FFFFFF' : checkoutC.textMuted}
                />
              </View>
              {index < STEPS.length - 1 ? (
                <View style={[styles.line, done && styles.lineDone]} />
              ) : null}
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{step.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  stepCol: { flex: 1, alignItems: 'center' },
  stepTop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    marginBottom: 6,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: checkoutC.divider,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  dotActive: {
    backgroundColor: checkoutC.accent,
    borderColor: checkoutC.accent,
  },
  dotDone: {
    backgroundColor: checkoutC.success,
    borderColor: checkoutC.success,
  },
  line: {
    position: 'absolute',
    left: '55%',
    right: '-45%',
    height: 2,
    backgroundColor: '#E5E7EB',
    top: 15,
  },
  lineDone: { backgroundColor: checkoutC.success },
  label: { fontSize: 10, fontWeight: '600', color: checkoutC.textMuted },
  labelActive: { color: checkoutC.accent, fontWeight: '800' },
});
