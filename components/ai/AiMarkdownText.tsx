import { Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';

type Props = {
  children: string;
  style?: TextStyle;
  boldStyle?: TextStyle;
  italicStyle?: TextStyle;
  headingStyle?: TextStyle;
  listItemStyle?: TextStyle;
};

type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string };

function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /(\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    if (match[2] || match[3]) {
      tokens.push({ type: 'bold', value: match[2] ?? match[3] ?? '' });
    } else if (match[4] || match[5]) {
      tokens.push({ type: 'italic', value: match[4] ?? match[5] ?? '' });
    } else if (match[6]) {
      tokens.push({ type: 'code', value: match[6] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return tokens.length ? tokens : [{ type: 'text', value: text }];
}

function renderInline(
  text: string,
  style: TextStyle,
  boldStyle: TextStyle,
  italicStyle: TextStyle,
): ReactNode {
  const tokens = tokenizeInline(text);
  if (tokens.length === 1 && tokens[0].type === 'text') {
    return text;
  }

  return tokens.map((token, i) => {
    switch (token.type) {
      case 'bold':
        return (
          <Text key={i} style={boldStyle}>
            {token.value}
          </Text>
        );
      case 'italic':
        return (
          <Text key={i} style={italicStyle}>
            {token.value}
          </Text>
        );
      case 'code':
        return (
          <Text key={i} style={styles.code}>
            {token.value}
          </Text>
        );
      default:
        return <Fragment key={i}>{token.value}</Fragment>;
    }
  });
}

function parseListMarker(line: string): { marker: string; content: string } | null {
  const bullet = line.match(/^(\s*[-*•]\s+)(.+)$/);
  if (bullet) return { marker: '•', content: bullet[2] };

  const numbered = line.match(/^(\s*\d+[.)]\s+)(.+)$/);
  if (numbered) return { marker: numbered[1].trim(), content: numbered[2] };

  return null;
}

export function AiMarkdownText({
  children,
  style,
  boldStyle,
  italicStyle,
  headingStyle,
  listItemStyle,
}: Props) {
  const base = StyleSheet.flatten([styles.base, style]) as TextStyle;
  const bold = StyleSheet.flatten([base, styles.bold, boldStyle]) as TextStyle;
  const italic = StyleSheet.flatten([base, styles.italic, italicStyle]) as TextStyle;
  const heading = StyleSheet.flatten([base, styles.heading, headingStyle]) as TextStyle;
  const listItem = StyleSheet.flatten([base, styles.listItem, listItemStyle]) as TextStyle;

  const lines = children.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let listBuffer: { marker: string; content: string }[] = [];

  function flushList() {
    if (!listBuffer.length) return;
    blocks.push(
      <Text key={`list-${blocks.length}`} style={base}>
        {listBuffer.map((item, idx) => (
          <Text key={idx} style={listItem}>
            {item.marker}{' '}
            {renderInline(item.content, base, bold, italic)}
            {idx < listBuffer.length - 1 ? '\n' : ''}
          </Text>
        ))}
      </Text>,
    );
    listBuffer = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      blocks.push(<Text key={`br-${blocks.length}`}>{'\n'}</Text>);
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      blocks.push(
        <Text key={`h-${blocks.length}`} style={heading}>
          {renderInline(headingMatch[2], heading, bold, italic)}
          {'\n'}
        </Text>,
      );
      continue;
    }

    const listItemMatch = parseListMarker(trimmed);
    if (listItemMatch) {
      listBuffer.push(listItemMatch);
      continue;
    }

    flushList();
    blocks.push(
      <Text key={`p-${blocks.length}`} style={base}>
        {renderInline(trimmed, base, bold, italic)}
        {'\n'}
      </Text>,
    );
  }

  flushList();

  return <Text style={base}>{blocks}</Text>;
}

const styles = StyleSheet.create({
  base: {
    fontSize: 14,
    lineHeight: 21,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  heading: {
    fontWeight: '800',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 2,
  },
  listItem: {
    paddingLeft: 4,
    lineHeight: 21,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 13,
    backgroundColor: 'rgba(5, 255, 155, 0.12)',
    color: '#A7F3D0',
    borderRadius: 4,
  },
});
