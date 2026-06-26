import type {
  AdminBanner,
  AdminKycSolicitacao,
  AdminLeilao,
  AdminLoteArrematado,
  AdminUsuario,
  Colaborador,
} from './types';

/** Banner 1 — destaque principal no topo da Home (app móvel). */
export const BANNER_PRINCIPAL_INICIAL: AdminBanner = {
  id: 'banner-principal',
  titulo: 'MacBook Pro M3 Max',
  imagemUrl:
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1200&auto=format&fit=crop',
  linkDestino: '/auction/premium-macbook',
  ordem: 1,
  status: 'ativo',
};

/** Banner 2 — bloco promocional / secundário na Home (app móvel). */
export const BANNER_SECUNDARIO_INICIAL: AdminBanner = {
  id: 'banner-secundario',
  titulo: 'CyberCruiser Elétrico v4',
  imagemUrl:
    'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=1200&auto=format&fit=crop',
  linkDestino: '/leiloes?categoria=veiculos',
  ordem: 2,
  status: 'ativo',
};

export const BANNERS_INICIAIS: AdminBanner[] = [
  BANNER_PRINCIPAL_INICIAL,
  BANNER_SECUNDARIO_INICIAL,
];

export const LEILOES_INICIAIS: AdminLeilao[] = [
  {
    id: 'l1',
    titulo: 'iPhone 16 Pro Max 256GB',
    vendedor: '@tech_store_br',
    lanceAtual: 'FTK 7.499,00',
    status: 'ao_vivo',
    imagemUrl:
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=1200&auto=format&fit=crop',
    galeriaUrls: [
      'https://images.unsplash.com/photo-1592750475338-74b7b21085bb?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1605236453806-6ff368512a0b?q=80&w=400&auto=format&fit=crop',
    ],
    descricao:
      'iPhone 16 Pro Max com chip A18 Pro, tela Super Retina XDR de 6,9", câmera de 48 MP e armazenamento de 256 GB. Unidade nacional, bateria com 94% de saúde. Acompanha caixa original, cabo USB-C e capa de silicone. Sem riscos na tela; pequena marca de uso na moldura traseira.',
  },
  {
    id: 'l2',
    titulo: 'Drone DJI Mavic 3 Pro Fly',
    vendedor: '@drone_master',
    lanceAtual: 'FTK 5.890,00',
    status: 'ao_vivo',
    imagemUrl:
      'https://images.unsplash.com/photo-1473968512647-3e447244af8f?q=80&w=1200&auto=format&fit=crop',
    galeriaUrls: [
      'https://images.unsplash.com/photo-1508614589041-895c52a75b9e?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1527979022952-48d61c09b8a2?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1579829366246-4b1cb5d9ef8f?q=80&w=400&auto=format&fit=crop',
    ],
    descricao:
      'DJI Mavic 3 Pro Fly More Combo com sensor Hasselblad 4/3 CMOS, autonomia de até 43 min e transmissão O3+. Inclui controle RC-N1, 3 baterias inteligentes, hub de carregamento e maleta rígida. Apenas 28 horas de voo registradas. Hélices revisadas; sem quedas ou reparos estruturais.',
  },
  {
    id: 'l3',
    titulo: 'PlayStation 5 Edição Digital',
    vendedor: '@gamer_vini',
    lanceAtual: 'FTK 3.250,00',
    status: 'ao_vivo',
    imagemUrl:
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=1200&auto=format&fit=crop',
    galeriaUrls: [
      'https://images.unsplash.com/photo-1606144042614-b2417e99e721?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1486401899868-0a035710fa42?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1612287230202-1ff1d85b1e7f?q=80&w=400&auto=format&fit=crop',
    ],
    descricao:
      'PlayStation 5 Edição Digital (CFI-1200) com SSD ultrarrápido e suporte a 4K/120 Hz. Console em excelente estado cosmético, sem superaquecimento. Controle DualSense branco com drift zero nos analógicos. Acompanha cabo de energia e base vertical original.',
  },
  {
    id: 'l4',
    titulo: 'MacBook Pro M2 512GB',
    vendedor: '@setup_minimal',
    lanceAtual: 'FTK 8.450,00',
    status: 'pausado',
    imagemUrl:
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1200&auto=format&fit=crop',
    galeriaUrls: [
      'https://images.unsplash.com/photo-1611186871348-b1ce06e07e9b?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-154180708639-5c2626d92e9b?q=80&w=400&auto=format&fit=crop',
    ],
    descricao:
      'MacBook Pro 14" (2023) com Apple M2, 16 GB de memória unificada e SSD de 512 GB. Tela Liquid Retina XDR sem dead pixels. Ciclo de bateria: 187 cargas. Teclado e trackpad impecáveis. Leve desgaste nas quinas; carregador MagSafe 67 W e cabo USB-C inclusos.',
  },
];

