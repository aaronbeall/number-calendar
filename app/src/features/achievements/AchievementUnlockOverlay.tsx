import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { NewAchievementResult } from '@/hooks/useAchievements';
import AchievementBadge from './AchievementBadge';

const overlayAnimations = `
  @keyframes overlay-bar-grow {
    0% { transform: translateX(-50%) scaleX(0.08); }
    90% { transform: translateX(-50%) scaleX(1); }
    95% { transform: translateX(-50%) scaleX(1); }
    100% { transform: translateX(-50%) scaleX(1); }
  }

  @keyframes overlay-badge-drop {
    0% { transform: translateY(-160px) scale(1.7); opacity: 0; }
    100% { transform: translateY(0) scale(1); }
  }

  @keyframes overlay-text-rise {
    0% { opacity: 0; transform: translateY(28px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes overlay-badge-stagger {
    0% { opacity: 0; transform: translateX(32px) scale(0.45); }
    100% { opacity: 1; transform: translateX(0) scale(0.72); }
  }

  @media (prefers-reduced-motion: reduce) {
    .achievement-overlay * {
      animation: none !important;
      transition: none !important;
    }
  }
`;

type AchievementUnlockOverlayProps = {
  achievements: NewAchievementResult[];
  onClose: () => void;
};

export function AchievementUnlockOverlay({ achievements, onClose }: AchievementUnlockOverlayProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const hasMultiple = achievements.length > 1;

  useEffect(() => {
    setActiveIndex(0);
  }, [achievements]);

  const active = achievements[activeIndex];

  const orderedBadges = useMemo(() => {
    return achievements.map((achievement, index) => {
      const offset = index - activeIndex;
      return {
        achievement,
        index,
        offset,
        isActive: offset === 0,
        delay: Math.max(0, index - activeIndex) * 0.08,
      };
    });
  }, [achievements, activeIndex]);

  const handlePrev = () => {
    setActiveIndex(current => (current - 1 + achievements.length) % achievements.length);
  };

  const handleNext = () => {
    setActiveIndex(current => (current + 1) % achievements.length);
  };

  if (!active) return null;

  return (
    <div className="achievement-overlay fixed inset-0 z-50 flex items-center justify-center">
      <style>{overlayAnimations}</style>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(900px circle at 12% -10%, rgba(255, 235, 168, 0.55) 0%, transparent 60%),\n'
            + 'radial-gradient(700px circle at 85% 5%, rgba(170, 238, 226, 0.45) 0%, transparent 55%),\n'
            + 'linear-gradient(160deg, rgba(12, 15, 20, 0.94) 0%, rgba(19, 23, 32, 0.96) 45%, rgba(28, 24, 34, 0.96) 100%)',
        }}
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-5xl px-6">
        <div
          className="pointer-events-none absolute left-1/2 top-16 h-52 w-[92%] rounded-full bg-[linear-gradient(90deg,rgba(243,214,150,0.85),rgba(243,244,246,0.9),rgba(165,221,214,0.85))] shadow-[0_40px_140px_rgba(120,130,150,0.35)] dark:bg-[linear-gradient(180deg,rgba(12,14,18,0.98),rgba(6,8,12,0.98))] dark:shadow-[0_40px_160px_rgba(4,6,9,0.85)]"
          style={{
            transformOrigin: 'center',
            animation: 'overlay-bar-grow 0.6s cubic-bezier(0.05, 0.92, 0.16, 1) both',
          }}
        />
        <div
          className="pointer-events-none absolute left-1/2 top-[248px] h-16 w-[78%] -translate-x-1/2 rounded-full bg-[radial-gradient(70%_120%_at_50%_0%,rgba(50,60,80,0.38),transparent_70%)] dark:bg-[radial-gradient(70%_120%_at_50%_0%,rgba(255,196,128,0.18),transparent_70%)]"
          style={{
            filter: 'blur(6px)',
            opacity: 0.6,
          }}
        />

        <div className="relative mt-12 flex flex-col items-center text-center">
          <button
            className="absolute right-4 top-0 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative flex min-h-[240px] w-full items-center justify-center overflow-visible">
            {orderedBadges.map(({ achievement, index, offset, isActive, delay }) => {
              const translateX = offset * 140;
              return (
                <button
                  key={achievement.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className="absolute transition-transform duration-500 ease-out"
                  style={{
                    transform: `translateX(${translateX}px)`,
                    zIndex: isActive ? 20 : 10 - Math.abs(offset),
                    opacity: isActive ? 1 : 0.8,
                  }}
                >
                  <div
                    className={cn(
                      'transition-transform duration-500',
                      isActive ? 'scale-100' : 'scale-75'
                    )}
                    style={{
                      animation: isActive
                        ? 'overlay-badge-drop 0.5s cubic-bezier(1,0,0.76,1) both'
                        : `overlay-badge-stagger 0.45s ease-out ${delay}s both`,
                    }}
                  >
                    <AchievementBadge badge={achievement.goal.badge} size="large" animate={isActive} />
                  </div>
                </button>
              );
            })}
          </div>

          <div
            className="mt-6 max-w-2xl"
            style={{
              animation: 'overlay-text-rise 0.55s ease-out 0.75s both',
            }}
          >
            <div className="text-xs uppercase tracking-[0.4em] text-amber-200/80">Achievement Unlocked</div>
            <div className="mt-2 text-3xl font-semibold text-white drop-shadow">
              {active.goal.title}
            </div>
            {active.goal.description && (
              <div className="mt-3 text-base text-white/70">
                {active.goal.description}
              </div>
            )}
          </div>

          {hasMultiple && (
            <div className="mt-8 flex items-center gap-4">
              <Button
                variant="secondary"
                className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={handlePrev}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-xs uppercase tracking-[0.35em] text-white/50">
                {activeIndex + 1} / {achievements.length}
              </div>
              <Button
                variant="secondary"
                className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={handleNext}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
