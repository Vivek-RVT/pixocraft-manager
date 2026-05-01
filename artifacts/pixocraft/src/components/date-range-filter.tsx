import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

export type DateFilterPreset = "this_month" | "last_2_months" | "last_3_months" | "custom";

export interface DateFilter {
  preset: DateFilterPreset;
  from: Date;
  to: Date;
}

function getPresetRange(preset: DateFilterPreset, customFrom?: Date, customTo?: Date): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case "this_month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "last_2_months":
      return { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(now) };
    case "last_3_months":
      return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) };
    case "custom":
      return {
        from: customFrom ?? startOfMonth(now),
        to: customTo ?? endOfMonth(now),
      };
  }
}

export function getDefaultDateFilter(): DateFilter {
  const range = getPresetRange("this_month");
  return { preset: "this_month", ...range };
}

interface Props {
  value: DateFilter;
  onChange: (filter: DateFilter) => void;
  className?: string;
}

const PRESETS: { label: string; value: DateFilterPreset }[] = [
  { label: "This month", value: "this_month" },
  { label: "Last 2 months", value: "last_2_months" },
  { label: "Last 3 months", value: "last_3_months" },
  { label: "Custom range", value: "custom" },
];

export function DateRangeFilter({ value, onChange, className }: Props) {
  const [calOpen, setCalOpen] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>({
    from: value.from,
    to: value.to,
  });

  const handlePreset = (preset: DateFilterPreset) => {
    if (preset === "custom") {
      setCalOpen(true);
      return;
    }
    const range = getPresetRange(preset);
    onChange({ preset, ...range });
  };

  const handleCustomApply = () => {
    if (customRange?.from && customRange?.to) {
      onChange({ preset: "custom", from: customRange.from, to: customRange.to });
      setCalOpen(false);
    }
  };

  const label =
    value.preset !== "custom"
      ? PRESETS.find((p) => p.value === value.preset)?.label
      : `${format(value.from, "dd MMM")} – ${format(value.to, "dd MMM yyyy")}`;

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {PRESETS.filter((p) => p.value !== "custom").map((p) => (
        <Button
          key={p.value}
          variant={value.preset === p.value ? "default" : "outline"}
          size="sm"
          onClick={() => handlePreset(p.value)}
        >
          {p.label}
        </Button>
      ))}
      <Popover open={calOpen} onOpenChange={setCalOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={value.preset === "custom" ? "default" : "outline"}
            size="sm"
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {value.preset === "custom" ? label : "Custom"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <Calendar
            mode="range"
            selected={customRange}
            onSelect={setCustomRange}
            numberOfMonths={2}
          />
          <div className="flex justify-end mt-2">
            <Button size="sm" onClick={handleCustomApply} disabled={!customRange?.from || !customRange?.to}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function isInDateRange(dateStr: string, filter: DateFilter): boolean {
  const d = new Date(dateStr);
  return d >= filter.from && d <= filter.to;
}
