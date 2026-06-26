import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import type { PaymentMethod } from '@/src/types/operations';
import { formatBRL } from '@/src/lib/bids';
import { checkoutC } from './checkoutTheme';

type Props = {
  method: PaymentMethod;
  totalCents: number;
  orderSeed: string;
  pixCopyPaste?: string | null;
  pixQrBase64?: string | null;
  invoiceUrl?: string | null;
  awaitingPayment?: boolean;
  asaasSandbox?: boolean;
};

function buildPixPayload(seed: string, totalCents: number): string {
  const valor = (totalCents / 100).toFixed(2);
  return `00020126580014BR.GOV.BCB.PIX0136${seed.slice(0, 32)}520400005303986540${valor}5802BR5925LEV0U LEILOES LTDA6009SAO PAULO62070503***6304A1B2`;
}

function PixQrDecor({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    const size = 11;
    const out: { x: number; y: number; filled: boolean }[] = [];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        hash = (hash * 1103515245 + 12345) >>> 0;
        const filled =
          (x < 3 && y < 3) ||
          (x > size - 4 && y < 3) ||
          (x < 3 && y > size - 4) ||
          (hash & 1) === 1;
        out.push({ x, y, filled });
      }
    }
    return out;
  }, [seed]);

  const cell = 7;
  const pad = 8;
  const dim = 11 * cell + pad * 2;

  return (
    <View style={styles.qrWrap}>
      <Svg width={dim} height={dim}>
        <Rect x={0} y={0} width={dim} height={dim} fill="#FFFFFF" rx={8} />
        {cells.map((c) =>
          c.filled ? (
            <Rect
              key={`${c.x}-${c.y}`}
              x={pad + c.x * cell}
              y={pad + c.y * cell}
              width={cell - 1}
              height={cell - 1}
              fill="#1E1B2E"
              rx={1}
            />
          ) : null,
        )}
      </Svg>
    </View>
  );
}

export function CheckoutMethodDetails({
  method,
  totalCents,
  orderSeed,
  pixCopyPaste,
  pixQrBase64,
  invoiceUrl,
  awaitingPayment,
  asaasSandbox,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardLast4, setCardLast4] = useState('');

  const realPix = pixCopyPaste?.trim() ?? '';
  const pixCode =
    realPix.length > 0
      ? realPix
      : awaitingPayment
        ? null
        : buildPixPayload(orderSeed, totalCents);
  const pixQrUri = pixQrBase64 ? `data:image/png;base64,${pixQrBase64}` : null;

  async function copiarPix() {
    if (!pixCode) {
      Alert.alert(
        'Pix indisponível',
        'O Asaas não retornou um código válido. Tente gerar de novo ou use Recarga demo nos testes.',
      );
      return;
    }
    await Clipboard.setStringAsync(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    Alert.alert('Pix copiado', 'Cole no app do seu banco para concluir o pagamento.');
  }

  if (method === 'PIX') {
    if (awaitingPayment && !pixCode) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Pix indisponível</Text>
          <Text style={styles.sub}>
            A cobrança foi criada, mas o Asaas não devolveu o código Pix. Verifique se há chave Pix
            cadastrada na sua conta Asaas e tente novamente.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Pague com Pix</Text>
        <Text style={styles.sub}>
          {awaitingPayment
            ? 'Aguardando confirmação do pagamento no Asaas…'
            : 'Escaneie o QR ou copie o código.'}{' '}
          Valor: {formatBRL(totalCents)}
        </Text>
        {asaasSandbox && awaitingPayment ? (
          <View style={styles.sandboxBanner}>
            <Text style={styles.sandboxTitle}>Ambiente de testes Asaas</Text>
            <Text style={styles.sandboxText}>
              Este Pix foi gerado no sandbox. Bancos reais (Nubank, Itaú etc.) não aceitam esse
              código. Para testar, confirme o pagamento no painel Asaas → Cobranças, ou use
              &quot;Recarga demo&quot; na carteira.
            </Text>
          </View>
        ) : null}
        <View style={styles.pixRow}>
          {pixQrUri ? (
            <Image source={{ uri: pixQrUri }} style={styles.pixImage} />
          ) : (
            <PixQrDecor seed={orderSeed} />
          )}
          <View style={styles.pixSide}>
            <Text style={styles.pixCode} numberOfLines={4}>
              {pixCode}
            </Text>
            <Pressable
              style={[styles.copyBtn, !pixCode && styles.copyBtnDisabled]}
              onPress={() => void copiarPix()}
              disabled={!pixCode}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#FFFFFF" />
              <Text style={styles.copyBtnText}>{copied ? 'Copiado!' : 'Copiar código Pix'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (method === 'CARTAO') {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Cartão de crédito</Text>
        <Text style={styles.sub}>
          {invoiceUrl
            ? 'Toque em Pagar para abrir a fatura segura do Asaas no navegador.'
            : 'Dados para simulação — integração LuckCode em produção.'}
        </Text>
        <Text style={styles.label}>Nome no cartão</Text>
        <TextInput
          style={styles.input}
          value={cardName}
          onChangeText={setCardName}
          placeholder="Como impresso no cartão"
          placeholderTextColor={checkoutC.textMuted}
        />
        <Text style={styles.label}>Últimos 4 dígitos</Text>
        <TextInput
          style={styles.input}
          value={cardLast4}
          onChangeText={(t) => setCardLast4(t.replace(/\D/g, '').slice(0, 4))}
          placeholder="0000"
          placeholderTextColor={checkoutC.textMuted}
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Criptomoedas (USDT)</Text>
      <Text style={styles.sub}>Envie o valor exato em USDT na rede Polygon.</Text>
      <View style={styles.cryptoBox}>
        <Text style={styles.cryptoLabel}>Endereço Levou Escrow</Text>
        <Text style={styles.cryptoAddr} selectable>
          0xLev0u{orderSeed.replace(/-/g, '').slice(0, 24)}A9f2
        </Text>
        <Text style={styles.cryptoAmount}>
          ≈ {(totalCents / 100 / 5.45).toFixed(2)} USDT
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: checkoutC.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: checkoutC.cardBorder,
    padding: 16,
    gap: 10,
    shadowColor: checkoutC.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 3,
  },
  title: { fontSize: 14, fontWeight: '800', color: checkoutC.text },
  sub: { fontSize: 12, color: checkoutC.textMuted, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '600', color: checkoutC.textMuted, marginTop: 4 },
  input: {
    backgroundColor: checkoutC.inputBg,
    borderWidth: 1,
    borderColor: checkoutC.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: checkoutC.text,
  },
  pixRow: { flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 4 },
  qrWrap: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: checkoutC.divider,
  },
  pixImage: {
    width: 148,
    height: 148,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: checkoutC.divider,
  },
  pixSide: { flex: 1, gap: 10 },
  pixCode: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: checkoutC.textSecondary,
    lineHeight: 13,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: checkoutC.accent,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  copyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  copyBtnDisabled: { opacity: 0.45 },
  sandboxBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    padding: 12,
    gap: 4,
  },
  sandboxTitle: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  sandboxText: { fontSize: 11, color: '#92400E', lineHeight: 16 },
  cryptoBox: {
    backgroundColor: checkoutC.accentSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: checkoutC.accentBorder,
    padding: 14,
    gap: 6,
  },
  cryptoLabel: { fontSize: 10, fontWeight: '700', color: checkoutC.textMuted },
  cryptoAddr: { fontSize: 11, fontFamily: 'monospace', color: checkoutC.text },
  cryptoAmount: { fontSize: 16, fontWeight: '800', color: checkoutC.accent },
});
