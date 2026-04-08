import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: unknown };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown) {
    console.error("App crashed:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const message =
      this.state.error instanceof Error ? this.state.error.message : "Something went wrong while loading the app.";

    return (
      <div className="min-h-screen bg-white text-slate-900 [font-family:Poppins,system-ui,sans-serif]">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
          <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <img src="/instipilot-mark.png" alt="InstiPilot" className="h-12 w-12 object-contain" />
          </div>
          <div className="mt-4 text-xl font-semibold tracking-tight">InstiPilot couldn’t load</div>
          <div className="mt-2 text-sm text-slate-600">{message}</div>
          <div className="mt-6 rounded-xl border border-slate-200 bg-[#F9FAFB] p-4 text-left text-xs text-slate-700">
            <div className="font-semibold text-slate-900">Next steps</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Open DevTools → Console and copy the first red error.</li>
              <li>Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set (Netlify env too).</li>
              <li>If you enabled RLS, ensure the logged-in user is linked in `public.users` (has `auth_user_id`).</li>
            </ul>
          </div>
          <button
            className="mt-6 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB]/90"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

