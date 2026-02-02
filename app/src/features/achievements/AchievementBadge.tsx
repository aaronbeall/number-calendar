import { achievementBadgeColors, achievementBadgeIcons, achievementBadgeSizes, achievementBadgeStyles, type AchievementBadgeSize } from '@/lib/achievements';
import { cn } from '@/lib/utils';
import type { GoalBadge } from '../db/localdb';


type AchievementBadgeProps = {
  badge: GoalBadge;
  size?: AchievementBadgeSize;
  className?: string;
};


const styleIcons = achievementBadgeStyles;
const centerIcons = achievementBadgeIcons;
const colorPresets = achievementBadgeColors;
const sizePresets = achievementBadgeSizes;

export function AchievementBadge({ badge, size = 'medium', className }: AchievementBadgeProps) {
  const color = colorPresets[badge.color];
  const sizePreset = sizePresets[size];
  const containerPx = sizePreset.container;
  const ShapeIcon = styleIcons[badge.style];
  const CenterIcon = badge.icon && centerIcons[badge.icon];

  // Flat design: shape as background, icon and label in center
  return (
    <div
      className={cn('inline-flex items-center justify-center relative', className)}
      style={{ width: containerPx, height: containerPx }}
    >
      {/* Background shape */}
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{ color: color.bg }}
      >
        <ShapeIcon size={containerPx} color={color.bg} />
      </span>
      {/* Border overlay for flat look */}
      <span
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        // style={{ color: color.border, zIndex: 1 }}
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
              background: `${ color.label }f8`, 
              color: color.accent, 
              filter: `drop-shadow(0 0 20px ${color.accent}99)`,
              // textShadow: `0 1px 0 ${color.accent}`
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
  );
}

export default AchievementBadge;
