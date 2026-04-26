import { nanoid } from 'nanoid';
import type { Element } from '../types';

/**
 * A 14 × 10 ft bedroom with a 3 ft door opening on the south wall.
 * The perimeter is one wall chain starting and ending at each side of the
 * door gap, so the opening is a natural break in the chain.
 */
export function createSampleElements(): Element[] {
  return [
    // Perimeter — single chain with 3 ft door gap on south wall (x = 3 to x = 6)
    {
      id: nanoid(),
      type: 'wall',
      points: [
        { x: 3, y: 10 },
        { x: 0, y: 10 },
        { x: 0, y: 0 },
        { x: 14, y: 0 },
        { x: 14, y: 10 },
        { x: 6, y: 10 },
      ],
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
      x: 8.983816013628616,
      y: 8.459114139693359,
      width: 5,
      height: 1.5,
      rotation: 0,
      label: 'Dresser',
    },
    {
      id: nanoid(),
      type: 'box',
      x: 0.5161839863713809,
      y: 6.877342419080069,
      width: 2.5,
      height: 2.5,
      rotation: -25,
      label: 'Armchair',
    },
  ];
}
