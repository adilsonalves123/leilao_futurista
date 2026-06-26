import type { AdminLeilaoPendencia } from '@/src/lib/adminLeilaoFluxo';
import type { SellerBadge } from '@/src/constants/sellerBadge';
import type { StatusVerificacao } from '@/src/types/database';

export type AdminPermission =
  | 'financeiro'
  | 'leiloes'
  | 'usuarios'
  | 'banners'
  | 'suporte'
  | 'policies';

export type BannerStatus = 'ativo' | 'pausado';

export type AdminBanner = {
  id: string;
  titulo: string;
  imagemUrl: string;
  linkDestino: string;
  ordem: number;
  status: BannerStatus;
};

export type FluxoArrematadoStatus =
  | 'aguardando_pagamento'
  | 'pago_aguardando_envio'
  | 'enviado'
  | 'entregue'
  | 'atrasado';

export type EtapaTimelineArrematado = {
  id: string;
  titulo: string;
  descricao: string;
  /** Data formatada (DD/MM/AAAA) ou null se etapa pendente */
  data: string | null;
  concluida: boolean;
  atual?: boolean;
};

export type AlertaAdmArrematado = {
  tipo: 'pagamento_atrasado' | 'envio_atrasado' | 'mediacao';
  mensagem: string;
  severidade: 'aviso' | 'critico';
};

export type AdminLoteArrematado = {
  id: string;
  loteId: string;
  titulo: string;
  imagemUrl: string;
  galeriaUrls: string[];
  comprador: string;
  vendedor: string;
  valorFinal: string;
  taxaPlataforma: string;
  valorFrete: string;
  fluxoStatus: FluxoArrematadoStatus;
  fluxoLabel: string;
  alertaAdm: AlertaAdmArrematado | null;
  timeline: EtapaTimelineArrematado[];
  orderStatus?: StatusPedidoAdmin | null;
  trackingCode?: string | null;
  pendencia?: AdminLeilaoPendencia;
};

export type AdminLeilaoStatus =
  | 'em_analise'
  | 'ao_vivo'
  | 'pausado'
  | 'encerrado'
  | 'rejeitado';

export type AdminKycSolicitacao = {
  id: string;
  email: string;
  displayName: string | null;
  nomeCompleto: string | null;
  cpf: string | null;
  documentoUrl: string | null;
  selfieUrl: string | null;
  statusVerificacao: StatusVerificacao;
  termosAceitos: string | null;
  criadoEm: string;
  sellerBadge?: SellerBadge | null;
};

export type StatusContaUsuario = 'ativo' | 'suspenso' | 'bloqueado' | 'banido';

export type AdminUsuario = {
  id: string;
  nome: string;
  email: string;
  saldoFtk: string;
  /** @deprecated use statusConta */
  status: StatusContaUsuario;
  statusConta: StatusContaUsuario;
  statusKyc?: string;
  statusVerificacao?: StatusVerificacao;
  role?: string;
  criadoEm?: string;
  displayName?: string | null;
  nomeCompleto?: string | null;
  telefone?: string | null;
  cpf?: string | null;
  documentoUrl?: string | null;
  selfieUrl?: string | null;
  dataNascimento?: string | null;
  cep?: string | null;
  enderecoLogradouro?: string | null;
  enderecoNumero?: string | null;
  enderecoComplemento?: string | null;
  enderecoBairro?: string | null;
  enderecoCidade?: string | null;
  enderecoUf?: string | null;
  termosAceitos?: string | null;
};

export type FiltroPedidoAdmin =
  | 'todos'
  | 'pagamento_pendente'
  | 'entrega_pendente'
  | 'disputas'
  | 'pagamentos_pendentes'
  | 'em_envio';


export type StatusPedidoAdmin =
  | 'pendente_pagamento'
  | 'pago'
  | 'em_envio'
  | 'aguardando_confirmacao'
  | 'finalizado'
  | 'em_disputa'
  | 'estornado';

