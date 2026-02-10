import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DATASET_TEMPLATES, type DatasetTemplate } from '@/lib/dataset-builder';
import { getColorTheme } from '@/lib/colors';
import { getDatasetIcon } from '@/lib/dataset-icons';
import { cn } from '@/lib/utils';
import { ArrowRight, ChartNoAxesColumnDecreasing, ChartNoAxesColumnIncreasing, Search, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';

export type DatasetBuilderProps = {
  onSelectTemplate: (template: DatasetTemplate) => void;
  onManualMode: () => void;
};

export function DatasetBuilder({ onSelectTemplate, onManualMode }: DatasetBuilderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return DATASET_TEMPLATES;

    return DATASET_TEMPLATES.filter((template) => {
      if (template.name.toLowerCase().includes(query)) return true;
      return template.searchTerms.some((term) => term.toLowerCase().includes(query));
    });
  }, [searchQuery]);

  return (
    <div className="flex max-h-[90vh] flex-col">
      <DialogHeader className="px-6 pt-6">
        <div className="flex flex-col gap-4">
          <div className="space-y-1">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              What do you want to track?
            </DialogTitle>
            <DialogDescription>
              Pick a starting point and we will prefill the setup for you.
            </DialogDescription>
          </div>
        </div>
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              autoFocus
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search templates"
              className="pl-9"
            />
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {filteredTemplates.length} templates
        </div>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 px-6 py-12 text-center">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              No templates found
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Try a different keyword or switch to manual setup.
            </div>
            <Button
              type="button"
              variant="ghost"
              className="mt-4"
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => {
              const Icon = getDatasetIcon(template.icon);
              const { bg: iconBg, text: iconText } = getColorTheme(template.theme);
              const unitsLabel = template.units.length > 0 ? template.units.join(', ') : null;
              const isTrend = template.settings.tracking === 'trend';
              const isNegative = template.settings.valence === 'negative';
              const TrackingIcon = isTrend 
                ? (isNegative ? TrendingDown : TrendingUp) 
                : (isNegative ? ChartNoAxesColumnDecreasing : ChartNoAxesColumnIncreasing);

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onSelectTemplate(template)}
                  className={cn(
                    'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-4 text-left shadow-sm transition-all',
                    'hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg',
                    'dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-blue-500'
                  )}
                >
                  <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-blue-50/40 via-transparent to-transparent dark:from-blue-900/20" />
                  <div className="flex items-center justify-center">
                    <div
                      className={cn(
                        'relative flex h-11 w-11 items-center justify-center rounded-full shadow-sm ring-1 ring-white/70 transition-transform',
                        'before:absolute before:inset-1 before:rounded-full before:bg-white/40 before:mix-blend-soft-light',
                        'after:absolute after:-inset-1 after:rounded-full after:border after:border-white/60 after:opacity-80',
                        'group-hover:-translate-y-0.5 group-hover:scale-105 dark:ring-slate-900/60',
                        iconBg
                      )}
                    >
                      <Icon className={cn('relative h-5 w-5 drop-shadow-sm', iconText)} />
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {template.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {template.description}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1 text-[10px] uppercase tracking-wide">
                      <TrackingIcon
                        className={cn(
                          'h-3.5 w-3.5',
                        )}
                      />
                      {isTrend ? 'Trend' : 'Series'}
                    </Badge>
                    {unitsLabel && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Units: {unitsLabel}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-blue-600 transition-colors group-hover:text-blue-700 dark:text-blue-400">
                    Use this template
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200/70 px-6 py-4 dark:border-slate-700/70">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">Want full control?</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Start from a blank dataset and customize every detail.
            </div>
          </div>
          <Button type="button" onClick={onManualMode} className="gap-2">
            Build from scratch
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