export const ARREMATADOS_INICIAIS: AdminLoteArrematado[] = [
  {
    id: 'arr1',
    loteId: 'l1',
    titulo: 'iPhone 16 Pro Max 256GB',
    imagemUrl:
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=1200&auto=format&fit=crop',
    galeriaUrls: [
      'https://images.unsplash.com/photo-1592750475338-74b7b21085bb?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1605236453806-6ff368512a0b?q=80&w=400&auto=format&fit=crop',
    ],
    comprador: '@marcos_silva_ftk',
    vendedor: '@tech_store_br',
    valorFinal: 'FTK 7.499,00',
    taxaPlataforma: 'FTK 749,90 (10%)',
    valorFrete: 'FTK 0,00 (retirada local)',
    fluxoStatus: 'entregue',
    fluxoLabel: 'Entregue',
    alertaAdm: null,
    timeline: [
      {
        id: 't1',
        titulo: 'Leilão encerrado',
        descricao: 'Lance vencedor registrado automaticamente.',
        data: '18/05/2026',
        concluida: true,
      },
      {
        id: 't2',
        titulo: 'Pagamento confirmado',
        descricao: 'Comprador quitou via saldo FTK em 4 minutos.',
        data: '18/05/2026',
        concluida: true,
      },
      {
        id: 't3',
        titulo: 'Envio postado',
        descricao: 'Código de rastreio BR123456789BR — Correios SEDEX.',
        data: '19/05/2026',
        concluida: true,
      },
      {
        id: 't4',
        titulo: 'Entrega confirmada',
        descricao: 'Comprador assinou recebimento no app.',
        data: '22/05/2026',
        concluida: true,
        atual: true,
      },
    ],
  },
  {
    id: 'arr2',
    loteId: 'l3',
    titulo: 'PlayStation 5 Edição Digital',
    imagemUrl:
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=1200&auto=format&fit=crop',
    galeriaUrls: [
      'https://images.unsplash.com/photo-1606144042614-b2417e99e721?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1486401899868-0a035710fa42?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1612287230202-1ff1d85b1e7f?q=80&w=400&auto=format&fit=crop',
    ],
    comprador: '@pedro_42_gamer',
    vendedor: '@gamer_vini',
    valorFinal: 'FTK 3.250,00',
    taxaPlataforma: 'FTK 325,00 (10%)',
    valorFrete: 'FTK 89,00',
    fluxoStatus: 'aguardando_pagamento',
    fluxoLabel: 'Aguardando Pagamento',
    alertaAdm: {
      tipo: 'pagamento_atrasado',
      mensagem: '⚠️ Comprador com pagamento atrasado há 2 dias',
      severidade: 'aviso',
    },
    timeline: [
      {
        id: 't1',
        titulo: 'Leilão encerrado',
        descricao: 'Prazo de pagamento iniciado (48h úteis).',
        data: '24/05/2026',
        concluida: true,
      },
      {
        id: 't2',
        titulo: 'Aguardando pagamento',
        descricao: 'Comprador ainda não confirmou o débito FTK.',
        data: null,
        concluida: false,
        atual: true,
      },
      {
        id: 't3',
        titulo: 'Aguardando envio',
        descricao: 'Liberado após confirmação do pagamento.',
        data: null,
        concluida: false,
      },
      {
        id: 't4',
        titulo: 'Entrega ao comprador',
        descricao: 'Rastreio e confirmação de recebimento.',
        data: null,
        concluida: false,
      },
    ],
  },
  {
    id: 'arr3',
    loteId: 'l2',
    titulo: 'Drone DJI Mavic 3 Pro Fly',
    imagemUrl:
      'https://images.unsplash.com/photo-1473968512647-3e447244af8f?q=80&w=1200&auto=format&fit=crop',
    galeriaUrls: [
      'https://images.unsplash.com/photo-1508614589041-895c52a75b9e?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1527979022952-48d61c09b8a2?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1579829366246-4b1cb5d9ef8f?q=80&w=400&auto=format&fit=crop',
    ],
    comprador: '@lucas_fly_drone',
    vendedor: '@drone_master',
    valorFinal: 'FTK 5.890,00',
    taxaPlataforma: 'FTK 589,00 (10%)',
    valorFrete: 'FTK 145,00',
    fluxoStatus: 'atrasado',
    fluxoLabel: 'Pago — Envio Atrasado',
    alertaAdm: {
      tipo: 'envio_atrasado',
      mensagem: '🚨 Vendedor atrasou o envio (prazo venceu há 3 dias)',
      severidade: 'critico',
    },
    timeline: [
      {
        id: 't1',
        titulo: 'Leilão encerrado',
        descricao: 'Arrematação registrada com sucesso.',
        data: '15/05/2026',
        concluida: true,
      },
      {
        id: 't2',
        titulo: 'Pagamento confirmado',
        descricao: 'Valor bloqueado em custódia da plataforma.',
        data: '15/05/2026',
        concluida: true,
      },
      {
        id: 't3',
        titulo: 'Envio pendente',
        descricao: 'Vendedor não informou código de rastreio no prazo.',
        data: null,
        concluida: false,
        atual: true,
      },
      {
        id: 't4',
        titulo: 'Entrega ao comprador',
        descricao: 'Aguardando postagem do vendedor.',
        data: null,
        concluida: false,
      },
    ],
  },
  {
    id: 'arr4',
    loteId: 'l4',
    titulo: 'MacBook Pro M2 512GB',
    imagemUrl:
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1200&auto=format&fit=crop',
    galeriaUrls: [
      'https://images.unsplash.com/photo-1611186871348-b1ce06e07e9b?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-154180708639-5c2626d92e9b?q=80&w=400&auto=format&fit=crop',
    ],
    comprador: '@marta_tech_setup',
    vendedor: '@setup_minimal',
    valorFinal: 'FTK 8.450,00',
    taxaPlataforma: 'FTK 845,00 (10%)',
    valorFrete: 'FTK 120,00',
    fluxoStatus: 'enviado',
    fluxoLabel: 'Enviado',
    alertaAdm: null,
    timeline: [
      {
        id: 't1',
        titulo: 'Leilão encerrado',
        descricao: 'Lote arrematado após disputa final.',
        data: '20/05/2026',
        concluida: true,
      },
      {
        id: 't2',
        titulo: 'Pagamento confirmado',
        descricao: 'Transferência FTK concluída em 12 minutos.',
        data: '20/05/2026',
        concluida: true,
      },
      {
        id: 't3',
        titulo: 'Envio postado',
        descricao: 'Loggi — código LG987654321 em trânsito.',
        data: '23/05/2026',
        concluida: true,
        atual: true,
      },
      {
        id: 't4',
        titulo: 'Entrega ao comprador',
        descricao: 'Previsão de entrega: 28/05/2026.',
        data: null,
        concluida: false,
      },
    ],
  },
];

