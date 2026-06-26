import type { Shipment } from '@/src/types/operations';

function randomTracking(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'BR';
  for (let i = 0; i < 11; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createMockShipment(orderId: string): Shipment {
  const trackingCode = randomTracking();
  const carrier = Math.random() > 0.5 ? 'MELHOR_ENVIO' : 'CORREIOS';
  const labelUrl = `https://mock.${carrier === 'MELHOR_ENVIO' ? 'melhorenvio' : 'correios'}.com.br/label/${orderId}`;
  const qrCodeData = `AETHERION-POSTAGEM:${orderId}:${trackingCode}`;

  return {
    id: `ship-${Date.now()}`,
    orderId,
    carrier,
    trackingCode,
    labelUrl,
    qrCodeData,
    createdAt: new Date().toISOString(),
  };
}

export function getCarrierLabel(carrier: Shipment['carrier']): string {
  return carrier === 'MELHOR_ENVIO' ? 'Melhor Envio' : 'Correios';
}