export type AdminLeilao = {
  id: string;
  titulo: string;
  vendedor: string;
  vendedorEmail?: string;
  lanceAtual: string;
  status: AdminLeilaoStatus;
  imagemUrl: string;
  galeriaUrls: string[];
  descricao: string;
  promocoes?: string[];
  criadoEm?: string;
  encerraEm?: string;
  orderId?: string | null;
  orderCode?: string | null;
  orderStatus?: StatusPedidoAdmin | null;
  trackingCode?: string | null;
  winnerName?: string | null;
  winnerBidCents?: number | null;
  bidCount?: number;
  pendencia?: AdminLeilaoPendencia;
};

export type MetodoPagamentoPedido = 'pix' | 'boleto' | 'cartao' | 'cripto';

export type AdminPedidoParte = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cpf?: string | null;
};

export type AdminPedidoEvento = {
  id: string;
  tipo: string;
  mensagem: string;
  criadoEm: string;
};

export type AdminPedidoEtapa = {
  id: string;
  titulo: string;
  descricao: string;
  data: string | null;
  concluida: boolean;
  atual?: boolean;
};

export type AdminPedidoResumo = {
  id: string;
  codigo: string;
  leilaoId: string;
  tituloLeilao: string;
  imagemLeilao: string;
  comprador: AdminPedidoParte;
  vendedor: AdminPedidoParte;
  valorCents: number;
  status: StatusPedidoAdmin;
  criadoEm: string;
  atualizadoEm: string;
  trackingCode?: string | null;
  pendencia?: AdminLeilaoPendencia;
};

export type AdminPedidoDetalhe = AdminPedidoResumo & {
  itemCents: number;
  freteCents: number;
  comissaoCents: number;
  codigoRastreio: string | null;
  /** Alias de codigoRastreio para serviços unificados */
  trackingCode?: string | null;
  pagamento: {
    metodo: MetodoPagamentoPedido;
    transacaoId: string | null;
    aprovadoEm: string | null;
    comprovanteUrl: string | null;
    gateway: string;
  };
  timeline: AdminPedidoEtapa[];
  eventos: AdminPedidoEvento[];
};

export const STATUS_PEDIDO_LABEL: Record<StatusPedidoAdmin, string> = {
  pendente_pagamento: 'Pagamento pendente',
  pago: 'Pago · aguardando envio',
  em_envio: 'Em envio',
  aguardando_confirmacao: 'Aguardando confirmação',
  finalizado: 'Finalizado',
  em_disputa: 'Em disputa',
  estornado: 'Estornado',
};

export const METODO_PAGAMENTO_PEDIDO_LABEL: Record<MetodoPagamentoPedido, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  cartao: 'Cartão',
  cripto: 'Cripto',
};

export type AdminVendedorPerfil = {
  id: string;
  handle: string;
  nomeExibicao: string;
  nomeCompleto: string | null;
  email: string;
  telefone: string | null;
  statusKyc: StatusVerificacao;
  sellerBadge: SellerBadge | null;
  mediaEstrelas: number;
  totalAvaliacoes: number;
  leiloesConcluidos: number;
  desistencias: number;
  multasAplicadas: number;
};

export type Colaborador = {
  id: string;
  nome: string;
  email: string;
  senhaProvisoria?: string;
  permissoes: AdminPermission[];
};

export const PERMISSOES_LABELS: Record<
  AdminPermission,
  { label: string; descricao: string }
> = {
  financeiro: {
    label: 'Acesso ao Financeiro',
    descricao: 'Ver faturamento, destaques e os 10%',
  },
  leiloes: {
    label: 'Acesso aos Leilões',
    descricao: 'Pausar e Deletar',
  },
  usuarios: {
    label: 'Acesso aos Usuários',
    descricao: 'Banir membros e moderar KYC',
  },
  banners: {
    label: 'Patrocínios (carrosséis)',
    descricao: 'Home fallback e bloco na aba Leilões',
  },
  suporte: {
    label: 'Acesso ao Suporte',
    descricao: 'Responder o Chat',
  },
  policies: {
    label: 'Termos e Políticas',
    descricao: 'Editar textos jurídicos do app',
  },
};

export const TODAS_PERMISSOES: AdminPermission[] = [
  'financeiro',
  'leiloes',
  'usuarios',
  'banners',
  'suporte',
  'policies',
];
