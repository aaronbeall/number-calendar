import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

export interface MonthChartProps {
  days: { date: string; numbers: number[] }[];
  mode: 'serial' | 'cumulative';
  group: 'daily' | 'all';
}

export const MonthChart: React.FC<MonthChartProps> = ({ days, mode, group }) => {
  const data = useMemo(() => {
    if (group === 'daily') {
      // Daily mode: aggregate all numbers per day
      if (mode === 'serial') {
        return days.map(d => ({ date: d.date, value: d.numbers.reduce((a, b) => a + b, 0) }));
      } else {
        let sum = 0;
        return days.map(d => {
          sum += d.numbers.reduce((a, b) => a + b, 0);
          return { date: d.date, value: sum };
        });
      }
    } else {
      // All mode: individual bars for each number
      const allData: { date: string; value: number; numberIndex: number }[] = [];
      
      if (mode === 'serial') {
        days.forEach(d => {
          d.numbers.forEach((num, idx) => {
            allData.push({ 
              date: `${d.date}-${idx}`, 
              value: num, 
              numberIndex: idx 
            });
          });
        });
      } else {
        // Cumulative mode: each individual number adds to running total
        let runningTotal = 0;
        days.forEach(d => {
          d.numbers.forEach((num, idx) => {
            runningTotal += num;
            allData.push({ 
              date: `${d.date}-${idx}`, 
              value: runningTotal, 
              numberIndex: idx 
            });
          });
        });
      }
      
      return allData;
    }
  }, [days, mode, group]);

  // When showing all entries, only show one X-axis tick per day (on the first bar of that day)
  const ticks = useMemo(() => {
    if (group !== 'all') return undefined;
    const t: string[] = [];
    days.forEach(d => {
      if (d.numbers.length > 0) {
        t.push(`${d.date}-0`);
      }
    });
    return t;
  }, [days, group]);

  return (
    <div className="w-full h-48">
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No data to display</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={d => {
                if (group === 'daily') {
                  return String(new Date(d).getDate());
                } else {
                  const parts = d.split('-');
                  return String(new Date(parts.slice(0, 3).join('-')).getDate());
                }
              }} 
              interval={group === 'daily' ? 0 : undefined}
              ticks={group === 'all' ? ticks : undefined}
              fontSize={12} 
            />
            <YAxis fontSize={12} domain={['dataMin', 'dataMax']} />
            <Tooltip
              cursor={{ fill: 'rgba(16,185,129,0.08)' }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const value = payload[0].value;
                  if (typeof value !== 'number') return null;
                  let color = '#059669';
                  if (value < 0) color = '#dc2626';
                  if (value === 0) color = '#374151';
                  let formattedDate = '';
                  if (group === 'daily') {
                    const date = new Date(label);
                    formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  } else {
                    const parts = label.split('-');
                    const dateStr = parts.slice(0, 3).join('-');
                    const numberIndex = parts[3];
                    const date = new Date(dateStr);
                    const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    formattedDate = `${formatted} • Entry ${parseInt(numberIndex) + 1}`;
                  }
                  return (
                    <div className="rounded-md bg-white px-3 py-2 shadow-lg border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">{formattedDate}</div>
                      <span style={{ color, fontWeight: 600, fontSize: 16 }}>{value}</span>
                    </div>
                  );
                }
                return null;
              }}
            />
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
