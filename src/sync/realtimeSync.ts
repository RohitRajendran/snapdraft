import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Element } from '../types';
import { supabase } from '../lib/supabase';

export type PresenceUser = {
  userId: string;
  email: string;
  /** World-space cursor position in feet, or null when off-canvas. */
  cursor: { x: number; y: number } | null;
  /** Deterministic color derived from userId. */
  color: string;
};

const PRESENCE_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#8b5cf6',
  '#ec4899',
];

function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

type PresencePayload = {
  userId: string;
  email: string;
  cursor: { x: number; y: number } | null;
};

type RealtimeHandle = {
  /** Stop listening and leave the Supabase channel. */
  unsubscribe: () => void;
  /** Broadcast the local user's cursor position to collaborators. */
  trackCursor: (cursor: { x: number; y: number } | null) => void;
};

/**
 * Subscribe to real-time changes for a plan.
 *
 * - `onElements` fires whenever another client updates the plan's elements.
 * - `onPresence` fires whenever the set of connected collaborators changes.
 *
 * Returns a handle to unsubscribe and to broadcast cursor position.
 */
export function subscribeToRealtimePlan(
  planId: string,
  userId: string,
  email: string,
  onElements: (elements: Element[], remoteUpdatedAt: string) => void,
  onPresence: (users: PresenceUser[]) => void,
): RealtimeHandle {
  if (!supabase) {
    return { unsubscribe: () => {}, trackCursor: () => {} };
  }

  const channel: RealtimeChannel = supabase
    .channel(`plan:${planId}`, { config: { presence: { key: userId } } })
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'floor_plans',
        filter: `id=eq.${planId}`,
      },
      (payload) => {
        const row = payload.new as { elements: unknown; updated_at: string };
        onElements(row.elements as Element[], row.updated_at);
      },
    )
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresencePayload>();
      const users: PresenceUser[] = Object.values(state)
        .flat()
        .filter((u) => u.userId !== userId) // exclude self
        .map((u) => ({ ...u, color: colorForUser(u.userId) }));
      onPresence(users);
    })
    .subscribe();

  // Announce presence immediately.
  channel.track({ userId, email, cursor: null } satisfies PresencePayload);

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
    trackCursor: (cursor) => {
      channel.track({ userId, email, cursor } satisfies PresencePayload);
    },
  };
}
