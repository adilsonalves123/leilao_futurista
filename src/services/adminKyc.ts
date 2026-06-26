import AsyncStorage from '@react-native-async-storage/async-storage';



import { KYC_SOLICITACOES_INICIAIS } from '@/src/admin/mockData';

import type { AdminKycSolicitacao } from '@/src/admin/types';

import { isMockMode } from '@/src/lib/mockMode';

import { getSupabase, isSupabaseConfigured } from '@/src/lib/supabase';

import { formatarCpf } from '@/src/lib/cpf';

import type { StatusVerificacao } from '@/src/types/database';
import {
  parseSellerBadge,
  SELLER_BADGE_DEFAULT,
  type SellerBadge,
} from '@/src/constants/sellerBadge';



const ADMIN_KYC_MOCK_KEY = '@aetherion/admin_kyc_queue';

const KYC_DB_PREFIX = 'kyc-db://';



type KycRowRpc = {

  id: string;

  email: string;

  display_name: string | null;

  nome_completo: string | null;

  cpf: string | null;

  documento_url: string | null;

  selfie_url: string | null;

  status_verificacao: StatusVerificacao;

  termos_aceitos: string | null;

  created_at: string;

  seller_badge: string | null;

};



function mapRow(row: KycRowRpc): AdminKycSolicitacao {

  return {

    id: row.id,

    email: row.email,

    displayName: row.display_name,

    nomeCompleto: row.nome_completo,

    cpf: row.cpf,

    documentoUrl: row.documento_url,

    selfieUrl: row.selfie_url,

    statusVerificacao: row.status_verificacao,

    termosAceitos: row.termos_aceitos,

    criadoEm: row.created_at,

    sellerBadge: parseSellerBadge(row.seller_badge),

  };

}



async function lerFilaMock(): Promise<AdminKycSolicitacao[]> {

  const raw = await AsyncStorage.getItem(ADMIN_KYC_MOCK_KEY);

  if (!raw) return [...KYC_SOLICITACOES_INICIAIS];

  try {

    return JSON.parse(raw) as AdminKycSolicitacao[];

  } catch {

    return [...KYC_SOLICITACOES_INICIAIS];

  }

}



async function salvarFilaMock(fila: AdminKycSolicitacao[]): Promise<void> {

  await AsyncStorage.setItem(ADMIN_KYC_MOCK_KEY, JSON.stringify(fila));

}



function extrairIdKycDb(url: string | null): string | null {

  if (!url?.startsWith(KYC_DB_PREFIX)) return null;

  return url.slice(KYC_DB_PREFIX.length).trim() || null;

}



export async function resolverUrlDocumentoAdmin(url: string | null): Promise<string | null> {

  if (!url) return null;

  const fileId = extrairIdKycDb(url);

  if (!fileId) return url;



  const supabase = getSupabase();

  if (!supabase) return null;



  const { data, error } = await supabase.rpc('admin_kyc_arquivo_data_url', {

    p_file_id: fileId,

  });



  if (error || !data) return null;

  return typeof data === 'string' ? data : null;

}



export function formatarCpfExibicao(cpf: string | null): string {

  if (!cpf) return '—';

  const digits = cpf.replace(/\D/g, '');

  return digits.length === 11 ? formatarCpf(digits) : cpf;

}



async function enriquecerUrlsAdmin(lista: AdminKycSolicitacao[]): Promise<AdminKycSolicitacao[]> {

  return Promise.all(

    lista.map(async (s) => {

      const [documentoUrl, selfieUrl] = await Promise.all([

        resolverUrlDocumentoAdmin(s.documentoUrl),

        resolverUrlDocumentoAdmin(s.selfieUrl),

      ]);

      return {

        ...s,

        documentoUrl: documentoUrl ?? s.documentoUrl,

        selfieUrl: selfieUrl ?? s.selfieUrl,

      };

    }),

  );

}



export async function listarSolicitacoesKyc(): Promise<AdminKycSolicitacao[]> {

  if (isMockMode() || !isSupabaseConfigured()) {

    return lerFilaMock();

  }



  const supabase = getSupabase();

  if (!supabase) {

    return lerFilaMock();

  }



  const { data: ehAdmin, error: adminErr } = await supabase.rpc('auth_is_admin');
  if (adminErr) {
    throw new Error(
      `Função auth_is_admin ausente. Execute migrations 021 e 027. Detalhe: ${adminErr.message}`,
    );
  }
  if (ehAdmin !== true) {
    throw new Error(
      'Conta logada não é admin no Supabase. Rode: UPDATE public.users SET role = \'admin\' WHERE email = seu e-mail; depois saia e entre de novo em /admin/login.',
    );
  }

  const { data, error } = await supabase.rpc('admin_listar_kyc');

  if (error) {
    if (
      error.message.includes('admin_listar_kyc') ||
      error.message.includes('estrutura da consulta') ||
      error.message.includes('structure of query') ||
      error.code === 'PGRST202'
    ) {
      throw new Error(
        'Execute supabase/migrations/032_admin_listar_kyc_type_fix.sql no SQL Editor do Supabase e clique em Atualizar.',
      );
    }
    throw new Error(error.message);
  }

  const lista = ((data ?? []) as KycRowRpc[]).map(mapRow);
  return enriquecerUrlsAdmin(lista);
}



export async function atualizarStatusKycAdmin(

  userId: string,

  status: 'aprovado' | 'rejeitado',

  sellerBadge?: SellerBadge,

): Promise<void> {

  if (isMockMode() || !isSupabaseConfigured()) {

    const fila = await lerFilaMock();

    const next = fila.map((s) =>

      s.id === userId
        ? {
            ...s,
            statusVerificacao: status,
            sellerBadge:
              status === 'aprovado' ? (sellerBadge ?? SELLER_BADGE_DEFAULT) : s.sellerBadge,
          }
        : s,

    );

    await salvarFilaMock(next);



    const mockKycKey = '@aetherion/mock_kyc';

    const raw = await AsyncStorage.getItem(mockKycKey);

    if (raw) {

      try {

        const perfil = JSON.parse(raw);

        if (perfil.userId === userId || !perfil.userId) {

          perfil.statusVerificacao = status;

          perfil.userId = userId;

          await AsyncStorage.setItem(mockKycKey, JSON.stringify(perfil));

        }

      } catch {

        /* ignore */

      }

    }

    return;

  }



  const supabase = getSupabase();

  if (!supabase) {

    const fila = await lerFilaMock();

    const next = fila.map((s) =>

      s.id === userId
        ? {
            ...s,
            statusVerificacao: status,
            sellerBadge:
              status === 'aprovado' ? (sellerBadge ?? SELLER_BADGE_DEFAULT) : s.sellerBadge,
          }
        : s,

    );

    await salvarFilaMock(next);

    return;

  }



  const { error } = await supabase.rpc('admin_atualizar_kyc_status', {
    p_user_id: userId,
    p_status: status,
    p_seller_badge:
      status === 'aprovado' ? (sellerBadge ?? SELLER_BADGE_DEFAULT) : null,
  });

  if (error) {
    if (error.message.includes('admin_atualizar_kyc_status') || error.code === 'PGRST202') {
      throw new Error(
        'Função admin_atualizar_kyc_status ausente. Execute supabase/migrations/028_admin_aprovar_kyc_fix.sql.',
      );
    }
    throw new Error(error.message);
  }
}


