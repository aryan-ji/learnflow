import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Clock, IndianRupee, MessageCircle, PhoneCall, ShieldCheck, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const WHATSAPP_NUMBER = "919999999999"; // TODO: replace with your number (with country code, no +)
const LOGO_SRC = "/instipilot-mark.png"; // Recommended: place your logo at `public/instipilot-mark.png`
const LOGO_FALLBACK_SRC = "/learnflow-mark.png"; // Backwards-compatible fallback

function buildWhatsAppLink(message: string) {
  const text = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function PhoneMockup({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[340px] rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]",
        className,
      )}
    >
      <div className="px-5 pt-5">
        <div className="flex items-center justify-between">
          <div className="h-2.5 w-20 rounded-full bg-slate-200" />
          <div className="h-2.5 w-12 rounded-full bg-slate-200" />
        </div>
      </div>
      <div className="p-5">
        <div className="rounded-2xl border border-slate-100 bg-[#F9FAFB] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">{title}</div>
              {subtitle ? <div className="mt-0.5 text-xs text-slate-600">{subtitle}</div> : null}
            </div>
            <div className="rounded-xl bg-white px-2.5 py-1 text-xs font-semibold text-[#2563EB] shadow-sm ring-1 ring-slate-200">
              Live
            </div>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3">
          <div className="h-2.5 w-14 rounded-full bg-slate-200" />
          <div className="h-2.5 w-14 rounded-full bg-slate-200" />
          <div className="h-2.5 w-14 rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { toast } = useToast();

  const [showSticky, setShowSticky] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [institute, setInstitute] = useState("");

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 340);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const whatsappIntroMessage = useMemo(() => {
    const safeName = name.trim() || "[Name]";
    const safeInstitute = institute.trim() || "[Institute]";
    const safePhone = phone.trim() || "[Phone]";
    return `Hi! I’m ${safeName} from ${safeInstitute}. I want to join the 2-month free pilot for InstiPilot. My phone number is ${safePhone}.`;
  }, [name, institute, phone]);

  const whatsappHref = useMemo(() => buildWhatsAppLink(whatsappIntroMessage), [whatsappIntroMessage]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !institute.trim()) {
      toast({
        title: "Missing details",
        description: "Please fill Name, Phone Number, and Institute Name.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Opening WhatsApp…", description: "Send the message to join the pilot program." });
    window.open(whatsappHref, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 [font-family:Poppins,system-ui,sans-serif]">
      <div className="pb-24 sm:pb-0">
        {/* Top navigation */}
        <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur">
          <div className="container">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                  <img
                    src={LOGO_SRC}
                    alt="InstiPilot"
                    className="h-8 w-8 object-contain"
                    loading="eager"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.src.endsWith(LOGO_FALLBACK_SRC)) return;
                      img.src = LOGO_FALLBACK_SRC;
                    }}
                  />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold tracking-tight">InstiPilot</div>
                  <div className="text-xs text-slate-500">for coaching institutes</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button asChild variant="outline" className="rounded-xl border-slate-200 bg-white hover:bg-slate-50">
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild className="rounded-xl bg-[#2563EB] text-white hover:bg-[#2563EB]/90">
                  <a href={whatsappHref} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp Us
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="relative">
          <div className="container py-10 sm:py-16">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
              <div>
                <Badge
                  className="rounded-full border-[#2563EB]/20 bg-[#2563EB]/10 px-3 py-1 text-xs font-semibold text-[#2563EB]"
                  variant="outline"
                >
                  Exclusive: Early Access Pilot Program
                </Badge>

                <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                  Stop Managing Your Coaching Center via Registers. Switch to Digital in 10 Minutes.
                </h1>
                <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                  A simple system to track attendance, manage fees, and update parents. Built for teachers who hate complicated tech.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    onClick={() => scrollToId("pilot-form")}
                    className="h-12 rounded-xl bg-[#2563EB] text-white hover:bg-[#2563EB]/90"
                    size="lg"
                  >
                    Start 2-Month Free Pilot <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-12 rounded-xl border-slate-200 bg-white hover:bg-slate-50"
                  >
                    <a href={whatsappHref} target="_blank" rel="noreferrer">
                      <PhoneCall className="h-4 w-4" />
                      Chat on WhatsApp
                    </a>
                  </Button>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: Zap, label: "1‑Tap attendance" },
                    { icon: IndianRupee, label: "Fee tracking" },
                    { icon: MessageCircle, label: "Parent updates" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                    >
                      <item.icon className="h-4 w-4 text-[#2563EB]" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:justify-self-end">
                <PhoneMockup title="Attendance Success" subtitle="Batch: Evening Maths • Today">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <div className="text-sm font-semibold text-slate-900">Marked: 18 present</div>
                      </div>
                      <div className="text-xs font-semibold text-emerald-700">Done</div>
                    </div>

                    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-slate-700">Fee status (this month)</div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="rounded-lg bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 ring-1 ring-emerald-200">
                            P
                          </span>
                          <span className="rounded-lg bg-rose-50 px-2 py-0.5 font-semibold text-rose-700 ring-1 ring-rose-200">
                            NP
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 grid gap-2">
                        {[
                          { name: "Aarav", status: "P", color: "emerald" },
                          { name: "Diya", status: "NP", color: "rose" },
                          { name: "Kabir", status: "P", color: "emerald" },
                        ].map((row) => (
                          <div key={row.name} className="flex items-center justify-between rounded-xl bg-[#F9FAFB] px-3 py-2">
                            <div className="text-sm font-medium text-slate-800">{row.name}</div>
                            <div
                              className={cn(
                                "rounded-lg px-2 py-0.5 text-xs font-semibold ring-1",
                                row.color === "emerald"
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                  : "bg-rose-50 text-rose-700 ring-rose-200",
                              )}
                            >
                              {row.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <Clock className="h-4 w-4 text-[#2563EB]" />
                        Takes ~15 seconds for a class
                      </div>
                      <div className="text-xs text-slate-500">Mobile-first</div>
                    </div>
                  </div>
                </PhoneMockup>
              </div>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="bg-[#F9FAFB]">
          <div className="container py-12 sm:py-16">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Is manual work eating your teaching time?
              </h2>
              <p className="mt-3 text-base text-slate-600">
                InstiPilot removes busywork so you can focus on teaching and results.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Clock,
                  title: "Attendance is slow",
                  desc: "Register-based attendance takes time and causes mistakes.",
                },
                {
                  icon: IndianRupee,
                  title: "Fees are a headache",
                  desc: "Tracking paid/unpaid manually is stressful every month.",
                },
                {
                  icon: PhoneCall,
                  title: "Parents keep calling",
                  desc: "Daily follow-ups for updates disturb your class flow.",
                },
              ].map((card) => (
                <div key={card.title} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#2563EB]/10 ring-1 ring-[#2563EB]/20">
                      <card.icon className="h-5 w-5 text-[#2563EB]" />
                    </div>
                    <div className="text-base font-semibold">{card.title}</div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Solution */}
        <section>
          <div className="container py-12 sm:py-16">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Everything you need, nothing you don’t.
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Simple screens, quick actions, and clear reports — designed for mobile use in Indian coaching institutes.
              </p>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {[
                {
                  icon: Zap,
                  title: "1‑Tap Attendance",
                  desc: "Mark a whole class in seconds.",
                },
                {
                  icon: IndianRupee,
                  title: "Automatic Fee Alerts",
                  desc: "No more awkward “fee reminder” calls.",
                },
                {
                  icon: MessageCircle,
                  title: "WhatsApp Reports",
                  desc: "Send monthly progress to parents automatically.",
                },
              ].map((f) => (
                <div key={f.title} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#2563EB]/10 ring-1 ring-[#2563EB]/20">
                      <f.icon className="h-5 w-5 text-[#2563EB]" />
                    </div>
                    <div className="text-base font-semibold">{f.title}</div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <PhoneMockup title="Dashboard" subtitle="Today at a glance" className="max-w-[320px]">
                <div className="grid gap-3">
                  <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                    <div className="text-xs font-semibold text-slate-700">Batches Today</div>
                    <div className="mt-2 flex items-end justify-between">
                      <div className="text-2xl font-semibold text-slate-900">5</div>
                      <div className="text-xs text-slate-500">2 pending attendance</div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                    <div className="text-xs font-semibold text-slate-700">Fees Due</div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900">12 students</div>
                      <div className="rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                        Review
                      </div>
                    </div>
                  </div>
                </div>
              </PhoneMockup>

              <PhoneMockup title="Attendance" subtitle="Fast batch marking" className="max-w-[320px]">
                <div className="grid gap-2">
                  {[
                    { name: "Aarav", mark: "Present", color: "emerald" },
                    { name: "Diya", mark: "Absent", color: "rose" },
                    { name: "Kabir", mark: "Present", color: "emerald" },
                  ].map((row) => (
                    <div key={row.name} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                      <div className="text-sm font-medium text-slate-800">{row.name}</div>
                      <div
                        className={cn(
                          "rounded-lg px-2 py-0.5 text-xs font-semibold ring-1",
                          row.color === "emerald"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-rose-50 text-rose-700 ring-rose-200",
                        )}
                      >
                        {row.mark}
                      </div>
                    </div>
                  ))}
                </div>
              </PhoneMockup>

              <PhoneMockup title="Fee Status" subtitle="Clear paid/unpaid view" className="max-w-[320px]">
                <div className="grid gap-2">
                  {[
                    { label: "Paid", value: "24", tone: "emerald" },
                    { label: "Pending", value: "12", tone: "amber" },
                    { label: "Overdue", value: "3", tone: "rose" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                      <div className="text-sm font-medium text-slate-800">{row.label}</div>
                      <div
                        className={cn(
                          "rounded-lg px-2 py-0.5 text-xs font-semibold ring-1",
                          row.tone === "emerald"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : row.tone === "amber"
                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                              : "bg-rose-50 text-rose-700 ring-rose-200",
                        )}
                      >
                        {row.value}
                      </div>
                    </div>
                  ))}
                </div>
              </PhoneMockup>
            </div>
          </div>
        </section>

        {/* Founder's promise */}
        <section className="bg-[#F9FAFB]">
          <div className="container py-12 sm:py-16">
            <div className="mx-auto max-w-3xl rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#2563EB]/10 ring-1 ring-[#2563EB]/20">
                  <ShieldCheck className="h-6 w-6 text-[#2563EB]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">Why we are offering 2 months free.</h3>
                  <p className="mt-3 leading-relaxed text-slate-600">
                    “We are looking for 10 forward-thinking teachers to join our Pilot Program. I will personally come to your institute,
                    set up your data, and ensure you save at least 5 hours every week. No credit card, no strings attached—just your honest feedback.”
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {["No credit card", "On-site setup", "Save 5+ hours/week"].map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-[#F9FAFB] px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Lead form */}
        <section id="pilot-form">
          <div className="container py-12 sm:py-16">
            <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Join the Pilot Program</h2>
                <p className="mt-3 text-base text-slate-600">
                  Fill the details and we’ll connect on WhatsApp to set up your institute in minutes.
                </p>
                <div className="mt-6 rounded-xl border border-slate-100 bg-[#F9FAFB] p-5">
                  <div className="text-sm font-semibold text-slate-900">What you get</div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-700">
                    {[
                      "Digital attendance + monthly %",
                      "Fee status in one screen",
                      "Parents see absences clearly",
                    ].map((x) => (
                      <div key={x} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                        <span>{x}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
                <form onSubmit={onSubmit} className="grid gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-800">Name</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="mt-2 h-12 rounded-xl border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-800">Phone Number</label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      inputMode="numeric"
                      className="mt-2 h-12 rounded-xl border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-800">Institute Name</label>
                    <Input
                      value={institute}
                      onChange={(e) => setInstitute(e.target.value)}
                      placeholder="Coaching / Tuition name"
                      className="mt-2 h-12 rounded-xl border-slate-200 bg-white"
                    />
                  </div>

                  <Button type="submit" className="mt-2 h-12 rounded-xl bg-[#2563EB] text-white hover:bg-[#2563EB]/90">
                    Join the Pilot Program <ArrowRight className="h-4 w-4" />
                  </Button>

                  <p className="text-xs leading-relaxed text-slate-500">
                    By submitting, you’ll be redirected to WhatsApp with a pre-filled message. No spam.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-100 bg-white">
          <div className="container py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">Built for the hardworking teachers of India.</div>
              <div className="flex items-center gap-4 text-sm">
                <a className="font-semibold text-[#2563EB] hover:underline" href={whatsappHref} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
                <a className="text-slate-500 hover:text-slate-700" href="#">
                  Privacy
                </a>
                <a className="text-slate-500 hover:text-slate-700" href="#">
                  Terms
                </a>
              </div>
            </div>
          </div>
        </footer>

        {/* Mobile sticky CTA */}
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 sm:hidden",
            showSticky ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
          )}
        >
          <div className="border-t border-slate-200 bg-white/90 backdrop-blur">
            <div className="container py-3">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => scrollToId("pilot-form")}
                  className="h-12 rounded-xl bg-[#2563EB] text-white hover:bg-[#2563EB]/90"
                >
                  Start Free
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-xl border-slate-200 bg-white hover:bg-slate-50"
                >
                  <a href={whatsappHref} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
