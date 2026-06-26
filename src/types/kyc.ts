import type { StatusVerificacao } from '@/src/types/database';

export type { StatusVerificacao };

export const KYC_STATUS_LABELS: Record<StatusVerificacao, string> = {
  pendente: 'Cadastro pendente',
  em_analise: 'Em análise',
  aprovado: 'Verificado',
  rejeitado: 'Rejeitado — reenvie',
};

/** Multa irrevogável por desistência após arremate (blindagem jurídica). */
export const PENALIDADE_DESISTENCIA_RATE = 0.3;

export type KycProfile = {
  userId: string;
  email: string | null;
  telefone: string | null;
  nomeCompleto: string | null;
  cpf: string | null;
  dataNascimento: string | null;
  documentoUrl: string | null;
  selfieUrl: string | null;
  cep: string | null;
  enderecoLogradouro: string | null;
  enderecoNumero: string | null;
  enderecoComplemento: string | null;
  enderecoBairro: string | null;
  enderecoCidade: string | null;
  enderecoUf: string | null;
  statusVerificacao: StatusVerificacao;
  termosAceitos: string | null;
};

export type AtualizarContatoKycInput = {
  email: string;
  telefone: string;
  cep: string;
  enderecoLogradouro: string;
  enderecoNumero: string;
  enderecoComplemento: string;
  enderecoBairro: string;
  enderecoCidade: string;
  enderecoUf: string;
};

/** Conta verificada — vale para dar lances e publicar anúncios (mesmo cadastro KYC). */
export function perfilKycAprovado(status: StatusVerificacao): boolean {
  return status === 'aprovado';
}

export function podeDarLance(status: StatusVerificacao): boolean {
  return perfilKycAprovado(status);
}

export function podePublicarAnuncio(status: StatusVerificacao): boolean {
  return perfilKycAprovado(status);
}

/** Status em que identidade/documentos não podem mais ser alterados. */
export function perfilEmModoEdicao(status: StatusVerificacao): boolean {
  return status === 'em_analise' || status === 'aprovado';
}

/**
 * Cadastro inicial já concluído — oculta CPF, selfie e documentos.
 * Inclui envio já realizado mesmo se o status ainda não atualizou no cliente.
 */
export function cadastroInicialJaEnviado(perfil: KycProfile | null): boolean {
  if (!perfil) return false;

  if (perfil.statusVerificacao === 'rejeitado') return false;

  if (perfilEmModoEdicao(perfil.statusVerificacao)) return true;

  const temIdentidadeEnviada =
    Boolean(perfil.cpf) &&
    Boolean(perfil.documentoUrl) &&
    Boolean(perfil.selfieUrl);

  return Boolean(perfil.termosAceitos) || temIdentidadeEnviada;
}

/** Ainda precisa enviar CPF, documentos e selfie (primeira vez). */
export function precisaCadastroInicial(perfil: KycProfile | null): boolean {
  if (!perfil) return true;
  return !cadastroInicialJaEnviado(perfil);
}
