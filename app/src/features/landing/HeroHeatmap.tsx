import { useMemo } from 'react';

const COLS = 56;
const ROWS = 22;
const CELL = 22;
const GAP = 6;
const STEP = CELL + GAP;

// Deterministic pseudo-random numbers so the pattern is the same on every visit.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

type Cell = { x: number; y: number; tone: 'good' | 'bad' | 'empty'; strength: number; delay: number };

/**
 * Decorative calendar heatmap behind the hero. Days fill in as a diagonal wave, and the further
 * right you go the greener it gets: the numbers go up. Masked so the headline stays clear.
 */
export function HeroHeatmap() {
  const cells = useMemo(() => {
    const r = rng(7);
    const out: Cell[] = [];
    for (let c = 0; c < COLS; c++) {
      const progress = c / (COLS - 1); // 0 on the left, 1 on the right
      for (let row = 0; row < ROWS; row++) {
        const roll = r();
        const emptyChance = 0.22 - progress * 0.1;
        const goodChance = 0.45 + progress * 0.45;
        const tone: Cell['tone'] = roll < emptyChance ? 'empty' : r() < goodChance ? 'good' : 'bad';
        const strength = 0.35 + r() * 0.45 + (tone === 'good' ? progress * 0.2 : 0);
        out.push({ x: c * STEP, y: row * STEP, tone, strength: Math.min(strength, 1), delay: (c * 0.9 + row * 0.6) * 28 });
      }
    }
    return out;
  }, []);

  return (
    <div
      aria-hidden
      className="absolute inset-x-0 top-0 h-[720px] overflow-hidden pointer-events-none"
      style={{
        // Clear behind the headline, visible toward the edges, fading out before the screenshot.
        maskImage: 'radial-gradient(ellipse 60% 55% at 50% 42%, transparent 50%, black 92%), linear-gradient(to bottom, black 55%, transparent)',
        maskComposite: 'intersect',
        WebkitMaskImage: 'radial-gradient(ellipse 60% 55% at 50% 42%, transparent 50%, black 92%), linear-gradient(to bottom, black 55%, transparent)',
        WebkitMaskComposite: 'source-in',
      }}
    >
      <style>{`
        @keyframes hero-heatmap-fill {
          0% { opacity: 0; transform: scale(0.3); }
          60% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
        .hero-heatmap-cell { transform-box: fill-box; transform-origin: center; animation: hero-heatmap-fill 600ms ease-out both; }
        @media (prefers-reduced-motion: reduce) { .hero-heatmap-cell { animation: none; } }
      `}</style>
      <svg
        width={COLS * STEP}
        height={ROWS * STEP}
        className="absolute left-1/2 -translate-x-1/2 -top-2 opacity-40 sm:opacity-60 dark:opacity-45 sm:dark:opacity-60"
      >
        {cells.map((cell, i) => (
          <rect
            key={i}
            x={cell.x}
            y={cell.y}
            width={CELL}
            height={CELL}
            rx={6}
            className={
              'hero-heatmap-cell ' +
              (cell.tone === 'good'
                ? 'fill-emerald-500 dark:fill-emerald-400'
                : cell.tone === 'bad'
                  ? 'fill-red-400 dark:fill-red-500'
                  : 'fill-slate-200 dark:fill-slate-800')
            }
            style={{ fillOpacity: cell.tone === 'empty' ? 1 : cell.strength * 0.55, animationDelay: `${Math.round(cell.delay)}ms` }}
          />
        ))}
      </svg>
    </div>
  );
}
