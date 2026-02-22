import type { Transform, Keyframe, EasingType } from '../types';

// Easing functions
const easings: Record<EasingType, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t * t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  bounceOut: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  elasticOut: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpTransform(a: Transform, b: Transform, t: number): Transform {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    scaleX: lerp(a.scaleX, b.scaleX, t),
    scaleY: lerp(a.scaleY, b.scaleY, t),
    rotation: lerp(a.rotation, b.rotation, t),
    opacity: lerp(a.opacity, b.opacity, t),
  };
}

/**
 * Get the interpolated transform for a target at a given time,
 * based on the keyframes defined for that target.
 */
export function getInterpolatedTransform(
  targetId: string,
  time: number,
  keyframes: Keyframe[],
  baseTransform: Transform
): Transform {
  // Get keyframes for this target, sorted by time
  const targetKfs = keyframes
    .filter((kf) => kf.targetId === targetId)
    .sort((a, b) => a.time - b.time);

  if (targetKfs.length === 0) return baseTransform;

  // Before first keyframe: use base transform
  if (time <= targetKfs[0].time) {
    return baseTransform;
  }

  // After last keyframe: hold last keyframe transform
  if (time >= targetKfs[targetKfs.length - 1].time) {
    return targetKfs[targetKfs.length - 1].transform;
  }

  // Find surrounding keyframes
  let prevKf = targetKfs[0];
  let nextKf = targetKfs[1];

  for (let i = 0; i < targetKfs.length - 1; i++) {
    if (time >= targetKfs[i].time && time <= targetKfs[i + 1].time) {
      prevKf = targetKfs[i];
      nextKf = targetKfs[i + 1];
      break;
    }
  }

  // Compute interpolation factor
  const duration = nextKf.time - prevKf.time;
  const elapsed = time - prevKf.time;
  const rawT = duration > 0 ? elapsed / duration : 0;

  // Apply easing
  const easingFn = easings[nextKf.easing] || easings.linear;
  const t = easingFn(rawT);

  return lerpTransform(prevKf.transform, nextKf.transform, t);
}

export { easings };
