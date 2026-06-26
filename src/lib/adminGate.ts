import AsyncStorage from '@react-native-async-storage/async-storage';

const ADMIN_GATE_KEY = '@aetherion/admin_gate_ok';

export async function marcarAdminGateOk(): Promise<void> {
  await AsyncStorage.setItem(ADMIN_GATE_KEY, '1');
}

export async function limparAdminGate(): Promise<void> {
  await AsyncStorage.removeItem(ADMIN_GATE_KEY);
}

export async function adminGateEstaOk(): Promise<boolean> {
  const v = await AsyncStorage.getItem(ADMIN_GATE_KEY);
  return v === '1';
}
