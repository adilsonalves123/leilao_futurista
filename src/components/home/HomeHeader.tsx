import { StyleSheet, Text, View } from 'react-native';
import { getMockSession } from '@/src/lib/mockSession';
import { lightColors } from '@/src/theme/lightTokens';
import { fonts, spacing } from '@/src/theme/tokens';

export function HomeHeader() {
  const user = getMockSession();
  const name = user?.displayName ?? 'Visitante';

  // Simulando dados da carteira antifraude do usuário (Mock)
  const saldoDisponivel = "2.500,00";
  const saldoRetidoGarantia = "500,00";

  return (
    <View style={styles.container}>
      {/* Topo original com o Nome e o Badge Ao Vivo */}
      <View style={styles.wrap}>
        <View>
          <Text style={styles.greeting}>Olá, {name.split(' ')[0]}</Text>
          <Text style={styles.title}>Leilões ao vivo</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>AO VIVO</Text>
        </View>
      </View>

      {/* ================= DASHBOARD: CARTEIRA VIRTUAL ANTIFRAUDE ================= */}
      <View style={styles.walletCard}>
        <View style={styles.walletSection}>
          <Text style={styles.walletLabel}>SALDO DISPONÍVEL</Text>
          <Text style={styles.walletValue}>
            <Text style={styles.currencySymbol}>FTK </Text>
            {saldoDisponivel}
          </Text>
        </View>
        
        {/* Linha divisória vertical discreta */}
        <View style={styles.divider} />

        <View style={styles.walletSection}>
          <Text style={styles.walletLabel}>RETIDO (GARANTIA)</Text>
          <Text style={[styles.walletValue, styles.blockedValue]}>
            <Text style={styles.currencySymbol}>FTK </Text>
            {saldoRetidoGarantia}
          </Text>
        </View>
      </View>
      {/* ========================================================================= */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  greeting: {
    fontSize: 14,
    color: lightColors.textSecondary,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: lightColors.textPrimary,
    letterSpacing: -0.5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontFamily: fonts.timerRegular,
    fontSize: 9,
    letterSpacing: 2,
    color: lightColors.accent,
    fontWeight: '600',
  },
  /* Estilos do novo Dashboard da Carteira */
  walletCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(124, 58, 237, 0.06)', // Roxo bem suave combinando com o app
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  walletSection: {
    flex: 1,
  },
  walletLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: lightColors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  walletValue: {
    fontSize: 16,
    fontWeight: '700',
    color: lightColors.textPrimary,
  },
  currencySymbol: {
    fontSize: 12,
    color: lightColors.accent, // Roxo em destaque para a moeda
    fontWeight: '600',
  },
  blockedValue: {
    color: '#F59E0B', // Tom laranja/âmbar para indicar saldo temporariamente travado
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    marginHorizontal: spacing.md,
  },
});