import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBanners } from '@/src/store/bannersContext';
import { lightColors } from '@/src/theme/lightTokens';

/** Banner retangular largo (2:1) — largura quase total da tela */
const BANNER_H_MARGIN = 8;
const BANNER_ASPECT = 2;
const BANNER_WIDTH = Dimensions.get('window').width - BANNER_H_MARGIN * 2;
const BANNER_HEIGHT = BANNER_WIDTH / BANNER_ASPECT;

export function HomeBannerCarousel() {
  const router = useRouter();
  const { carrosselInicioAtivos, autoplayIntervalMs } = useBanners();
  const [indiceAtivo, setIndiceAtivo] = useState(0);

  useEffect(() => {
    setIndiceAtivo(0);
  }, [carrosselInicioAtivos]);

  useEffect(() => {
    if (carrosselInicioAtivos.length <= 1) return;
    const timer = setInterval(() => {
      setIndiceAtivo((atual) => (atual + 1) % carrosselInicioAtivos.length);
    }, autoplayIntervalMs);
    return () => clearInterval(timer);
  }, [carrosselInicioAtivos, carrosselInicioAtivos.length, autoplayIntervalMs]);

  if (carrosselInicioAtivos.length === 0) {
    return null;
  }

  const slide = carrosselInicioAtivos[indiceAtivo];

  function abrirDestino() {
    if (!slide.link || slide.link.startsWith('http')) return;
    router.push(slide.link as never);
  }

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.hero} onPress={abrirDestino} accessibilityRole="button">
        <Image source={{ uri: slide.image }} style={styles.heroImage} />
        <View style={styles.heroOverlayTop} />
        <View style={styles.heroOverlayBottom} />

        <View style={styles.heroContent}>
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>📣 CAMPANHA</Text>
          </View>

          <Text style={styles.heroTitle}>{slide.title}</Text>
          {slide.subtitle ? (
            <Text style={styles.heroSubtitle}>{slide.subtitle}</Text>
          ) : null}

          <View style={styles.participateBtn}>
            <Text style={styles.participateBtnText}>Saiba mais</Text>
            <Ionicons name="arrow-forward" size={16} color="#1A1625" />
          </View>
        </View>
      </Pressable>

      {carrosselInicioAtivos.length > 1 && (
        <View style={styles.heroIndicators}>
          {carrosselInicioAtivos.map((item, i) => (
            <Pressable
              key={item.id}
              onPress={() => setIndiceAtivo(i)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Ir para slide ${i + 1}`}>
              <View
                style={[
                  styles.heroIndicator,
                  i === indiceAtivo
                    ? styles.heroIndicatorActive
                    : styles.heroIndicatorInactive,
                ]}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    marginBottom: 4,
  },
  hero: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    alignSelf: 'center',
    marginHorizontal: BANNER_H_MARGIN,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1A1625',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlayTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 7, 28, 0.15)',
  },
  heroOverlayBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '72%',
    backgroundColor: 'rgba(9, 7, 28, 0.72)',
  },
  heroContent: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  featuredBadgeText: {
    color: '#FCD34D',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 12,
  },
  participateBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5B942',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  participateBtnText: {
    color: '#1A1625',
    fontSize: 14,
    fontWeight: '800',
  },
  heroIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  heroIndicator: { height: 6, borderRadius: 3 },
  heroIndicatorActive: { width: 22, backgroundColor: lightColors.accent },
  heroIndicatorInactive: { width: 6, backgroundColor: '#D1D5DB' },
});
