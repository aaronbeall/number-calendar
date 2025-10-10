import React, { useMemo } from 'react';

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

  // Simple bar chart rendering with Tailwind
  const maxAbsValue = Math.max(...data.map(d => Math.abs(d.value)), 1);
  const hasNegativeValues = data.some(d => d.value < 0);
  
  return (
    <div className="w-full">
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No data to display</div>
      ) : (
        <div className="flex items-end justify-center gap-1 h-32 px-2">
          {data.map((d) => {
            const heightPercent = (Math.abs(d.value) / maxAbsValue) * 100;
            const isPositive = d.value >= 0;
            
            return (
              <div key={d.date} className="flex flex-col items-center flex-1 max-w-[20px]">
                <div 
                  className="w-full flex flex-col justify-end items-center"
                  style={{ height: '100px' }}
                >
                  {hasNegativeValues && (
                    <div className="flex-1 flex items-end">
                      {!isPositive && (
                        <div
                          className="w-full bg-red-500 hover:bg-red-600 transition-colors rounded-t"
                          style={{ height: `${heightPercent}%` }}
                          title={`${d.date}: ${d.value}`}
                        />
                      )}
                    </div>
                  )}
                  
                  <div className={hasNegativeValues ? 'border-t border-gray-300' : ''} />
                  
                  <div className="flex-1 flex items-start">
                    {isPositive && (
                      <div
                        className="w-full bg-green-500 hover:bg-green-600 transition-colors rounded-t"
                        style={{ height: `${heightPercent}%` }}
                        title={`${d.date}: ${d.value}`}
                      />
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 mt-1 writing-mode-vertical transform rotate-90 origin-center">
                  {new Date(d.date).getDate()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
