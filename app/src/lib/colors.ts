
// Returns a matching background and text color theme (tailwind classes) based on a seed
// Each palette item: { bg, text }
const PALETTE = [
  {
    bg: 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-500 dark:to-blue-700',
    text: 'text-blue-700 dark:text-blue-50',
  },
  {
    bg: 'bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-500 dark:to-emerald-700',
    text: 'text-emerald-600 dark:text-emerald-50',
  },
  {
    bg: 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-400 dark:to-amber-600',
    text: 'text-amber-700 dark:text-amber-50',
  },
  {
    bg: 'bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-500 dark:to-pink-700',
    text: 'text-pink-600 dark:text-pink-50',
  },
  {
    bg: 'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-500 dark:to-purple-700',
    text: 'text-purple-600 dark:text-purple-50',
  },
  {
    bg: 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-500 dark:to-red-700',
    text: 'text-red-600 dark:text-red-50',
  },
  {
    bg: 'bg-gradient-to-br from-sky-100 to-sky-200 dark:from-sky-500 dark:to-sky-700',
    text: 'text-sky-600 dark:text-sky-50',
  },
  {
    bg: 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-400 dark:to-yellow-600',
    text: 'text-yellow-700 dark:text-yellow-900',
  },
  {
    bg: 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-500 dark:to-green-700',
    text: 'text-green-700 dark:text-green-50',
  },
  {
    bg: 'bg-gradient-to-br from-violet-100 to-violet-200 dark:from-violet-500 dark:to-violet-700',
    text: 'text-violet-700 dark:text-violet-50',
  },
];

export function getSeededColorTheme(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % PALETTE.length;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
