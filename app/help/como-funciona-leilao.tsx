import { Link } from 'expo-router';

import { Text, View } from 'react-native';

import { SubScreenLayout } from '@/src/components/SubScreenLayout';

import { REGRAS_LEILAO } from '@/src/content/regrasLeilao';

import { RegraDetalhesTexto, regraHelpStyles as styles } from './_components/RegraDetalhesTexto';



export default function ComoFuncionaLeilaoScreen() {

  return (

    <SubScreenLayout

      title="Como funciona o leilão"

      subtitle="Regras completas para participar com segurança">

      <Text style={styles.intro}>

        Leia cada etapa antes de dar lances. Dúvidas sobre verificação de identidade podem ser

        resolvidas em{' '}

        <Link href="/kyc" style={styles.link}>

          Meu cadastro (KYC)

        </Link>

        .

      </Text>



      {REGRAS_LEILAO.map((secao) => (

        <View key={secao.id} style={styles.card}>

          <Text style={styles.titulo}>{secao.titulo}</Text>

          <RegraDetalhesTexto texto={secao.detalhes} />

        </View>

      ))}



      <View style={styles.rodape}>

        <Text style={styles.rodapeText}>

          Ao dar lance, você concorda com estas regras e com os termos de arremate exibidos no

          leilão.

        </Text>

      </View>

    </SubScreenLayout>

  );

}


