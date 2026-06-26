import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = {
  size?: number;
  /** Olhos acesos — feedback visual ao tocar/arrastar */
  active?: boolean;
  /** `light` para FAB roxo; `dark` para avatar em fundo claro */
  tone?: 'dark' | 'light';
};

/**
 * Núcleo neural do Jarvis — visor compacto para FAB.
 * Rosto só, sem corpo: leitura clara em tamanhos pequenos.
 */
export function JarvisRobotIcon({ size = 32, active = true, tone = 'dark' }: Props) {
  const eyeOpacity = active ? 1 : 0.55;
  const light = tone === 'light';

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Defs>
        <LinearGradient id="jarvisFace" x1="6" y1="6" x2="26" y2="26">
          <Stop offset="0" stopColor={light ? '#FFFFFF' : '#0F172A'} />
          <Stop offset="1" stopColor={light ? '#F3E8FF' : '#020617'} />
        </LinearGradient>
        <LinearGradient id="jarvisEye" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={light ? '#E9D5FF' : '#67E8F9'} />
          <Stop offset="1" stopColor={light ? '#FFFFFF' : '#22D3EE'} />
        </LinearGradient>
      </Defs>

      {/* Halo interno */}
      <Circle
        cx="16"
        cy="16"
        r="13.5"
        stroke={light ? 'rgba(255,255,255,0.45)' : 'rgba(34, 211, 238, 0.22)'}
        strokeWidth="1"
      />

      {/* Placa frontal — formato de escudo/visor */}
      <Path
        d="M16 5.5 L23.2 9.2 V16.2 C23.2 20.4 20.1 23.8 16 24.8 C11.9 23.8 8.8 20.4 8.8 16.2 V9.2 Z"
        fill="url(#jarvisFace)"
        stroke={light ? '#FFFFFF' : '#22D3EE'}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Scan line sutil */}
      <Rect
        x="10"
        y="11.5"
        width="12"
        height="0.8"
        rx="0.4"
        fill={light ? 'rgba(255,255,255,0.55)' : 'rgba(34, 211, 238, 0.35)'}
      />

      {/* Olhos HUD */}
      <Rect
        x="10.8"
        y="14.2"
        width="4.2"
        height="2.4"
        rx="1.2"
        fill={light ? '#FFFFFF' : 'url(#jarvisEye)'}
        opacity={eyeOpacity}
      />
      <Rect
        x="17"
        y="14.2"
        width="4.2"
        height="2.4"
        rx="1.2"
        fill={light ? '#FFFFFF' : 'url(#jarvisEye)'}
        opacity={eyeOpacity}
      />

      {/* Brilho nos olhos */}
      <Circle cx="11.6" cy="14.8" r="0.55" fill={light ? '#F3E8FF' : '#ECFEFF'} opacity={eyeOpacity} />
      <Circle cx="17.8" cy="14.8" r="0.55" fill={light ? '#F3E8FF' : '#ECFEFF'} opacity={eyeOpacity} />

      {/* Linha de status (boca → diagnóstico, não emoji) */}
      <Path
        d="M13 19.2 H19"
        stroke={light ? '#F3E8FF' : '#10B981'}
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity={0.9}
      />

      {/* Antena → uplink */}
      <Circle cx="16" cy="4.2" r="1.1" fill={light ? '#FFFFFF' : '#22D3EE'} />
      <Path
        d="M16 5.3 V6.2"
        stroke={light ? '#FFFFFF' : '#22D3EE'}
        strokeWidth="1"
        strokeLinecap="round"
      />
    </Svg>
  );
}
