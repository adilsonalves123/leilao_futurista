import { Ionicons } from '@expo/vector-icons';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { pickerBaseStyles, pickerColors } from '@/components/listing/listingPickerTheme';

type HeroProps = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  subtitle: string;
  style?: StyleProp<ViewStyle>;
};

export function ListingPickerHero({ icon: Icon, eyebrow, title, subtitle, style }: HeroProps) {
  return (
    <View style={[pickerBaseStyles.hero, style]}>
      <View style={pickerBaseStyles.heroIconWrap}>
        <Icon size={18} color={pickerColors.accent} strokeWidth={2} />
      </View>
      <View style={pickerBaseStyles.heroText}>
        <Text style={pickerBaseStyles.heroEyebrow}>{eyebrow}</Text>
        <Text style={pickerBaseStyles.heroTitle}>{title}</Text>
        <Text style={pickerBaseStyles.heroSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

export function ListingPickerBackRow({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={pickerBaseStyles.backRow} onPress={onPress} hitSlop={8}>
      <Ionicons name="chevron-back" size={20} color={pickerColors.textPrimary} />
      <Text style={pickerBaseStyles.backText}>{label}</Text>
    </Pressable>
  );
}

export function ListingPickerSectionHead({
  title,
  countLabel,
}: {
  title: string;
  countLabel: string;
}) {
  return (
    <View style={pickerBaseStyles.sectionHead}>
      <Text style={pickerBaseStyles.sectionTitle}>{title}</Text>
      <Text style={pickerBaseStyles.sectionCount}>{countLabel}</Text>
    </View>
  );
}

export function ListingPickerSearch({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={pickerBaseStyles.searchWrap}>
      <Ionicons name="search-outline" size={18} color={pickerColors.textMuted} />
      <TextInput
        style={pickerBaseStyles.searchInput}
        placeholder={placeholder}
        placeholderTextColor={pickerColors.textMuted}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={pickerColors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function ListingPickerTrustNote({ text }: { text: string }) {
  return (
    <View style={pickerBaseStyles.trustRow}>
      <Ionicons name="shield-checkmark-outline" size={16} color={pickerColors.accent} />
      <Text style={pickerBaseStyles.trustText}>{text}</Text>
    </View>
  );
}

export function ListingPickerCardFooter() {
  return (
    <View style={pickerBaseStyles.cardFooter}>
      <Text style={pickerBaseStyles.cardAction}>Selecionar</Text>
      <Ionicons name="chevron-forward" size={14} color={pickerColors.accent} />
    </View>
  );
}
