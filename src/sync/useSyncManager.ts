import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore/useAuthStore';
import { useFloorplanStore } from '../store/useFloorplanStore/useFloorplanStore';
import { uploadPlan, downloadPlans, deletePlanFromCloud } from './planSync';
import { subscribeToRealtimePlan, type PresenceUser } from './realtimeSync';
import { isSyncEnabled } from '../lib/supabase';

export type { PresenceUser };

/**
 * Mounts the sync layer between the floorplan store and Supabase.
 *
 * - On login: downloads cloud plans, merges with local ones, and uploads any
 *   local plans that aren't in the cloud yet.
 * - While logged in: uploads each plan whenever it changes locally.
 * - Subscribes to Supabase Realtime for the active plan so edits on other
 *   devices/tabs appear immediately.
 * - On logout: clears cloud-origin plans from local storage.
 *
 * Call this hook once at the app root. It is a no-op when Supabase is not
 * configured.
 */
export function useSyncManager(onPresenceChange?: (users: PresenceUser[]) => void) {
  const user = useAuthStore((s) => s.user);
  const { plans, activeId, applyRemoteElements, mergePlans } = useFloorplanStore();

  // Track updatedAt per plan so we only upload plans that actually changed.
  const prevUpdatedRef = useRef<Map<string, string>>(new Map());
  // Plans applied from remote are tagged here so we don't re-upload them.
  const remoteTagRef = useRef<Map<string, string>>(new Map()); // planId -> updatedAt
  const realtimeRef = useRef<ReturnType<typeof subscribeToRealtimePlan> | null>(null);

  // ── Initial sync when user logs in ───────────────────────────────────────
  useEffect(() => {
    if (!isSyncEnabled) return;

    if (!user) {
      // Reset the tracking map on logout so we start fresh on next login.
      prevUpdatedRef.current = new Map();
      return;
    }

    async function initialSync() {
      const currentPlans = useFloorplanStore.getState().plans;
      const cloudPlans = await downloadPlans(user!.id);

      const localById = new Map(currentPlans.map((p) => [p.id, p]));
      const cloudById = new Map(cloudPlans.map((p) => [p.id, p]));

      // Plans in cloud but not local → add them.
      const incoming = cloudPlans.filter((p) => !localById.has(p.id));
      if (incoming.length > 0) mergePlans(incoming);

      // Plans in both → keep whichever has a newer updatedAt.
      for (const cloudPlan of cloudPlans) {
        const local = localById.get(cloudPlan.id);
        if (local && cloudPlan.updatedAt > local.updatedAt) {
          remoteTagRef.current.set(cloudPlan.id, cloudPlan.updatedAt);
          applyRemoteElements(cloudPlan.id, cloudPlan.elements, cloudPlan.updatedAt);
        }
      }

      // Plans local but not in cloud → upload them.
      for (const local of currentPlans) {
        if (!cloudById.has(local.id)) {
          uploadPlan({ ...local, ownerId: user!.id }, user!.id);
        }
      }

      // Seed the tracking map so the upload effect starts clean.
      const merged = useFloorplanStore.getState().plans;
      prevUpdatedRef.current = new Map(merged.map((p) => [p.id, p.updatedAt]));
    }

    initialSync();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Upload plans that changed locally ────────────────────────────────────
  useEffect(() => {
    if (!isSyncEnabled || !user) return;

    for (const plan of plans) {
      const prev = prevUpdatedRef.current.get(plan.id);
      if (prev === plan.updatedAt) continue; // unchanged

      // Skip if this exact updatedAt was applied from remote (avoid echo upload).
      const remoteTag = remoteTagRef.current.get(plan.id);
      if (remoteTag === plan.updatedAt) {
        remoteTagRef.current.delete(plan.id);
        prevUpdatedRef.current.set(plan.id, plan.updatedAt);
        continue;
      }

      uploadPlan({ ...plan, ownerId: user.id }, user.id).catch(console.error);
      prevUpdatedRef.current.set(plan.id, plan.updatedAt);
    }

    // Handle deletions: plans in prev that are no longer in current.
    const currentIds = new Set(plans.map((p) => p.id));
    for (const [id] of prevUpdatedRef.current) {
      if (!currentIds.has(id)) {
        deletePlanFromCloud(id).catch(console.error);
        prevUpdatedRef.current.delete(id);
      }
    }
  }, [plans, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime subscription for active plan ────────────────────────────────
  useEffect(() => {
    if (realtimeRef.current) {
      realtimeRef.current.unsubscribe();
      realtimeRef.current = null;
    }

    if (!isSyncEnabled || !user || !activeId) return;

    const handle = subscribeToRealtimePlan(
      activeId,
      user.id,
      user.email ?? '',
      (elements, remoteUpdatedAt) => {
        // Only apply if the remote version is actually newer.
        const local = useFloorplanStore.getState().plans.find((p) => p.id === activeId);
        if (!local || remoteUpdatedAt <= local.updatedAt) return;

        remoteTagRef.current.set(activeId, remoteUpdatedAt);
        applyRemoteElements(activeId, elements, remoteUpdatedAt);
      },
      (users) => {
        onPresenceChange?.(users);
      },
    );

    realtimeRef.current = handle;

    return () => {
      handle.unsubscribe();
      realtimeRef.current = null;
    };
  }, [user?.id, activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    /** Broadcast the local user's current cursor position to collaborators. */
    trackCursor: (cursor: { x: number; y: number } | null) => {
      realtimeRef.current?.trackCursor(cursor);
    },
  };
}
