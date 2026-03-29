export type Point = {
  x: number; // in feet
  y: number; // in feet
};

export type Wall = {
  id: string;
  type: 'wall';
  points: Point[]; // chain of connected points
};

export type Box = {
  id: string;
  type: 'box';
  x: number; // in feet
  y: number; // in feet
  width: number; // in feet
  height: number; // in feet
  rotation: number; // in degrees
  label?: string;
};

export type Element = Wall | Box;

export type ToolType = 'select' | 'wall' | 'box' | 'measure';

export type FloorPlan = {
  id: string;
  version: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  elements: Element[];
  /** Set when the plan has been synced to the cloud. undefined = local-only. */
  ownerId?: string;
  /** When true, any authenticated user who knows the plan ID can view and edit it. */
  isPublic?: boolean;
};
