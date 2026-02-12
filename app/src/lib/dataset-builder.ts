import type { DatasetIconName } from '@/lib/dataset-icons';
import type { ColorThemeName } from '@/lib/colors';
import type { GoalCondition, Tracking, Valence } from '@/features/db/localdb';

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
  sampleData: number[][];
  suggestedTarget?: {
    // 'period-change' (tracking=trend): target change per period (e.g. lose 1 pound per week)
    // 'period-target' (tracking=series): target value per period (e.g. walk 10,000 steps per day)
    // 'alltime-target': target total value by end date (e.g. save $5000 by end of year)
    // 'period-range': target range (above, below, between) per period (e.g. keep blood pressure between 70-100 each day)
    type: 'period-change' | 'period-target' | 'alltime-target' | 'period-range';
    period?: 'day' | 'week' | 'month';
    condition?: GoalCondition; // Optional condition to determine good vs bad target (e.g. only consider it good if you hit 10k steps and also improve by 500 steps from previous week)
  };
  goalQuestions: {
    period: {
      prompt: string; // Default: "What time period are you focused on?"
      description: string; // Default: "Choose how often you'd like to track progress"
      recommended?: 'day' | 'week' | 'month';
    },
    targetType: {
      prompt: string; // Default: "How will you measure success?"
      description?: string; // Default: "Track {periodly} changes or overall progress" (trend) "Focus on {periodly} totals or all-time milestones" (series)
      options: {
        period?: {
          label: string; // Default: "{Periodly} Change" (trend) or "{Periodly} Total" (series)
          description: string; // Default: "Target improvement each {period}" (trend) or "Set targets for total value each {period}" (series)
        },
        alltime?: {
          label: string; // Default: "All Time Target" (trend) or "All Time Total" (series)
          description: string; // Default: "Reach a specific overall value" (trend) or "Build towards cumulative total" (series)
        },
        range?: {
          label: string; // Default: "{Periodly} Range"
          description: string; // Default: "Stay within a target range each {period}"
        }
      }
    },
    goodValue: {
      period?: {
        prompt: string; // Default: "What's good {periodly} progress?" (trend) or "What's a good {period}?" (series)
        description: string; // Default: "Enter the {periodly} improvement that would make you proud" (trend) or "Enter the target total each {period} that would make you proud" (series)
        suggested?: {
          day?: number;
          week?: number;
          month?: number;
        }
      },
      alltime?: {
        prompt: string; // Default: "What value are you aiming for?" (series) "What total do you want to reach?" (trend)
        description: string; // Default: "Enter the overall target value you'd like to hit" (trend) "Enter a milestone total you'd like to reach" (series)
        suggested?: number; // Default is based on starting value and valence based delta (e.g. startingValue + or - 10)
      },
      range?: {
        prompt: string; // Default: "What's a good {periodly} range?"
        description: string; // Default: "Enter the target range for each {period}" (e.g. 70-100 for blood pressure)
        suggested?: {
          day?: [number, number];
          week?: [number, number];
          month?: [number, number];
        }
      }
    },
    startingValue: {
      prompt: string; // Default: "Starting from?"
      description: string; // Default: "Your current value (optional)" (trend) or "Your current total (optional)" (series)
      required?: boolean; // Default is false, if true the user must enter a starting value to proceed (e.g. for weight loss/gain goals)
      suggested?: number; // Default is based on current data, or 0
    } | null; // If null, don't show the starting value prompt
    timeline: {
      prompt: string; // Default: "How long?"
      description: string; // Default: "Time to reach goal (optional)"
    },
    activity: {
      prompt: string; // Default: "How actively will you make progress?"
      description: string; // Default: "How many {periods} per {parent} will you typically record data?"
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
    tracking: 'series',
    valence: 'positive',
    sampleData: [
      [3200, -1800, 900],
      [4100, -2600, 700],
      [2800, -3500, 600],
      [5200, -2100, 1200],
      [1900, -3200, 600],
      [8600, -2400, 1800],
      [2600, -1500, 800],
      [2200, -9800, 900],
      [4300, -2700, 1100],
      [3500, -2600, 900],
      [2400, -4100, 600],
      [9800, -3800, 3200],
    ],
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review profit?',
        description: 'Choose how often you want to track profit performance.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} profit totals or an all-time milestone.',
        options: {
          period: {
            label: '{Periodly} total',
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
          suggested: {
            day: 1000,
            week: 5000,
            month: 20000,
          },
        },
        alltime: {
          prompt: 'What total profit do you want to reach?',
          description: 'Enter the overall net profit milestone you want to hit.',
          suggested: 25000,
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
    tracking: 'series',
    valence: 'positive',
    sampleData: [
      [820, 310, 220],
      [860, 320, 230],
      [900, 340, 240],
      [760, 280, 210],
      [940, 350, 260],
      [980, 360, 270],
      [830, 300, 230],
      [1020, 380, 290],
      [1080, 400, 300],
      [920, 340, 250],
      [1120, 420, 310],
      [1180, 440, 320],
    ],
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review revenue?',
        description: 'Choose how often you want to track revenue performance.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} revenue totals or an all-time milestone.',
        options: {
          period: {
            label: '{Periodly} total',
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
          suggested: {
            day: 1000,
            week: 7000,
            month: 30000,
          },
        },
        alltime: {
          prompt: 'What total revenue do you want to reach?',
          description: 'Enter the overall revenue milestone you want to hit.',
          suggested: 50000,
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
    sampleData: [
      [1200, 450, 30],
      [950, 400, 28],
      [110, 500, 35],
      [85, 380, -25],
      [140, -550, 40],
      [70, 320, 24],
      [1600, 600, 45],
      [900, 350, -140],
      [130, -520, 36],
      [75, 300, -20],
      [1500, 580, 42],
      [88, 340, -160],
    ],
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review spending?',
        description: 'Choose how often you want to track spending totals.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} spending limits or an all-time cap.',
        options: {
          period: {
            label: '{Periodly} total',
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
          suggested: {
            day: 500,
            week: 3000,
            month: 12000,
          },
        },
        alltime: {
          prompt: 'What total spend do you want to stay under?',
          description: 'Enter a cumulative spending cap you want to maintain.',
          suggested: 20000,
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
    tracking: 'trend',
    valence: 'negative',
    sampleData: [
      [185],
      [184.6],
      [184.1],
      [184.8],
      [183.9],
      [183.4],
      [183.0],
      [183.3],
      [182.6],
      [182.2],
      [182.5],
      [181.8],
    ],
    suggestedTarget: { type: 'period-change', period: 'week', condition: { condition: 'below', value: -0.5 } },
    goalQuestions: {
      period: {
        prompt: 'How often do you want to check your weight?',
        description: 'Choose how often you want to log weigh-ins.',
        recommended: 'week',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Track {periodly} loss or set an all-time goal weight.',
        options: {
          period: {
            label: '{Periodly} loss',
            description: 'Target a weight loss each {period}.',
          },
          alltime: {
            label: 'Goal weight',
            description: 'Reach a specific goal weight.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What loss per {period} feels healthy?',
          description: 'Enter the {periodly} loss in {units} that feels sustainable.',
          suggested: {
            day: -0.07,
            week: -0.5,
            month: -4,
          },
        },
        alltime: {
          prompt: 'What goal weight do you want to reach?',
          description: 'Enter your target weight in {units}.',
          suggested: 175,
        },
      },
      startingValue: {
        prompt: 'Starting weight?',
        description: 'Your current weight.',
        required: true,
        suggested: 185,
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
    tracking: 'trend',
    valence: 'positive',
    sampleData: [
      [150],
      [150.4],
      [150.9],
      [150.2],
      [151.3],
      [151.8],
      [152.4],
      [151.7],
      [152.8],
      [153.3],
      [152.6],
      [153.8],
    ],
    suggestedTarget: { type: 'period-change', period: 'week', condition: { condition: 'above', value: 0.25 } },
    goalQuestions: {
      period: {
        prompt: 'How often do you want to check your weight?',
        description: 'Choose how often you want to log weigh-ins.',
        recommended: 'week',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Track {periodly} gain or set an all-time goal weight.',
        options: {
          period: {
            label: '{Periodly} gain',
            description: 'Target a weight gain each {period}.',
          },
          alltime: {
            label: 'Goal weight',
            description: 'Reach a specific goal weight.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What gain per {period} feels healthy?',
          description: 'Enter the {periodly} gain in {units} that feels sustainable.',
          suggested: {
            day: 0.04,
            week: 0.25,
            month: 1,
          },
        },
        alltime: {
          prompt: 'What goal weight do you want to reach?',
          description: 'Enter your target weight in {units}.',
          suggested: 160,
        },
      },
      startingValue: {
        prompt: 'Starting weight?',
        description: 'Your current weight.',
        required: true,
        suggested: 150,
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
    tracking: 'trend',
    valence: 'neutral',
    sampleData: [
      [96],
      [105],
      [94],
      [96],
      [93],
      [102],
      [91],
      [93],
      [90],
      [109],
      [91],
      [88],
    ],
    suggestedTarget: { type: 'period-range', period: 'day', condition: { condition: 'inside', range: [70, 100] } },
    goalQuestions: {
      period: {
        prompt: 'How often do you want to check blood pressure?',
        description: 'Choose how often you will record readings.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Track {periodly} shifts or aim for a healthy range.',
        options: {
          period: {
            label: '{Periodly} shift',
            description: 'Target a shift each {period}.',
          },
          range: {
            label: 'Target range',
            description: 'Stay within a healthy range each {period}.',
          }
        },
      },
      goodValue: {
        period: {
          prompt: 'What shift per {period} feels realistic?',
          description: 'Enter the {periodly} shift in {units} you want to see.',
          suggested: {
            day: -0.5,
            week: -1.5,
            month: -4,
          },
        },
        range: {
          prompt: 'What reading range are you aiming for?',
          description: 'Enter your target range in {units}.',
          suggested: {
            day: [70, 100],
            week: [70, 100],
            month: [70, 100],
          },
        }
      },
      startingValue: {
        prompt: 'Starting reading?',
        description: 'Your current reading (optional).',
        suggested: 96,
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
    name: 'Exercise',
    description: 'Track daily workout minutes or activity time.',
    searchTerms: ['exercise', 'workout', 'minutes', 'fitness', 'activity'],
    icon: 'dumbbell',
    theme: 'emerald',
    units: ['minute', 'hour'],
    tracking: 'series',
    valence: 'positive',
    sampleData: [
      [25, 10, 5],
      [30, 12, 6],
      [35, 14, 8],
      [15, 6, 4],
      [40, 16, 9],
      [45, 18, 10],
      [20, 8, 5],
      [50, 20, 12],
      [55, 22, 12],
      [25, 10, 6],
      [60, 24, 13],
      [65, 26, 14],
    ],
    suggestedTarget: { type: 'period-target', period: 'day', condition: { condition: 'above', value: 30 } },
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
            label: '{Periodly} total',
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
          suggested: {
            day: 30,
            week: 150,
            month: 600,
          },
        },
        alltime: {
          prompt: 'How much total activity do you want to reach?',
          description: 'Enter a cumulative activity target in {units}.',
          suggested: 5000,
        },
      },
      startingValue: null,
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
    tracking: 'series',
    valence: 'neutral',
    sampleData: [
      [3200, 2800, 1500],
      [3400, 3000, 1600],
      [3600, 3100, 1700],
      [2800, 2400, 1200],
      [3800, 3200, 1800],
      [4000, 3400, 1900],
      [2900, 2600, 1300],
      [4200, 3500, 2000],
      [4400, 3600, 2100],
      [3000, 2700, 1400],
      [4600, 3700, 2200],
      [4800, 3900, 2300],
    ],
    suggestedTarget: { type: 'period-target', period: 'day', condition: { condition: 'above', value: 8000 } },
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
            label: '{Periodly} total',
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
          suggested: {
            day: 8000,
            week: 56000,
            month: 240000,
          },
        },
        alltime: {
          prompt: 'What total steps do you want to reach?',
          description: 'Enter a cumulative step milestone you want to hit.',
          suggested: 500000,
        },
      },
      startingValue: null,
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
    tracking: 'trend',
    valence: 'positive',
    sampleData: [
      [6.6],
      [6.7],
      [6.8],
      [6.5],
      [6.9],
      [7.0],
      [7.1],
      [6.8],
      [7.2],
      [7.3],
      [7.0],
      [7.4],
    ],
    suggestedTarget: { type: 'period-range', period: 'day', condition: { condition: 'inside', range: [7, 9] } },
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review sleep?',
        description: 'Choose how often you want to record sleep.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Track {periodly} improvements or aim for a target sleep range.',
        options: {
          period: {
            label: '{Periodly} improvement',
            description: 'Target a sleep improvement each {period}.',
          },
          range: {
            label: 'Target range',
            description: 'Stay within a healthy sleep range each {period}.',
          }
        },
      },
      goodValue: {
        period: {
          prompt: 'What improvement per {period} feels good?',
          description: 'Enter the {periodly} improvement in {units} you want to see.',
          suggested: {
            day: 0.1,
            week: 0.3,
            month: 1,
          },
        },
        range: {
          prompt: 'What sleep range are you aiming for?',
          description: 'Enter your target range in {units}.',
          suggested: {
            day: [7, 9],
            week: [7, 9],
            month: [7, 9],
          },
        }
      },
      startingValue: null,
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
    tracking: 'series',
    valence: 'positive',
    sampleData: [
      [20, 18, 16],
      [22, 20, 16],
      [24, 20, 18],
      [16, 14, 12],
      [26, 22, 18],
      [28, 24, 18],
      [18, 16, 12],
      [30, 24, 20],
      [32, 26, 20],
      [20, 16, 14],
      [34, 26, 22],
      [36, 28, 22],
    ],
    suggestedTarget: { type: 'period-target', period: 'day', condition: { condition: 'above', value: 64 } },
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
            label: '{Periodly} total',
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
          suggested: {
            day: 64,
            week: 448,
            month: 1920,
          },
        },
        alltime: {
          prompt: 'What total water intake do you want to reach?',
          description: 'Enter a cumulative hydration target in {units}.',
          suggested: 10000,
        },
      },
      startingValue: null,
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
    valence: 'neutral',
    sampleData: [
      [750, 780, 700],
      [720, 760, 680],
      [700, 740, 660],
      [820, 860, 760],
      [690, 720, 650],
      [670, 700, 640],
      [810, 840, 740],
      [660, 690, 620],
      [640, 670, 610],
      [800, 820, 730],
      [630, 660, 600],
      [620, 650, 590],
    ],
    suggestedTarget: { type: 'period-range', period: 'day', condition: { condition: 'inside', range: [1600, 2400] } },
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review calories?',
        description: 'Choose how often you want to track calorie totals.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Aim for a healthy range each {period}.',
        options: {
          range: {
            label: 'Target range',
            description: 'Stay within your calorie range each {period}.',
          }
        },
      },
      goodValue: {
        range: {
          prompt: 'What calorie range per {period} feels right?',
          description: 'Enter the {periodly} range in {units} that keeps you on track.',
          suggested: {
            day: [1600, 2400],
            week: [11200, 16800],
            month: [48000, 72000],
          },
        },
      },
      startingValue: null,
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
    tracking: 'trend',
    valence: 'positive',
    sampleData: [
      [6.2],
      [6.4],
      [6.6],
      [6.1],
      [6.8],
      [7.0],
      [7.2],
      [6.7],
      [7.3],
      [7.4],
      [6.9],
      [7.5],
    ],
    goalQuestions: {
      period: {
        prompt: 'How often do you want to check in on mood?',
        description: 'Choose how often you want to rate your mood.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Track {periodly} lifts or aim for an all-time mood score.',
        options: {
          period: {
            label: '{Periodly} lift',
            description: 'Target a mood lift each {period}.',
          },
          alltime: {
            label: 'Goal mood score',
            description: 'Reach a specific overall mood score.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What lift per {period} feels good?',
          description: 'Enter the {periodly} lift in mood score you want to see.',
          suggested: {
            day: 0.1,
            week: 0.3,
            month: 1,
          },
        },
        alltime: {
          prompt: 'What mood score are you aiming for?',
          description: 'Enter the overall mood score you want to reach.',
          suggested: 8,
        },
      },
      startingValue: {
        prompt: 'Starting mood score?',
        description: 'Your current average mood (optional).',
        suggested: 6.5,
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
    tracking: 'series',
    valence: 'positive',
    sampleData: [
      [25, 15, 10],
      [30, 18, 12],
      [35, 20, 12],
      [20, 12, 8],
      [40, 22, 14],
      [45, 24, 16],
      [25, 14, 10],
      [50, 26, 18],
      [55, 28, 18],
      [30, 16, 12],
      [60, 30, 20],
      [65, 32, 22],
    ],
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
            label: '{Periodly} total',
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
          suggested: {
            day: 30,
            week: 180,
            month: 720,
          },
        },
        alltime: {
          prompt: 'How much total study time do you want to reach?',
          description: 'Enter a cumulative study target in {units}.',
          suggested: 2000,
        },
      },
      startingValue: null,
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
    tracking: 'series',
    valence: 'positive',
    sampleData: [
      [30, 20, 10],
      [35, 22, 12],
      [40, 24, 14],
      [20, 12, 8],
      [45, 26, 16],
      [50, 28, 18],
      [25, 14, 10],
      [55, 30, 20],
      [60, 32, 22],
      [30, 18, 12],
      [65, 34, 24],
      [70, 36, 26],
    ],
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
            label: '{Periodly} total',
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
          suggested: {
            day: 45,
            week: 240,
            month: 960,
          },
        },
        alltime: {
          prompt: 'How much total coding time do you want to reach?',
          description: 'Enter a cumulative coding target in {units}.',
          suggested: 3000,
        },
      },
      startingValue: null,
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
    id: 'hobby-time',
    name: 'Hobby Time',
    description: 'Track time spent on hobbies and creative projects.',
    searchTerms: ['hobby', 'creative', 'craft', 'painting', 'music', 'project'],
    icon: 'palette',
    theme: 'teal',
    units: ['minute', 'hour'],
    tracking: 'series',
    valence: 'positive',
    sampleData: [
      [20, 12, 8],
      [25, 15, 10],
      [30, 18, 12],
      [15, 10, 6],
      [35, 20, 14],
      [40, 22, 16],
      [18, 12, 8],
      [45, 26, 18],
      [50, 28, 20],
      [22, 14, 10],
      [55, 30, 22],
      [60, 32, 24],
    ],
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review hobby time?',
        description: 'Choose how often you want to track hobby totals.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} hobby totals or an all-time milestone.',
        options: {
          period: {
            label: '{Periodly} total',
            description: 'Set a hobby time target for each {period}.',
          },
          alltime: {
            label: 'All time total',
            description: 'Reach a cumulative hobby time milestone.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'How many {units} per {period} feels good?',
          description: 'Enter the {periodly} hobby total in {units} you want to hit.',
          suggested: {
            day: 30,
            week: 150,
            month: 600,
          },
        },
        alltime: {
          prompt: 'How much total hobby time do you want to reach?',
          description: 'Enter a cumulative hobby time target in {units}.',
          suggested: 1500,
        },
      },
      startingValue: null,
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you log hobby time?',
        description: 'How many {periods} per {parent} will you record hobby time?',
      },
    },
  },
  {
    id: 'reading',
    name: 'Reading Time',
    description: 'Track daily reading minutes or hours.',
    searchTerms: ['reading', 'books', 'literature', 'study', 'pages'],
    icon: 'book',
    theme: 'amber',
    units: ['minute', 'hour'],
    tracking: 'series',
    valence: 'positive',
    sampleData: [
      [15, 10, 5],
      [20, 12, 8],
      [25, 14, 10],
      [10, 6, 4],
      [30, 16, 12],
      [35, 18, 14],
      [12, 8, 6],
      [40, 20, 16],
      [45, 22, 18],
      [18, 10, 8],
      [50, 24, 20],
      [55, 26, 22],
    ],
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review reading time?',
        description: 'Choose how often you want to track reading totals.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} reading totals or an all-time milestone.',
        options: {
          period: {
            label: '{Periodly} total',
            description: 'Set a reading target for each {period}.',
          },
          alltime: {
            label: 'All time total',
            description: 'Reach a cumulative reading milestone.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'How many {units} per {period} feels good?',
          description: 'Enter the {periodly} reading total in {units} you want to hit.',
          suggested: {
            day: 20,
            week: 120,
            month: 480,
          },
        },
        alltime: {
          prompt: 'How much total reading time do you want to reach?',
          description: 'Enter a cumulative reading target in {units}.',
          suggested: 1200,
        },
      },
      startingValue: null,
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you log reading time?',
        description: 'How many {periods} per {parent} will you record reading time?',
      },
    },
  },
  {
    id: 'meditation',
    name: 'Meditation',
    description: 'Track daily meditation or mindfulness minutes.',
    searchTerms: ['meditation', 'mindfulness', 'breathing', 'calm', 'focus'],
    icon: 'sparkle',
    theme: 'indigo',
    units: ['minute'],
    tracking: 'series',
    valence: 'positive',
    sampleData: [
      [5, 3, 2],
      [8, 4, 3],
      [10, 5, 4],
      [6, 3, 2],
      [12, 6, 4],
      [15, 7, 5],
      [7, 4, 3],
      [18, 8, 6],
      [20, 10, 6],
      [9, 5, 4],
      [22, 10, 8],
      [25, 12, 8],
    ],
    suggestedTarget: { type: 'period-target', period: 'day', condition: { condition: 'above', value: 10 } },
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review meditation?',
        description: 'Choose how often you want to track meditation minutes.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} meditation totals or an all-time milestone.',
        options: {
          period: {
            label: '{Periodly} total',
            description: 'Set a meditation target for each {period}.',
          },
          alltime: {
            label: 'All time total',
            description: 'Reach a cumulative meditation milestone.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'How many {units} per {period} feels good?',
          description: 'Enter the {periodly} meditation total in {units} you want to hit.',
          suggested: {
            day: 10,
            week: 70,
            month: 300,
          },
        },
        alltime: {
          prompt: 'How much total meditation time do you want to reach?',
          description: 'Enter a cumulative meditation target in {units}.',
          suggested: 600,
        },
      },
      startingValue: null,
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you log meditation?',
        description: 'How many {periods} per {parent} will you record meditation?',
      },
    },
  },
  {
    id: 'volunteer-time',
    name: 'Volunteer Time',
    description: 'Track hours spent volunteering or giving back.',
    searchTerms: ['volunteer', 'service', 'community', 'charity', 'giving'],
    icon: 'heart',
    theme: 'rose',
    units: ['minute', 'hour'],
    tracking: 'series',
    valence: 'positive',
    sampleData: [
      [60, 40, 20],
      [75, 50, 25],
      [90, 60, 30],
      [45, 30, 15],
      [120, 80, 40],
      [135, 90, 45],
      [50, 35, 20],
      [150, 100, 50],
      [165, 110, 55],
      [70, 45, 25],
      [180, 120, 60],
      [195, 130, 65],
    ],
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review volunteer time?',
        description: 'Choose how often you want to track volunteer totals.',
        recommended: 'week',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} volunteer totals or an all-time milestone.',
        options: {
          period: {
            label: '{Periodly} total',
            description: 'Set a volunteer time target for each {period}.',
          },
          alltime: {
            label: 'All time total',
            description: 'Reach a cumulative volunteer time milestone.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'How many {units} per {period} feels good?',
          description: 'Enter the {periodly} volunteer total in {units} you want to hit.',
          suggested: {
            day: 60,
            week: 180,
            month: 720,
          },
        },
        alltime: {
          prompt: 'How much total volunteer time do you want to reach?',
          description: 'Enter a cumulative volunteer target in {units}.',
          suggested: 5000,
        },
      },
      startingValue: null,
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you log volunteer time?',
        description: 'How many {periods} per {parent} will you record volunteer time?',
      },
    },
  },
  {
    id: 'practice-time',
    name: 'Practice Time',
    description: 'Track time spent practicing a skill or craft.',
    searchTerms: ['practice', 'skill', 'training', 'repetition', 'drill'],
    icon: 'book',
    theme: 'amber',
    units: ['minute', 'hour'],
    tracking: 'series',
    valence: 'positive',
    sampleData: [
      [20, 12, 8],
      [25, 15, 10],
      [30, 18, 12],
      [15, 10, 6],
      [35, 20, 14],
      [40, 22, 16],
      [18, 12, 8],
      [45, 26, 18],
      [50, 28, 20],
      [22, 14, 10],
      [55, 30, 22],
      [60, 32, 24],
    ],
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review practice time?',
        description: 'Choose how often you want to track practice totals.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} practice totals or an all-time milestone.',
        options: {
          period: {
            label: '{Periodly} total',
            description: 'Set a practice target for each {period}.',
          },
          alltime: {
            label: 'All time total',
            description: 'Reach a cumulative practice milestone.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'How many {units} per {period} feels good?',
          description: 'Enter the {periodly} practice total in {units} you want to hit.',
          suggested: {
            day: 30,
            week: 180,
            month: 720,
          },
        },
        alltime: {
          prompt: 'How much total practice time do you want to reach?',
          description: 'Enter a cumulative practice target in {units}.',
          suggested: 2000,
        },
      },
      startingValue: null,
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you log practice time?',
        description: 'How many {periods} per {parent} will you record practice time?',
      },
    },
  },
  {
    id: 'session-count',
    name: 'Session Count',
    description: 'Track how many sessions you complete over time.',
    searchTerms: ['session', 'count', 'appointments', 'classes', 'events'],
    icon: 'activity',
    theme: 'emerald',
    units: ['session'],
    tracking: 'series',
    valence: 'positive',
    sampleData: [
      [2, 1, 1],
      [3, 2, 1],
      [4, 2, 2],
      [1, 1, 0],
      [5, 3, 2],
      [6, 3, 3],
      [2, 1, 1],
      [7, 4, 3],
      [8, 4, 4],
      [3, 2, 1],
      [9, 5, 4],
      [10, 5, 5],
    ],
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review session counts?',
        description: 'Choose how often you want to track session totals.',
        recommended: 'week',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} session totals or an all-time milestone.',
        options: {
          period: {
            label: '{Periodly} total',
            description: 'Set a session target for each {period}.',
          },
          alltime: {
            label: 'All time total',
            description: 'Reach a cumulative session milestone.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'How many sessions per {period} feels good?',
          description: 'Enter the {periodly} session total you want to hit.',
          suggested: {
            day: 1,
            week: 5,
            month: 20,
          },
        },
        alltime: {
          prompt: 'How many sessions do you want to reach overall?',
          description: 'Enter a cumulative session milestone you want to hit.',
          suggested: 100,
        },
      },
      startingValue: null,
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you log sessions?',
        description: 'How many {periods} per {parent} will you record sessions?',
      },
    },
  },
  {
    id: 'daily-rating',
    name: 'Daily Rating',
    description: 'Track a daily rating on a simple numeric scale.',
    searchTerms: ['rating', 'score', 'scale', 'daily', 'check-in'],
    icon: 'smile',
    theme: 'pink',
    units: [],
    tracking: 'trend',
    valence: 'neutral',
    sampleData: [
      [6.0],
      [6.3],
      [6.6],
      [6.1],
      [6.7],
      [6.9],
      [7.1],
      [6.8],
      [7.2],
      [7.3],
      [6.9],
      [7.4],
    ],
    goalQuestions: {
      period: {
        prompt: 'How often do you want to check in?',
        description: 'Choose how often you want to record ratings.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Track {periodly} improvements or aim for an all-time rating.',
        options: {
          period: {
            label: '{Periodly} improvement',
            description: 'Target a rating improvement each {period}.',
          },
          alltime: {
            label: 'Goal rating',
            description: 'Reach a specific overall rating.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What improvement per {period} feels good?',
          description: 'Enter the {periodly} improvement in your rating you want to see.',
          suggested: {
            day: 0.1,
            week: 0.3,
            month: 1,
          },
        },
        alltime: {
          prompt: 'What rating are you aiming for?',
          description: 'Enter the overall rating you want to reach.',
          suggested: 8,
        },
      },
      startingValue: {
        prompt: 'Starting rating?',
        description: 'Your current average rating (optional).',
        suggested: 6.5,
      },
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you log ratings?',
        description: 'How many {periods} per {parent} will you record ratings?',
      },
    },
  },
  {
    id: 'screen-time',
    name: 'Screen Time',
    description: 'Track daily screen time usage.',
    searchTerms: ['screen', 'phone', 'device', 'usage', 'digital'],
    icon: 'code',
    theme: 'sky',
    units: ['minute', 'hour'],
    tracking: 'series',
    valence: 'negative',
    sampleData: [
      [180, 120, 60],
      [200, 130, 70],
      [220, 140, 80],
      [150, 100, 50],
      [240, 150, 90],
      [260, 160, 100],
      [170, 110, 60],
      [280, 170, 110],
      [300, 180, 120],
      [190, 120, 70],
      [320, 190, 130],
      [340, 200, 140],
    ],
    suggestedTarget: { type: 'period-target', period: 'day', condition: { condition: 'below', value: 180 } },
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review screen time?',
        description: 'Choose how often you want to track screen usage.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} screen time limits or an all-time cap.',
        options: {
          period: {
            label: '{Periodly} total',
            description: 'Set a screen time limit for each {period}.',
          },
          alltime: {
            label: 'All time total',
            description: 'Stay under a cumulative screen time cap.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What screen time limit per {period} feels right?',
          description: 'Enter the {periodly} limit in {units} that keeps you on track.',
          suggested: {
            day: 180,
            week: 1260,
            month: 5400,
          },
        },
        alltime: {
          prompt: 'What total screen time do you want to stay under?',
          description: 'Enter a cumulative screen time limit in {units}.',
          suggested: 5000,
        },
      },
      startingValue: null,
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you log screen time?',
        description: 'How many {periods} per {parent} will you record screen time?',
      },
    },
  },
  {
    id: 'caffeine-intake',
    name: 'Caffeine Intake',
    description: 'Track daily caffeine consumption.',
    searchTerms: ['caffeine', 'coffee', 'tea', 'energy drink', 'stimulant'],
    icon: 'apple',
    theme: 'orange',
    units: ['milligram', 'cup'],
    tracking: 'series',
    valence: 'neutral',
    sampleData: [
      [120, 80, 40],
      [140, 90, 50],
      [160, 100, 60],
      [100, 60, 40],
      [180, 110, 70],
      [200, 120, 80],
      [110, 70, 40],
      [220, 130, 90],
      [240, 140, 100],
      [130, 80, 50],
      [260, 150, 110],
      [280, 160, 120],
    ],
    suggestedTarget: { type: 'period-target', period: 'day', condition: { condition: 'below', value: 300 } },
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review caffeine intake?',
        description: 'Choose how often you want to track caffeine totals.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} intake limits or an all-time cap.',
        options: {
          period: {
            label: '{Periodly} total',
            description: 'Set a caffeine limit for each {period}.',
          },
          alltime: {
            label: 'All time total',
            description: 'Stay under a cumulative caffeine total.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What caffeine limit per {period} feels right?',
          description: 'Enter the {periodly} limit in {units} that keeps you on track.',
          suggested: {
            day: 200,
            week: 1200,
            month: 5000,
          },
        },
        alltime: {
          prompt: 'What total caffeine do you want to stay under?',
          description: 'Enter a cumulative caffeine limit in {units}.',
          suggested: 20000,
        },
      },
      startingValue: null,
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you log caffeine intake?',
        description: 'How many {periods} per {parent} will you record caffeine intake?',
      },
    },
  },
  {
    id: 'running-distance',
    name: 'Running Distance',
    description: 'Track running distance over time.',
    searchTerms: ['running', 'distance', 'miles', 'kilometers', 'cardio'],
    icon: 'footprints',
    theme: 'emerald',
    units: ['mile', 'kilometer'],
    tracking: 'series',
    valence: 'positive',
    sampleData: [
      [2.1, 1.4, 0.7],
      [2.4, 1.6, 0.8],
      [2.7, 1.8, 0.9],
      [1.5, 1.0, 0.5],
      [3.0, 2.0, 1.0],
      [3.3, 2.2, 1.1],
      [1.8, 1.2, 0.6],
      [3.6, 2.4, 1.2],
      [3.9, 2.6, 1.3],
      [2.0, 1.3, 0.7],
      [4.2, 2.8, 1.4],
      [4.5, 3.0, 1.5],
    ],
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review running distance?',
        description: 'Choose how often you want to track distance totals.',
        recommended: 'day',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Focus on {periodly} distance totals or an all-time milestone.',
        options: {
          period: {
            label: '{Periodly} total',
            description: 'Set a distance target for each {period}.',
          },
          alltime: {
            label: 'All time total',
            description: 'Reach a cumulative distance milestone.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What distance per {period} feels good?',
          description: 'Enter the {periodly} distance total in {units} you want to hit.',
          suggested: {
            day: 3,
            week: 15,
            month: 60,
          },
        },
        alltime: {
          prompt: 'What total distance do you want to reach?',
          description: 'Enter a cumulative distance milestone in {units}.',
          suggested: 100,
        },
      },
      startingValue: null,
      timeline: {
        prompt: 'How long do you want to plan ahead?',
        description: 'Time to reach the target (optional).',
      },
      activity: {
        prompt: 'How often will you log running distance?',
        description: 'How many {periods} per {parent} will you record distance?',
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
    tracking: 'trend',
    valence: 'positive',
    sampleData: [
      [2500],
      [2600],
      [2550],
      [2700],
      [2850],
      [2800],
      [2950],
      [3100],
      [3050],
      [3250],
      [3400],
      [3550],
    ],
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review savings?',
        description: 'Choose how often you want to update your balance.',
        recommended: 'month',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Track {periodly} increases or set an all-time balance goal.',
        options: {
          period: {
            label: '{Periodly} increase',
            description: 'Target a balance increase each {period}.',
          },
          alltime: {
            label: 'Savings goal',
            description: 'Reach a specific savings balance.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What increase per {period} feels good?',
          description: 'Enter the {periodly} savings increase that keeps you on track.',
          suggested: {
            day: 10,
            week: 50,
            month: 200,
          },
        },
        alltime: {
          prompt: 'What savings balance do you want to reach?',
          description: 'Enter the total balance milestone you want to hit.',
          suggested: 10000,
        },
      },
      startingValue: {
        prompt: 'Starting balance?',
        description: 'Your current balance (optional).',
        suggested: 2500,
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
    tracking: 'trend',
    valence: 'negative',
    sampleData: [
      [6200],
      [6120],
      [6050],
      [6150],
      [5980],
      [5900],
      [5960],
      [5800],
      [5720],
      [5780],
      [5600],
      [5480],
    ],
    goalQuestions: {
      period: {
        prompt: 'How often do you want to review debt?',
        description: 'Choose how often you want to update your balance.',
        recommended: 'month',
      },
      targetType: {
        prompt: 'How will you measure success?',
        description: 'Track {periodly} reductions or set an all-time payoff goal.',
        options: {
          period: {
            label: '{Periodly} reduction',
            description: 'Target a balance reduction each {period}.',
          },
          alltime: {
            label: 'Payoff target',
            description: 'Reach a specific remaining balance.',
          },
        },
      },
      goodValue: {
        period: {
          prompt: 'What reduction per {period} feels good?',
          description: 'Enter the {periodly} payoff amount that keeps you on track.',
          suggested: {
            day: 10,
            week: 50,
            month: 200,
          },
        },
        alltime: {
          prompt: 'What balance do you want to reach?',
          description: 'Enter the remaining balance target you want to hit.',
          suggested: 0,
        },
      },
      startingValue: {
        prompt: 'Starting balance?',
        description: 'Your current balance (optional).',
        suggested: 6200,
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
] satisfies DatasetTemplate[];

export type DatasetTemplateId = typeof DATASET_TEMPLATES[number]['id'];

export const DATASET_TEMPLATE_IDS = DATASET_TEMPLATES.map((template) => template.id);

export function getDatasetTemplateById(id: string): DatasetTemplate | undefined {
  return DATASET_TEMPLATES.find((template) => template.id === id);
}
