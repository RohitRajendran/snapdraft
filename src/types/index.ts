export type Point = {
  x: number; // in feet
  y: number; // in feet
};

export type Wall = {
  id: string;
  type: 'wall';
  points: Point[]; // chain of connected points
  thickness: number; // in feet, default 0.5 (6 inches)
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

export type ToolType = 'select' | 'wall' | 'box';

export type FloorPlan = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  elements: Element[];
};
