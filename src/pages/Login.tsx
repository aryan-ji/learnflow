import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Building2, Lock, Mail, Sparkles } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getActiveInstituteId } from "@/lib/tenant";

const LOGO_SRC = "/instipilot-mark.png"; // Recommended: place your logo at `public/instipilot-mark.png`
const LOGO_FALLBACK_SRC = "/learnflow-mark.png"; // Backwards-compatible fallback

export default function Login() {
  const [instituteId, setInstituteId] = useState(import.meta.env.VITE_INSTITUTE_ID ?? "inst_1");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const demoAccounts = [
    { role: "Admin", email: "admin@coaching.com", icon: "👑" },
    { role: "Teacher", email: "rahul@coaching.com", icon: "📚" },
    { role: "Parent", email: "amit.parent@email.com", icon: "👨‍👩‍👧" },
  ];

  const loginAsDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("demo123");
  };

  useEffect(() => {
    const stored = getActiveInstituteId();
    if (stored) setInstituteId(stored);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const user = await login(email, password, instituteId);
    if (user) {
      toast.success("Welcome back!");
      navigate(`/${user.role}`);
    } else {
      toast.error("Invalid credentials. Check institute code and email (or try a demo account).");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 [font-family:Poppins,system-ui,sans-serif]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Left */}
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-16">
          <div className="w-full max-w-md">
            <Button
              variant="ghost"
              className="-ml-2 mb-6 text-slate-600 hover:text-slate-900"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="mb-8 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 shadow-sm">
                <img
                  src={LOGO_SRC}
                  alt="InstiPilot"
                  className="h-10 w-10 object-contain"
                  loading="eager"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.src.endsWith(LOGO_FALLBACK_SRC)) return;
                    img.src = LOGO_FALLBACK_SRC;
                  }}
                />
              </div>
              <div className="leading-tight">
                <div className="text-2xl font-semibold tracking-tight">InstiPilot</div>
                <div className="text-sm text-slate-500">Sign in to your dashboard</div>
              </div>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-600">Use your email and password, or try a demo account.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="institute" className="text-sm font-semibold text-slate-800">
                  Institute Code
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="institute"
                    placeholder="e.g. inst_1"
                    value={instituteId}
                    onChange={(e) => setInstituteId(e.target.value)}
                    className="h-12 rounded-xl border-slate-200 bg-white pl-10 focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                    required
                  />
                </div>
                <p className="text-xs text-slate-500">Ask your admin for this code (each institute has its own).</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-800">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl border-slate-200 bg-white pl-10 focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-800">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl border-slate-200 bg-white pl-10 focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="h-12 w-full rounded-xl bg-[#2563EB] text-white hover:bg-[#2563EB]/90"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-10">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#2563EB]" />
                <p className="text-sm text-slate-600">Quick demo access</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {demoAccounts.map((account) => (
                  <button
                    key={account.role}
                    onClick={() => loginAsDemo(account.email)}
                    className="rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:bg-[#F9FAFB] hover:shadow-sm"
                    type="button"
                  >
                    <span className="mb-2 block text-2xl">{account.icon}</span>
                    <span className="text-sm font-semibold text-slate-800">{account.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="hidden flex-1 items-center justify-center border-l border-slate-100 bg-[#F9FAFB] p-10 lg:flex">
          <div className="w-full max-w-lg">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                  <img
                    src={LOGO_SRC}
                    alt="InstiPilot"
                    className="h-10 w-10 object-contain"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.src.endsWith(LOGO_FALLBACK_SRC)) return;
                      img.src = LOGO_FALLBACK_SRC;
                    }}
                  />
                </div>
                <div>
                  <div className="text-lg font-semibold tracking-tight">Attendance • Fees • Parent updates</div>
                  <div className="text-sm text-slate-600">Built for Indian coaching institutes</div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 text-sm text-slate-700">
                {[
                  "Mark attendance in seconds (mobile-first)",
                  "See paid/unpaid fees at a glance",
                  "Share clear updates with parents",
                ].map((x) => (
                  <div key={x} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[#2563EB]" />
                    <span>{x}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-xl border border-slate-200 bg-[#F9FAFB] p-4">
                <div className="text-sm font-semibold text-slate-900">Tip</div>
                <div className="mt-1 text-sm text-slate-600">Use a demo account to preview the dashboards instantly.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
