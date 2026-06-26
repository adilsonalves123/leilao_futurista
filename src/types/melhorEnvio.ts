export type MelhorEnvioProductInput = {
  id: string;
  width: number;
  height: number;
  length: number;
  weight: number;
  insurance_value: number;
  quantity: number;
};

export type MelhorEnvioQuoteRequest = {
  fromCep: string;
  toCep: string;
  products: MelhorEnvioProductInput[];
};

export type MelhorEnvioQuoteOption = {
  id: number;
  name: string;
  price: string;
  custom_price: string;
  delivery_time: number;
  custom_delivery_time: number;
  company?: { id?: number; name?: string; picture?: string };
  error?: string;
};

export type MelhorEnvioQuoteResult = {
  priceCents: number;
  estimatedDays: number;
  carrier: string;
  serviceName: string;
  serviceId: number;
  options: MelhorEnvioQuoteOption[];
};
