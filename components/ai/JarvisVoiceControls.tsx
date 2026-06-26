import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { jarvisModern as m } from '@/components/ai/jarvisModernTheme';
import { jarvis, jarvisMono } from '@/components/ai/jarvisTheme';

type UiVariant = 'modern' | 'terminal';

type Props = {
  escutando: boolean;
  falando: boolean;
  vozRespostaAtiva: boolean;
  sttOk: boolean;
  disabled?: boolean;
  onToggleEscuta: () => void;
  onToggleVozResposta: () => void;
  compact?: boolean;
  variant?: UiVariant;
};

export function JarvisVoiceControls({
  escutando,
  falando,
  vozRespostaAtiva,
  sttOk,
  disabled = false,
  onToggleEscuta,
  onToggleVozResposta,
  compact = false,
  variant = 'modern',
}: Props) {
  if (variant === 'modern') {
    return (
      <View style={[styles.modernRow, compact && styles.modernRowCompact]}>
        <Pressable
          style={({ pressed }) => [
            styles.modernBtn,
            escutando && styles.modernBtnMicActive,
            (!sttOk || disabled) && styles.modernBtnDisabled,
            pressed && styles.modernBtnPressed,
          ]}
          onPress={onToggleEscuta}
          disabled={disabled || !sttOk}
          accessibilityLabel={escutando ? 'Parar microfone' : 'Usar microfone'}>
          {escutando ? (
            <ActivityIndicator size="small" color={m.purple} />
          ) : (
            <Ionicons name="mic-outline" size={18} color={sttOk ? m.purple : m.textMuted} />
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.modernBtn,
            vozRespostaAtiva && styles.modernBtnOn,
            disabled && styles.modernBtnDisabled,
            pressed && styles.modernBtnPressed,
          ]}
          onPress={onToggleVozResposta}
          disabled={disabled}
          accessibilityLabel={vozRespostaAtiva ? 'Desativar voz' : 'Ativar voz'}>
          <Ionicons
            name={vozRespostaAtiva ? 'volume-high-outline' : 'volume-mute-outline'}
            size={18}
            color={vozRespostaAtiva ? m.purple : m.textMuted}
          />
        </Pressable>

        {!compact ? (
          <Text style={styles.modernHint} numberOfLines={1}>
            {escutando
              ? 'Ouvindo você…'
              : falando
                ? 'Jarvis está falando'
                : sttOk
                  ? 'Voz e leitura de respostas'
                  : 'Voz disponível no navegador ou app nativo'}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <Pressable
        style={({ pressed }) => [
          styles.btn,
          styles.btnMic,
          escutando && styles.btnMicActive,
          (!sttOk || disabled) && styles.btnDisabled,
          pressed && styles.btnPressed,
        ]}
        onPress={onToggleEscuta}
        disabled={disabled || !sttOk}
        accessibilityRole="button"
        accessibilityLabel={escutando ? 'Parar escuta' : 'Falar comando'}>
        {escutando ? (
          <ActivityIndicator size="small" color="#FCA5A5" />
        ) : (
          <Ionicons name="mic-outline" size={16} color={sttOk ? '#FCA5A5' : jarvis.textMuted} />
        )}
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.btn,
          vozRespostaAtiva ? styles.btnSpeakerOn : styles.btnSpeakerOff,
          falando && styles.btnSpeakerSpeaking,
          disabled && styles.btnDisabled,
          pressed && styles.btnPressed,
        ]}
        onPress={onToggleVozResposta}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={vozRespostaAtiva ? 'Desativar voz nas respostas' : 'Ativar voz nas respostas'}>
        <Ionicons
          name={vozRespostaAtiva ? 'volume-high-outline' : 'volume-mute-outline'}
          size={16}
          color={vozRespostaAtiva ? jarvis.cyan : jarvis.textMuted}
        />
      </Pressable>

      {!compact ? (
        <Text style={styles.hint} numberOfLines={1}>
          {escutando
            ? 'Ouvindo… toque de novo para parar'
            : falando
              ? 'Jarvis falando…'
              : sttOk
                ? Platform.OS === 'web'
                  ? 'Mic · voz nas respostas'
                  : 'Mic · respostas faladas'
                : 'Voz: use Chrome/web ou build nativo'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  modernRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  modernRowCompact: { marginBottom: 6 },
  modernBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: m.surfaceMuted,
    borderWidth: 1,
    borderColor: m.border,
  },
  modernBtnOn: { backgroundColor: m.purpleLight, borderColor: '#E9D5FF' },
  modernBtnMicActive: { backgroundColor: '#FCE7F3', borderColor: '#F9A8D4' },
  modernBtnDisabled: { opacity: 0.45 },
  modernBtnPressed: { opacity: 0.85 },
  modernHint: { flex: 1, fontSize: 12, color: m.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  rowCompact: { marginBottom: 4 },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnMic: { backgroundColor: 'rgba(248, 113, 113, 0.08)', borderColor: 'rgba(248, 113, 113, 0.35)' },
  btnMicActive: { backgroundColor: 'rgba(248, 113, 113, 0.2)', borderColor: '#F87171' },
  btnSpeakerOn: { backgroundColor: 'rgba(6, 182, 212, 0.1)', borderColor: jarvis.borderCyan },
  btnSpeakerOff: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)' },
  btnSpeakerSpeaking: { borderColor: jarvis.borderEmerald, backgroundColor: 'rgba(16, 185, 129, 0.12)' },
  btnDisabled: { opacity: 0.4 },
  btnPressed: { opacity: 0.85 },
  hint: { flex: 1, fontSize: 8, color: jarvis.textMuted, fontFamily: jarvisMono, letterSpacing: 0.3 },
});
