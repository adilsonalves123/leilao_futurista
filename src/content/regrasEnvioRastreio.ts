export type RegraEnvioSecao = {
  id: string;
  titulo: string;
  detalhes: string;
};

export const REGRAS_ENVIO_RASTREIO: RegraEnvioSecao[] = [
  {
    id: 'etiqueta',
    titulo: '📦 1. Preparação e Geração da Etiqueta',
    detalhes:
      'Assim que o seu pagamento é confirmado no sistema, o processo de envio é iniciado automaticamente:\n\n' +
      '• Confirmação de Endereço: O produto será enviado estritamente para o endereço cadastrado no seu perfil no momento do arremate. Certifique-se de manter seus dados atualizados.\n' +
      '• Prazo de Preparação: Após a compensação do pagamento da fatura, a plataforma ou o vendedor parceiro tem o prazo de até 3 dias úteis para embalar o produto com segurança e gerar a etiqueta de envio.\n' +
      '• Notificação Inicial: Assim que a etiqueta de postagem for gerada, você receberá um alerta no aplicativo informando que o produto entrou na fase de preparação para o envio.',
  },
  {
    id: 'transportadoras',
    titulo: '🚚 2. Métodos de Envio e Transportadoras',
    detalhes:
      'Trabalhamos com os melhores serviços de logística do país para garantir que o seu lote chegue intacto:\n\n' +
      '• Correios e Parceiros: Os envios são realizados prioritariamente via Correios (Sedex ou PAC) ou por transportadoras privadas parceiras (como Loggi, Jadlog, etc.), dependendo do tamanho e peso do lote arrematado.\n' +
      '• Seguro Total: Todos os produtos leiloados viajam com seguro total declarado. Em caso de extravio, roubo de carga ou perda confirmada pela transportadora, você será 100% reembolsado pela plataforma.',
  },
  {
    id: 'rastreio',
    titulo: '📍 3. Como Rastrear o meu Produto?',
    detalhes:
      'Você consegue acompanhar cada passo da entrega sem precisar sair do aplicativo:\n\n' +
      '• Código de Rastreamento: Assim que o pacote for bipado na agência dos Correios ou coletado pela transportadora, um código de rastreio (ex: AA123456789BR) será vinculado ao seu lote.\n' +
      '• Aba de Compras: Para rastrear, basta ir no menu do app, clicar em \'Meus Arremates\', selecionar o item desejado e clicar no botão \'Rastrear Objeto\'. O status de onde o seu produto está aparecerá atualizado na hora.',
  },
  {
    id: 'prazos',
    titulo: '⏳ 4. Prazos de Entrega e Recebimento',
    detalhes:
      'O tempo para o produto chegar na sua casa varia de acordo com a sua localização:\n\n' +
      '• Estimativa de Prazo: O prazo estimado de entrega começa a contar a partir da data de postagem e segue a tabela padrão da transportadora escolhida para a sua região (geralmente de 2 a 12 dias úteis).\n' +
      '• Critério de Recebimento: É obrigatório que haja alguém maior de 18 anos no local para assinar o recebimento e conferir o pacote.\n' +
      '• Conferência no Ato da Entrega: IMPORTANTE! Ao receber o pacote, verifique se a embalagem não está violada ou amassada. Caso note qualquer irregularidade, recuse o recebimento e entre em contato imediatamente com o nosso suporte.',
  },
];
