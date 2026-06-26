import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAdminSession } from '@/src/admin/AdminSessionContext';
import {
  criarSlideNovo,
  moverSlideDireita,
  moverSlideEsquerda,
  type AppBanner,
} from '@/src/store/banners';
import { useBanners } from '@/src/store/bannersContext';
import {
  getSupabaseConfigWarnings,
  testarConexaoSupabase,
} from '@/src/lib/supabaseEnv';
import { adminC, adminStyles } from './_components/adminStyles';

/** Alert nativo falha silenciosamente no navegador — feedback inline + log. */
function alertarAdmin(titulo: string, mensagem: string) {
  console.log(`[AdminBanners] ${titulo}:`, mensagem);
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${titulo}\n\n${mensagem}`);
    return;
  }
  Alert.alert(titulo, mensagem);
}

function ordinalLabel(indice: number): string {
  const n = indice + 1;
  if (n === 1) return '1º';
  if (n === 2) return '2º';
  if (n === 3) return '3º';
  return `${n}º`;
}

type EsteiraProps = {
  lista: AppBanner[];
  onRemover: (id: string) => void;
  onMoverEsquerda: (indice: number) => void;
  onMoverDireita: (indice: number) => void;
  onEditar: (id: string, patch: Partial<AppBanner>) => void;
};

function EsteiraCarrossel({
  lista,
  onRemover,
  onMoverEsquerda,
  onMoverDireita,
  onEditar,
}: EsteiraProps) {
  if (lista.length === 0) {
    return (
      <View style={styles.esteiraVazia}>
        <Ionicons name="images-outline" size={32} color={adminC.textMuted} />
        <Text style={styles.esteiraVaziaTexto}>
          Nenhum slide neste carrossel. Use o botão abaixo para adicionar a primeira imagem.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.esteiraScroll}>
      {lista.map((slide, indice) => (
        <View key={slide.id} style={styles.miniaturaColuna}>
          <View style={styles.miniaturaWrap}>
            <Image source={{ uri: slide.image }} style={styles.miniaturaImagem} resizeMode="cover" />
            <View style={styles.miniaturaOverlay} />
            <View style={styles.miniaturaOrdem}>
              <Text style={styles.miniaturaOrdemTexto}>{ordinalLabel(indice)}</Text>
            </View>
            {!slide.active && (
              <View style={styles.miniaturaPausado}>
                <Text style={styles.miniaturaPausadoTexto}>Pausado</Text>
              </View>
            )}
            <Pressable
              style={styles.miniaturaExcluir}
              onPress={() => onRemover(slide.id)}
              accessibilityRole="button"
              accessibilityLabel={`Remover slide ${slide.title}`}>
              <Ionicons name="trash-outline" size={14} color="#FEE2E2" />
            </Pressable>
            <View style={styles.miniaturaLegenda}>
              <Text style={styles.miniaturaTitulo} numberOfLines={1}>
                {slide.title}
              </Text>
            </View>
          </View>

          <View style={styles.setasRow}>
            <Pressable
              style={[styles.setaBtn, indice === 0 && styles.setaBtnDisabled]}
              onPress={() => onMoverEsquerda(indice)}
              disabled={indice === 0}
              accessibilityLabel="Mover para a esquerda">
              <Text style={styles.setaTexto}>◀</Text>
            </Pressable>
            <Pressable
              style={[
                styles.setaBtn,
                indice === lista.length - 1 && styles.setaBtnDisabled,
              ]}
              onPress={() => onMoverDireita(indice)}
              disabled={indice === lista.length - 1}
              accessibilityLabel="Mover para a direita">
              <Text style={styles.setaTexto}>▶</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.slideInput}
            placeholder="Título do slide"
            placeholderTextColor={adminC.textMuted}
            value={slide.title}
            onChangeText={(title) => onEditar(slide.id, { title })}
          />
          <TextInput
            style={styles.slideInput}
            placeholder="Link (/leiloes...)"
            placeholderTextColor={adminC.textMuted}
            value={slide.link}
            onChangeText={(link) => onEditar(slide.id, { link })}
          />
        </View>
      ))}
    </ScrollView>
  );
}

type CarrosselBlocoProps = {
  titulo: string;
  descricao: string;
  rotuloUpload: string;
  lista: AppBanner[];
  selecionando: boolean;
  salvando: boolean;
  mensagemSucesso: string | null;
  mensagemErro: string | null;
  onListaChange: (lista: AppBanner[]) => void;
  onSelecionarImagem: () => void;
  onSalvar: () => void;
};

function CarrosselGerenciadorBloco({
  titulo,
  descricao,
  rotuloUpload,
  lista,
  selecionando,
  salvando,
  mensagemSucesso,
  mensagemErro,
  onListaChange,
  onSelecionarImagem,
  onSalvar,
}: CarrosselBlocoProps) {
  const ativos = lista.filter((s) => s.active).length;

  function remover(id: string) {
    onListaChange(lista.filter((s) => s.id !== id));
  }

  function editar(id: string, patch: Partial<AppBanner>) {
    onListaChange(lista.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function moverEsquerda(indice: number) {
    onListaChange(moverSlideEsquerda(lista, indice));
  }

  function moverDireita(indice: number) {
    onListaChange(moverSlideDireita(lista, indice));
  }

  return (
    <View style={adminStyles.card}>
      <Text style={styles.blocoTituloGrande}>{titulo}</Text>
      <Text style={styles.blocoDescricao}>{descricao}</Text>

      <View style={styles.contadorRow}>
        <Text style={styles.contadorTexto}>
          {lista.length} slide(s) · {ativos} ativo(s) no app
        </Text>
        <Text style={styles.contadorDica}>Use ◀ ▶ para reordenar</Text>
      </View>

      <EsteiraCarrossel
        lista={lista}
        onRemover={remover}
        onMoverEsquerda={moverEsquerda}
        onMoverDireita={moverDireita}
        onEditar={editar}
      />

      <Pressable
        style={[styles.btnUpload, selecionando && styles.btnUploadDisabled]}
        onPress={onSelecionarImagem}
        disabled={selecionando}>
        {selecionando ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Ionicons name="add-circle-outline" size={20} color="#FFF" />
            <Text style={styles.btnUploadTexto}>{rotuloUpload}</Text>
          </>
        )}
      </Pressable>

      {mensagemErro ? (
        <View style={styles.erroBox}>
          <Ionicons name="alert-circle" size={18} color={adminC.danger} />
          <Text style={styles.erroTexto}>{mensagemErro}</Text>
        </View>
      ) : null}

      {mensagemSucesso ? (
        <View style={styles.sucessoBox}>
          <Ionicons name="checkmark-circle" size={18} color={adminC.success} />
          <Text style={styles.sucessoTexto}>{mensagemSucesso}</Text>
        </View>
      ) : null}

      <Pressable
        style={[adminStyles.btnPrimary, styles.btnSalvar, salvando && styles.btnSalvarDisabled]}
        onPress={onSalvar}
        disabled={salvando}
        accessibilityRole="button"
        accessibilityLabel="Salvar carrossel no app">
        {salvando ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={adminStyles.btnPrimaryText}>Salvar carrossel no app</Text>
        )}
      </Pressable>
    </View>
  );
}

export default function AdminBanners() {
  const { temPermissao } = useAdminSession();
  const {
    carrosselInicio,
    carrosselLeiloes,
    publicarCarrosselInicio,
    publicarCarrosselLeiloes,
    usandoSupabase,
  } = useBanners();

  const [carrosselInicioRascunho, setCarrosselInicioRascunho] =
    useState<AppBanner[]>(carrosselInicio);
  const [carrosselLeiloesRascunho, setCarrosselLeiloesRascunho] =
    useState<AppBanner[]>(carrosselLeiloes);
  const [uploadDestino, setUploadDestino] = useState<'inicio' | 'leiloes' | null>(null);
  const [salvandoDestino, setSalvandoDestino] = useState<'inicio' | 'leiloes' | null>(
    null,
  );
  const [sucessoInicio, setSucessoInicio] = useState<string | null>(null);
  const [sucessoLeiloes, setSucessoLeiloes] = useState<string | null>(null);
  const [erroInicio, setErroInicio] = useState<string | null>(null);
  const [erroLeiloes, setErroLeiloes] = useState<string | null>(null);
  const [diagSupabase, setDiagSupabase] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function checarSupabase() {
      const avisos = getSupabaseConfigWarnings();
      if (!ativo) return;
      if (avisos.length > 0) {
        setDiagSupabase(avisos.join(' '));
        return;
      }
      const teste = await testarConexaoSupabase();
      if (!ativo) return;
      if (!teste.ok) setDiagSupabase(teste.motivo);
      else setDiagSupabase(null);
    }

    checarSupabase();
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    setCarrosselInicioRascunho(carrosselInicio);
  }, [carrosselInicio]);

  useEffect(() => {
    setCarrosselLeiloesRascunho(carrosselLeiloes);
  }, [carrosselLeiloes]);

  useEffect(() => {
    if (!sucessoInicio) return;
    const t = setTimeout(() => setSucessoInicio(null), 5000);
    return () => clearTimeout(t);
  }, [sucessoInicio]);

  useEffect(() => {
    if (!sucessoLeiloes) return;
    const t = setTimeout(() => setSucessoLeiloes(null), 5000);
    return () => clearTimeout(t);
  }, [sucessoLeiloes]);

  useEffect(() => {
    if (!erroInicio) return;
    const t = setTimeout(() => setErroInicio(null), 8000);
    return () => clearTimeout(t);
  }, [erroInicio]);

  useEffect(() => {
    if (!erroLeiloes) return;
    const t = setTimeout(() => setErroLeiloes(null), 8000);
    return () => clearTimeout(t);
  }, [erroLeiloes]);

  const adicionarImagem = useCallback(async (destino: 'inicio' | 'leiloes') => {
    if (Platform.OS !== 'web') {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria.');
        return;
      }
    }

    setUploadDestino(destino);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        const novo = criarSlideNovo(
          uri,
          destino === 'inicio' ? 'Novo slide — Início' : 'Novo slide — Leilões',
        );
        if (destino === 'inicio') {
          setCarrosselInicioRascunho((prev) => [...prev, novo]);
        } else {
          setCarrosselLeiloesRascunho((prev) => [...prev, novo]);
        }
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    } finally {
      setUploadDestino(null);
    }
  }, []);

  const salvarInicio = useCallback(async () => {
    setSucessoInicio(null);
    setErroInicio(null);
    setSalvandoDestino('inicio');
    try {
      const r = await publicarCarrosselInicio(carrosselInicioRascunho);
      if (!r.ok) {
        setErroInicio(r.erro);
        alertarAdmin('Não foi possível salvar', r.erro);
        return;
      }
      const msg = r.aviso
        ? `Salvo neste dispositivo. Aviso Supabase: ${r.aviso}`
        : usandoSupabase
          ? 'Carrossel da Home salvo no app e no Supabase.'
          : 'Carrossel da Home salvo neste dispositivo.';
      setSucessoInicio(msg);
    } catch (error) {
      const texto =
        error instanceof Error ? error.message : 'Erro inesperado ao salvar o carrossel da Home.';
      console.error('ERRO DO SUPABASE (AdminBanners salvar Início):', error);
      setErroInicio(texto);
      alertarAdmin('Erro inesperado', texto);
    } finally {
      setSalvandoDestino(null);
    }
  }, [carrosselInicioRascunho, publicarCarrosselInicio, usandoSupabase]);

  const salvarLeiloes = useCallback(async () => {
    setSucessoLeiloes(null);
    setErroLeiloes(null);
    setSalvandoDestino('leiloes');
    try {
      const r = await publicarCarrosselLeiloes(carrosselLeiloesRascunho);
      if (!r.ok) {
        setErroLeiloes(r.erro);
        alertarAdmin('Não foi possível salvar', r.erro);
        return;
      }
      const msg = r.aviso
        ? `Salvo neste dispositivo. Aviso Supabase: ${r.aviso}`
        : usandoSupabase
          ? 'Carrossel de Leilões salvo no app e no Supabase.'
          : 'Carrossel de Leilões salvo neste dispositivo.';
      setSucessoLeiloes(msg);
    } catch (error) {
      const texto =
        error instanceof Error
          ? error.message
          : 'Erro inesperado ao salvar o carrossel de Leilões.';
      console.error('ERRO DO SUPABASE (AdminBanners salvar Leilões):', error);
      setErroLeiloes(texto);
      alertarAdmin('Erro inesperado', texto);
    } finally {
      setSalvandoDestino(null);
    }
  }, [carrosselLeiloesRascunho, publicarCarrosselLeiloes, usandoSupabase]);

  if (!temPermissao('banners')) {
    return <Redirect href="/admin/equipe" />;
  }

  return (
    <View>
      <Text style={adminStyles.pageTitle}>Patrocínios e carrosséis</Text>
      <Text style={adminStyles.pageSubtitle}>
        Propaganda da plataforma (imagens estáticas, sem cronômetro de leilão). Diferente dos
        Destaques pagos pelo vendedor no cadastro — esses são geridos em Ganhos destaques.
      </Text>

      <View style={[adminStyles.alertInfo, diagSupabase && styles.alertWarn]}>
        <Text style={adminStyles.alertInfoText}>
          {diagSupabase
            ? `⚠️ Supabase: ${diagSupabase}`
            : usandoSupabase
              ? 'Conectado ao Supabase (tabela banners). Reordene com ◀ ▶ e salve cada bloco.'
              : 'Modo local — banners salvos neste navegador. Corrija o .env para sincronizar na nuvem.'}
        </Text>
      </View>

      <CarrosselGerenciadorBloco
        titulo="🏠 Patrocínio na Home (fallback)"
        descricao={
          'Campanhas no topo da página Início. Só aparece quando não há nenhum Destaque Plus ' +
          'ativo (leilão pago). Se houver Plus ao vivo, o hero da Home é o leilão com cronômetro — ' +
          'este carrossel fica oculto até não existir Plus.'
        }
        rotuloUpload="Adicionar slide — Home"
        lista={carrosselInicioRascunho}
        selecionando={uploadDestino === 'inicio'}
        onListaChange={setCarrosselInicioRascunho}
        onSelecionarImagem={() => adicionarImagem('inicio')}
        onSalvar={salvarInicio}
        salvando={salvandoDestino === 'inicio'}
        mensagemSucesso={sucessoInicio}
        mensagemErro={erroInicio}
      />

      <CarrosselGerenciadorBloco
        titulo="📋 Patrocínio na lista de Leilões"
        descricao={
          'Bloco “Patrocinado” no meio da aba Ao Vivo. Use para campanhas, parceiros ou avisos ' +
          'da plataforma. Não substitui Destaque / Destaque Plus do vendedor.'
        }
        rotuloUpload="Adicionar slide — Leilões"
        lista={carrosselLeiloesRascunho}
        selecionando={uploadDestino === 'leiloes'}
        onListaChange={setCarrosselLeiloesRascunho}
        onSelecionarImagem={() => adicionarImagem('leiloes')}
        onSalvar={salvarLeiloes}
        salvando={salvandoDestino === 'leiloes'}
        mensagemSucesso={sucessoLeiloes}
        mensagemErro={erroLeiloes}
      />
    </View>
  );
}

const MINIATURA_W = 200;
const MINIATURA_H = 112;

const styles = StyleSheet.create({
  blocoTituloGrande: {
    fontSize: 18,
    fontWeight: '800',
    color: adminC.textPrimary,
    marginBottom: 6,
  },
  blocoDescricao: {
    fontSize: 13,
    color: adminC.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  contadorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  contadorTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: adminC.textSecondary,
  },
  contadorDica: {
    fontSize: 11,
    color: adminC.textMuted,
    fontStyle: 'italic',
  },
  esteiraScroll: { gap: 14, paddingBottom: 8 },
  esteiraVazia: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: adminC.borderStrong,
    borderRadius: 12,
    backgroundColor: adminC.bg,
    marginBottom: 16,
  },
  esteiraVaziaTexto: {
    fontSize: 13,
    color: adminC.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  miniaturaColuna: { width: MINIATURA_W },
  miniaturaWrap: {
    width: MINIATURA_W,
    height: MINIATURA_H,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: adminC.bg,
    borderWidth: 1,
    borderColor: adminC.border,
    position: 'relative',
  },
  miniaturaImagem: { width: '100%', height: '100%' },
  miniaturaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  miniaturaOrdem: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  miniaturaOrdemTexto: { fontSize: 11, fontWeight: '800', color: '#FFF' },
  miniaturaPausado: {
    position: 'absolute',
    top: 8,
    right: 40,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniaturaPausadoTexto: { fontSize: 9, fontWeight: '700', color: '#FDE68A' },
  miniaturaExcluir: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: '#991B1B',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as const,
  },
  miniaturaLegenda: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  miniaturaTitulo: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  setasRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  setaBtn: {
    width: 36,
    height: 32,
    borderRadius: 8,
    backgroundColor: adminC.bg,
    borderWidth: 1,
    borderColor: adminC.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as const,
  },
  setaBtnDisabled: { opacity: 0.35 },
  setaTexto: { fontSize: 14, color: adminC.accentBright, fontWeight: '700' },
  slideInput: {
    backgroundColor: adminC.bg,
    borderWidth: 1,
    borderColor: adminC.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: adminC.textPrimary,
    marginBottom: 6,
  },
  btnUpload: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: adminC.accent,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 16,
    marginBottom: 12,
    cursor: 'pointer' as const,
  },
  btnUploadDisabled: { opacity: 0.65 },
  btnUploadTexto: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  alertWarn: {
    borderColor: adminC.warning,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  btnSalvar: {
    marginTop: 4,
    cursor: 'pointer' as const,
  },
  btnSalvarDisabled: { opacity: 0.7 },
  erroBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#450A0A',
    borderWidth: 1,
    borderColor: adminC.danger,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  erroTexto: {
    flex: 1,
    fontSize: 13,
    color: '#FECACA',
    fontWeight: '600',
    lineHeight: 18,
  },
  sucessoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#064E3B',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  sucessoTexto: {
    flex: 1,
    fontSize: 13,
    color: '#A7F3D0',
    fontWeight: '600',
    lineHeight: 18,
  },
});
