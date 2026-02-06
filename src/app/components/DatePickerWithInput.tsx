'use client';

import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type Props = {
  date?: Date;
  time?: string; // HH:mm:ss
  onChange?: (nextDate: Date | undefined, nextTime: string) => void;
};

const DatePickerWithInput = ({ date: cDate, time: cTime, onChange }: Props) => {
  const [open, setOpen] = React.useState(false);

  // Uncontrolled fallback when props not supplied
  const [uDate, setUDate] = React.useState<Date | undefined>(undefined);
  const [uTime, setUTime] = React.useState<string>('10:30:00');

  const date = cDate ?? uDate;
  const time = cTime ?? uTime;

  const setDate = (d?: Date) => {
    if (onChange) onChange(d, time);
    else setUDate(d);
  };
  const setTime = (t: string) => {
    if (onChange) onChange(date, t);
    else setUTime(t);
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col gap-3">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date-picker"
              className="w-32 justify-between font-normal"
            >
              {date ? date.toLocaleDateString() : 'Select date'}
              <ChevronDownIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              onSelect={(next) => {
                setDate(next ?? undefined);
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-3">
        <Input
          type="time"
          id="time-picker"
          step="1"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    </div>
  );
};

export default DatePickerWithInput;
