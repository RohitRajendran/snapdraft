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
  length: number; // in feet
  rotation: number; // in degrees
  label?: string;
};

export type Opening = {
  id: string;
  type: 'door' | 'window';
  wallId: string;
  segmentIndex: number;
  offset: number; // feet from segment start to near edge of gap
  width: number; // feet
  facing: 'left' | 'right';
  hinge?: 'start' | 'end'; // which end of the gap the hinge pin is on; undefined = 'start'
};

export type Element = Wall | Box | Opening;

export type ToolType = 'select' | 'wall' | 'box' | 'measure' | 'pan' | 'door' | 'window';

export type UnitSystem = 'imperial' | 'metric';

export type FloorPlan = {
  id: string;
  version: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  elements: Element[];
};
