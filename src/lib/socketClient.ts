/**
 * socketClient.ts
 * WebSocket wrapper that replaces Supabase Realtime (postgres_changes / presence).
 *
 * Your Express backend should use `socket.io` or `ws`.
 * This client uses the native browser WebSocket API (no extra deps).
 *
 * Usage:
 *   import { createChannel, removeChannel } from '@/lib/socketClient';
 *
 *   const unsub = createChannel('orders', (event) => {
 *     if (event.type === 'UPDATE') { ... }
 *   });
 *   // cleanup:
 *   unsub();
 */

import { tokenStorage } from "./apiClient";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:4000";

type EventType = "INSERT" | "UPDATE" | "DELETE" | "PRESENCE";

export interface RealtimeEvent<T = Record<string, unknown>> {
  type: EventType;
  table?: string;
  new?: T;
  old?: T;
  /** For presence events */
  presenceData?: T;
}

type ChannelHandler<T = Record<string, unknown>> = (
  event: RealtimeEvent<T>,
) => void;

interface Subscription {
  channel: string;
  filter?: string;
  handler: ChannelHandler;
}

// Singleton WebSocket

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const subscriptions: Map<string, Subscription> = new Map();

function getSocket(): WebSocket {
  if (socket && socket.readyState === WebSocket.OPEN) return socket;

  const token = tokenStorage.get();
  const url = token ? `${WS_URL}?token=${token}` : WS_URL;

  socket = new WebSocket(url);

  socket.onopen = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    // Re-subscribe all channels after reconnect
    subscriptions.forEach((sub) => {
      sendSubscribeMessage(sub.channel, sub.filter);
    });
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string) as {
        channel: string;
        filter?: string;
        payload: RealtimeEvent;
      };

      subscriptions.forEach((sub, key) => {
        if (sub.channel === msg.channel) {
          if (!sub.filter || msg.filter === sub.filter) {
            sub.handler(msg.payload);
          }
        }
      });
    } catch (err) {
      console.error("[socketClient] Failed to parse message", err);
    }
  };

  socket.onclose = () => {
    reconnectTimer = setTimeout(() => getSocket(), 3000);
  };

  socket.onerror = (err) => {
    console.error("[socketClient] WebSocket error", err);
  };

  return socket;
}

function sendSubscribeMessage(channel: string, filter?: string) {
  const sock = getSocket();
  if (sock.readyState === WebSocket.OPEN) {
    sock.send(JSON.stringify({ action: "subscribe", channel, filter }));
  }
}

function sendUnsubscribeMessage(channel: string, filter?: string) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: "unsubscribe", channel, filter }));
  }
}

// Public API

/**
 * Subscribe to a named channel (maps to a DB table or custom event stream).
 *
 * @param channel  e.g. 'orders', 'haggles', `rider-location-${riderId}`
 * @param handler  Called with each incoming RealtimeEvent
 * @param filter   Optional server-side filter e.g. `buyer_id=eq.${userId}`
 * @returns        Unsubscribe function — call in your useEffect cleanup
 */
export function createChannel<T = Record<string, unknown>>(
  channel: string,
  handler: ChannelHandler<T>,
  filter?: string,
): () => void {
  const key = filter ? `${channel}:${filter}` : channel;

  subscriptions.set(key, {
    channel,
    filter,
    handler: handler as ChannelHandler,
  });

  sendSubscribeMessage(channel, filter);

  return () => removeChannel(channel, filter);
}

/**
 * Unsubscribe from a channel.
 */
export function removeChannel(channel: string, filter?: string) {
  const key = filter ? `${channel}:${filter}` : channel;
  subscriptions.delete(key);
  sendUnsubscribeMessage(channel, filter);
}

/**
 * Send a presence track update (replaces supabase channel.track()).
 */
export function trackPresence(channel: string, data: Record<string, unknown>) {
  const sock = getSocket();
  if (sock.readyState === WebSocket.OPEN) {
    sock.send(JSON.stringify({ action: "presence", channel, data }));
  }
}

// Eagerly connect on import
getSocket();
