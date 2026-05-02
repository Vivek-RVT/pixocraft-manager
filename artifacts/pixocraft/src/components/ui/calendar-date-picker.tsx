import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface CalendarDatePickerProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CalendarDatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled,
}: CalendarDatePickerProps) {
  const [open, setOpen] = useState(false);

  const parsed = value ? new Date(value + "T00:00:00") : undefined;
  const selected = parsed && !isNaN(parsed.getTime()) ? parsed : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center gap-2.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-left">
            {value ? format(selected!, "dd MMM yyyy") : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 shadow-xl border border-border/60 rounded-xl overflow-hidden"
        align="start"
        sideOffset={6}
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (d) onChange(format(d, "yyyy-MM-dd"));
            setOpen(false);
          }}
          captionLayout="dropdown"
          startMonth={new Date(2015, 0)}
          endMonth={new Date(2035, 11)}
          initialFocus
          className="[--cell-size:2.75rem] p-4"
        />
      </PopoverContent>
    </Popover>
  );
}
