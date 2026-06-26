import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { lightColors } from '@/src/theme/lightTokens';

const C = {
  accent: lightColors.accent,
  textPrimary: '#1A1625',
  textSecondary: '#6B7280',
  border: '#E9E0FF',
  accentSoft: '#F4F0FF',
  gold: '#B45309',
  goldSoft: '#FFFBEB',
};

const BASE_TIPS = [
  {
    icon: 'sunny-outline' as const,
    text: 'Use luz natural ou ambiente bem iluminado — evite sombras duras sobre o produto.',
  },
  {
    icon: 'image-outline' as const,
    text: 'Escolha um fundo limpo e favorável: mesa, parede neutra ou ambiente organizado.',
  },
  {
    icon: 'eye-outline' as const,
    text: 'Deixe o item em destaque, centralizado e ocupando boa parte do quadro.',
  },
  {
    icon: 'close-circle-outline' as const,
    text: 'Evite cama, chão bagunçado, objetos pessoais ou fundo que distraia do leilão.',
  },
  {
    icon: 'sparkles-outline' as const,
    text: 'Capas com impacto visual recebem mais cliques na Home — pense como vitrine de loja.',
  },
];

const CATEGORY_TIPS: Record<string, string> = {
  eletronicos:
    'Eletrônicos vendem mais em mesa ou superfície lisa, com cabos organizados e tela visível.',
  veiculos: 'Mostre o ângulo que revela estado e diferenciais — luz do dia valoriza a pintura.',
  imoveis: 'Priorize ambientes amplos, janelas e luz entrando — transmita sensação de espaço.',
  produtos_gerais: 'Fundo neutro e item bem posicionado passam mais confiança aos compradores.',
  colecionaveis: 'Detalhes nítidos e fundo escuro ou neutro valorizam peças de coleção.',
};

type Props = {
  category?: string;
};

export function ListingCoverPhotoTipsCard({ category = '' }: Props) {
  const categoryTip = CATEGORY_TIPS[category.toLowerCase()];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="camera" size={20} color={C.gold} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Capa que vende mais</Text>
          <Text style={styles.subtitle}>
            A foto de capa é a vitrine do seu leilão na Home. Boas fotos geram mais visitas e lances.
          </Text>
        </View>
      </View>

      {categoryTip ? (
        <View style={styles.categoryTip}>
          <Ionicons name="bulb-outline" size={16} color={C.gold} />
          <Text style={styles.categoryTipText}>{categoryTip}</Text>
        </View>
      ) : null}

      <View style={styles.tipsList}>
        {BASE_TIPS.map((tip) => (
          <View key={tip.text} style={styles.tipRow}>
            <Ionicons name={tip.icon} size={16} color={C.accent} style={styles.tipIcon} />
            <Text style={styles.tipText}>{tip.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.goldSoft,
    padding: 14,
    marginBottom: 16,
  },
  headerRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { fontSize: 14, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 12, color: C.textSecondary, lineHeight: 17 },
  categoryTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryTipText: { flex: 1, fontSize: 12, color: C.textPrimary, lineHeight: 17, fontWeight: '600' },
  tipsList: { gap: 8 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipIcon: { marginTop: 1 },
  tipText: { flex: 1, fontSize: 12, color: C.textSecondary, lineHeight: 17 },
});
