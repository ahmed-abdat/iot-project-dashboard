'use client';

import * as React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, subHours, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  className?: string;
}

const presets = [
  {
    label: 'Last hour',
    getValue: () => ({
      from: subHours(new Date(), 1),
      to: new Date(),
    }),
  },
  {
    label: 'Last 6 hours',
    getValue: () => ({
      from: subHours(new Date(), 6),
      to: new Date(),
    }),
  },
  {
    label: 'Last 24 hours',
    getValue: () => ({
      from: subDays(new Date(), 1),
      to: new Date(),
    }),
  },
  {
    label: 'Last 7 days',
    getValue: () => ({
      from: subDays(new Date(), 7),
      to: new Date(),
    }),
  },
  {
    label: 'Last 30 days',
    getValue: () => ({
      from: subDays(new Date(), 30),
      to: new Date(),
    }),
  },
];

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(value);
  const [open, setOpen] = React.useState(false);

  // Sync internal state with external value
  React.useEffect(() => {
    if (value) {
      setDate(value);
    }
  }, [value]);

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range);
    onChange?.(range);
  };

  const handlePresetClick = (preset: typeof presets[0]) => {
    const range = preset.getValue();
    handleSelect(range);
    setOpen(false);
  };

  const formatDateRange = () => {
    if (!date?.from) {
      return 'Pick a date range';
    }

    if (date.to) {
      // Use shorter format for better fit
      return `${format(date.from, 'MMM d, yyyy')} - ${format(date.to, 'MMM d, yyyy')}`;
    }

    return format(date.from, 'MMM d, yyyy');
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            data-empty={!date?.from}
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              'data-[empty=true]:text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate">{formatDateRange()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex flex-col sm:flex-row">
            {/* Presets sidebar */}
            <div className="flex flex-row sm:flex-col gap-1 border-b sm:border-b-0 sm:border-r p-3 sm:min-w-[140px]">
              <div className="hidden sm:block text-xs font-semibold text-muted-foreground mb-2">
                Quick Select
              </div>
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal text-xs sm:text-sm"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Calendar */}
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleSelect}
                numberOfMonths={2}
                className="hidden sm:block"
              />
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleSelect}
                numberOfMonths={1}
                className="block sm:hidden"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
