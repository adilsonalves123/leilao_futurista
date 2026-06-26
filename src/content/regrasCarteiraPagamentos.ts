export type RegraCarteiraSecao = {
  id: string;
  titulo: string;
  detalhes: string;
};

export const REGRAS_CARTEIRA_PAGAMENTOS: RegraCarteiraSecao[] = [
  {
    id: 'aviso',
    titulo: '💡 AVISO IMPORTANTE: Onde operar minha carteira?',
    detalhes:
      'Esta seção serve exclusivamente para tirar dúvidas sobre o funcionamento financeiro da plataforma.\n\n' +
      '• Para Adicionar ou Sacar valores: Você NÃO realiza operações por aqui. Para colocar ou retirar dinheiro, volte à tela inicial do aplicativo, acesse o menu \'Minha Carteira\' no seu perfil e utilize os botões operacionais de Depósito ou Saque.',
  },
  {
    id: 'deposito',
    titulo: '💰 1. Como colocar saldo na Carteira?',
    detalhes:
      'Para participar dos leilões e dar lances, você precisa ter saldo disponível na sua carteira digital interna:\n\n' +
      '• Formas de Depósito: Aceitamos exclusivamente PIX para garantir a compensação imediata do seu saldo.\n' +
      '• Tempo de Compensação: Depósitos via PIX caem na sua carteira do aplicativo em poucos segundos. Assim que o pagamento for confirmado, seu poder de compra é atualizado na hora e você já pode dar lances.',
  },
  {
    id: 'saldo',
    titulo: '🔒 2. Saldo total, garantias e saque',
    detalhes:
      'Sua carteira mostra o valor total na conta. Parte pode ficar em garantias enquanto você disputa lances ou tem anúncios ativos:\n\n' +
      '• Saldo total: tudo que está na sua carteira Levou.\n' +
      '• Em garantias: caução de lances (comprador) ou garantia de anúncio (vendedor). Não é taxa — volta quando a operação encerra.\n' +
      '• Livre para usar: saldo para novos lances ou publicar leilões.\n' +
      '• Saque: só o valor livre, e apenas quando não houver compra/venda em andamento. Pix para o mesmo CPF do KYC.',
  },
  {
    id: 'saque',
    titulo: '💸 3. Regras e Prazos para Saques (Retiradas)',
    detalhes:
      'Você pode sacar o saldo livre quando não houver operações pendentes:\n\n' +
      '• Mesma Titularidade: o saque só é aprovado se a chave PIX pertencer ao MESMO CPF do KYC.\n' +
      '• Operações em andamento: enquanto houver pedido pago aguardando envio, entrega ou disputa, o saque fica pausado.\n' +
      '• Prazo: após aprovação, liquidação em até 2 horas úteis.',
  },
  {
    id: 'arremate',
    titulo: '🧾 4. Pagamento de Lotes Arrematados',
    detalhes:
      'Se você vencer um leilão, veja como o pagamento é processado:\n\n' +
      '• Uso do Saldo Interno: Você pode utilizar o próprio saldo da sua carteira para quitar a Fatura de Arremate do lote.\n' +
      '• Complementação de Valor: Caso o valor do lote arrematado seja maior do que o saldo que você já tinha em conta, o aplicativo gerará um PIX copia e cola exclusivo com o valor restante para você realizar o pagamento complementar em até 24 horas.',
  },
];
