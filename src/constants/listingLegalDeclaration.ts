/** Texto jurídico exibido no cadastro de leilão (antes de publicar). */

export const LISTING_LEGAL_DECLARATION_TITLE =
  'DECLARAÇÃO DE ORIGEM, CONFORMIDADE FISCAL E RESPONSABILIDADE CIVIL E PENAL';

export const LISTING_LEGAL_DECLARATION_INTRO = [
  'Ao publicar este leilão, o USUÁRIO VENDEDOR declara, sob as penas da lei, ser o legítimo proprietário e possuidor do bem anunciado, garantindo sua origem lícita e idoneidade.',
  'O USUÁRIO afirma estar ciente de que a inserção de informações falsas, a omissão de defeitos graves ou a tentativa de leiloar produtos de origem ilícita (furtados/roubados) configuram crimes previstos no Código Penal Brasileiro, sujeitando o infrator às penalidades de:',
] as const;

export const LISTING_LEGAL_CP_ARTICLES = [
  {
    crime: 'Falsidade Ideológica',
    article: 'Art. 299, CP',
    penalty: 'reclusão de 1 a 5 anos e multa',
  },
  {
    crime: 'Receptação',
    article: 'Art. 180, CP',
    penalty: 'reclusão de 1 a 4 anos e multa',
  },
  {
    crime: 'Estelionato',
    article: 'Art. 171, CP',
    penalty: 'reclusão de 1 a 5 anos e multa',
  },
] as const;

export const LISTING_LEGAL_INTERMEDIATION =
  'O aplicativo Levou atua estritamente como provedor de tecnologia e intermediador de leilões eletrônicos, não assumindo qualquer responsabilidade civil, fiscal ou criminal pela procedência, garantia ou entrega dos produtos anunciados por terceiros.';

export const LISTING_LEGAL_SHIELD_TITLE = 'CLÁUSULAS EXCLUSIVAS DE BLINDAGEM DA PLATAFORMA';

export const LISTING_LEGAL_SHIELD_CLAUSES = [
  {
    title: 'Intermediação Pura',
    body:
      'O aplicativo atua estritamente como provedor de tecnologia nos termos do Art. 19 da Lei 12.965/14 (Marco Civil da Internet). A plataforma não possui a posse, não estipula o preço e não outorga garantia por vícios, defeitos ou disparidades nos produtos anunciados por terceiros.',
  },
  {
    title: 'Venda no Estado',
    body:
      'O vendedor declara que o item será arrematado "no estado em que se encontra", sendo de sua total e exclusiva responsabilidade descrever minuciosamente qualquer avaria no campo de descrição.',
  },
  {
    title: 'Conformidade Fiscal',
    body:
      'O vendedor assume total responsabilidade pelo envio da Nota Fiscal ou Declaração de Conteúdo exigida pelos órgãos de transporte (Correios/Transportadoras), respondendo individualmente por eventuais apreensões fiscais.',
  },
  {
    title: 'Obrigação de Assunção de Polo (Direito de Regresso)',
    body:
      'O vendedor concorda expressamente que, caso a plataforma seja demandada judicial ou administrativamente por falhas decorrentes do lote leiloado, o vendedor requererá sua imediata inclusão no polo passivo da demanda, arcando com todas as custas, honorários advocatícios e eventuais condenações, isentando integralmente a plataforma.',
  },
] as const;

export const LISTING_LEGAL_ACCEPTANCE_LABEL =
  'Li, compreendo e aceito os termos, as cláusulas de isenção e as implicações legais acima descritas.';

/** Versão plana (logs, RPC metadata, auditoria). */
export const LISTING_LEGAL_DECLARATION_FULL_TEXT = [
  LISTING_LEGAL_DECLARATION_TITLE,
  '',
  ...LISTING_LEGAL_DECLARATION_INTRO,
  ...LISTING_LEGAL_CP_ARTICLES.map(
    (a) => `${a.crime} (${a.article}): ${a.penalty}.`,
  ),
  LISTING_LEGAL_INTERMEDIATION,
  '',
  LISTING_LEGAL_SHIELD_TITLE,
  ...LISTING_LEGAL_SHIELD_CLAUSES.map((c) => `${c.title}: ${c.body}`),
  '',
  LISTING_LEGAL_ACCEPTANCE_LABEL,
].join('\n');
