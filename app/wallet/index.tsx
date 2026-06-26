import { Redirect } from 'expo-router';

/** Rota legada `/wallet` — redireciona para a aba Carteira. */
export default function WalletLegacyRedirect() {
  return <Redirect href="/(tabs)/wallet" />;
}
