import { achievementBadgeColors, achievementBadgeIcons, achievementBadgeSizes, achievementBadgeStyles, type AchievementBadgeSize } from '@/lib/achievements';
import { cn } from '@/lib/utils';
import type { GoalBadge } from '../db/localdb';


type AchievementBadgeProps = {
  badge: GoalBadge;
  size?: AchievementBadgeSize;
  className?: string;
  floating?: boolean;
  shine?: boolean;
  pulse?: boolean;
  grayscale?: boolean;
};


const styleIcons = achievementBadgeStyles;
const centerIcons = achievementBadgeIcons;
const colorPresets = achievementBadgeColors;
const sizePresets = achievementBadgeSizes;

// Animation keyframes
const animationStyles = `
  @keyframes achievement-float {
    0%, 100% { transform: translateY(4px); }
    50% { transform: translateY(-4px); }
  }

  @keyframes achievement-wobble {
    0%, 100% { transform: rotate(-3deg); }
    50% { transform: rotate(3deg); }
  }
  
  @keyframes achievement-shine {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  @keyframes achievement-pulse {
    0% { box-shadow: 0 0 0 0px currentColor; opacity: 0; transform: scale(.9); }
    15% { box-shadow: 0 0 0 2px currentColor; opacity: 0.8; transform: scale(.95); }
    100% { box-shadow: 0 0 0 0px currentColor; opacity: 0; transform: scale(1.5); }
  }
`;

export function AchievementBadge({ badge, size = 'medium', className, floating, shine, pulse, grayscale }: AchievementBadgeProps) {
  const color = colorPresets[badge.color];
  const sizePreset = sizePresets[size];
  const containerPx = sizePreset.container;
  const ShapeIcon = styleIcons[badge.style];
  const CenterIcon = badge.icon && centerIcons[badge.icon];

  // Flat design: shape as background, icon and label in center
  return (
    <>
      <style>{animationStyles}</style>
      {/* Wobble animation effect */}
      <div
        className={cn(
          'inline-flex items-center justify-center relative',
          grayscale && 'opacity-60 grayscale',
          className
        )}
        style={{
          width: containerPx,
          height: containerPx,
          animation: floating ? 'achievement-float 3s ease-in-out infinite' : undefined,
        }}
      >
        <span
          className="absolute inset-1 rounded-full bg-slate-900/90 shadow-inner dark:hidden"
          aria-hidden="true"
        />
        {/* Wobble animation effect */}
        <div
          style={{
          width: containerPx,
          height: containerPx,
          animation: floating ? 'achievement-wobble 3s ease-in-out infinite' : undefined,
          animationDelay: floating ? '-2s' : undefined,
        }}
      >
        {/* Pulse ring effect */}
        {pulse && (
          <span
            className="absolute inset-0 rounded-full"
            style={{
              color: color.accent,
              animation: 'achievement-pulse 2s ease-out infinite',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Background shape with shine effect */}
        <span
          className="absolute inset-0 flex items-center justify-center rounded-full"
          style={{
            color: color.bg,
            backgroundImage: shine
              ? `linear-gradient(90deg, transparent, ${color.bg}40, transparent)`
              : undefined,
            backgroundSize: shine ? '200% 100%' : undefined,
            animation: shine ? 'achievement-shine 3s ease-in-out infinite' : undefined,
          }}
        >
          <ShapeIcon size={containerPx} color={color.bg} />
        </span>

        {/* Border overlay for flat look */}
        <span
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <ShapeIcon size={containerPx} color={color.border} style={{ opacity: 0.18 }} />
        </span>

        {/* Center icon and label */}
        <span
          className="relative z-10 flex items-center justify-center"
          style={{ width: containerPx, height: containerPx }}
        >
          {(CenterIcon || !!badge.label?.trim()) && (
            <span
              className={cn(
                'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-center select-none flex items-center justify-center gap-1',
                'rounded-full',
                'shadow-md',
                'py-0.5 px-4 leading-[1em] min-w-[1em]',
              )}
              style={{
                fontSize: sizePreset.label,
                background: `${color.label}f8`,
                color: color.accent,
                filter: `drop-shadow(0 0 20px ${color.accent}99)`,
              }}
            >
              {CenterIcon && (
                <span
                  className="inline-flex items-center justify-center"
                  style={{
                    color: color.accent,
                    fontSize: sizePreset.icon,
                  }}
                >
                  <CenterIcon size={sizePreset.icon} />
                </span>
              )}
              {badge.label && badge.label !== '' && size !== 'small' && (
                <span style={{ color: color.bg }}>{badge.label}</span>
              )}
            </span>
          )}
        </span>
      </div>
      </div>
    </>
  );
}

export default AchievementBadge;
