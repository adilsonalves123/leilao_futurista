import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const OPCOES_IMAGEM: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.85,
};

export async function escolherImagemSuporteChat(): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert('Enviar foto', 'Como deseja anexar a imagem?', [
      {
        text: 'Tirar foto',
        onPress: async () => {
          const uri = await abrirCameraSuporte();
          resolve(uri);
        },
      },
      {
        text: 'Galeria',
        onPress: async () => {
          const uri = await abrirGaleriaSuporte();
          resolve(uri);
        },
      },
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

async function abrirGaleriaSuporte(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para enviar fotos.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync(OPCOES_IMAGEM);
  if (result.canceled || !result.assets[0]?.uri) return null;
  return result.assets[0].uri;
}

async function abrirCameraSuporte(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar fotos.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync(OPCOES_IMAGEM);
  if (result.canceled || !result.assets[0]?.uri) return null;
  return result.assets[0].uri;
}
