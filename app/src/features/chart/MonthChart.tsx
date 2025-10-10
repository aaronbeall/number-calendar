import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export interface MonthChartProps {
  days: { date: string; numbers: number[] }[];
  mode: 'serial' | 'cumulative';
}

export const MonthChart: React.FC<MonthChartProps> = ({ days, mode }) => {
  const data = useMemo(() => {
    if (mode === 'serial') {
      return days.map(d => ({ date: d.date, value: d.numbers.reduce((a, b) => a + b, 0) }));
    } else {
      let sum = 0;
      return days.map(d => {
        sum += d.numbers.reduce((a, b) => a + b, 0);
        return { date: d.date, value: sum };
      });
    }
  }, [days, mode]);

  return (
    <div className="w-full h-48">
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No data to display</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={d => String(new Date(d).getDate())} interval={0} fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip labelFormatter={d => d} formatter={(value: number) => [value, mode === 'serial' ? 'Serial' : 'Cumulative']} />
            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
