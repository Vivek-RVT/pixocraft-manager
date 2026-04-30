import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor, LogOut } from "lucide-react";

const THEMES = [
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "dark" as const, label: "Dark", icon: Moon },
  { value: "system" as const, label: "System", icon: Monitor },
];

export default function Settings() {
  const { username, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-muted-foreground text-sm">
        Personalise the way Pixocraft feels.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Profile</CardTitle>
          <CardDescription>
            Signed in as the studio owner.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-chart-2 text-primary-foreground flex items-center justify-center text-base font-semibold shadow-md shadow-primary/20">
              {(username ?? "U").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="font-medium">{username ?? "User"}</div>
              <div className="text-sm text-muted-foreground">Studio owner</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Appearance</CardTitle>
          <CardDescription>
            Choose how the dashboard looks day or night.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((t) => {
              const Icon = t.icon;
              const active = theme === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`rounded-lg border p-4 text-left transition hover-elevate ${
                    active
                      ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                      : "bg-card"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 mb-2 ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <div className="text-sm font-medium">{t.label}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">About</CardTitle>
          <CardDescription>
            Pixocraft Business Manager — built for small studios who need a
            confident, calm overview of their work and money.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <div>Version 1.0.0</div>
          <div>Currency: Indian Rupee (₹)</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-destructive">
            Sign out
          </CardTitle>
          <CardDescription>
            End your session on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={logout} className="gap-2">
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
