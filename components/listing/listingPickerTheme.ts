import { Platform, StyleSheet } from 'react-native';

import { lightColors } from '@/src/theme/lightTokens';

export const PICKER_GRID_GAP = 12;
export const PICKER_H_PADDING = 20;
export const PICKER_ICON_STROKE = 1.85;

export const pickerColors = {
  accent: lightColors.accent,
  accentDeep: '#6D28D9',
  heroBg: 'rgba(255, 255, 255, 0.78)',
  heroBorder: 'rgba(233, 224, 255, 0.9)',
  cardFeaturedBg: 'rgba(255, 255, 255, 0.88)',
  cardStandardBg: 'rgba(255, 255, 255, 0.65)',
  cardStandardBorder: 'rgba(255, 255, 255, 0.95)',
  cardMutedFill: 'rgba(255, 255, 255, 0.55)',
  cardPressed: 'rgba(244, 240, 255, 0.92)',
  textPrimary: lightColors.textPrimary,
  textSecondary: lightColors.textSecondary,
  textMuted: lightColors.textMuted,
  border: '#E8EAED',
  borderFeatured: 'rgba(221, 214, 254, 0.95)',
  badgeBg: 'rgba(237, 233, 254, 0.85)',
  badgeText: lightColors.accent,
  searchBg: 'rgba(255, 255, 255, 0.72)',
};

export const pickerShadowFeatured = Platform.select({
  ios: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  android: { elevation: 4 },
  default: {},
});

export const pickerShadowCard = Platform.select({
  ios: {
    shadowColor: '#1A1625',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  android: { elevation: 2 },
  default: {},
});

export const pickerShadowHero = Platform.select({
  ios: {
    shadowColor: '#5B21B6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  android: { elevation: 2 },
  default: {},
});

export const pickerBaseStyles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: pickerColors.heroBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: pickerColors.heroBorder,
    padding: 14,
    marginBottom: 16,
    ...pickerShadowHero,
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: pickerColors.heroBorder,
  },
  heroText: { flex: 1 },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: pickerColors.accent,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: pickerColors.textPrimary,
    letterSpacing: -0.35,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: pickerColors.textSecondary,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 14, fontWeight: '600', color: pickerColors.textPrimary },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: pickerColors.textPrimary,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: pickerColors.textMuted,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: pickerColors.searchBg,
    borderWidth: 1,
    borderColor: pickerColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    ...pickerShadowCard,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: pickerColors.textPrimary,
    paddingVertical: 0,
  },
  columnRow: { gap: PICKER_GRID_GAP, marginBottom: PICKER_GRID_GAP },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 2,
  },
  trustText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: pickerColors.textMuted,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: '100%',
  },
  cardAction: {
    fontSize: 11,
    fontWeight: '700',
    color: pickerColors.accent,
  },
  featuredAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: pickerColors.accent,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
});
