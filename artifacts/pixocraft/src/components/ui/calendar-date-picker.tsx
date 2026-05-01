import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const selected = value ? new Date(value + "T00:00:00") : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value ? format(selected!, "dd MMM yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (d) onChange(format(d, "yyyy-MM-dd"));
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
