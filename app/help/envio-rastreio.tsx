import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { SubScreenLayout } from '@/src/components/SubScreenLayout';
import { REGRAS_ENVIO_RASTREIO } from '@/src/content/regrasEnvioRastreio';
import { RegraDetalhesTexto, regraHelpStyles as styles } from './_components/RegraDetalhesTexto';

export default function EnvioRastreioScreen() {
  return (
    <SubScreenLayout title="Envio e rastreio" subtitle="Etiquetas, transportadoras e acompanhamento">
      <Text style={styles.intro}>
        Depois do pagamento da fatura, acompanhe aqui como o produto é preparado, postado e entregue.
        Para ver o status do seu lote, acesse{' '}
        <Link href="/my-bids" style={styles.link}>
          Meus Lotes / Arremates
        </Link>
        .
      </Text>

      {REGRAS_ENVIO_RASTREIO.map((secao) => (
        <View key={secao.id} style={styles.card}>
          <Text style={styles.titulo}>{secao.titulo}</Text>
          <RegraDetalhesTexto texto={secao.detalhes} />
        </View>
      ))}

      <View style={styles.rodape}>
        <Text style={styles.rodapeText}>
          Problemas na entrega? Abra um chamado em Ajuda → Falar com suporte o quanto antes.
        </Text>
      </View>
    </SubScreenLayout>
  );
}
