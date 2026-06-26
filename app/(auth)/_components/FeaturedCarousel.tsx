import React from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
// Define o tamanho ideal do card para o carrossel no tablet
const CARD_WIDTH = width * 0.45; 

const DESTAQUES = [
  { id: '1', title: 'iPhone 16 Pro Max 256GB', lances: 'Popular', atual: 'R$ 7.499,00', tempo: '03:17:28', img: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?q=80&w=400' },
  { id: '2', title: 'Drone DJI Mavic 3 Pro Fly', lances: '12 lances', atual: 'R$ 5.890,00', tempo: '01:54:28', img: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?q=80&w=400' },
  { id: '3', title: 'PlayStation 5 Edição Digital', lances: '8 lances', atual: 'R$ 3.250,00', tempo: '00:44:28', img: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=400' },
  { id: '4', title: 'Apple Watch Ultra 2', lances: '5 lances', atual: 'R$ 2.890,00', tempo: '00:25:18', img: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?q=80&w=400' },
];

export default function FeaturedCarousel() {
  return (
    <View style={styles.container}>
      <View style={styles.rowHeader}>
        <Text style={styles.sectionTitle}>Leilões em destaque</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>Ver todos ❯</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal={true} 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.scrollList}
      >
        {DESTAQUES.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.badgeContainer}>
              <View style={[styles.badge, item.lances === 'Popular' ? styles.badgePopular : styles.badgeLances]}>
                <Text style={styles.badgeText}>{item.lances}</Text>
              </View>
            </View>
            
            <Image source={{ uri: item.img }} style={styles.image} />
            
            <View style={styles.infoContainer}>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.label}>Lance atual</Text>
              <Text style={styles.price}>{item.atual}</Text>
              <Text style={styles.timer}>⏱️ {item.tempo}</Text>
              
              <TouchableOpacity style={styles.btn} activeOpacity={0.8}>
                <Text style={styles.btnText}>Ver leilão</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 15 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1625' },
  seeAll: { fontSize: 13, color: '#7C3AED', fontWeight: '600' },
  scrollList: { paddingLeft: 20, paddingRight: 20, gap: 14 },
  card: { width: CARD_WIDTH, backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#F3F4F6', overflow: 'hidden', elevation: 2, marginBottom: 5 },
  badgeContainer: { position: 'absolute', top: 10, left: 10, zIndex: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgePopular: { backgroundColor: '#FF4A4A' },
  badgeLances: { backgroundColor: '#7C3AED' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  image: { width: '100%', height: 130, backgroundColor: '#F9FAFB', resizeMode: 'cover' },
  infoContainer: { padding: 12 },
  title: { fontSize: 14, fontWeight: '700', color: '#1A1625', height: 40 },
  label: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  price: { fontSize: 15, fontWeight: '800', color: '#7C3AED', marginVertical: 2 },
  timer: { fontSize: 12, color: '#4B5563', fontWeight: '600', marginBottom: 10 },
  btn: { backgroundColor: '#7C3AED', paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 13, fontWeight: '700' }
});