export const KYC_SOLICITACOES_INICIAIS: AdminKycSolicitacao[] = [
  {
    id: 'kyc-1',
    email: 'adilson@adilson.com',
    displayName: 'Adilson Silva',
    nomeCompleto: 'Adilson da Silva Santos',
    cpf: '12345678901',
    documentoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400',
    selfieUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    statusVerificacao: 'em_analise',
    termosAceitos: new Date().toISOString(),
    criadoEm: new Date().toISOString(),
  },
  {
    id: 'kyc-2',
    email: 'marcos@email.com',
    displayName: 'Marcos Silva',
    nomeCompleto: 'Marcos Silva Oliveira',
    cpf: '98765432100',
    documentoUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
    selfieUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    statusVerificacao: 'em_analise',
    termosAceitos: new Date(Date.now() - 86400000).toISOString(),
    criadoEm: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'kyc-3',
    email: 'marta.tech@email.com',
    displayName: 'Marta Costa',
    nomeCompleto: 'Marta Costa Lima',
    cpf: '11122233344',
    documentoUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400',
    selfieUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    statusVerificacao: 'aprovado',
    termosAceitos: new Date(Date.now() - 86400000 * 5).toISOString(),
    criadoEm: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];

export const USUARIOS_INICIAIS: AdminUsuario[] = [
  {
    id: 'u1',
    nome: 'Marcos Silva',
    nomeCompleto: 'Marcos Antônio Silva',
    email: 'marcos@email.com',
    telefone: '(11) 98765-4321',
    cpf: '12345678901',
    saldoFtk: 'FTK 2.500,00',
    status: 'ativo',
    statusConta: 'ativo',
    statusKyc: 'Aprovado',
    statusVerificacao: 'aprovado',
    role: 'bidder',
    cep: '01310-100',
    enderecoLogradouro: 'Av. Paulista',
    enderecoNumero: '1000',
    enderecoBairro: 'Bela Vista',
    enderecoCidade: 'São Paulo',
    enderecoUf: 'SP',
    documentoUrl: null,
    selfieUrl: null,
  },
  {
    id: 'u2',
    nome: 'Marta Costa',
    nomeCompleto: 'Marta Costa Oliveira',
    email: 'marta.tech@email.com',
    telefone: '(21) 99876-5432',
    cpf: '98765432100',
    saldoFtk: 'FTK 1.850,00',
    status: 'ativo',
    statusConta: 'ativo',
    statusKyc: 'Em análise',
    statusVerificacao: 'em_analise',
    role: 'bidder',
    cep: '22041-080',
    enderecoLogradouro: 'Rua Barata Ribeiro',
    enderecoNumero: '200',
    enderecoBairro: 'Copacabana',
    enderecoCidade: 'Rio de Janeiro',
    enderecoUf: 'RJ',
    documentoUrl: null,
    selfieUrl: null,
  },
  {
    id: 'u3',
    nome: 'Pedro Alves',
    nomeCompleto: 'Pedro Henrique Alves',
    email: 'pedro_42@email.com',
    telefone: '(31) 99123-4567',
    cpf: '11122233344',
    saldoFtk: 'FTK 4.200,00',
    status: 'suspenso',
    statusConta: 'suspenso',
    statusKyc: 'Aprovado',
    statusVerificacao: 'aprovado',
    role: 'vendor',
    documentoUrl: null,
    selfieUrl: null,
  },
  {
    id: 'u4',
    nome: 'Lucas Ferreira',
    nomeCompleto: 'Lucas Ferreira Santos',
    email: 'lucas_fly@email.com',
    telefone: '(41) 98888-7777',
    saldoFtk: 'FTK 890,00',
    status: 'ativo',
    statusConta: 'ativo',
    statusKyc: 'Pendente',
    statusVerificacao: 'pendente',
    role: 'bidder',
    documentoUrl: null,
    selfieUrl: null,
  },
];

export const COLABORADOR_MASTER: Colaborador = {
  id: 'master',
  nome: 'Administrador Master',
  email: 'admin@luckcode.com.br',
  permissoes: ['financeiro', 'leiloes', 'usuarios', 'banners', 'suporte', 'policies'],
};

export const COLABORADORES_INICIAIS: Colaborador[] = [
  COLABORADOR_MASTER,
  {
    id: 'c2',
    nome: 'Ana Moderadora',
    email: 'ana.moderacao@luckcode.com.br',
    permissoes: ['leiloes', 'usuarios', 'suporte'],
  },
  {
    id: 'c3',
    nome: 'Ricardo Marketing',
    email: 'ricardo.mkt@luckcode.com.br',
    permissoes: ['banners'],
  },
];
