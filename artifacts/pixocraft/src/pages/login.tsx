import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      login(username);
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-chart-2/10 blur-[100px]" />
      </div>

      <Card className="w-full max-w-md relative z-10 glass-card border-none shadow-2xl">
        <CardHeader className="space-y-3 pb-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl mb-2 shadow-lg shadow-primary/20">
            P
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to Pixocraft Business Manager
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-background/50 h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a href="#" className="text-xs text-primary hover:underline font-medium">
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background/50 h-11"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-medium shadow-lg hover-elevate"
              disabled={!username || !password}
            >
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
