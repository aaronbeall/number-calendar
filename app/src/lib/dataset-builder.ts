import type { DatasetIconName } from '@/lib/dataset-icons';
import type { ColorThemeName } from '@/lib/colors';
import type { Tracking, Valence } from '@/features/db/localdb';

export type DatasetTemplateStep =
	| 'period'
	| 'valueType'
	| 'goodValue'
	| 'startingValue'
	| 'timelineLength'
	| 'timelineUnit'
	| 'activity';

export type DatasetTemplateQuestion = {
	prompt: string;
	helperText?: string;
	placeholder?: string;
	defaultValue?: string | number | boolean;
	exampleValue?: string;
};

export type DatasetTemplate = {
	id: string;
	name: string;
	description: string;
	searchTerms: string[];
	icon: DatasetIconName;
	theme: ColorThemeName;
	units: string[];
	usesCurrency?: boolean;
	settings: {
		tracking: Tracking;
		valence: Valence;
	};
	goalQuestions: Record<DatasetTemplateStep, DatasetTemplateQuestion>;
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
		settings: { tracking: 'series', valence: 'positive' },
		goalQuestions: {
			period: {
				prompt: 'How often do you want to review profit?',
			},
			valueType: {
				prompt: 'What kind of goal do you want to set?',
			},
			goodValue: {
				prompt: 'What profit per period feels like a win?',
				placeholder: 'e.g. 200',
				helperText: 'Use net profit after expenses.',
			},
			startingValue: {
				prompt: 'Current total profit (optional)',
				placeholder: 'e.g. 1200',
			},
			timelineLength: {
				prompt: 'How long should we aim for this total?',
				placeholder: 'e.g. 90',
			},
			timelineUnit: {
				prompt: 'Timeline unit',
			},
			activity: {
				prompt: 'How often will you log profit?',
				placeholder: 'e.g. 5',
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
		settings: { tracking: 'series', valence: 'positive' },
		goalQuestions: {
			period: {
				prompt: 'How often do you want to review revenue?',
			},
			valueType: {
				prompt: 'What kind of goal do you want to set?',
			},
			goodValue: {
				prompt: 'What revenue per period feels good?',
				placeholder: 'e.g. 500',
			},
			startingValue: {
				prompt: 'Current total revenue (optional)',
				placeholder: 'e.g. 2500',
			},
			timelineLength: {
				prompt: 'How long should we aim for this total?',
				placeholder: 'e.g. 90',
			},
			timelineUnit: {
				prompt: 'Timeline unit',
			},
			activity: {
				prompt: 'How often will you log revenue?',
				placeholder: 'e.g. 5',
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
		settings: { tracking: 'series', valence: 'negative' },
		goalQuestions: {
			period: {
				prompt: 'How often do you want to review spending?',
			},
			valueType: {
				prompt: 'What kind of goal do you want to set?',
			},
			goodValue: {
				prompt: 'What spending cap per period feels right?',
				placeholder: 'e.g. 50',
			},
			startingValue: {
				prompt: 'Current total spend (optional)',
				placeholder: 'e.g. 400',
			},
			timelineLength: {
				prompt: 'How long should we aim for this total?',
				placeholder: 'e.g. 90',
			},
			timelineUnit: {
				prompt: 'Timeline unit',
			},
			activity: {
				prompt: 'How often will you log spending?',
				placeholder: 'e.g. 5',
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
		settings: { tracking: 'trend', valence: 'negative' },
		goalQuestions: {
			period: {
				prompt: 'How often do you want to check your weight?',
			},
			valueType: {
				prompt: 'What kind of goal do you want to set?',
			},
			goodValue: {
				prompt: 'What change per period feels healthy?',
				placeholder: 'e.g. 1',
				helperText: 'Use pounds or kilograms.',
			},
			startingValue: {
				prompt: 'Current weight (optional)',
				placeholder: 'e.g. 180',
			},
			timelineLength: {
				prompt: 'How long do you want to give yourself?',
				placeholder: 'e.g. 90',
			},
			timelineUnit: {
				prompt: 'Timeline unit',
			},
			activity: {
				prompt: 'How often will you record weigh-ins?',
				placeholder: 'e.g. 4',
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
		settings: { tracking: 'trend', valence: 'positive' },
		goalQuestions: {
			period: {
				prompt: 'How often do you want to check your weight?',
			},
			valueType: {
				prompt: 'What kind of goal do you want to set?',
			},
			goodValue: {
				prompt: 'What change per period feels healthy?',
				placeholder: 'e.g. 0.5',
				helperText: 'Use pounds or kilograms.',
			},
			startingValue: {
				prompt: 'Current weight (optional)',
				placeholder: 'e.g. 140',
			},
			timelineLength: {
				prompt: 'How long do you want to give yourself?',
				placeholder: 'e.g. 90',
			},
			timelineUnit: {
				prompt: 'Timeline unit',
			},
			activity: {
				prompt: 'How often will you record weigh-ins?',
				placeholder: 'e.g. 4',
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
		units: ['millimeter-of-mercury', 'kilopascal'],
		settings: { tracking: 'trend', valence: 'negative' },
		goalQuestions: {
			period: {
				prompt: 'How often do you want to check blood pressure?',
			},
			valueType: {
				prompt: 'What kind of goal do you want to set?',
			},
			goodValue: {
				prompt: 'What reduction per period feels realistic?',
				placeholder: 'e.g. 2',
				helperText: 'Lower numbers are better for this dataset.',
			},
			startingValue: {
				prompt: 'Current reading (optional)',
				placeholder: 'e.g. 125',
			},
			timelineLength: {
				prompt: 'How long do you want to give yourself?',
				placeholder: 'e.g. 90',
			},
			timelineUnit: {
				prompt: 'Timeline unit',
			},
			activity: {
				prompt: 'How often will you record readings?',
				placeholder: 'e.g. 6',
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
		settings: { tracking: 'series', valence: 'positive' },
		goalQuestions: {
			period: {
				prompt: 'How often do you want to track exercise time?',
			},
			valueType: {
				prompt: 'What kind of goal do you want to set?',
			},
			goodValue: {
				prompt: 'How many minutes per period feels good?',
				placeholder: 'e.g. 30',
			},
			startingValue: {
				prompt: 'Current weekly total (optional)',
				placeholder: 'e.g. 90',
			},
			timelineLength: {
				prompt: 'How long do you want to plan ahead?',
				placeholder: 'e.g. 90',
			},
			timelineUnit: {
				prompt: 'Timeline unit',
			},
			activity: {
				prompt: 'How often will you log workouts?',
				placeholder: 'e.g. 5',
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
		settings: { tracking: 'series', valence: 'positive' },
		goalQuestions: {
			period: {
				prompt: 'How often do you want to review steps?',
			},
			valueType: {
				prompt: 'What kind of goal do you want to set?',
			},
			goodValue: {
				prompt: 'What step count per period feels good?',
				placeholder: 'e.g. 10000',
			},
			startingValue: {
				prompt: 'Current total steps (optional)',
				placeholder: 'e.g. 35000',
			},
			timelineLength: {
				prompt: 'How long do you want to plan ahead?',
				placeholder: 'e.g. 90',
			},
			timelineUnit: {
				prompt: 'Timeline unit',
			},
			activity: {
				prompt: 'How often will you log steps?',
				placeholder: 'e.g. 6',
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
		settings: { tracking: 'trend', valence: 'positive' },
		goalQuestions: {
			period: {
				prompt: 'How often do you want to review sleep?',
			},
			valueType: {
				prompt: 'What kind of goal do you want to set?',
			},
			goodValue: {
				prompt: 'What sleep value are you aiming for?',
				placeholder: 'e.g. 8',
				helperText: 'Use hours.',
			},
			startingValue: {
				prompt: 'Current sleep average (optional)',
				placeholder: 'e.g. 6.5',
			},
			timelineLength: {
				prompt: 'How long do you want to plan ahead?',
				placeholder: 'e.g. 60',
			},
			timelineUnit: {
				prompt: 'Timeline unit',
			},
			activity: {
				prompt: 'How often will you log sleep?',
				placeholder: 'e.g. 6',
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
		settings: { tracking: 'series', valence: 'positive' },
		goalQuestions: {
			period: {
				prompt: 'How often do you want to review hydration?',
			},
			valueType: {
				prompt: 'What kind of goal do you want to set?',
			},
			goodValue: {
				prompt: 'How much water per period feels good?',
				placeholder: 'e.g. 64',
				helperText: 'Use ounces or liters.',
			},
			startingValue: {
				prompt: 'Current average intake (optional)',
				placeholder: 'e.g. 32',
			},
			timelineLength: {
				prompt: 'How long do you want to plan ahead?',
				placeholder: 'e.g. 60',
			},
			timelineUnit: {
				prompt: 'Timeline unit',
			},
			activity: {
				prompt: 'How often will you log water intake?',
				placeholder: 'e.g. 6',
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
		settings: { tracking: 'series', valence: 'negative' },
		goalQuestions: {
			period: {
				prompt: 'How often do you want to review calories?',
			},
			valueType: {
				prompt: 'What kind of goal do you want to set?',
			},
			goodValue: {
				prompt: 'What calorie limit per period feels right?',
				placeholder: 'e.g. 2000',
			},
			startingValue: {
				prompt: 'Current average intake (optional)',
				placeholder: 'e.g. 2200',
			},
			timelineLength: {
				prompt: 'How long do you want to plan ahead?',
				placeholder: 'e.g. 60',
			},
			timelineUnit: {
				prompt: 'Timeline unit',
			},
			activity: {
				prompt: 'How often will you log calories?',
				placeholder: 'e.g. 6',
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
		settings: { tracking: 'trend', valence: 'positive' },
		goalQuestions: {
			period: {
				prompt: 'How often do you want to check in on mood?',
			},
			valueType: {
				prompt: 'What kind of goal do you want to set?',
			},
			goodValue: {
				prompt: 'What mood score feels good?',
				placeholder: 'e.g. 7',
			},
			startingValue: {
				prompt: 'Current average mood (optional)',
				placeholder: 'e.g. 6',
			},
			timelineLength: {
				prompt: 'How long do you want to plan ahead?',
				placeholder: 'e.g. 60',
			},
			timelineUnit: {
				prompt: 'Timeline unit',
			},
			activity: {
				prompt: 'How often will you log mood scores?',
				placeholder: 'e.g. 6',
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
		settings: { tracking: 'series', valence: 'positive' },
		goalQuestions: {
			period: {
				prompt: 'How often do you want to review study time?',
			},
			valueType: {
				prompt: 'What kind of goal do you want to set?',
			},
			goodValue: {
				prompt: 'How many minutes per period feels good?',
				placeholder: 'e.g. 60',
			},
			startingValue: {
				prompt: 'Current weekly total (optional)',
				placeholder: 'e.g. 180',
			},
			timelineLength: {
				prompt: 'How long do you want to plan ahead?',
				placeholder: 'e.g. 90',
			},
			timelineUnit: {
				prompt: 'Timeline unit',
			},
			activity: {
				prompt: 'How often will you log study time?',
				placeholder: 'e.g. 5',
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
		settings: { tracking: 'series', valence: 'positive' },
		goalQuestions: {
			period: {
				prompt: 'How often do you want to review coding time?',
			},
			valueType: {
				prompt: 'What kind of goal do you want to set?',
			},
			goodValue: {
				prompt: 'How much coding per period feels good?',
				placeholder: 'e.g. 45',
			},
			startingValue: {
				prompt: 'Current weekly total (optional)',
				placeholder: 'e.g. 120',
			},
			timelineLength: {
				prompt: 'How long do you want to plan ahead?',
				placeholder: 'e.g. 90',
			},
			timelineUnit: {
				prompt: 'Timeline unit',
			},
			activity: {
				prompt: 'How often will you log coding time?',
				placeholder: 'e.g. 5',
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
		settings: { tracking: 'trend', valence: 'positive' },
		goalQuestions: {
			period: {
				prompt: 'How often do you want to review savings?',
			},
			valueType: {
				prompt: 'What kind of goal do you want to set?',
			},
			goodValue: {
				prompt: 'What increase per period feels good?',
				placeholder: 'e.g. 500',
			},
			startingValue: {
				prompt: 'Current balance (optional)',
				placeholder: 'e.g. 2500',
			},
			timelineLength: {
				prompt: 'How long do you want to plan ahead?',
				placeholder: 'e.g. 180',
			},
			timelineUnit: {
				prompt: 'Timeline unit',
			},
			activity: {
				prompt: 'How often will you log savings balance?',
				placeholder: 'e.g. 4',
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
		settings: { tracking: 'trend', valence: 'negative' },
		goalQuestions: {
			period: {
				prompt: 'How often do you want to review debt?',
			},
			valueType: {
				prompt: 'What kind of goal do you want to set?',
			},
			goodValue: {
				prompt: 'What reduction per period feels good?',
				placeholder: 'e.g. 300',
			},
			startingValue: {
				prompt: 'Current balance (optional)',
				placeholder: 'e.g. 6000',
			},
			timelineLength: {
				prompt: 'How long do you want to plan ahead?',
				placeholder: 'e.g. 180',
			},
			timelineUnit: {
				prompt: 'Timeline unit',
			},
			activity: {
				prompt: 'How often will you update the balance?',
				placeholder: 'e.g. 4',
			},
		},
	},
];

export const DATASET_TEMPLATE_IDS = DATASET_TEMPLATES.map((template) => template.id);

export function getDatasetTemplateById(id: string): DatasetTemplate | undefined {
	return DATASET_TEMPLATES.find((template) => template.id === id);
}
