import { Platform, StyleSheet, Text, View } from 'react-native';

import { AiMarkdownText } from '@/components/ai/AiMarkdownText';
import { JarvisAiAvatar } from '@/components/ai/JarvisAiAvatar';
import { jarvisModern as m } from '@/components/ai/jarvisModernTheme';
import { jarvis, jarvisMono } from '@/components/ai/jarvisTheme';

type UiVariant = 'modern' | 'terminal';

type Props = {
  role: 'user' | 'assistant';
  text: string;
  assistantLabel?: string;
  userLabel?: string;
  compact?: boolean;
  variant?: UiVariant;
};

export function JarvisLogEntry({
  role,
  text,
  assistantLabel = 'Jarvis',
  userLabel = 'Você',
  compact = false,
  variant = 'modern',
}: Props) {
  const isUser = role === 'user';

  if (variant === 'modern') {
    return (
      <View style={[styles.modernRow, isUser ? styles.modernRowUser : styles.modernRowBot]}>
        {!isUser ? <JarvisAiAvatar size={compact ? 28 : 32} /> : null}
        <View
          style={[
            styles.modernBubble,
            compact && styles.modernBubbleCompact,
            isUser ? styles.modernBubbleUser : styles.modernBubbleBot,
          ]}>
          {!compact ? (
            <Text style={[styles.modernMeta, isUser && styles.modernMetaUser]}>
              {isUser ? userLabel : assistantLabel}
            </Text>
          ) : null}
          {isUser ? (
            <Text style={[styles.modernTextUser, compact && styles.modernTextCompact]}>{text}</Text>
          ) : (
            <AiMarkdownText
              style={[styles.modernTextBot, compact && styles.modernTextCompact]}
              boldStyle={styles.modernTextBold}
              headingStyle={styles.modernHeading}
              listItemStyle={[styles.modernTextBot, compact && styles.modernTextCompact]}>
              {text}
            </AiMarkdownText>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, compact && styles.rowCompact, isUser ? styles.rowUser : styles.rowBot]}>
      {!compact ? (
        <View style={styles.prefix}>
          <Text style={[styles.prefixText, isUser ? styles.prefixUser : styles.prefixBot]}>
            {isUser ? 'CMD' : 'JRV'}
          </Text>
        </View>
      ) : null}
      <View style={[styles.body, compact && styles.bodyCompact, isUser ? styles.bodyUser : styles.bodyBot]}>
        <View style={styles.meta}>
          <Text style={styles.metaLabel}>{isUser ? userLabel : assistantLabel}</Text>
          {!isUser && !compact ? (
            <View style={styles.neuralTag}>
              <Text style={styles.neuralText}>NEURAL</Text>
            </View>
          ) : null}
        </View>
        {isUser ? (
          <Text style={[styles.textUser, compact && styles.textCompact]}>{text}</Text>
        ) : (
          <AiMarkdownText
            style={[styles.textBot, compact && styles.textCompact]}
            boldStyle={styles.textBold}
            headingStyle={styles.heading}
            listItemStyle={[styles.textBot, compact && styles.textCompact]}>
            {text}
          </AiMarkdownText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modernRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  modernRowBot: { justifyContent: 'flex-start' },
  modernRowUser: { justifyContent: 'flex-end' },
  modernBubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: m.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  modernBubbleCompact: { maxWidth: '88%', paddingHorizontal: 12, paddingVertical: 8 },
  modernBubbleBot: {
    backgroundColor: m.botBubble,
    borderWidth: 1,
    borderColor: m.border,
    borderBottomLeftRadius: 6,
  },
  modernBubbleUser: {
    backgroundColor: m.userBubble,
    borderBottomRightRadius: 6,
  },
  modernMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: m.purple,
    marginBottom: 4,
  },
  modernMetaUser: { color: 'rgba(255,255,255,0.85)' },
  modernTextBot: {
    fontSize: Platform.OS === 'web' ? 14 : 16,
    lineHeight: Platform.OS === 'web' ? 21 : 24,
    color: m.botText,
    fontWeight: '400',
  },
  modernTextUser: {
    fontSize: Platform.OS === 'web' ? 14 : 16,
    lineHeight: Platform.OS === 'web' ? 21 : 24,
    color: m.userText,
    fontWeight: '500',
  },
  modernTextCompact: { fontSize: Platform.OS === 'web' ? 13 : 15, lineHeight: Platform.OS === 'web' ? 19 : 22 },
  modernTextBold: { color: m.purpleDeep, fontWeight: '700' },
  modernHeading: { color: m.text, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', marginBottom: 12, gap: 8, alignItems: 'flex-start' },
  rowCompact: { marginBottom: 8, gap: 0 },
  rowBot: { justifyContent: 'flex-start' },
  rowUser: { justifyContent: 'flex-end', flexDirection: 'row-reverse' },
  prefix: { width: 28, paddingTop: 8, alignItems: 'center' },
  prefixText: { fontSize: 7, fontWeight: '800', letterSpacing: 0.5, fontFamily: jarvisMono },
  prefixUser: { color: jarvis.emerald },
  prefixBot: { color: jarvis.cyan },
  body: { maxWidth: '88%', borderRadius: 3, paddingHorizontal: 11, paddingVertical: 9, borderWidth: 1 },
  bodyCompact: { maxWidth: '96%', paddingHorizontal: 9, paddingVertical: 7 },
  bodyBot: { backgroundColor: jarvis.glassBg, borderColor: jarvis.borderCyan },
  bodyUser: { backgroundColor: 'rgba(16, 185, 129, 0.06)', borderColor: jarvis.borderEmerald },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  metaLabel: { fontSize: 7, fontWeight: '800', color: jarvis.textMuted, letterSpacing: 0.8, fontFamily: jarvisMono },
  neuralTag: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: jarvis.borderCyan,
  },
  neuralText: { fontSize: 6, fontWeight: '800', color: jarvis.cyan, letterSpacing: 0.6 },
  textBot: { fontSize: 13, lineHeight: 20, color: '#E2E8F0', fontWeight: '500' },
  textBold: { color: '#67E8F9', fontWeight: '800' },
  heading: { color: jarvis.textPrimary, fontSize: 14, fontWeight: '800' },
  textUser: { fontSize: 13, lineHeight: 20, color: '#ECFDF5', fontWeight: '600' },
  textCompact: { fontSize: 12, lineHeight: 17 },
});
