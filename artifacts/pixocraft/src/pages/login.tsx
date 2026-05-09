import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, AlertCircle, Zap, Users, BarChart2, Shield, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FEATURES = [
  { icon: Users, label: "Client Management", desc: "Track every customer, project, and invoice in one place." },
  { icon: BarChart2, label: "Revenue Analytics", desc: "Real-time charts and profit breakdowns by service type." },
  { icon: Zap, label: "Fast & Private", desc: "Your data stays yours. No third parties, no leaks." },
];

const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2.5 + 0.8,
  dur: Math.random() * 14 + 10,
  delay: Math.random() * 8,
}));

export default function Login() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const t = setInterval(() => setActiveFeature((f) => (f + 1) % FEATURES.length), 3200);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setError("");
    setLoading(true);
    const result = await login(password);
    setLoading(false);
    if (result.ok) {
      setLocation("/");
    } else {
      setError(result.error ?? "Incorrect password");
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-stretch bg-[#04040f] overflow-hidden">
      {/* ── Ambient background glows ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.12, 0.2, 0.12] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -left-32 w-[640px] h-[640px] rounded-full bg-cyan-500 blur-[140px]"
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.1, 0.17, 0.1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute -bottom-40 -right-24 w-[560px] h-[560px] rounded-full bg-violet-600 blur-[130px]"
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.04, 0.08, 0.04] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 6 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-blue-600 blur-[160px]"
        />

        {/* grid */}
        <div
          className="absolute inset-0 opacity-[0.028]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        {/* floating particles */}
        {PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-cyan-300/40"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
            }}
            animate={{ y: [0, -32, 0], opacity: [0, 0.6, 0] }}
            transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
          />
        ))}
      </div>

      {/* ── LEFT — Brand showcase (hidden on mobile) ── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] relative z-10 p-14 xl:p-20">
        {/* Logo + brand */}
        <div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-3 rounded-[22px] border border-cyan-400/20"
                style={{ borderRadius: 22 }}
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-5 rounded-[26px] border border-violet-500/10"
                style={{ borderRadius: 26 }}
              />
              <img
                src="/logo.webp"
                alt="Pixocraft"
                className="w-12 h-12 rounded-xl relative z-10 shadow-lg shadow-cyan-500/30"
              />
            </div>
            <div className="ml-2">
              <p className="text-lg font-bold text-white tracking-tight leading-none">Pixocraft</p>
              <p className="text-[11px] text-white/35 tracking-widest uppercase mt-0.5">Studio Manager</p>
            </div>
          </div>
        </div>

        {/* Center content */}
        <div className="space-y-10">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight"
            >
              Your agency,{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                fully in control.
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-4 text-white/45 text-base leading-relaxed max-w-sm"
            >
              One private dashboard to manage clients, track revenue, and run your digital studio smarter.
            </motion.p>
          </div>

          {/* Feature carousel */}
          <div className="space-y-3">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              const active = activeFeature === i;
              return (
                <motion.div
                  key={feat.label}
                  animate={{ opacity: active ? 1 : 0.38, x: active ? 0 : -4 }}
                  transition={{ duration: 0.35 }}
                  className={`flex items-start gap-4 rounded-xl px-4 py-3 border transition-colors duration-300 ${
                    active
                      ? "bg-white/[0.04] border-white/[0.09]"
                      : "bg-transparent border-transparent"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${
                      active
                        ? "bg-gradient-to-br from-cyan-500/30 to-violet-600/20 text-cyan-300"
                        : "bg-white/[0.04] text-white/30"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold transition-colors duration-300 ${active ? "text-white" : "text-white/40"}`}>
                      {feat.label}
                    </p>
                    <p className={`text-xs leading-relaxed mt-0.5 transition-colors duration-300 ${active ? "text-white/50" : "text-white/20"}`}>
                      {feat.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom stat pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-3 flex-wrap"
        >
          {[
            { label: "Clients tracked", value: "∞" },
            { label: "Revenue visibility", value: "100%" },
            { label: "Private access", value: "🔐" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/[0.07] px-3.5 py-1.5"
            >
              <span className="text-sm font-semibold text-cyan-300">{s.value}</span>
              <span className="text-xs text-white/35">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── RIGHT — Login form ── */}
      <div className="flex-1 flex items-center justify-center relative z-10 p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile-only logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="relative inline-block mb-4">
              <motion.div
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-cyan-500/25 to-violet-600/15 blur-md"
              />
              <img
                src="/logo.webp"
                alt="Pixocraft"
                className="w-16 h-16 rounded-2xl relative z-10 shadow-xl shadow-cyan-500/25"
              />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Pixocraft</h1>
            <p className="text-white/35 text-xs mt-1 tracking-widest uppercase">Studio Manager</p>
          </div>

          {/* Card */}
          <div className="relative">
            {/* Animated glow border */}
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -inset-px rounded-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(0,231,255,0.3), rgba(139,92,246,0.2), rgba(0,231,255,0.1))",
              }}
            />
            <div className="relative rounded-2xl bg-[#0a0a1a]/90 backdrop-blur-2xl border border-white/[0.09] p-8 shadow-2xl shadow-black/60">
              {/* Desktop heading inside card */}
              <div className="hidden lg:block mb-7">
                <h2 className="text-xl font-bold text-white tracking-tight">Welcome back</h2>
                <p className="text-white/40 text-sm mt-1">Enter your password to access the studio.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/60 text-[11px] font-semibold uppercase tracking-widest">
                    Password
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/10 to-violet-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -m-px" />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-cyan-400/70 transition-colors duration-200 z-10" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      className="relative pl-10 pr-11 h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/18 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20 rounded-xl z-10 text-[15px]"
                      autoComplete="current-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/55 transition-colors z-10"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    className="w-full h-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white border-0 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 mt-1 group"
                    disabled={!password || loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Verifying...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Unlock Studio
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                      </span>
                    )}
                  </Button>
                </motion.div>
              </form>

              {/* Security badge */}
              <div className="mt-6 flex items-center justify-center gap-2 text-white/20">
                <Shield className="w-3.5 h-3.5" />
                <span className="text-[11px]">Private & encrypted access</span>
              </div>
            </div>
          </div>

          <p className="text-center text-white/15 text-[11px] mt-6 tracking-wide">
            Pixocraft Studio · All rights reserved
          </p>
        </motion.div>
      </div>
    </div>
  );
}
