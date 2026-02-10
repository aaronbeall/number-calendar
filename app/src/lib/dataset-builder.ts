import type { DatasetIconName } from '@/lib/dataset-icons';
import type { ColorThemeName } from '@/lib/colors';
import type { Tracking, Valence } from '@/features/db/localdb';

export type DatasetTemplate = {
  id: string;
  name: string;
  description: string;
  searchTerms: string[];
  icon: DatasetIconName;
  theme: ColorThemeName;
  units: string[];
  usesCurrency?: boolean;
  tracking: Tracking;
  valence: Valence;
  suggestedTarget?: {
    // 'period-change' (tracking=trend): target change per period (e.g. lose 1 pound per week)
    // 'period-target' (tracking=series): target value per period (e.g. walk 10,000 steps per day)
    // 'alltime-target': target total value by end date (e.g. save $5000 by end of year)
    type: 'period-change' | 'period-target' | 'alltime-target';
    period: 'day' | 'week' | 'month';
    value?: number;
    range?: [number, number];
  };
  goalQuestions: {
    period: {
      prompt: string; // Generic: "What time period are you focused on?"
      description: string; // Generic: "Choose how often you'd like to track progress"
      recommended?: 'day' | 'week' | 'month';
    },
    targetType: {
      prompt: string; // Generic: "How will you measure success?"
      description?: string; // Generic: "Track {periodly} changes or overall progress" (trend) "Focus on {periodly} totals or all-time milestones" (series)
      options: {
        period: {
          label: string; // Generic: "{Periodly} Change" (trend) or "{Periodly} Total" (series)
          description: string; // Generic: "Target improvement each {period}" (trend) or "Set targets for total value each {period}" (series)
        },
        alltime: {
          label: string; // Generic: "All Time Target" (trend) or "All Time Total" (series)
          description: string; // Generic: "Reach a specific overall value" (trend) or "Build towards cumulative total" (series)
        },
      }
    },
    goodValue: {
      period: {
        prompt: string; // Generic: "What's good {periodly} progress?" (trend) or "What's a good {period}?" (series)
        description: string; // Generic: "Enter the {periodly} improvement that would make you proud" (trend) or "Enter the target total each {period} that would make you proud" (series)
        recommended?: {
          day?: number | [number, number];
          week?: number | [number, number];
          month?: number | [number, number];
        }
      },
      alltime: {
        prompt: string; // Generic: "What value are you aiming for?" (series) "What total do you want to reach?" (trend)
        description: string; // Generic: "Enter the overall target value you'd like to hit" (trend) "Enter a milestone total you'd like to reach" (series)
      }
    },
    startingValue: {
      prompt: string; // Generic: "Starting from?"
      description: string; // Generic: "Your current value (optional)" (trend) or "Your current total (optional)" (series)
    },
    timeline: {
      prompt: string; // Generic: "How long?"
      description: string; // Generic: "Time to reach goal (optional)"
    },
    activity: {
      prompt: string; // Generic: "How actively will you make progress?"
      description: string; // Generic: "How many {periods} per {parent} will you typically record data?"
    }
  }
};

