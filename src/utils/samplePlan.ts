import { nanoid } from 'nanoid';
import type { Element } from '../types';

/**
 * A 15 × 11 ft bedroom with four separate wall segments, a window on the left wall,
 * and a door on the bottom wall using the Opening element system.
 */
export function createSampleElements(): Element[] {
  const leftWallId = nanoid();
  const bottomWallId = nanoid();
  const rightWallId = nanoid();
  const topWallId = nanoid();

  return [
    {
      id: leftWallId,
      type: 'wall',
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 11 },
      ],
    },
    {
      id: bottomWallId,
      type: 'wall',
      points: [
        { x: 0, y: 11 },
        { x: 15, y: 11 },
      ],
    },
    {
      id: rightWallId,
      type: 'wall',
      points: [
        { x: 15, y: 11 },
        { x: 15, y: 0 },
      ],
    },
    {
      id: topWallId,
      type: 'wall',
      points: [
        { x: 15, y: 0 },
        { x: 0, y: 0 },
      ],
    },
    {
      id: nanoid(),
      type: 'window',
      wallId: leftWallId,
      segmentIndex: 0,
      offset: 3.7184300341296934,
      width: 3,
      facing: 'left',
      hinge: 'start',
    },
    {
      id: nanoid(),
      type: 'door',
      wallId: bottomWallId,
      segmentIndex: 0,
      offset: 6.02734375,
      width: 3,
      facing: 'left',
      hinge: 'end',
    },
    {
      id: nanoid(),
      type: 'box',
      x: 4.7972742759795555,
      y: 0.05025553662691706,
      width: 5,
      height: 6.666666666666667,
      rotation: 0,
      label: 'Bed',
    },
    {
      id: nanoid(),
      type: 'box',
      x: 3.2061328790459984,
      y: 0.050255536626916175,
      width: 1.5,
      height: 2,
      rotation: 0,
      label: 'Nightstand',
    },
    {
      id: nanoid(),
      type: 'box',
      x: 9.907155025553664,
      y: 0.05025553662691662,
      width: 1.5,
      height: 2,
      rotation: 0,
      label: 'Nightstand',
    },
    {
      id: nanoid(),
      type: 'box',
      x: 11.702246047758319,
      y: 7.727032228430556,
      width: 5,
      height: 1.5,
      rotation: -90,
      label: 'Dresser',
    },
    {
      id: nanoid(),
      type: 'box',
      x: 0.48205429353861584,
      y: 8.020687128977679,
      width: 2.5,
      height: 2.5,
      rotation: -25,
      label: 'Armchair',
    },
  ];
}
