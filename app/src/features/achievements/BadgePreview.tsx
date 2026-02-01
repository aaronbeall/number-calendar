import { achievementBadgeColors, achievementBadgeIcons, achievementBadgeStyles, type AchievementBadgeStyle } from "@/lib/achievements";
import { keysOf } from "@/lib/utils";
import { useCallback, useState } from "react";
import AchievementBadge from "./AchievementBadge";
import { Palette, StarIcon, TypeIcon } from "lucide-react";

const styleVariants = keysOf(achievementBadgeStyles);
const iconVariants = keysOf(achievementBadgeIcons);
const colorVariants = keysOf(achievementBadgeColors);
const labelVariants = ['1', '7', '100k', '🏆', '✔', '★', 'A+', '🎉', ''];

function BadgePreview({ style }: { style: AchievementBadgeStyle }) {
  const [colorIdx, setColorIdx] = useState(0);
  const [iconIdx, setIconIdx] = useState(0);
  const [labelIdx, setLabelIdx] = useState(0);

  const color = colorVariants[colorIdx % colorVariants.length];
  const icon = iconVariants[iconIdx % iconVariants.length];
  const label = labelVariants[labelIdx % labelVariants.length];

  return (
    <div className="flex flex-col items-center gap-2">
      <AchievementBadge badge={{ style, icon, color, label }} size="medium" />
      <span className="text-xs text-slate-500">{style}</span>
      <div className="flex gap-2 mt-1">
        <button
          className="p-1 rounded hover:bg-slate-200"
          title="Cycle Color"
          onClick={() => setColorIdx(i => (i + 1) % colorVariants.length)}
        >
          <Palette className="w-4 h-4" style={{ color: achievementBadgeColors[color].accent }} />
        </button>
        <button
          className="p-1 rounded hover:bg-slate-200"
          title="Cycle Icon"
          onClick={() => setIconIdx(i => (i + 1) % iconVariants.length)}
        >
          <StarIcon className="w-4 h-4" style={{ color: achievementBadgeColors[color].accent }} />
        </button>
        <button
          className="p-1 rounded hover:bg-slate-200"
          title="Cycle Label"
          onClick={() => setLabelIdx(i => (i + 1) % labelVariants.length)}
        >
          <TypeIcon className="w-4 h-4" style={{ color: achievementBadgeColors[color].accent }} />
        </button>
      </div>
    </div>
  );
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomBadge() {
  return {
    style: getRandomItem(styleVariants),
    icon: getRandomItem(iconVariants),
    color: getRandomItem(colorVariants),
    label: getRandomItem(labelVariants),
  };
}

export function BadgePreviews() {
  const [randomBadge, setRandomBadge] = useState(() => getRandomBadge());
  const handleRandomize = useCallback(() => {
    setRandomBadge(getRandomBadge());
  }, []);

  return (
    <div className="mb-10">
      <h3 className="text-lg font-semibold mb-2">Badge Style Preview</h3>
      <div className="flex flex-col items-center mb-8">
        <button
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer mb-6"
          onClick={handleRandomize}
          title="Click to randomize badge"
          type="button"
        >
          <AchievementBadge badge={randomBadge} size="large" />
          <span className="text-xs text-slate-500 mt-2">Click to randomize</span>
        </button>
      </div>
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 mb-8">
          {styleVariants.map(style => (
            <BadgePreview key={style} style={style} />
          ))}
        </div>
        <h3 className="text-lg font-semibold mb-2 mt-8">Badge Icon Preview</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6">
          {iconVariants.map(icon => (
            <div key={icon} className="flex flex-col items-center gap-2">
              <AchievementBadge badge={{ style: 'border_badge', icon, color: 'sapphire', label: '' }} size="medium" />
              <span className="text-xs text-slate-500">{icon}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}