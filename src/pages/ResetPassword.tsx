import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, KeyRound } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LOGO_SRC = "/instipilot-mark.png";
const LOGO_FALLBACK_SRC = "/learnflow-mark.png";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setHasSession(Boolean(data.session));
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password updated. You can continue to the app.");
      navigate("/", { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 [font-family:Poppins,system-ui,sans-serif]">
      <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <Button
            variant="ghost"
            className="-ml-2 mb-6 text-slate-600 hover:text-slate-900"
            onClick={() => navigate("/login")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
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
              <div className="text-sm text-slate-500">Set a new password</div>
            </div>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">Reset password</h1>
          <p className="mt-2 text-sm text-slate-600">
            Opened from your reset email. Choose a new password to continue.
          </p>

          {hasSession === false ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-[#F9FAFB] p-4 text-sm text-slate-700">
              This reset link is missing a valid session. Please open the latest password reset email again.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-semibold text-slate-800">
                  New password
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-12 rounded-xl border-slate-200 bg-white pl-10 focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-800">
                  Confirm password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  required
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isLoading || hasSession === null}
                className="h-12 w-full rounded-xl bg-[#2563EB] text-white hover:bg-[#2563EB]/90"
              >
                {isLoading ? "Updating..." : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

