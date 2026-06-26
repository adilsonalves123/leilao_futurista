import { Platform } from 'react-native';

/** Design tokens Jarvis — comprador + admin */
export const jarvis = {
  cyan: '#22D3EE',
  emerald: '#10B981',
  neon: '#05FF9B',
  slate950: 'rgba(2, 6, 23, 0.88)',
  slate900: 'rgba(15, 23, 42, 0.75)',
  slate800: 'rgba(30, 41, 59, 0.65)',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  borderCyan: 'rgba(6, 182, 212, 0.28)',
  borderEmerald: 'rgba(16, 185, 129, 0.32)',
  glassBg: 'rgba(15, 23, 42, 0.72)',
  canvas: 'rgba(2, 6, 23, 0.55)',
} as const;

export const jarvisMono =
  Platform.OS === 'ios' ? 'Menlo' : Platform.OS === 'android' ? 'monospace' : 'monospace';

export const jarvisGlassWeb =
  Platform.OS === 'web'
    ? ({
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      } as object)
    : {};

export const jarvisGridWeb =
  Platform.OS === 'web'
    ? ({
        backgroundImage:
          'linear-gradient(rgba(6,182,212,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.035) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      } as object)
    : {};
