import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatValue, getSupportedUnits, getUnitName, getUnitSymbol, isSameUnit, type NumberUnit } from '@/lib/friendly-numbers';
import { capitalize, cn } from '@/lib/utils';

const NONE_KEY = 'none';

/** Stable string key for a unit, for use as a select/toggle value */
function getUnitKey(unit: NumberUnit | undefined): string {
  if (!unit) return NONE_KEY;
  return unit.style === 'currency' ? `currency:${unit.currency}` : `unit:${unit.unit}`;
}

/** Display label for a unit, e.g. "Kilograms (kg)", "US dollars ($)" */
function getUnitLabel(unit: NumberUnit): string {
  const name = capitalize(getUnitName(unit));
  const symbol = getUnitSymbol(unit);
  return symbol && symbol.toLowerCase() !== name.toLowerCase() ? `${name} (${symbol})` : name;
}

type UnitToggleProps = {
  /** Suggested units to choose from (a "None" option is always included) */
  options: NumberUnit[];
  value: NumberUnit | undefined;
  onChange: (unit: NumberUnit | undefined) => void;
  className?: string;
};

/**
 * A compact toggle between a few suggested units and none.
 */
export function UnitToggle({ options, value, onChange, className }: UnitToggleProps) {
  // Keep a current unit that isn't among the suggestions selectable
  const allOptions = value && !options.some((option) => isSameUnit(option, value)) ? [...options, value] : options;
  const byKey = new Map(allOptions.map((unit) => [getUnitKey(unit), unit]));
  return (
    <ToggleGroup
      type="single"
      size="sm"
      value={getUnitKey(value)}
      onValueChange={(key) => {
        if (!key) return; // Ignore deselecting the active item
        onChange(byKey.get(key));
      }}
      className={className}
    >
      {allOptions.map((unit) => (
        <ToggleGroupItem key={getUnitKey(unit)} value={getUnitKey(unit)} aria-label={getUnitLabel(unit)} title={getUnitLabel(unit)} className="px-2.5">
          {getUnitSymbol(unit) || getUnitName(unit)}
        </ToggleGroupItem>
      ))}
      <ToggleGroupItem value={NONE_KEY} aria-label="No unit" className="px-2.5">
        None
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

type UnitPickerProps = {
  value: NumberUnit | undefined;
  onChange: (unit: NumberUnit | undefined) => void;
  /** Units to list first, e.g. from a template */
  suggested?: NumberUnit[];
  id?: string;
  className?: string;
};

type UnitOption = { key: string; unit: NumberUnit; label: string; search: string };

function toOption(unit: NumberUnit): UnitOption {
  const label = getUnitLabel(unit);
  const id = unit.style === 'currency' ? unit.currency : unit.unit;
  return { key: getUnitKey(unit), unit, label, search: `${label} ${id}` };
}

/**
 * A searchable picker of every unit and currency supported by Intl.NumberFormat.
 */
export function UnitPicker({ value, onChange, suggested = [], id, className }: UnitPickerProps) {
  const [open, setOpen] = useState(false);

  const groups = useMemo(() => {
    const { currencies, units } = getSupportedUnits();
    const isSuggested = (unit: NumberUnit) => suggested.some((s) => isSameUnit(s, unit));
    return [
      { heading: 'Suggested', options: suggested.map(toOption) },
      { heading: 'Units', options: units.filter((u) => !isSuggested(u)).map(toOption).sort((a, b) => a.label.localeCompare(b.label)) },
      { heading: 'Currencies', options: currencies.filter((u) => !isSuggested(u)).map(toOption).sort((a, b) => a.label.localeCompare(b.label)) },
    ].filter((group) => group.options.length > 0);
  }, [suggested]);

  const select = (unit: NumberUnit | undefined) => {
    onChange(unit);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', !value && 'text-slate-500 dark:text-slate-400', className)}
        >
          <span className="truncate">{value ? getUnitLabel(value) : 'None'}</span>
          <span className="flex items-center gap-2">
            {value && <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{formatValue(1234.5, { unit: value })}</span>}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search units and currencies..." />
          <CommandList>
            <CommandEmpty>No matching unit.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="none no unit" onSelect={() => select(undefined)}>
                <Check className={cn('mr-2 h-4 w-4', value ? 'opacity-0' : 'opacity-100')} />
                None
              </CommandItem>
            </CommandGroup>
            {groups.map((group) => (
              <CommandGroup key={group.heading} heading={group.heading}>
                {group.options.map((option) => (
                  <CommandItem key={option.key} value={option.search} onSelect={() => select(option.unit)}>
                    <Check className={cn('mr-2 h-4 w-4', isSameUnit(value, option.unit) ? 'opacity-100' : 'opacity-0')} />
                    <span className="flex-1 truncate">{option.label}</span>
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400 font-mono">{formatValue(1234.5, { unit: option.unit })}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
