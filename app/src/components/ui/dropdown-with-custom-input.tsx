import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState } from 'react';

export interface DropdownWithCustomInputOption {
  id: string;
  content: React.ReactNode;
  onSelect: () => void;
  className?: string;
}

interface DropdownWithCustomInputProps {
  trigger: React.ReactNode;
  header?: React.ReactNode;
  options?: DropdownWithCustomInputOption[];
  emptyContent?: React.ReactNode;
  customInputValue: string;
  onCustomInputChange: (value: string) => void;
  customInputPlaceholder?: string;
  customInputType?: 'text' | 'number';
  customInputAriaLabel?: string;
  customInputClassName?: string;
  customInputMin?: number;
  customInputMax?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: 'start' | 'center' | 'end';
  contentClassName?: string;
  closeOnSelect?: boolean;
}

export function DropdownWithCustomInput({
  trigger,
  header,
  options = [],
  emptyContent,
  customInputValue,
  onCustomInputChange,
  customInputPlaceholder,
  customInputType = 'text',
  customInputAriaLabel,
  customInputClassName,
  customInputMin,
  customInputMax,
  open,
  onOpenChange,
  align = 'start',
  contentClassName,
  closeOnSelect = true,
}: DropdownWithCustomInputProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = typeof open === 'boolean';
  const isOpen = isControlled ? !!open : internalOpen;
  const setIsOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className={contentClassName} align={align}>
        {header}
        {options.length > 0 ? (
          <>
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  option.onSelect();
                  if (closeOnSelect) setIsOpen(false);
                }}
                className={option.className ?? 'w-full rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800'}
              >
                {option.content}
              </button>
            ))}
            <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2" />
          </>
        ) : emptyContent ? (
          <>
            {emptyContent}
            <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2" />
          </>
        ) : null}

        <Input
          type={customInputType}
          min={customInputMin}
          max={customInputMax}
          value={customInputValue}
          onChange={(e) => onCustomInputChange(e.target.value)}
          placeholder={customInputPlaceholder}
          className={customInputClassName ?? 'h-8 text-xs'}
          aria-label={customInputAriaLabel ?? 'Custom value'}
        />
      </PopoverContent>
    </Popover>
  );
}
