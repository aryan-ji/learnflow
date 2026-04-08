import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Mail, Sparkles } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LOGO_SRC = "/learnflow-mark.png";
const LOGO_FALLBACK_SRC = "/learnflow-mark.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithPassword, sendPasswordResetEmail } = useAuth();
  const navigate = useNavigate();

  const demoAccounts = [
    { role: "Admin", email: "admin@coaching.com" },
    { role: "Teacher", email: "rahul@coaching.com" },
    { role: "Parent", email: "amit.parent@email.com" },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await loginWithPassword(email, password);
      if (!res.ok) {
        toast.error(res.message ?? "Login failed.");
        return;
      }
      toast.success("Logged in.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setIsLoading(true);
    try {
      const res = await sendPasswordResetEmail(email);
      if (!res.ok) {
        toast.error(res.message ?? "Could not send password reset email.");
        return;
      }
      toast.success("Password reset email sent. Check your inbox.");
    } finally {
      setIsLoading(false);
    }
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
              <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
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
            <p className="mt-2 text-sm text-slate-600">
              Sign in with the email and password shared by your institute admin.
            </p>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
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
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
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

              <Button
                type="button"
                variant="ghost"
                disabled={isLoading || !email.trim()}
                onClick={handleForgotPassword}
                className="w-full text-slate-600 hover:text-slate-900"
              >
                Forgot password? Get reset email
              </Button>
            </form>

            <div className="mt-10">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#2563EB]" />
                <p className="text-sm text-slate-600">Quick demo emails</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {demoAccounts.map((account) => (
                  <button
                    key={account.role}
                    onClick={() => setEmail(account.email)}
                    className="rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:bg-[#F9FAFB] hover:shadow-sm"
                    type="button"
                  >
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
                  "Sign in securely with email and password.",
                  "Forgot password sends a reset email to your inbox.",
                  "Parents see only their own child's data (RLS).",
                ].map((x) => (
                  <div key={x} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[#2563EB]" />
                    <span>{x}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-xl border border-slate-200 bg-[#F9FAFB] p-4">
                <div className="text-sm font-semibold text-slate-900">Tip</div>
                <div className="mt-1 text-sm text-slate-600">
                  If you don't know your password, ask your admin or use the reset email option.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
