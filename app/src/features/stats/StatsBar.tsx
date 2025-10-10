import React from 'react';

export interface StatsBarProps {
  numbers: number[];
}

function calcStats(numbers: number[]) {
  if (!numbers.length) return null;
  const total = numbers.reduce((a, b) => a + b, 0);
  const mean = total / numbers.length;
  const sorted = [...numbers].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  return { total, mean, median, min, max };
}

export const StatsBar: React.FC<StatsBarProps> = ({ numbers }) => {
  const stats = calcStats(numbers);
  if (!stats) return (
    <div className="text-sm text-gray-500">No data</div>
  );
  
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <div className="flex flex-col">
        <span className="text-gray-500">Total</span>
        <span className={`font-semibold ${stats.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {stats.total}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-gray-500">Mean</span>
        <span className={`font-semibold ${stats.mean >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {stats.mean.toFixed(1)}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-gray-500">Median</span>
        <span className={`font-semibold ${stats.median >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {stats.median}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-gray-500">Min</span>
        <span className={`font-semibold ${stats.min >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {stats.min}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-gray-500">Max</span>
        <span className={`font-semibold ${stats.max >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {stats.max}
        </span>
      </div>
    </div>
  );
};

