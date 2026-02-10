import type { NewAchievementResult } from "@/hooks/useAchievements";
import AchievementBadge from "./AchievementBadge";

export const AchievementToast = ({ result: { goal: { badge, title, description } } }: { result: NewAchievementResult }) => (
  <div className="flex w-[360px] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-950">
    <AchievementBadge badge={badge} size="small" animate />
    <div className="min-w-0">
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        {title}
      </div>
      {description && (
        <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
          {description}
        </div>
      )}
    </div>
  </div>
);