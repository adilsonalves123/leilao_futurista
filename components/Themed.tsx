import { Text as DefaultText, View as DefaultView, type TextProps, type ViewProps } from 'react-native';
import { colors, fonts } from '@/src/theme/tokens';

export function Text(props: TextProps & { muted?: boolean; timer?: boolean }) {
  const { style, muted, timer, ...rest } = props;
  return (
    <DefaultText
      style={[
        { color: muted ? colors.textMuted : colors.textPrimary },
        timer && { fontFamily: fonts.timer },
        style,
      ]}
      {...rest}
    />
  );
}

export function View(props: ViewProps) {
  const { style, ...rest } = props;
  return <DefaultView style={[{ backgroundColor: colors.background }, style]} {...rest} />;
}
