import type Konva from 'konva';

export function boxMaskId(boxId: string) {
  return `sd-mask-${boxId}`;
}

/** Live drags move Konva nodes directly, so a box's grid mask has to move with its node. */
export function moveBoxMask(stage: Konva.Stage, boxId: string, x: number, y: number) {
  stage.findOne(`#${boxMaskId(boxId)}`)?.position({ x, y });
}
