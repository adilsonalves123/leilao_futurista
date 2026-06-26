import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfile } from '@/src/store/profileContext';
import { lightColors } from '@/src/theme/lightTokens';

const SENSITIVE_ITEMS = [
  {
    id: 'address',
    icon: 'location-outline' as const,
    title: 'Endereço de entrega/postagem',
    subtitle: 'Av. Paulista, 1000 — Bela Vista, São Paulo — SP',
    action: 'Editar endereço',
  },
  {
    id: 'password',
    icon: 'lock-closed-outline' as const,
    title: 'Alterar Senha',
    subtitle: 'Última alteração há 3 meses',
    action: 'Alterar',
  },
  {
    id: 'cards',
    icon: 'card-outline' as const,
    title: 'Cartões de Crédito',
    subtitle: 'Visa •••• 4821 · Principal',
    action: 'Gerenciar',
  },
];

const C = {
  accent: lightColors.accent,
  bg: '#FAFAFE',
  white: '#FFFFFF',
  textPrimary: '#1A1625',
  textMuted: '#9CA3AF',
  textSecondary: '#6B7280',
  border: '#F3F4F6',
};

export default function MyProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { avatarUri, setAvatarUri } = useProfile();

  const pickFromGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para alterar sua foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
    }
  }, [setAvatarUri]);

  const pickFromCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar uma nova foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
    }
  }, [setAvatarUri]);

  function handleChangePhoto() {
    Alert.alert('Alterar foto de perfil', 'Escolha de onde deseja enviar a nova foto.', [
      { text: 'Galeria', onPress: pickFromGallery },
      { text: 'Câmera', onPress: pickFromCamera },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={C.textPrimary} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Meu perfil</Text>
          <Text style={styles.headerSubtitle}>Dados pessoais e segurança</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.photoCard}>
          <Pressable
            style={styles.avatarWrap}
            onPress={handleChangePhoto}
            accessibilityRole="button"
            accessibilityLabel="Alterar foto de perfil">
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </View>
          </Pressable>
          <Text style={styles.userName}>Adison Silva</Text>
          <Pressable
            style={styles.changePhotoBtn}
            onPress={handleChangePhoto}
            accessibilityRole="button">
            <Ionicons name="image-outline" size={16} color={C.accent} />
            <Text style={styles.changePhotoText}>Alterar foto de perfil</Text>
          </Pressable>
        </View>

        <View style={styles.noticeBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color={C.accent} />
          <Text style={styles.noticeText}>
            Estas informações são privadas e usadas apenas para entregas, pagamentos e segurança da
            conta.
          </Text>
        </View>

        {SENSITIVE_ITEMS.map((item) => (
          <Pressable key={item.id} style={styles.itemCard} accessibilityRole="button">
            <View style={styles.itemIconWrap}>
              <Ionicons name={item.icon} size={22} color={C.accent} />
            </View>
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
            </View>
            <View style={styles.itemAction}>
              <Text style={styles.itemActionText}>{item.action}</Text>
              <Ionicons name="chevron-forward" size={16} color={C.accent} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.textPrimary },
  headerSubtitle: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  photoCard: {
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E5E7EB',
    borderWidth: 3,
    borderColor: '#F4F0FF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.white,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: C.textPrimary,
    marginTop: 14,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F4F0FF',
    borderWidth: 1,
    borderColor: '#E9E0FF',
  },
  changePhotoText: { fontSize: 13, fontWeight: '700', color: C.accent },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F4F0FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9E0FF',
    padding: 14,
    marginBottom: 4,
  },
  noticeText: { flex: 1, fontSize: 12, color: C.textSecondary, lineHeight: 18 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  itemIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F4F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  itemSubtitle: { fontSize: 12, color: C.textMuted, marginTop: 3, lineHeight: 17 },
  itemAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  itemActionText: { fontSize: 12, fontWeight: '700', color: C.accent },
});
