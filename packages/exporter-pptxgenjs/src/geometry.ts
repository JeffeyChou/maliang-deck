import type { CanvasSize } from '@maliang-deck/schema';
import type { PptxGenJsBaseElement } from './types.js';

const DEFAULT_SLIDE_HEIGHT_IN = 7.5;

export type CanvasGeometry = {
  canvas: CanvasSize;
  widthIn: number;
  heightIn: number;
  scaleX: number;
  scaleY: number;
  layoutName: string;
};

export type ElementPosition = {
  x: number;
  y: number;
  w?: number;
  h?: number;
};

export function createCanvasGeometry(canvas: CanvasSize, slideHeightIn = DEFAULT_SLIDE_HEIGHT_IN): CanvasGeometry {
  const heightIn = slideHeightIn;
  const widthIn = slideHeightIn * (canvas.width / canvas.height);
  return {
    canvas,
    widthIn,
    heightIn,
    scaleX: widthIn / canvas.width,
    scaleY: heightIn / canvas.height,
    layoutName: `MALIANG_DECK_${canvas.width}x${canvas.height}`,
  };
}

export function toSlideX(value: number, geometry: CanvasGeometry): number {
  return roundInches(value * geometry.scaleX);
}

export function toSlideY(value: number, geometry: CanvasGeometry): number {
  return roundInches(value * geometry.scaleY);
}

export function toSlideWidth(value: number, geometry: CanvasGeometry): number {
  return roundInches(value * geometry.scaleX);
}

export function toSlideHeight(value: number, geometry: CanvasGeometry): number {
  return roundInches(value * geometry.scaleY);
}

export function elementPosition(element: PptxGenJsBaseElement, geometry: CanvasGeometry): ElementPosition {
  return {
    x: toSlideX(element.x, geometry),
    y: toSlideY(element.y, geometry),
    ...(element.width == null ? {} : { w: toSlideWidth(element.width, geometry) }),
    ...(element.height == null ? {} : { h: toSlideHeight(element.height, geometry) }),
  };
}

export function offsetElementPosition(
  element: PptxGenJsBaseElement,
  geometry: CanvasGeometry,
  offset = { x: 0, y: 0 },
): ElementPosition {
  return elementPosition(
    {
      ...element,
      x: element.x + offset.x,
      y: element.y + offset.y,
    },
    geometry,
  );
}

function roundInches(value: number): number {
  return Number(value.toFixed(4));
}
