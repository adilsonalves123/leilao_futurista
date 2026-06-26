import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

type Props = {
  size?: number;
};

/** Ícone estilo Gemini — estrelas com gradiente azul/roxo/rosa */
export function JarvisGeminiIcon({ size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="geminiGrad" x1="4" y1="4" x2="20" y2="20">
          <Stop offset="0" stopColor="#4285F4" />
          <Stop offset="0.5" stopColor="#9B72CB" />
          <Stop offset="1" stopColor="#D96570" />
        </LinearGradient>
      </Defs>
      <Path
        d="M12 2.5 L13.6 8.8 L19.5 7.2 L14.8 11.5 L19.5 16.8 L13.6 15.2 L12 21.5 L10.4 15.2 L4.5 16.8 L9.2 11.5 L4.5 7.2 L10.4 8.8 Z"
        fill="url(#geminiGrad)"
      />
      <Path
        d="M18.2 3.8 L18.8 6.2 L21.2 6.8 L18.8 7.4 L18.2 9.8 L17.6 7.4 L15.2 6.8 L17.6 6.2 Z"
        fill="#4285F4"
        opacity={0.85}
      />
      <Path
        d="M5.8 16.2 L6.3 18.1 L8.2 18.6 L6.3 19.1 L5.8 21 L5.3 19.1 L3.4 18.6 L5.3 18.1 Z"
        fill="#D96570"
        opacity={0.8}
      />
    </Svg>
  );
}
