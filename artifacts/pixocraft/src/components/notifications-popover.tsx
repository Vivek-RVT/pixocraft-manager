import { Bell, AlertCircle, AlertTriangle, Info } from "lucide-react";
import {
  useGetNotifications,
  getGetNotificationsQueryKey,
  type Notification as ApiNotification,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate } from "@/lib/format";

const iconFor = (n: ApiNotification) => {
  if (n.severity === "danger") return AlertCircle;
  if (n.severity === "warning") return AlertTriangle;
  return Info;
};

const toneFor = (n: ApiNotification) => {
  if (n.severity === "danger") return "text-red-500 bg-red-500/10";
  if (n.severity === "warning") return "text-amber-500 bg-amber-500/10";
  return "text-primary bg-primary/10";
};

export function NotificationsPopover() {
  const { data: notifications } = useGetNotifications({
    query: { queryKey: getGetNotificationsQueryKey() },
  });

  const count = notifications?.length ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="w-4 h-4" />
          {count > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b">
          <div className="font-medium text-sm">Notifications</div>
          <div className="text-xs text-muted-foreground">
            {count > 0
              ? `${count} item${count > 1 ? "s" : ""} need attention`
              : "You're all caught up"}
          </div>
        </div>
        <ScrollArea className="max-h-80">
          {count === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nothing urgent right now.
            </div>
          ) : (
            <ul className="py-1">
              {notifications?.map((n) => {
                const Icon = iconFor(n);
                return (
                  <li
                    key={n.id}
                    className="px-4 py-3 flex gap-3 items-start hover:bg-muted/50"
                  >
                    <div
                      className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${toneFor(n)}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium leading-snug">
                        {n.title}
                      </div>
                      <div className="text-xs text-muted-foreground leading-snug">
                        {n.message}
                      </div>
                      {n.createdAt && (
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
                          {formatDate(n.createdAt)}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
