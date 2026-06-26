import { StyleSheet, Text, View } from 'react-native';
import { lightColors } from '@/src/theme/lightTokens';

export function RegraDetalhesTexto({ texto }: { texto: string }) {
  const blocos = texto.split('\n\n').filter(Boolean);

  return (
    <View style={styles.detalhes}>
      {blocos.map((bloco, index) => {
        const linhas = bloco.split('\n').filter(Boolean);
        const ehLista = linhas.every((l) => l.trim().startsWith('•'));

        if (ehLista) {
          return (
            <View key={`lista-${index}`} style={styles.lista}>
              {linhas.map((linha) => {
                const conteudo = linha.replace(/^•\s*/, '').trim();
                const [rotulo, ...resto] = conteudo.split(':');
                const temRotulo = resto.length > 0 && rotulo.length < 48;

                return (
                  <View key={linha} style={styles.itemLista}>
                    <View style={styles.bullet} />
                    <Text style={styles.textoItem}>
                      {temRotulo ? (
                        <>
                          <Text style={styles.rotulo}>{rotulo.trim()}: </Text>
                          {resto.join(':').trim()}
                        </>
                      ) : (
                        conteudo
                      )}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        }

        return (
          <Text key={`p-${index}`} style={styles.paragrafo}>
            {bloco}
          </Text>
        );
      })}
    </View>
  );
}

export const regraHelpStyles = StyleSheet.create({
  intro: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
    marginBottom: 16,
  },
  link: {
    color: lightColors.accent,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 16,
    marginBottom: 12,
  },
  titulo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1625',
    marginBottom: 12,
    lineHeight: 22,
  },
  detalhes: { gap: 10 },
  paragrafo: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 21,
  },
  lista: { gap: 10 },
  itemLista: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: lightColors.accent,
    marginTop: 7,
  },
  textoItem: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 21,
  },
  rotulo: {
    fontWeight: '700',
    color: '#1A1625',
  },
  rodape: {
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F4F0FF',
    borderWidth: 1,
    borderColor: '#E9E0FF',
  },
  rodapeText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    textAlign: 'center',
  },
});

const styles = regraHelpStyles;
