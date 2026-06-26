import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SubScreenLayout } from '@/src/components/SubScreenLayout';
import { REGRAS_CARTEIRA_PAGAMENTOS } from '@/src/content/regrasCarteiraPagamentos';
import { lightColors } from '@/src/theme/lightTokens';
import { RegraDetalhesTexto, regraHelpStyles } from './_components/RegraDetalhesTexto';

export default function CarteiraDuvidasScreen() {
  return (
    <SubScreenLayout
      title="Carteira e pagamentos"
      subtitle="Dúvidas sobre saldo, depósitos, saques e faturas">
      <View style={localStyles.avisoCard}>
        <Text style={localStyles.avisoTitulo}>Só dúvidas aqui</Text>
        <Text style={localStyles.avisoTexto}>
          Depósito e saque são feitos na aba operacional da carteira, não nesta tela.
        </Text>
        <Link href="/(tabs)/wallet" style={localStyles.avisoLink}>
          Ir para Minha Carteira →
        </Link>
      </View>

      {REGRAS_CARTEIRA_PAGAMENTOS.map((secao) => (
        <View key={secao.id} style={regraHelpStyles.card}>
          <Text style={regraHelpStyles.titulo}>{secao.titulo}</Text>
          <RegraDetalhesTexto texto={secao.detalhes} />
        </View>
      ))}

      <View style={regraHelpStyles.rodape}>
        <Text style={regraHelpStyles.rodapeText}>
          Dúvidas sobre um lote arrematado? Consulte também Envio e rastreio ou fale com o suporte.
        </Text>
      </View>
    </SubScreenLayout>
  );
}

const localStyles = StyleSheet.create({
  avisoCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    marginBottom: 16,
  },
  avisoTitulo: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 6,
  },
  avisoTexto: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 19,
    marginBottom: 10,
  },
  avisoLink: {
    fontSize: 14,
    fontWeight: '700',
    color: lightColors.accent,
  },
});
