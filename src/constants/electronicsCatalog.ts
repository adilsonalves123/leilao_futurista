import { validateSerialOrImei } from '@/src/lib/serialImeiValidation';

/** Celular exige IMEI; demais tipos exigem número de série. */
export type ElectronicIdentification = 'imei_required' | 'serial';

export type ElectronicTypeId =
  | 'celular'
  | 'computador'
  | 'videogames'
  | 'smartwatches'
  | 'fones'
  | 'caixa_som'
  | 'smart_tv'
  | 'cameras_drones'
  | 'acessorios'
  | 'outros';

export type ElectronicType = {
  id: ElectronicTypeId;
  label: string;
  identification: ElectronicIdentification;
  keywords: string[];
};

export const ELECTRONICS_CATALOG: ElectronicType[] = [
  {
    id: 'celular',
    label: 'Celular',
    identification: 'imei_required',
    keywords: ['smartphone', 'iphone', 'samsung', 'xiaomi', 'motorola', 'imei', 'telefone'],
  },
  {
    id: 'computador',
    label: 'Computador',
    identification: 'serial',
    keywords: ['notebook', 'laptop', 'pc', 'desktop', 'monitor', 'macbook', 'tablet', 'ipad'],
  },
  {
    id: 'videogames',
    label: 'Videogames',
    identification: 'serial',
    keywords: ['playstation', 'ps5', 'xbox', 'nintendo', 'switch', 'console', 'controle'],
  },
  {
    id: 'smartwatches',
    label: 'Smartwatches',
    identification: 'serial',
    keywords: ['apple watch', 'galaxy watch', 'relógio', 'mi band', 'smartwatch'],
  },
  {
    id: 'fones',
    label: 'Fones de Ouvido',
    identification: 'serial',
    keywords: ['fone', 'headset', 'earbuds', 'airpods', 'bluetooth', 'ouvido'],
  },
  {
    id: 'caixa_som',
    label: 'Caixa de Som',
    identification: 'serial',
    keywords: ['jbl', 'bose', 'bluetooth', 'som portátil', 'soundbar', 'caixa'],
  },
  {
    id: 'smart_tv',
    label: 'Smart TV',
    identification: 'serial',
    keywords: ['televisão', 'tv', 'oled', 'qled', 'projetor', 'philco', 'samsung tv'],
  },
  {
    id: 'cameras_drones',
    label: 'Câmeras e Drones',
    identification: 'serial',
    keywords: ['câmera', 'canon', 'nikon', 'gopro', 'dji', 'drone', 'fotografia'],
  },
  {
    id: 'acessorios',
    label: 'Acessórios',
    identification: 'serial',
    keywords: ['teclado', 'mouse', 'webcam', 'cabo', 'carregador', 'roteador', 'modem'],
  },
  {
    id: 'outros',
    label: 'Outros',
    identification: 'serial',
    keywords: ['eletrônico', 'rádio', 'impressora', 'gadget', 'kindle', 'aspirador'],
  },
];

export function getElectronicType(id: ElectronicTypeId | null | undefined): ElectronicType | null {
  if (!id) return null;
  return ELECTRONICS_CATALOG.find((t) => t.id === id) ?? null;
}

export function getElectronicTagLabel(identification: ElectronicIdentification): 'IMEI' | 'Série' {
  return identification === 'imei_required' ? 'IMEI' : 'Série';
}

/** Aceita IDs antigos gravados antes da simplificação do catálogo. */
const LEGACY_TYPE_MAP: Record<string, ElectronicTypeId> = {
  smartphone: 'celular',
  feature_phone: 'celular',
  tablet: 'computador',
  smartwatch: 'smartwatches',
  notebook: 'computador',
  desktop: 'computador',
  monitor: 'computador',
  gpu_placa: 'computador',
  console: 'videogames',
  controle_videogame: 'videogames',
  projetor: 'smart_tv',
  soundbar: 'caixa_som',
  fone_ouvido: 'fones',
  fone_bluetooth: 'fones',
  tv: 'smart_tv',
  radio: 'outros',
  camera_foto: 'cameras_drones',
  camera_acao: 'cameras_drones',
  drone: 'cameras_drones',
  impressora: 'outros',
  roteador: 'acessorios',
  modem: 'acessorios',
  smart_speaker: 'caixa_som',
  chromecast_streaming: 'smart_tv',
  e_reader: 'outros',
  teclado: 'acessorios',
  mouse: 'acessorios',
  webcam: 'acessorios',
  hd_ssd: 'acessorios',
  smart_tv_box: 'smart_tv',
  aspirador_robo: 'outros',
  patinete_eletrico: 'outros',
  outros_eletronico: 'outros',
};

export function normalizeElectronicTypeId(
  id: string | null | undefined,
): ElectronicTypeId | null {
  if (!id) return null;
  if (ELECTRONICS_CATALOG.some((t) => t.id === id)) return id as ElectronicTypeId;
  return LEGACY_TYPE_MAP[id] ?? null;
}

export function labelElectronicType(id: ElectronicTypeId | string | null | undefined): string | null {
  const normalized = typeof id === 'string' ? normalizeElectronicTypeId(id) : id;
  return getElectronicType(normalized)?.label ?? null;
}

export function filterElectronicsCatalog(query: string): ElectronicType[] {
  const q = query
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (!q) return ELECTRONICS_CATALOG;
  return ELECTRONICS_CATALOG.filter((item) => {
    const hay = `${item.label} ${item.keywords.join(' ')}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '');
    return hay.includes(q);
  });
}

export function getIdentificationHint(identification: ElectronicIdentification): string {
  if (identification === 'imei_required') {
    return 'Celular: informe o IMEI com 15 dígitos (Ajustes → Sobre ou na caixa do aparelho).';
  }
  return 'Informe o número de série na etiqueta, nota fiscal ou embalagem do produto.';
}

export function validateElectronicsIdentification(
  typeId: ElectronicTypeId | string | null | undefined,
  raw: string,
): { valid: boolean; message: string | null; kind: 'imei' | 'serial' | null } {
  const normalized = normalizeElectronicTypeId(
    typeof typeId === 'string' ? typeId : typeId ?? null,
  );
  if (!normalized) {
    return { valid: false, message: 'Selecione o tipo de eletrônico na etapa anterior.', kind: null };
  }
  const type = getElectronicType(normalized);
  if (!type) {
    return { valid: false, message: 'Tipo de eletrônico inválido.', kind: null };
  }

  const check = validateSerialOrImei(raw);
  if (!check.valid) {
    return { valid: false, message: check.message, kind: null };
  }

  if (type.identification === 'imei_required' && check.kind !== 'imei') {
    return {
      valid: false,
      message: 'Para celulares, informe o IMEI completo com 15 dígitos válidos.',
      kind: null,
    };
  }

  if (type.identification === 'serial' && check.kind === 'imei') {
    return {
      valid: false,
      message: 'Para este tipo de item use o número de série (não o IMEI).',
      kind: null,
    };
  }

  return { valid: true, message: null, kind: check.kind };
}
