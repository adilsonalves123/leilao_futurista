export const INTEGRACOES_DO_AGENTE_IA = {
  regras_de_negocio: [
    '1. Verificar status de KYC do usuário logado no Supabase.',
    '2. Consultar código de rastreio de lotes arrematados.',
    '3. Explicar e validar saldos retidos ou disponíveis na carteira.',
    '4. Encaminhar para o atendimento humano se o assunto for contestação de faturas.',
  ],

  mensagens_iniciais: [
    'Olá! Eu sou o assistente virtual do Levou. 🤖',
    'Estou aqui para te ajudar em tempo real com lances, carteira, envios ou status do seu cadastro (KYC).',
    'Como posso te ajudar hoje?',
  ],
} as const;

export const ATALHOS_SUPORTE = [
  { id: 'kyc', label: 'Status KYC' },
  { id: 'rastreio', label: 'Rastreio' },
  { id: 'carteira', label: 'Carteira' },
  { id: 'humano', label: 'Atendente humano' },
] as const;
