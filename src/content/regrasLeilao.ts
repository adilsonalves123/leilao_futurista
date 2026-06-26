export type RegraLeilaoSecao = {
  id: string;
  titulo: string;
  detalhes: string;
};

export const REGRAS_LEILAO: RegraLeilaoSecao[] = [
  {
    id: 'kyc',
    titulo: '🔐 1. Cadastro e Validação Obrigatória (KYC)',
    detalhes:
      'Para garantir que nossa comunidade seja 100% segura, transparente e livre de robôs ou perfis falsos, aplicamos regras rígidas de acesso:\n\n' +
      '• Navegação Livre: Você pode criar sua conta, olhar todos os lotes disponíveis, acompanhar os cronômetros e assistir aos lances em tempo real sem pagar nada.\n' +
      '• Bloqueio Inicial: O botão de \'Dar Lance\' começará bloqueado para você. Para liberá-lo, você precisa ir no seu Perfil e concluir a Verificação de Identidade (KYC).\n' +
      '• Documentação Exigida: O sistema exigirá seu Nome Completo, CPF válido, uma foto nítida do seu documento oficial (RG ou CNH) e uma selfie segurando o documento.\n' +
      '• Status de Análise: Após enviar, sua conta ficará com o status \'Em Análise\'. Nossa equipe de auditoria revisará as informações. Assim que aprovado, seu painel de lances é liberado imediatamente.',
  },
  {
    id: 'carteira',
    titulo: '💳 2. Carteira Digital e Garantia de Lance',
    detalhes:
      'Aqui não existem lances falsos ou fakes. Cada oferta é protegida por uma garantia financeira real:\n\n' +
      '• Adicionando Saldo: Antes de começar a disputar, você deve carregar sua carteira interna do aplicativo utilizando os métodos de pagamento disponíveis (como Pix).\n' +
      '• Como Funciona o Lance: Quando você clica em \'Dar Lance\', o valor correspondente ao seu lance ou uma taxa de garantia estipulada pelo lote fica temporariamente \'retida\' pelo sistema.\n' +
      '• Se Alguém Cobrir Seu Lance: Se outro participante enviar uma oferta maior que a sua, o seu saldo retido é devolvido e desbloqueado na sua carteira no mesmo segundo. Você pode usar esse saldo para dar um novo lance ou retirá-lo de volta.',
  },
  {
    id: 'motor',
    titulo: '🔨 3. O Motor de Lances e o Sistema Anti-Robô',
    detalhes:
      'Nossas disputas são dinâmicas e baseadas em fair-play (jogo justo), eliminando qualquer vantagem de robôs de lances no último milissegundo:\n\n' +
      '• Incremento Mínimo: Você não pode cobrir um lance adicionando apenas centavos. Cada produto tem um valor de incremento mínimo obrigatório (ex: se o lote exige incrementos de R$ 20,00, seu lance deve ser o valor atual + R$ 20,00).\n' +
      '• O Cronômetro de Sobrevivência (Overtime de 15s): Se qualquer usuário fizer um lance quando o cronômetro do leilão estiver marcando menos de 15 segundos para acabar, o relógio ganha AUTOMATICAMENTE mais 15 segundos de acréscimo.\n' +
      '• Quando o Leilão Termina? O leilão só chega ao fim quando o cronômetro zerar completamente e ninguém mais tiver interesse em cobrir a oferta atual dentro dos últimos 15 segundos.',
  },
  {
    id: 'arremate',
    titulo: '🏆 4. Arremate, Pagamento e Penalidades',
    detalhes:
      'Caso o cronômetro zere e você seja o maior comprador, o lote é oficialmente seu! Veja como proceder:\n\n' +
      '• Geração da Fatura: No mesmo instante do término, o aplicativo gera uma Fatura de Arremate na sua aba de compras, contendo o valor final do item e eventuais taxas administrativas descritas no lote.\n' +
      '• Prazo de Pagamento: Você tem o prazo máximo e estrito de 24 horas corridas para realizar a quitação total da fatura através do aplicativo.\n' +
      '• Penalidade Crítica por Desistência: Se você não pagar em até 24 horas, sua atitude será considerada fraude de leilão. Como punição, o valor da sua garantia retida será confiscado pela plataforma, sua conta será suspensa permanentemente e o item será repassado imediatamente para o segundo colocado (o participante que deu o vice-maior lance).',
  },
];