export const DATASET_TEMPLATES: DatasetTemplate[] = [
  {
    id: 'profit-loss',
    name: 'Profit and Loss',
    description: 'Track daily net profit or loss for a business or side hustle.',
    searchTerms: ['profit', 'loss', 'pnl', 'net income', 'business', 'revenue', 'expenses'],
    icon: 'dollar',
    theme: 'emerald',
    units: [],
    usesCurrency: true,
    tracking: 'series', valence: 'positive',
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review profit?',
        description: 'Choose how often you want to track profit performance.',
        recommended: 'week',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} profit totals or an all-time milestone.',
        options: {
          period: {
            label: '{periodly} total',
            description: 'Set a profit total to hit each {period}.',
          },
          alltime: {
            label: 'All time total',
            description: 'Build toward a cumulative profit milestone.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What profit per {period} feels like a win?',
          description: 'Enter the {periodly} net profit that would make you proud.',
        },
        alltime: {
          prompt: 'What total profit do you want to reach?',
          description: 'Enter the overall net profit milestone you want to hit.',
        },
      },
      startingValue: {
        prompt: 'Starting profit total?',
        description: 'Your current total profit so far (optional).',
      },
      timeline: {
        prompt: 'How long should this goal take?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How actively will you log profit?',
        description: 'How many {periods} per {parent} will you record profit?',
      },
    },
  },
  {
    id: 'revenue',
    name: 'Revenue',
    description: 'Track daily gross revenue and growth over time.',
    searchTerms: ['revenue', 'sales', 'income', 'gross', 'business'],
    icon: 'wallet',
    theme: 'blue',
    units: [],
    usesCurrency: true,
    tracking: 'series', valence: 'positive',
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review revenue?',
        description: 'Choose how often you want to track revenue performance.',
        recommended: 'week',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} revenue totals or an all-time milestone.',
        options: {
          period: {
            label: '{periodly} total',
            description: 'Set a revenue total to hit each {period}.',
          },
          alltime: {
            label: 'All time total',
            description: 'Build toward a cumulative revenue milestone.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What revenue per {period} feels good?',
          description: 'Enter the {periodly} revenue total that would make you proud.',
        },
        alltime: {
          prompt: 'What total revenue do you want to reach?',
          description: 'Enter the overall revenue milestone you want to hit.',
        },
      },
      startingValue: {
        prompt: 'Starting revenue total?',
        description: 'Your current total revenue so far (optional).',
      },
      timeline: {
        prompt: 'How long should this goal take?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How actively will you log revenue?',
        description: 'How many {periods} per {parent} will you record revenue?',
      },
    },
  },
  {
    id: 'expenses',
    name: 'Expenses',
    description: 'Track daily spending to keep costs under control.',
    searchTerms: ['expenses', 'spend', 'budget', 'costs', 'outflow'],
    icon: 'cart',
    theme: 'red',
    units: [],
    usesCurrency: true,
    tracking: 'series',
    valence: 'negative',
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review spending?',
        description: 'Choose how often you want to track spending totals.',
        recommended: 'week',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} spending limits or an all-time cap.',
        options: {
          period: {
            label: '{periodly} total',
            description: 'Set a spending limit for each {period}.',
          },
          alltime: {
            label: 'All time total',
            description: 'Stay under a cumulative spending cap.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What spending cap per {period} feels right?',
          description: 'Enter the {periodly} spending limit that keeps you on track.',
        },
        alltime: {
          prompt: 'What total spend do you want to stay under?',
          description: 'Enter a cumulative spending cap you want to maintain.',
        },
      },
      startingValue: {
        prompt: 'Starting spend total?',
        description: 'Your current total spend so far (optional).',
      },
      timeline: {
        prompt: 'How long should this goal take?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How actively will you log spending?',
        description: 'How many {periods} per {parent} will you record spending?',
      },
    },
  },
  {
    id: 'weight-loss',
    name: 'Weight Loss',
    description: 'Track weight as it trends downward over time.',
    searchTerms: ['weight', 'loss', 'body', 'scale', 'fitness'],
    icon: 'activity',
    theme: 'rose',
    units: ['pound', 'kilogram'],
    tracking: 'trend', valence: 'negative',
    suggestedTarget: { type: 'period-change', period: 'week', value: -0.5 },
    goalQuestions: {
      period: {
        prompt: 'How often do you want to check your weight?',
        description: 'Choose how often you want to log weigh-ins.',
        recommended: 'week',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Track {periodly} changes or set an all-time goal weight.',
        options: {
          period: {
            label: '{periodly} change',
            description: 'Target a change in weight each {period}.',
          },
          alltime: {
            label: 'All time target',
            description: 'Reach a specific goal weight.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What change per {period} feels healthy?',
          description: 'Enter the {periodly} change in {units} that feels sustainable.',
          recommended: {
            day: -0.07,
            week: -0.5,
            month: -4,
          },
        },
        alltime: {
          prompt: 'What goal weight do you want to reach?',
          description: 'Enter your target weight in {units}.',
        },
      },
      startingValue: {
        prompt: 'Starting weight?',
        description: 'Your current weight (optional).',
      },
      timeline: {
        prompt: 'How long do you want to give yourself?',
        description: 'Time to reach the goal weight (optional).',
      },
      activity: {
        prompt: 'How often will you record weigh-ins?',
        description: 'How many {periods} per {parent} will you log your weight?',
      },
    },
  },
  {
    id: 'weight-gain',
    name: 'Weight Gain',
    description: 'Track weight as it trends upward over time.',
    searchTerms: ['weight', 'gain', 'bulk', 'mass', 'fitness'],
    icon: 'dumbbell',
    theme: 'amber',
    units: ['pound', 'kilogram'],
    tracking: 'trend', valence: 'positive',
    suggestedTarget: { type: 'period-change', period: 'week', value: 0.25 },
    goalQuestions: {
      period: {
        prompt: 'How often do you want to check your weight?',
        description: 'Choose how often you want to log weigh-ins.',
        recommended: 'week',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Track {periodly} changes or set an all-time goal weight.',
        options: {
          period: {
            label: '{periodly} change',
            description: 'Target a change in weight each {period}.',
          },
          alltime: {
            label: 'All time target',
            description: 'Reach a specific goal weight.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What change per {period} feels healthy?',
          description: 'Enter the {periodly} change in {units} that feels sustainable.',
          recommended: {
            day: 0.04,
            week: 0.25,
            month: 1,
          },
        },
        alltime: {
          prompt: 'What goal weight do you want to reach?',
          description: 'Enter your target weight in {units}.',
        },
      },
      startingValue: {
        prompt: 'Starting weight?',
        description: 'Your current weight (optional).',
      },
      timeline: {
        prompt: 'How long do you want to give yourself?',
        description: 'Time to reach the goal weight (optional).',
      },
      activity: {
        prompt: 'How often will you record weigh-ins?',
        description: 'How many {periods} per {parent} will you log your weight?',
      },
    },
  },
  {
    id: 'blood-pressure',
    name: 'Blood Pressure',
    description: 'Track daily blood pressure readings.',
    searchTerms: ['blood pressure', 'bp', 'health', 'systolic', 'diastolic'],
    icon: 'heart',
    theme: 'red',
    units: ['mean-arterial-pressure', 'systolic', 'diastolic'],
    tracking: 'trend', valence: 'negative',
    suggestedTarget: { type: 'period-target', period: 'day', range: [70, 100] },
    goalQuestions: {
      period: {
        prompt: 'How often do you want to check blood pressure?',
        description: 'Choose how often you will record readings.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Track {periodly} changes or aim for a healthy range.',
        options: {
          period: {
            label: '{periodly} change',
            description: 'Target improvement each {period}.',
          },
          alltime: {
            label: 'All time target',
            description: 'Reach a specific reading range.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What change per {period} feels realistic?',
          description[70, ]-1: 'Enter the {periodly} change in {units} you want to see.',
        },
        alltime: {
          prompt: 'What reading range are you aiming for?',
          description: 'Enter your target range in {units}.',
        },
      },
      startingValue: {
        prompt: 'Starting reading?',
        description: 'Your current reading (optional).',
      },
      timeline: {
        prompt: 'How long do you want to give yourself?',
        description: 'Time to reach your target range (optional).',
      },
      activity: {
        prompt: 'How often will you record readings?',
        description: 'How many {periods} per {parent} will you log readings?',
      },
    },
  },
  {
    id: 'exercise',
    name: 'Exercise Minutes',
    description: 'Track daily workout minutes or activity time.',
    searchTerms: ['exercise', 'workout', 'minutes', 'fitness', 'activity'],
    icon: 'dumbbell',
    theme: 'emerald',
    units: ['minute', 'hour'],
    tracking: 'series', valence: 'positive',
    suggestedTarget: { type: 'period-target', period: 'day', value: 30 },
    goalQuestions: {
      period: {
        prompt: 'How often do you want to track exercise time?',
        description: 'Choose how often you want to review activity.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} activity totals or an all-time milestone.',
        options: {
          period: {
            label: '{periodly} total',
            description: 'Set a target for {units} each {period}.',
          },
          alltime: {
            label: 'All time total',
            description: 'Reach a cumulative activity milestone.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'How many {units} per {period} feels good?',
          description: 'Enter the {periodly} activity total in {units} that would make you proud.',
          recommended: {
            day: 30,
            week: 150,
            month: 600,
          },
        },
        alltime: {
          prompt: 'How much total activity do you want to reach?',
          description: 'Enter a cumulative activity target in {units}.',
        },
      },
      startingValue: {
        prompt: 'Starting activity total?',
        description: 'Your current total activity (optional).',
      },
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you log workouts?',
        description: 'How many {periods} per {parent} will you record activity?',
      },
    },
  },
  {
    id: 'steps',
    name: 'Steps',
    description: 'Track your daily step counts.',
    searchTerms: ['steps', 'walking', 'fitness', 'footprints'],
    icon: 'footprints',
    theme: 'sky',
    units: [],
    tracking: 'series', valence: 'positive',
    suggestedTarget: { type: 'period-target', period: 'day', range: [8000, 10000] },
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review steps?',
        description: 'Choose how often you want to track step totals.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} step totals or an all-time milestone.',
        options: {
          period: {
            label: '{periodly} total',
            description: 'Set a step total to hit each {period}.',
          },
          alltime: {
            label: 'All time total',
            description: 'Build toward a cumulative step milestone.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What step count per {period} feels good?',
          description: 'Enter the {periodly} step total you want to hit.',
          recommended: {
            day: [8000, 10000],
            week: [56000, 70000],
            month: [240000, 300000],
          },
        },
        alltime: {
          prompt: 'What total steps do you want to reach?',
          description: 'Enter a cumulative step milestone you want to hit.',
        },
      },
      startingValue: {
        prompt: 'Starting step total?',
        description: 'Your current total steps so far (optional).',
      },
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you log steps?',
        description: 'How many {periods} per {parent} will you record steps?',
      },
    },
  },
  {
    id: 'sleep',
    name: 'Sleep Hours',
    description: 'Track nightly sleep duration.',
    searchTerms: ['sleep', 'rest', 'hours', 'recovery'],
    icon: 'moon',
    theme: 'indigo',
    units: ['hour'],
    tracking: 'trend', valence: 'positive',
    suggestedTarget: { type: 'period-target', period: 'day', range: [7, 9] },
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review sleep?',
        description: 'Choose how often you want to record sleep.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Track {periodly} changes or aim for a target sleep value.',
        options: {
          period: {
            label: '{periodly} change',
            description: 'Target improvement each {period}.',
          },
          alltime: {
            label: 'All time target',
            description: 'Reach a specific sleep value.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What change per {period} feels good?',
          description: 'Enter the {periodly} change in {units} you want to see.',
        },
        alltime: {
          prompt: 'What sleep value are you aiming for?',
          description: 'Enter your target sleep value in {units}.',
        },
      },
      startingValue: {
        prompt: 'Starting sleep average?',
        description: 'Your current sleep average (optional).',
      },
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you log sleep?',
        description: 'How many {periods} per {parent} will you record sleep?',
      },
    },
  },
  {
    id: 'hydration',
    name: 'Water Intake',
    description: 'Track daily water intake.',
    searchTerms: ['water', 'hydration', 'ounces', 'liters'],
    icon: 'droplet',
    theme: 'blue',
    units: ['fluid-ounce', 'liter', 'milliliter'],
    tracking: 'series', valence: 'positive',
    suggestedTarget: { type: 'period-target', period: 'day', value: 64 },
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review hydration?',
        description: 'Choose how often you want to track water intake.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} intake totals or an all-time milestone.',
        options: {
          period: {
            label: '{periodly} total',
            description: 'Set a target for {units} each {period}.',
          },
          alltime: {
            label: 'All time total',
            description: 'Reach a cumulative hydration milestone.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'How much water per {period} feels good?',
          description: 'Enter the {periodly} total in {units} you want to hit.',
          recommended: {
            day: 64,
            week: 448,
            month: 1920,
          },
        },
        alltime: {
          prompt: 'What total water intake do you want to reach?',
          description: 'Enter a cumulative hydration target in {units}.',
        },
      },
      startingValue: {
        prompt: 'Starting intake?',
        description: 'Your current average intake (optional).',
      },
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you log water intake?',
        description: 'How many {periods} per {parent} will you record intake?',
      },
    },
  },
  {
    id: 'nutrition-calories',
    name: 'Calories',
    description: 'Track daily calories consumed.',
    searchTerms: ['calories', 'diet', 'nutrition', 'food'],
    icon: 'apple',
    theme: 'orange',
    units: ['calorie', 'kilocalorie'],
    tracking: 'series',
    valence: 'negative',
    suggestedTarget: { type: 'period-target', period: 'day', value: 2000 },
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review calories?',
        description: 'Choose how often you want to track calorie totals.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} limits or an all-time cap.',
        options: {
          period: {
            label: '{periodly} total',
            description: 'Set a calorie limit each {period}.',
          },
          alltime: {
            label: 'All time total',
            description: 'Stay under a cumulative calorie total.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What calorie limit per {period} feels right?',
          description: 'Enter the {periodly} limit in {units} that keeps you on track.',
          recommended: {
            day: 2000,
            week: 14000,
            month: 60000,
          },
        },
        alltime: {
          prompt: 'What total calories do you want to stay under?',
          description: 'Enter a cumulative calorie limit in {units}.',
        },
      },
      startingValue: {
        prompt: 'Starting intake?',
        description: 'Your current average intake (optional).',
      },
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you log calories?',
        description: 'How many {periods} per {parent} will you record calories?',
      },
    },
  },
  {
    id: 'mood',
    name: 'Mood',
    description: 'Track a daily mood score on a simple scale.',
    searchTerms: ['mood', 'mental health', 'wellbeing', 'smile'],
    icon: 'smile',
    theme: 'pink',
    units: [],
    tracking: 'trend', valence: 'positive',
    goalQuestions: {
      period: {
        prompt: 'How often do you want to check in on mood?',
        description: 'Choose how often you want to rate your mood.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Track {periodly} changes or aim for an all-time mood score.',
        options: {
          period: {
            label: '{periodly} change',
            description: 'Target improvement each {period}.',
          },
          alltime: {
            label: 'All time target',
            description: 'Reach a specific overall mood score.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What change per {period} feels good?',
          description: 'Enter the {periodly} change in mood score you want to see.',
        },
        alltime: {
          prompt: 'What mood score are you aiming for?',
          description: 'Enter the overall mood score you want to reach.',
        },
      },
      startingValue: {
        prompt: 'Starting mood score?',
        description: 'Your current average mood (optional).',
      },
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you log mood scores?',
        description: 'How many {periods} per {parent} will you record mood scores?',
      },
    },
  },
  {
    id: 'study-time',
    name: 'Study Time',
    description: 'Track daily study minutes or hours.',
    searchTerms: ['study', 'learning', 'reading', 'school', 'focus'],
    icon: 'book',
    theme: 'purple',
    units: ['minute', 'hour'],
    tracking: 'series', valence: 'positive',
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review study time?',
        description: 'Choose how often you want to track study totals.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} study totals or an all-time milestone.',
        options: {
          period: {
            label: '{periodly} total',
            description: 'Set a study target for each {period}.',
          },
          alltime: {
            label: 'All time total',
            description: 'Reach a cumulative study milestone.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'How many {units} per {period} feels good?',
          description: 'Enter the {periodly} study total in {units} you want to hit.',
        },
        alltime: {
          prompt: 'How much total study time do you want to reach?',
          description: 'Enter a cumulative study target in {units}.',
        },
      },
      startingValue: {
        prompt: 'Starting study total?',
        description: 'Your current total study time (optional).',
      },
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you log study time?',
        description: 'How many {periods} per {parent} will you record study time?',
      },
    },
  },
  {
    id: 'coding',
    name: 'Coding Time',
    description: 'Track daily coding minutes or commits.',
    searchTerms: ['coding', 'programming', 'commits', 'dev'],
    icon: 'code',
    theme: 'cyan',
    units: ['minute', 'hour'],
    tracking: 'series', valence: 'positive',
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review coding time?',
        description: 'Choose how often you want to track coding totals.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} coding totals or an all-time milestone.',
        options: {
          period: {
            label: '{periodly} total',
            description: 'Set a coding target for each {period}.',
          },
          alltime: {
            label: 'All time total',
            description: 'Reach a cumulative coding milestone.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'How many {units} per {period} feels good?',
          description: 'Enter the {periodly} coding total in {units} you want to hit.',
        },
        alltime: {
          prompt: 'How much total coding time do you want to reach?',
          description: 'Enter a cumulative coding target in {units}.',
        },
      },
      startingValue: {
        prompt: 'Starting coding total?',
        description: 'Your current total coding time (optional).',
      },
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you log coding time?',
        description: 'How many {periods} per {parent} will you record coding time?',
      },
    },
  },
  {
    id: 'savings',
    name: 'Savings Balance',
    description: 'Track savings balance as it grows over time.',
    searchTerms: ['savings', 'balance', 'money', 'bank'],
    icon: 'wallet',
    theme: 'emerald',
    units: [],
    usesCurrency: true,
    tracking: 'trend', valence: 'positive',
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review savings?',
        description: 'Choose how often you want to update your balance.',
        recommended: 'month',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Track {periodly} changes or set an all-time balance goal.',
        options: {
          period: {
            label: '{periodly} change',
            description: 'Target an increase each {period}.',
          },
          alltime: {
            label: 'All time target',
            description: 'Reach a specific savings balance.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What change per {period} feels good?',
          description: 'Enter the {periodly} savings increase that keeps you on track.',
        },
        alltime: {
          prompt: 'What savings balance do you want to reach?',
          description: 'Enter the total balance milestone you want to hit.',
        },
      },
      startingValue: {
        prompt: 'Starting balance?',
        description: 'Your current balance (optional).',
      },
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you log savings balance?',
        description: 'How many {periods} per {parent} will you record balance updates?',
      },
    },
  },
  {
    id: 'debt-payoff',
    name: 'Debt Payoff',
    description: 'Track a debt balance as it goes down.',
    searchTerms: ['debt', 'loan', 'payoff', 'balance'],
    icon: 'wallet',
    theme: 'red',
    units: [],
    usesCurrency: true,
    tracking: 'trend', valence: 'negative',
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review debt?',
        description: 'Choose how often you want to update your balance.',
        recommended: 'month',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Track {periodly} changes or set an all-time payoff goal.',
        options: {
          period: {
            label: '{periodly} change',
            description: 'Target a reduction each {period}.',
          },
          alltime: {
            label: 'All time target',
            description: 'Reach a specific remaining balance.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What reduction per {period} feels good?',
          description: 'Enter the {periodly} payoff amount that keeps you on track.',
        },
        alltime: {
          prompt: 'What balance do you want to reach?',
          description: 'Enter the remaining balance target you want to hit.',
        },
      },
      startingValue: {
        prompt: 'Starting balance?',
        description: 'Your current balance (optional).',
      },
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you update the balance?',
        description: 'How many {periods} per {parent} will you record balance updates?',
      },
    },
  },
];

export const DATASET_TEMPLATE_IDS = DATASET_TEMPLATES.map((template) => template.id);

export function getDatasetTemplateById(id: string): DatasetTemplate | undefined {
  return DATASET_TEMPLATES.find((template) => template.id === id);
}
