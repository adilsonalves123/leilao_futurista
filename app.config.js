try {
  require('dotenv').config();
} catch {
  /* dotenv opcional — Expo também carrega .env ao iniciar */
}

const appJson = require('./app.json');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  '';
const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '';

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      supabaseUrl,
      supabaseKey,
      eas: {
        projectId: easProjectId || undefined,
      },
    },
  },
};
