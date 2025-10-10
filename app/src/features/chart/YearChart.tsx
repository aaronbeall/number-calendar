import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

export type YearChartMode = 'serial' | 'cumulative';
export type YearChartGroup = 'daily' | 'monthly';

interface YearChartProps {
  year: number;
  yearData: Record<string, number[]>;
  mode: YearChartMode;
  group: YearChartGroup;
}

// Helper to group data by month
function groupByMonth(yearData: Record<string, number[]>): { month: number; numbers: number[] }[] {
  const months: { month: number; numbers: number[] }[] = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, numbers: [] }));
  Object.entries(yearData).forEach(([date, nums]) => {
    const [, month] = date.split('-').map(Number);
    if (month >= 1 && month <= 12) {
      months[month - 1].numbers.push(...nums);
    }
  });
  return months;
}

// Helper to group data by day
function groupByDay(yearData: Record<string, number[]>): { date: string; numbers: number[] }[] {
  return Object.entries(yearData).map(([date, numbers]) => ({ date, numbers }));
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const YearChart: React.FC<YearChartProps> = ({ year, yearData, mode, group }) => {
  // Prepare chart data
  const chartDataMonthly = useMemo(() => groupByMonth(yearData), [yearData]);

  // For daily mode, generate all days in the year
  const getAllYearDays = (year: number) => {
    const days: string[] = [];
    for (let m = 1; m <= 12; m++) {
      const lastDay = new Date(year, m, 0).getDate();
      for (let d = 1; d <= lastDay; d++) {
        days.push(`${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      }
    }
    return days;
  };

  let data: { label: string; value: number }[] = [];
  if (group === 'monthly') {
    let cumulative = 0;
    data = chartDataMonthly.map(({ month, numbers }) => {
      const sum = numbers.reduce((a, b) => a + b, 0);
      if (mode === 'cumulative') {
        cumulative += sum;
        return { label: monthNames[month - 1], value: cumulative };
      } else {
        return { label: monthNames[month - 1], value: sum };
      }
    });
  } else {
    // Daily mode: fill all days in year
    const allDays = getAllYearDays(year);
    let cumulative = 0;
    data = allDays.map(date => {
      const numbers = yearData[date] || [];
      const sum = numbers.reduce((a, b) => a + b, 0);
      if (mode === 'cumulative') {
        cumulative += sum;
        return { label: date, value: cumulative };
      } else {
        return { label: date, value: sum };
      }
    });
  }

  return (
    <div className="w-full h-48">
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No data to display</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickFormatter={d => {
                if (group === 'monthly') return d;
                // For daily, show month abbreviation and day number (e.g. Jan 1, Jan 7, ...)
                const parts = d.split('-');
                const month = monthNames[parseInt(parts[1], 10) - 1];
                const day = parseInt(parts[2], 10);
                return `${month} ${day}`;
              }}
              fontSize={12}
              minTickGap={20}
            />
            <YAxis fontSize={12} domain={['dataMin', 'dataMax']} />
            <Tooltip labelFormatter={d => d} formatter={(value: number) => [value, mode === 'serial' ? 'Serial' : 'Cumulative']} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={entry.value >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default YearChart;
