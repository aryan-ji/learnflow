import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const LOGO_SRC = "/instipilot-mark.png"; // Recommended: place your logo at `public/instipilot-mark.png`
const LOGO_FALLBACK_SRC = "/learnflow-mark.png"; // Backwards-compatible fallback

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-white text-slate-900 [font-family:Poppins,system-ui,sans-serif]">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm">
          <img
            src={LOGO_SRC}
            alt="InstiPilot"
            className="h-12 w-12 object-contain"
            loading="eager"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src.endsWith(LOGO_FALLBACK_SRC)) return;
              img.src = LOGO_FALLBACK_SRC;
            }}
          />
        </div>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight">404</h1>
        <p className="mt-3 text-base text-slate-600">Oops! Page not found.</p>
        <div className="mt-6 flex items-center gap-3">
          <a
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white hover:bg-[#2563EB]/90"
          >
            Go to Home
          </a>
          <a
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-[#F9FAFB]"
          >
            Login
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
