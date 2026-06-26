import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

const OPCOES: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.85,
};

async function abrirGaleria(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para enviar fotos.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync(OPCOES);
  if (result.canceled || !result.assets[0]?.uri) return null;
  return result.assets[0].uri;
}

async function abrirCamera(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar fotos.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync(OPCOES);
  if (result.canceled || !result.assets[0]?.uri) return null;
  return result.assets[0].uri;
}

export async function escolherFotoLoteChat(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return abrirGaleria();
  }

  return new Promise((resolve) => {
    Alert.alert('Enviar foto', 'Como deseja anexar a imagem?', [
      { text: 'Galeria', onPress: () => abrirGaleria().then(resolve) },
      { text: 'Câmera', onPress: () => abrirCamera().then(resolve) },
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}
