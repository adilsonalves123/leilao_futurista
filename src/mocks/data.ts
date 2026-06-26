/** Dados locais de teste — substituem Supabase em modo demonstração */

export type MockUser = {
  id: string;
  email: string;
  displayName: string;
  provider?: 'email' | 'google' | 'apple' | 'facebook' | 'guest';
};

export const MOCK_USERS = {
  demo: {
    id: 'mock-user-demo',
    email: 'demo@aetherion.app',
    displayName: 'Usuário',
    provider: 'email' as const,
  },
  google: {
    id: 'mock-user-google',
    email: 'google.user@aetherion.app',
    displayName: 'Conta Google (teste)',
    provider: 'google' as const,
  },
  apple: {
    id: 'mock-user-apple',
    email: 'apple.user@aetherion.app',
    displayName: 'Conta Apple (teste)',
    provider: 'apple' as const,
  },
  facebook: {
    id: 'mock-user-facebook',
    email: 'facebook.user@aetherion.app',
    displayName: 'Conta Facebook (teste)',
    provider: 'facebook' as const,
  },
};

export const MOCK_AUCTIONS = [
  {
    id: '1',
    title: 'Interface Neural Mk.IV',
    priceCents: 125000,
    endsIn: '04:32',
  },
  {
    id: '2',
    title: 'Núcleo de Armazenamento Quântico',
    priceCents: 89000,
    endsIn: '12:08',
  },
  {
    id: '3',
    title: 'Unidade de Display Holográfico',
    priceCents: 45000,
    endsIn: '00:28',
  },
];

export const MOCK_BIDS_BY_AUCTION: Record<
  string,
  { amount_cents: number; created_at: string; bidder_id: string }[]
> = {
  '1': [
    { amount_cents: 125000, created_at: new Date().toISOString(), bidder_id: 'bidder-a' },
    { amount_cents: 120000, created_at: new Date(Date.now() - 8000).toISOString(), bidder_id: 'mock-user-demo' },
    { amount_cents: 115000, created_at: new Date(Date.now() - 15000).toISOString(), bidder_id: 'bidder-c' },
  ],
  '2': [
    { amount_cents: 89000, created_at: new Date().toISOString(), bidder_id: 'bidder-d' },
  ],
  '3': [
    { amount_cents: 45000, created_at: new Date().toISOString(), bidder_id: 'bidder-e' },
  ],
};
