import type { FloorPlan } from '../types';
import { supabase } from '../lib/supabase';

/** Shape of a row in the `floor_plans` Supabase table. */
interface CloudRow {
  id: string;
  owner_id: string;
  version: number;
  name: string;
  elements: unknown;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

function rowToLocal(row: CloudRow): FloorPlan {
  return {
    id: row.id,
    version: row.version,
    name: row.name,
    elements: row.elements as FloorPlan['elements'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerId: row.owner_id,
    isPublic: row.is_public,
  };
}

/** Upsert a plan to the cloud. No-op if Supabase is not configured. */
export async function uploadPlan(plan: FloorPlan, userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('floor_plans').upsert({
    id: plan.id,
    owner_id: userId,
    version: plan.version,
    name: plan.name,
    elements: plan.elements,
    is_public: plan.isPublic ?? false,
    created_at: plan.createdAt,
    updated_at: plan.updatedAt,
  });
}

/** Fetch all plans owned by the given user. */
export async function downloadPlans(userId: string): Promise<FloorPlan[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('floor_plans')
    .select('*')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  return (data as CloudRow[]).map(rowToLocal);
}

/** Fetch a single plan by ID (works for public plans too). */
export async function fetchPlanById(id: string): Promise<FloorPlan | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('floor_plans')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return rowToLocal(data as CloudRow);
}

/** Delete a plan from the cloud. No-op if Supabase is not configured. */
export async function deletePlanFromCloud(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('floor_plans').delete().eq('id', id);
}

/** Toggle the `is_public` flag for a plan. */
export async function setPlanPublic(id: string, isPublic: boolean): Promise<void> {
  if (!supabase) return;
  await supabase.from('floor_plans').update({ is_public: isPublic }).eq('id', id);
}
