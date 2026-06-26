import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

export type CoverCropRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (err) => reject(err ?? new Error('Não foi possível ler dimensões da imagem.')),
    );
  });
}

/** Reduz imagem antes de enviar à IA (economia de tokens e upload). */
export async function prepararImagemParaVisao(uri: string, maxWidth = 768): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

export async function aplicarRecorteCapa(
  uri: string,
  crop: CoverCropRect,
): Promise<string> {
  const { width, height } = await getImageSize(uri);
  const originX = Math.round(crop.originX * width);
  const originY = Math.round(crop.originY * height);
  const cropW = Math.max(1, Math.round(crop.width * width));
  const cropH = Math.max(1, Math.round(crop.height * height));

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        crop: {
          originX: Math.min(originX, width - 1),
          originY: Math.min(originY, height - 1),
          width: Math.min(cropW, width - originX),
          height: Math.min(cropH, height - originY),
        },
      },
      { resize: { width: 1200 } },
    ],
    { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

export async function salvarBase64ComoArquivoLocal(
  base64: string,
  mime: string,
): Promise<string> {
  const ext = mime.includes('png') ? 'png' : 'jpg';
  const path = `${FileSystem.cacheDirectory}cover-ai-${Date.now()}.${ext}`;
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return path;
}
