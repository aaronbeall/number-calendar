import { AchievementBadge } from './AchievementBadge';
import type { GoalBadge } from '../db/localdb';
import { Zap, Flag, Target, Trophy } from 'lucide-react';

type EmptyStateProps = {
  type: 'goal' | 'target' | 'milestone';
  onAddClick: () => void;
  onGoalBuilderClick: () => void;
};

// Sample badge for each type
const sampleBadges: Record<string, GoalBadge> = {
  goal: {
    style: 'medal',
    icon: 'trophy',
    color: 'gold',
    label: '',
  },
  target: {
    style: 'bolt_shield',
    icon: 'target',
    color: 'emerald',
    label: '',
  },
  milestone: {
    style: 'laurel_trophy',
    icon: 'flag',
    color: 'amethyst',
    label: '',
  },
};

const labels: Record<string, { title: string; description: string }> = {
  goal: {
    title: 'Achievements',
    description: 'Create goals to track your progress and celebrate wins',
  },
  target: {
    title: 'Targets',
    description: 'Set targets for specific time periods to stay motivated',
  },
  milestone: {
    title: 'Milestones',
    description: 'Mark important milestones in your journey',
  },
};

export function EmptyState({ type, onAddClick, onGoalBuilderClick }: EmptyStateProps) {
  const label = labels[type];
  const badge = sampleBadges[type];

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-full max-w-md text-center space-y-8 py-12">
        {/* Badge Display */}
        <div className="flex justify-center">
          <AchievementBadge badge={badge} size="large" className="drop-shadow-lg" />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            No {label.title} Yet
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            {label.description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 space-y-2 border border-slate-200 dark:border-slate-600">
            <button
              onClick={onGoalBuilderClick}
              className="w-full px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              style={{
                background:
                  type === 'goal'
                    ? 'linear-gradient(135deg, #eab308 0%, #facc15 100%)'
                    : type === 'target'
                      ? 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
              }}
            >
              <Zap className="w-4 h-4" />
              Use Goal Builder
            </button>

            {/* Tip - integrated with button */}
            <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1 flex-wrap pt-1">
              <span>Create</span>
              <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                <Flag className="w-3 h-3" />
                Milestones
              </span>
              <span>,</span>
              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                <Target className="w-3 h-3" />
                Targets
              </span>
              <span>, and</span>
              <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-medium">
                <Trophy className="w-3 h-3" />
                Achievements
              </span>
              <span>all at once</span>
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span>or</span>
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          <button
            onClick={onAddClick}
            className="w-full px-6 py-3 rounded-lg font-semibold text-slate-700 dark:text-slate-200 transition-all duration-200 transform hover:scale-105 active:scale-95 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
          >
            Add your first {label.title.toLowerCase().slice(0, -1)}
          </button>
        </div>
      </div>
    </div>
  );
}
