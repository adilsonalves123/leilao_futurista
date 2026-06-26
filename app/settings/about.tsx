import { StyleSheet, Text, View } from 'react-native';

import { SubScreenLayout } from '@/src/components/SubScreenLayout';

import { LevouLogo } from '@/src/components/LevouLogo';

import { useTranslation } from '@/src/i18n/useTranslation';

import { lightColors } from '@/src/theme/lightTokens';



const APP_VERSION = '1.0.0';



export default function AboutScreen() {

  const { t } = useTranslation();



  const secoes = [

    { title: t('about.whatTitle'), body: t('about.whatBody') },

    { title: t('about.missionTitle'), body: t('about.missionBody') },

    { title: t('about.howTitle'), body: t('about.howBody') },

    { title: t('about.trustTitle'), body: t('about.trustBody') },

    { title: t('about.securityTitle'), body: t('about.securityBody') },

  ];



  return (

    <SubScreenLayout title={t('about.title')} subtitle={t('about.subtitle')}>

      <View style={styles.hero}>

        <LevouLogo size="about" style={styles.logo} />

        <Text style={styles.tagline}>{t('about.tagline')}</Text>

        <View style={styles.versionPill}>

          <Text style={styles.versionText}>

            {t('about.version')} {APP_VERSION}

          </Text>

        </View>

      </View>



      {secoes.map((secao) => (

        <View key={secao.title} style={styles.section}>

          <Text style={styles.sectionTitle}>{secao.title}</Text>

          <Text style={styles.sectionBody}>{secao.body}</Text>

        </View>

      ))}



      <Text style={styles.footer}>{t('about.footer')}</Text>

    </SubScreenLayout>

  );

}



const styles = StyleSheet.create({

  hero: {

    alignItems: 'center',

    backgroundColor: '#FFFFFF',

    borderRadius: 16,

    borderWidth: 1,

    borderColor: '#F3F4F6',

    paddingVertical: 28,

    paddingHorizontal: 20,

    marginBottom: 20,

  },

  logo: { alignSelf: 'center', marginBottom: 12 },

  tagline: {

    fontSize: 14,

    color: '#6B7280',

    textAlign: 'center',

    marginTop: 6,

    lineHeight: 20,

    paddingHorizontal: 8,

  },

  versionPill: {

    marginTop: 14,

    backgroundColor: '#F4F0FF',

    paddingHorizontal: 12,

    paddingVertical: 5,

    borderRadius: 999,

  },

  versionText: { fontSize: 12, fontWeight: '600', color: lightColors.accent },

  section: {

    backgroundColor: '#FFFFFF',

    borderRadius: 14,

    borderWidth: 1,

    borderColor: '#F3F4F6',

    padding: 16,

    marginBottom: 12,

  },

  sectionTitle: {

    fontSize: 15,

    fontWeight: '700',

    color: '#1A1625',

    marginBottom: 8,

  },

  sectionBody: {

    fontSize: 14,

    color: '#5B5675',

    lineHeight: 21,

  },

  footer: {

    fontSize: 12,

    color: '#9CA3AF',

    textAlign: 'center',

    lineHeight: 18,

    marginTop: 8,

    paddingHorizontal: 8,

  },

});


