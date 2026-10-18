export const WORLD = {
  length: 342,
  halfWidth: 32,
  clearance: 1.55,
  pathHalfWidth: 1.05,
  wind: { x: 1, z: 0.34 },
  gust: { x: 1, z: 0.3 },
  eye: 1.56,
};

export const TRAIL = {
  zStart: 12,
  zEnd: -(WORLD.length - 13),
};

export function pathX(z) {
  return Math.sin(z * 0.045) * 3.8 + Math.sin(z * 0.013 + 1.2) * 1.9;
}

export function pathY(z) {
  return Math.sin(z * 0.09) * 0.12;
}

export function pathDistance(x, z) {
  const dx = x - pathX(z);
  return Math.abs(dx);
}
