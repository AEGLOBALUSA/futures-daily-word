import { useState, useEffect, useCallback } from 'react';

/**
 * HeroPhotoCarousel — a slow, cinematic crossfade between a few warm-graded
 * Futures community frames, sitting BEHIND the hero plate's veil + caption.
 *
 * - Auto-advances with a 1.5s crossfade; the ACTIVE frame drifts with a slow
 *   Ken Burns zoom (heroKenBurns keyframe in index.css). Only the visible frame
 *   animates / is compositor-promoted — the hidden frames are idle.
 * - Only the first frame's image loads eagerly; the rest are warmed off the
 *   critical home load (requestIdleCallback / shortly after paint), so the
 *   carousel adds no weight to first paint.
 * - Honours prefers-reduced-motion: no auto-advance, no zoom (static first
 *   frame; dots still switch).
 * - Renders absolutely to fill its positioned parent (the photo plate). Dots are
 *   24×24 tap targets (WCAG 2.5.8); the plate's veil/tag/caption sit on top with
 *   pointerEvents:none so taps fall through to them.
 */
const HERO_PHOTOS = [
  '/images/hero-a.jpg',
  '/images/hero-b.jpg',
  '/images/hero-c.jpg',
  '/images/hero-d.jpg',
];

const ADVANCE_MS = 6500;

export function HeroPhotoCarousel() {
  const [idx, setIdx] = useState(0);
  // Which frames have had their background-image attached. hero-1 loads eagerly;
  // the others are warmed after first paint so they stay off the critical load.
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0]));

  const reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Jump to a frame, ensuring its image is attached first (covers a tap before warm).
  const go = useCallback((next: number) => {
    setLoaded(prev => (prev.has(next) ? prev : new Set(prev).add(next)));
    setIdx(next);
  }, []);

  // Warm the remaining frames once, off the critical path.
  useEffect(() => {
    if (HERO_PHOTOS.length < 2) return;
    const warmAll = () => setLoaded(new Set(HERO_PHOTOS.map((_, i) => i)));
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(warmAll, { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(warmAll, 1500);
    return () => window.clearTimeout(t);
  }, []);

  // Auto-advance (disabled for reduced motion / a single frame).
  useEffect(() => {
    if (reduceMotion || HERO_PHOTOS.length < 2) return;
    const id = window.setInterval(
      () => setIdx(cur => (cur + 1) % HERO_PHOTOS.length),
      ADVANCE_MS,
    );
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  return (
    <>
      {HERO_PHOTOS.map((src, i) => {
        const active = i === idx;
        return (
          <div
            key={src}
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: loaded.has(i) ? `url(${src})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center 44%',
              backgroundRepeat: 'no-repeat',
              opacity: active ? 1 : 0,
              transition: 'opacity 1.5s ease-in-out',
              animation:
                reduceMotion || !active ? 'none' : 'heroKenBurns 11s ease-out forwards',
              willChange: active ? 'transform' : 'auto',
            }}
          />
        );
      })}

      {/* Frame dots — 24×24 tap targets with a small visible pill; live over the veil */}
      <div
        style={{
          position: 'absolute',
          bottom: 11,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          zIndex: 4,
        }}
      >
        {HERO_PHOTOS.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`Show photo ${i + 1} of ${HERO_PHOTOS.length}`}
            aria-current={i === idx}
            style={{
              width: 24,
              height: 24,
              minWidth: 24,
              padding: 0,
              border: 'none',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'block',
                width: i === idx ? 18 : 7,
                height: 7,
                borderRadius: 4,
                background: i === idx ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                transition: 'width 0.35s ease, background 0.35s ease',
              }}
            />
          </button>
        ))}
      </div>
    </>
  );
}
