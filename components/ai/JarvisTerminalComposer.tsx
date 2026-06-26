import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { JarvisBlinkCursor } from '@/components/ai/JarvisBlinkCursor';
import { jarvisModern as m } from '@/components/ai/jarvisModernTheme';
import { jarvis, jarvisMono } from '@/components/ai/jarvisTheme';

type UiVariant = 'modern' | 'terminal';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  processing?: boolean;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  autoFocus?: boolean;
  webSingleLine?: boolean;
  showSendLabel?: boolean;
  onFocus?: () => void;
  variant?: UiVariant;
};

const SEND_PURPLE = '#820AD1';
const SEND_PURPLE_DISABLED = '#A78BFA';

export function JarvisTerminalComposer({
  value,
  onChangeText,
  onSend,
  disabled = false,
  processing = false,
  placeholder = 'Pergunte qualquer coisa…',
  hint,
  maxLength = 800,
  autoFocus = false,
  webSingleLine = false,
  showSendLabel = false,
  onFocus,
  variant = 'modern',
}: Props) {
  const empty = !value.trim();
  const inputRef = useRef<TextInput>(null);
  const singleLine = Platform.OS === 'web' && webSingleLine;
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  const canSend = !empty && !disabled && !processing;

  useEffect(() => {
    if (!autoFocus || disabled) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 280);
    return () => clearTimeout(timer);
  }, [autoFocus, disabled]);

  function handleKeyPress(e: { nativeEvent: { key?: string; shiftKey?: boolean } }) {
    if (Platform.OS !== 'web' || singleLine) return;
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      onSend();
    }
  }

  if (variant === 'modern') {
    return (
      <View style={styles.modernWrap}>
        <View style={styles.modernRow}>
          <TextInput
            ref={inputRef}
            style={styles.modernInput}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={m.textMuted}
            editable={!disabled}
            multiline={!singleLine}
            maxLength={maxLength}
            onSubmitEditing={onSend}
            onKeyPress={handleKeyPress}
            onFocus={onFocus}
            blurOnSubmit={false}
            returnKeyType="send"
            autoFocus={autoFocus}
            allowFontScaling
            {...(Platform.OS === 'web' ? ({ tabIndex: 0 } as object) : {})}
          />
          <TouchableOpacity
            style={[
              styles.modernSendBtn,
              { backgroundColor: canSend ? SEND_PURPLE : SEND_PURPLE_DISABLED },
            ]}
            onPress={onSend}
            disabled={!canSend}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem"
            accessibilityState={{ disabled: !canSend }}>
            {processing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.modernSendText}>Enviar</Text>
            )}
          </TouchableOpacity>
        </View>
        {hint ? <Text style={styles.modernHint}>{hint}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>PROMPT DE COMANDO</Text>
      <View style={[styles.composer, processing && styles.composerActive]}>
        <Text style={styles.prompt}>{'>'}</Text>
        <View style={styles.inputWrap} pointerEvents="box-none">
          {empty ? (
            <View style={styles.cursorSlot} pointerEvents="none">
              <JarvisBlinkCursor />
            </View>
          ) : null}
          <TextInput
            ref={inputRef}
            style={[styles.input, empty && styles.inputWithCursor]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={jarvis.textMuted}
            editable={!disabled}
            multiline={!singleLine}
            maxLength={maxLength}
            onSubmitEditing={onSend}
            onKeyPress={handleKeyPress}
            onFocus={onFocus}
            blurOnSubmit={false}
            returnKeyType="send"
            autoFocus={autoFocus}
            allowFontScaling
            {...(Platform.OS === 'web' ? ({ tabIndex: 0 } as object) : {})}
          />
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.sendBtn,
            showSendLabel && styles.sendBtnWide,
            (empty || disabled) && styles.sendDisabled,
            pressed && !empty && !disabled && styles.sendPressed,
          ]}
          onPress={onSend}
          disabled={empty || disabled}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem">
          {processing ? (
            <ActivityIndicator size="small" color="#020617" />
          ) : (
            <>
              <Ionicons
                name="send"
                size={showSendLabel ? (isNative ? 18 : 15) : isNative ? 20 : 16}
                color="#020617"
              />
              {showSendLabel ? <Text style={styles.sendLabel}>Enviar</Text> : null}
            </>
          )}
        </Pressable>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  modernWrap: {
    width: '100%',
  },
  modernRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  modernInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 14,
    backgroundColor: m.surfaceMuted,
    borderWidth: 1,
    borderColor: m.border,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    marginRight: 10,
    fontSize: Platform.OS === 'web' ? 15 : 16,
    lineHeight: Platform.OS === 'web' ? 22 : 24,
    color: m.text,
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none', cursor: 'text', WebkitUserSelect: 'text' } as object)
      : {}),
  },
  modernSendBtn: {
    width: 76,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  modernSendText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modernHint: { fontSize: 12, color: m.textMuted, textAlign: 'center', paddingHorizontal: 8, marginTop: 8 },
  wrap: { gap: Platform.OS === 'web' ? 6 : 10 },
  label: {
    fontSize: Platform.OS === 'web' ? 8 : 12,
    fontWeight: '800',
    color: jarvis.textMuted,
    letterSpacing: 1,
    fontFamily: Platform.OS === 'web' ? jarvisMono : undefined,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Platform.OS === 'web' ? 6 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 10 : 14,
    paddingVertical: Platform.OS === 'web' ? 7 : 12,
    borderRadius: Platform.OS === 'web' ? 3 : 8,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1,
    borderColor: jarvis.borderCyan,
  },
  composerActive: { borderColor: jarvis.borderEmerald },
  prompt: {
    fontSize: Platform.OS === 'web' ? 15 : 20,
    fontWeight: '800',
    color: jarvis.emerald,
    paddingBottom: Platform.OS === 'web' ? 10 : 14,
    fontFamily: Platform.OS === 'web' ? jarvisMono : undefined,
  },
  inputWrap: { flex: 1, minHeight: Platform.OS === 'web' ? 38 : 48, position: 'relative' },
  cursorSlot: { position: 'absolute', left: 0, top: Platform.OS === 'web' ? 8 : 12, zIndex: 1 },
  input: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? 38 : 48,
    maxHeight: Platform.OS === 'web' ? 110 : 140,
    paddingVertical: Platform.OS === 'web' ? 8 : 12,
    paddingHorizontal: 4,
    fontSize: Platform.OS === 'web' ? 14 : 18,
    lineHeight: Platform.OS === 'web' ? 20 : 26,
    color: jarvis.textPrimary,
    backgroundColor: 'transparent',
    fontWeight: '500',
    fontFamily: Platform.OS === 'web' ? jarvisMono : undefined,
    zIndex: 2,
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none', cursor: 'text', WebkitUserSelect: 'text' } as object)
      : {}),
  },
  inputWithCursor: { paddingLeft: Platform.OS === 'web' ? 14 : 18 },
  sendBtn: {
    minWidth: Platform.OS === 'web' ? 36 : 48,
    height: Platform.OS === 'web' ? 40 : 48,
    borderRadius: 6,
    backgroundColor: jarvis.emerald,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: Platform.OS === 'web' ? 8 : 12,
    marginBottom: 2,
  },
  sendBtnWide: { minWidth: Platform.OS === 'web' ? 72 : 92, paddingHorizontal: 14 },
  sendLabel: { fontSize: Platform.OS === 'web' ? 11 : 14, fontWeight: '800', color: '#020617' },
  sendPressed: { opacity: 0.88, transform: [{ scale: 0.96 }] },
  sendDisabled: { opacity: 0.45, backgroundColor: 'rgba(16, 185, 129, 0.35)' },
  hint: {
    fontSize: Platform.OS === 'web' ? 8 : 12,
    color: jarvis.textMuted,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? jarvisMono : undefined,
  },
});
