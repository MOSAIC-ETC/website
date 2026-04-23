import type { Colormap } from "./types";

export const colormaps: Record<string, Colormap> = {
  viridis: [
    [68, 1, 84],
    [72, 35, 116],
    [64, 67, 135],
    [52, 94, 141],
    [41, 120, 142],
    [32, 144, 140],
    [34, 167, 132],
    [68, 190, 112],
    [121, 209, 81],
    [189, 222, 38],
    [253, 231, 37],
  ],
  plasma: [
    [13, 8, 135],
    [75, 3, 161],
    [125, 3, 168],
    [168, 34, 150],
    [203, 70, 121],
    [229, 107, 93],
    [248, 148, 65],
    [253, 195, 40],
    [240, 249, 33],
  ],
  inferno: [
    [0, 0, 4],
    [31, 12, 72],
    [85, 15, 109],
    [136, 34, 106],
    [186, 54, 85],
    [227, 89, 51],
    [249, 140, 10],
    [252, 201, 27],
    [240, 249, 33],
  ],
  cividis: [
    [0, 34, 78],
    [24, 60, 111],
    [53, 88, 140],
    [87, 117, 144],
    [126, 146, 141],
    [168, 175, 130],
    [214, 204, 111],
    [254, 232, 56],
  ],
  coolwarm: [
    [59, 76, 192],
    [103, 136, 238],
    [159, 186, 255],
    [210, 224, 255],
    [242, 242, 242],
    [255, 208, 187],
    [244, 142, 112],
    [207, 67, 61],
    [180, 4, 38],
  ],
  turbo: [
    [35, 23, 27],
    [70, 98, 216],
    [50, 182, 230],
    [42, 236, 151],
    [139, 240, 66],
    [217, 210, 50],
    [248, 131, 34],
    [215, 35, 35],
    [144, 12, 0],
  ],
  gray: [
    [0, 0, 0],
    [32, 32, 32],
    [64, 64, 64],
    [96, 96, 96],
    [128, 128, 128],
    [160, 160, 160],
    [192, 192, 192],
    [224, 224, 224],
    [255, 255, 255],
  ],
};

export function interpolateColormap(t: number, colormap: Colormap): string {
  const clampedT = Math.max(0, Math.min(1, t));
  const idx = clampedT * (colormap.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  const frac = idx - lower;

  const r = Math.round(colormap[lower][0] * (1 - frac) + colormap[upper][0] * frac);
  const g = Math.round(colormap[lower][1] * (1 - frac) + colormap[upper][1] * frac);
  const b = Math.round(colormap[lower][2] * (1 - frac) + colormap[upper][2] * frac);

  return `rgb(${r}, ${g}, ${b})`;
}

export const COLORMAP_NAMES = Object.keys(colormaps);

export function getColormap(colormap: Colormap | string): Colormap {
  if (Array.isArray(colormap)) {
    return colormap;
  }
  return colormaps[colormap] || colormaps.viridis;
}
