import { MonthCell } from './MonthCell';

interface MonthlyGridProps {
  year: number;
  yearData: Record<string, number[]>;
  onMonthClick: (monthNumber: number, monthName: string, numbers: number[]) => void;
}

export function MonthlyGrid({ year, yearData, onMonthClick }: MonthlyGridProps) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getMonthNumbers = (monthNumber: number): number[] => {
    const monthData: number[] = [];
    
    // Get all days in the month
    const lastDay = new Date(year, monthNumber, 0).getDate();
    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayNumbers = yearData[dateStr] || [];
      monthData.push(...dayNumbers);
    }
    
    return monthData;
  };

  const currentDate = new Date();
  const isCurrentYear = year === currentDate.getFullYear();
  const isFutureYear = year > currentDate.getFullYear();

  return (
    <>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        {monthNames.map((monthName, index) => {
          const monthNumber = index + 1;
          const monthNumbers = getMonthNumbers(monthNumber);
          const isCurrentMonth = isCurrentYear && monthNumber === currentDate.getMonth() + 1;
          const isFutureMonth = isFutureYear || (isCurrentYear && monthNumber > currentDate.getMonth() + 1);

          return (
            <div
              key={monthNumber}
              className="transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-2xl"
            >
              <MonthCell
                monthName={monthName}
                numbers={monthNumbers}
                isCurrentMonth={isCurrentMonth}
                isFutureMonth={isFutureMonth}
                onClick={() => onMonthClick(monthNumber, monthName, monthNumbers)}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}