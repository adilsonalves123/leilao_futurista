import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Pressable,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  uris: string[];
  index: number;
  labels?: string[];
  onClose: () => void;
  onIndexChange?: (index: number) => void;
};

export function ListingPhotoPreviewModal({
  visible,
  uris,
  index,
  labels,
  onClose,
  onIndexChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const uri = uris[index];
  const hasPrev = index > 0;
  const hasNext = index < uris.length - 1;
  const label = labels?.[index] ?? `Foto ${index + 1} de ${uris.length}`;

  function goPrev() {
    if (hasPrev) onIndexChange?.(index - 1);
  }

  function goNext() {
    if (hasNext) onIndexChange?.(index + 1);
  }

  if (!uri) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={12}
            accessibilityLabel="Fechar visualização">
            <Ionicons name="close" size={26} color="#FFF" />
          </Pressable>
        </View>

        <View style={styles.imageWrap}>
          <Image
            source={{ uri }}
            style={{ width: width - 24, height: height * 0.65 }}
            resizeMode="contain"
            accessibilityLabel={label}
          />
        </View>

        {uris.length > 1 ? (
          <View style={[styles.navRow, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable
              style={[styles.navBtn, !hasPrev && styles.navBtnDisabled]}
              onPress={goPrev}
              disabled={!hasPrev}
              accessibilityLabel="Foto anterior">
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <Text style={styles.counter}>
              {index + 1} / {uris.length}
            </Text>
            <Pressable
              style={[styles.navBtn, !hasNext && styles.navBtnDisabled]}
              onPress={goNext}
              disabled={!hasNext}
              accessibilityLabel="Próxima foto">
              <Ionicons name="chevron-forward" size={22} color="#FFF" />
            </Pressable>
          </View>
        ) : (
          <View style={{ height: insets.bottom + 16 }} />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  label: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingTop: 8,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.35 },
  counter: { color: '#FFF', fontSize: 14, fontWeight: '600', minWidth: 56, textAlign: 'center' },
});
