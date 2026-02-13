import { achievementBadgeColors, achievementBadgeStyles } from '@/lib/achievements';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { GoalBadge } from '../db/localdb';
import { useTheme } from '@/components/ThemeProvider';


type AchievementBadgeIconProps = {
  badge: GoalBadge;
  className?: string;
  size?: number
  style?: React.CSSProperties;
  title?: string;
};

const styleIcons = achievementBadgeStyles;
const colorPresets = achievementBadgeColors;

export function AchievementBadgeIcon({ badge, className, size = 24, style, title }: AchievementBadgeIconProps) {
  const color = colorPresets[badge.color] ?? colorPresets.gold;
  const ShapeIcon = styleIcons[badge.style] ?? styleIcons.badge;
  const containerPx = size;
  const iconSize = Math.round(containerPx * 0.75);
  const tooltipLabel = title ?? badge.label?.trim();

  const { appliedTheme } = useTheme();

  let border;
  let background;
  let fill;

  if (appliedTheme === 'dark') {
    border = `${color.border}99`;
    background = color.label;
    fill = color.accent;
  } else {
    border = `${color.border}99`;
    background = color.bg;
    fill = color.label;
  }

  const icon = (
    <div
      className={cn('inline-flex items-center justify-center rounded-full shadow-sm', className)}
      style={{
        ...style,
        width: containerPx,
        height: containerPx,
        background,
        border: `1px solid ${border}`,
      }}
    >
      <ShapeIcon size={iconSize} color={fill} style={{ fill }} />
    </div>
  );

  if (!tooltipLabel) {
    return icon;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{icon}</TooltipTrigger>
      <TooltipContent>{tooltipLabel}</TooltipContent>
    </Tooltip>
  );
}

export default AchievementBadgeIcon;
