import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationFeedEvent } from '@/src/types/notifications';

const FEED_KEY = '@aetherion/notification_feed';
const READ_KEY = '@aetherion/notification_read_ids';
const MAX_EVENTS = 80;

export async function appendNotificationFeedEvent(
  event: Omit<NotificationFeedEvent, 'id' | 'createdAtMs'> & {
    id?: string;
    createdAtMs?: number;
  },
): Promise<void> {
  const entry: NotificationFeedEvent = {
    ...event,
    id: event.id ?? `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAtMs: event.createdAtMs ?? Date.now(),
  };

  try {
    const raw = await AsyncStorage.getItem(FEED_KEY);
    let lista: NotificationFeedEvent[] = [];
    if (raw) {
      try {
        lista = JSON.parse(raw) as NotificationFeedEvent[];
      } catch {
        lista = [];
      }
    }
    await AsyncStorage.setItem(FEED_KEY, JSON.stringify([entry, ...lista].slice(0, MAX_EVENTS)));
  } catch {
    /* ignore */
  }
}

export async function listarNotificationFeed(): Promise<NotificationFeedEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(FEED_KEY);
    if (!raw) return [];
    const lista = JSON.parse(raw) as NotificationFeedEvent[];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export async function obterIdsNotificacoesLidas(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as string[];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

export async function marcarNotificacaoComoLida(id: string): Promise<void> {
  try {
    const lidos = await obterIdsNotificacoesLidas();
    lidos.add(id);
    await AsyncStorage.setItem(READ_KEY, JSON.stringify([...lidos]));
  } catch {
    /* ignore */
  }
}

export async function marcarTodasNotificacoesComoLidas(ids: string[]): Promise<void> {
  try {
    const lidos = await obterIdsNotificacoesLidas();
    ids.forEach((id) => lidos.add(id));
    await AsyncStorage.setItem(READ_KEY, JSON.stringify([...lidos]));
  } catch {
    /* ignore */
  }
}
