import { MonthCell } from './MonthCell';

interface MonthlyGridProps {
  year: number;
  yearData: Record<string, number[]>;
  onMonthClick: (monthNumber: number, monthName: string, numbers: number[]) => void;
  selectedPanelTitle?: string;
}

export function MonthlyGrid({ year, yearData, onMonthClick, selectedPanelTitle }: MonthlyGridProps) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getMonthNumbersAndDays = (monthNumber: number): { all: number[]; days: { date: Date; numbers: number[] }[] } => {
    const all: number[] = [];
    const days: { date: Date; numbers: number[] }[] = [];
    const lastDay = new Date(year, monthNumber, 0).getDate();
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, monthNumber - 1, day);
      const dateStr = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayNumbers = yearData[dateStr] || [];
      all.push(...dayNumbers);
      days.push({ date, numbers: dayNumbers });
    }
    return { all, days };
  };

  const currentDate = new Date();
  const isCurrentYear = year === currentDate.getFullYear();
  const isFutureYear = year > currentDate.getFullYear();

  return (
    <>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        {monthNames.map((monthName, index) => {
          const monthNumber = index + 1;
          const { all: monthNumbers, days: monthDays } = getMonthNumbersAndDays(monthNumber);
          const isCurrentMonth = isCurrentYear && monthNumber === currentDate.getMonth() + 1;
          const isFutureMonth = isFutureYear || (isCurrentYear && monthNumber > currentDate.getMonth() + 1);

          const expectedTitlePrefix = `${monthName} '`; // panel title format `${monthName} 'YY`
          const isSelected = !!selectedPanelTitle && selectedPanelTitle.startsWith(expectedTitlePrefix);
          return (
            <div
              key={monthNumber}
              className="transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-2xl"
            >
              <MonthCell
                monthName={monthName}
                numbers={monthNumbers}
                monthDays={monthDays}
                isCurrentMonth={isCurrentMonth}
                isFutureMonth={isFutureMonth}
                isSelected={isSelected}
                onClick={() => onMonthClick(monthNumber, monthName, monthNumbers)}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}