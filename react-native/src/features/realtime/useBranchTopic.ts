import { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import { API_BASE_URL } from '../../config/env';
import { getAccessToken } from '../../api/client';

/**
 * Subscribes to a branch topic over STOMP and calls `onEvent` for each notification. Events are signals to
 * re-fetch from the REST API; they are never treated as the authoritative state. Polling in the screens stays
 * as the fallback when the socket is down.
 *
 * Limitation: the socket authenticates with the access token held when it connects. After that token expires,
 * the server refuses reconnects until the screen re-mounts; polling keeps data fresh in the meantime.
 */
export function useBranchTopic(branchId: string | undefined, topic: 'orders' | 'kitchen', onEvent: () => void) {
  useEffect(() => {
    const token = getAccessToken();
    if (!branchId || !token) return;

    const brokerURL = `${API_BASE_URL.replace(/^http/, 'ws')}/ws`;
    const client = new Client({
      brokerURL,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5_000,
      onConnect: () => {
        client.subscribe(`/topic/branches/${branchId}/${topic}`, () => onEvent());
      },
    });
    client.activate();
    return () => {
      void client.deactivate();
    };
  }, [branchId, topic, onEvent]);
}
