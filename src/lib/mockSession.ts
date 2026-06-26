import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MockUser } from '@/src/mocks/data';

const MOCK_SESSION_KEY = '@levou/mock_session_v1';

let currentUser: MockUser | null = null;

export function setMockSession(user: MockUser): void {
  currentUser = user;
  void AsyncStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
}

export function getMockSession(): MockUser | null {
  return currentUser;
}

export function clearMockSession(): void {
  currentUser = null;
  void AsyncStorage.removeItem(MOCK_SESSION_KEY);
}

export async function restoreMockSession(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(MOCK_SESSION_KEY);
    if (!raw) return;
    currentUser = JSON.parse(raw) as MockUser;
  } catch {
    currentUser = null;
    await AsyncStorage.removeItem(MOCK_SESSION_KEY);
  }
}
