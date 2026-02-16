import { useRef, useEffect, useCallback } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface AnimState {
  aRects: SVGRectElement[];
  bRects: SVGRectElement[];
  aOrder: number[];
  bOrder: number[];
  aCount: number;
  bCount: number;
  direction: 'forward' | 'backward' | 'idle';
  animFrameId: number | null;
}

function shuffleArray(arr: number[]): number[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function useFragmentReveal(
  containerRef: React.RefObject<HTMLDivElement | null>,
  durationMs: number = 600,
  enabled: boolean = true
) {
  const stateRef = useRef<AnimState>({
    aRects: [], bRects: [],
    aOrder: [], bOrder: [],
    aCount: 0, bCount: 0,
    direction: 'idle',
    animFrameId: null,
  });
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    return () => {
      if (stateRef.current.animFrameId !== null) {
        cancelAnimationFrame(stateRef.current.animFrameId);
        stateRef.current.animFrameId = null;
      }
    };
  }, []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    // Calculate frames based on duration at 60fps
    const TARGET_FRAMES = Math.max(1, Math.ceil(durationMs / 16.67));
    const aBatchSize = Math.max(1, Math.ceil(s.aRects.length / TARGET_FRAMES));
    const bBatchSize = Math.max(1, Math.ceil(s.bRects.length / TARGET_FRAMES));

    if (s.direction === 'forward') {
      const aEnd = Math.max(s.aCount - aBatchSize, 0);
      for (let i = s.aCount - 1; i >= aEnd; i--) {
        s.aRects[s.aOrder[i]].style.opacity = '0';
      }
      s.aCount = aEnd;

      const bEnd = Math.min(s.bCount + bBatchSize, s.bRects.length);
      for (let i = s.bCount; i < bEnd; i++) {
        s.bRects[s.bOrder[i]].style.opacity = '1';
      }
      s.bCount = bEnd;

      if (s.aCount > 0 || s.bCount < s.bRects.length) {
        s.animFrameId = requestAnimationFrame(tick);
      } else {
        s.direction = 'idle';
        s.animFrameId = null;
      }
    } else if (s.direction === 'backward') {
      const bEnd = Math.max(s.bCount - bBatchSize, 0);
      for (let i = s.bCount - 1; i >= bEnd; i--) {
        s.bRects[s.bOrder[i]].style.opacity = '0';
      }
      s.bCount = bEnd;

      const aEnd = Math.min(s.aCount + aBatchSize, s.aRects.length);
      for (let i = s.aCount; i < aEnd; i++) {
        s.aRects[s.aOrder[i]].style.opacity = '';
      }
      s.aCount = aEnd;

      if (s.bCount > 0 || s.aCount < s.aRects.length) {
        s.animFrameId = requestAnimationFrame(tick);
      } else {
        s.direction = 'idle';
        s.animFrameId = null;
      }
    }
  }, [durationMs]);

  const ensureRects = useCallback((): boolean => {
    const s = stateRef.current;

    if (
      (s.aRects.length > 0 && s.aRects[0].isConnected) ||
      (s.bRects.length > 0 && s.bRects[0].isConnected)
    ) return true;

    const container = containerRef.current;
    if (!container) return false;

    const svg = container.querySelector('svg');
    if (!svg) return false;

    const aRects = Array.from(svg.querySelectorAll('rect[data-g="a"]')) as SVGRectElement[];
    const bRects = Array.from(svg.querySelectorAll('rect[data-g="b"]')) as SVGRectElement[];

    if (aRects.length === 0 && bRects.length === 0) return false;

    s.aRects = aRects;
    s.aOrder = shuffleArray(Array.from({ length: aRects.length }, (_, i) => i));
    s.aCount = aRects.length;

    s.bRects = bRects;
    s.bOrder = shuffleArray(Array.from({ length: bRects.length }, (_, i) => i));
    s.bCount = 0;

    return true;
  }, [containerRef]);

  const onMouseEnter = useCallback(() => {
    if (!enabled) return;
    if (!ensureRects()) return;
    const s = stateRef.current;

    if (reducedMotion) {
      s.aRects.forEach((r) => (r.style.opacity = '0'));
      s.aCount = 0;
      s.bRects.forEach((r) => (r.style.opacity = '1'));
      s.bCount = s.bRects.length;
      return;
    }

    s.direction = 'forward';
    if (s.animFrameId === null) {
      s.animFrameId = requestAnimationFrame(tick);
    }
  }, [tick, reducedMotion, enabled, ensureRects]);

  const onMouseLeave = useCallback(() => {
    if (!enabled) return;
    const s = stateRef.current;
    if (s.aRects.length === 0 && s.bRects.length === 0) return;

    if (reducedMotion) {
      s.aRects.forEach((r) => (r.style.opacity = ''));
      s.aCount = s.aRects.length;
      s.bRects.forEach((r) => (r.style.opacity = '0'));
      s.bCount = 0;
      return;
    }

    s.direction = 'backward';
    if (s.animFrameId === null) {
      s.animFrameId = requestAnimationFrame(tick);
    }
  }, [tick, reducedMotion, enabled]);

  return { onMouseEnter, onMouseLeave };
}
