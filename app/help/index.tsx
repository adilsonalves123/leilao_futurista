import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SubScreenLayout } from '@/src/components/SubScreenLayout';
import { lightColors } from '@/src/theme/lightTokens';

type HelpTopic = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  route?: string;
};

const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'h1',
    icon: 'help-buoy-outline',
    title: 'Como funciona o leilão',
    desc: 'KYC, carteira, lances, anti-robô e arremate',
    route: '/help/como-funciona-leilao',
  },
  {
    id: 'h2',
    icon: 'car-outline',
    title: 'Envio e rastreio',
    desc: 'Etiquetas, Correios e prazos de entrega',
    route: '/help/envio-rastreio',
  },
  {
    id: 'h3',
    icon: 'wallet-outline',
    title: 'Carteira e pagamentos',
    desc: 'Saldo, depósitos, saques e faturas',
    route: '/help/carteira-duvidas',
  },
  {
    id: 'h4',
    icon: 'chatbubble-ellipses-outline',
    title: 'Falar com suporte',
    desc: 'Chat com assistente virtual em tempo real',
    route: '/help/suporte-chat',
  },
];

export default function HelpScreen() {
  const router = useRouter();

  function abrirTopico(item: HelpTopic) {
    if (item.route) {
      router.push(item.route);
    }
  }

  return (
    <SubScreenLayout title="Ajuda" subtitle="Central de suporte Levou">
      <View style={styles.list}>
        {HELP_TOPICS.map((item, index) => (
          <Pressable
            key={item.id}
            style={[styles.row, index < HELP_TOPICS.length - 1 && styles.rowBorder]}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => abrirTopico(item)}>
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={20} color={lightColors.accent} />
            </View>
            <View style={styles.body}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.desc}>{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </Pressable>
        ))}
      </View>
    </SubScreenLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F4F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#1A1625' },
  desc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});
