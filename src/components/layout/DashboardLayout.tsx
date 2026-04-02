import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  FileText,
  CreditCard,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  getBatches,
  getBatchesByTeacher,
  getStudents,
  getStudentsByBatch,
  getStudentsByParent,
  getTeachers,
} from "@/lib/supabaseQueries";
import type { Batch, Student, Teacher } from "@/types";

const LOGO_SRC = "/instipilot-mark.png"; // Recommended: place your logo at `public/instipilot-mark.png`
const LOGO_FALLBACK_SRC = "/learnflow-mark.png"; // Backwards-compatible fallback

interface DashboardLayoutProps {
  children: ReactNode;
}

type SearchItem =
  | { type: "student"; id: string; title: string; subtitle?: string }
  | { type: "batch"; id: string; title: string; subtitle?: string }
  | { type: "teacher"; id: string; title: string; subtitle?: string };

type RankedItem = SearchItem & { score: number };

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const levenshtein = (aRaw: string, bRaw: string) => {
  const a = normalize(aRaw);
  const b = normalize(bRaw);
  if (!a) return b.length;
  if (!b) return a.length;

  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  const curr = new Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    const aChar = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const cost = aChar === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // delete
        curr[j - 1] + 1, // insert
        prev[j - 1] + cost, // replace
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
};

const rankSearch = (queryRaw: string, items: SearchItem[], limit = 8): RankedItem[] => {
  const query = normalize(queryRaw);
  if (!query) return [];
  const short = query.length <= 2;

  const scored: RankedItem[] = [];
  for (const item of items) {
    const title = item.title ?? "";
    const subtitle = item.subtitle ?? "";
    const hay = `${title} ${subtitle}`;
    const hayNorm = normalize(hay);

    if (short) {
      if (!hayNorm.includes(query)) continue;
      scored.push({ ...item, score: 0 });
      continue;
    }

    let score = 999;

    if (hayNorm.includes(query)) {
      score = 0;
    } else {
      const words = hayNorm.split(" ").filter(Boolean);
      for (const w of words) score = Math.min(score, levenshtein(query, w));
      score = Math.min(score, levenshtein(query, hayNorm.slice(0, Math.min(hayNorm.length, query.length + 4))));
    }

    const maxDist = Math.max(2, Math.floor(query.length / 3));
    if (score > maxDist) continue;
    scored.push({ ...item, score });
  }

  scored.sort((a, b) => a.score - b.score || a.title.localeCompare(b.title));
  return scored.slice(0, limit);
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);

  const handleLogout = () => {
    logout();
    navigate("/");
    setSidebarOpen(false);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const adminNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Calendar, label: "Attendance", path: "/admin/attendance" },
    { icon: Users, label: "Students", path: "/admin/students" },
    { icon: GraduationCap, label: "Batches", path: "/admin/batches" },
    { icon: Users, label: "Teachers", path: "/admin/teachers" },
    { icon: CreditCard, label: "Fees", path: "/admin/fees" },
  ];

  const teacherNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/teacher" },
    { icon: Calendar, label: "Attendance", path: "/teacher/attendance" },
    { icon: FileText, label: "Tests", path: "/teacher/tests" },
    { icon: CreditCard, label: "Fees", path: "/teacher/fees" },
  ];

  const parentNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/parent" },
    { icon: Calendar, label: "Attendance", path: "/parent/attendance" },
    { icon: FileText, label: "Results", path: "/parent/results" },
    { icon: CreditCard, label: "Fees", path: "/parent/fees" },
  ];

  const navItems =
    user?.role === "admin"
      ? adminNavItems
      : user?.role === "teacher"
      ? teacherNavItems
      : parentNavItems;

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      const el = searchWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  useEffect(() => {
    const loadIndex = async () => {
      if (!user?.role) return;

      try {
        if (user.role === "admin") {
          const [students, batches, teachers] = await Promise.all([getStudents(), getBatches(), getTeachers()]);
          const items: SearchItem[] = [
            ...students.map((s: Student) => ({ type: "student", id: s.id, title: s.name, subtitle: s.email })),
            ...batches.map((b: Batch) => ({ type: "batch", id: b.id, title: b.name, subtitle: b.subject })),
            ...teachers.map((t: Teacher) => ({ type: "teacher", id: t.id, title: t.name, subtitle: t.email })),
          ];
          setSearchItems(items);
          return;
        }

        if (user.role === "teacher") {
          const batches = await getBatchesByTeacher(user.id);
          const studentLists = await Promise.all(batches.map((b) => getStudentsByBatch(b.id)));
          const students = Array.from(new Map(studentLists.flat().map((s) => [s.id, s] as const)).values());
          const items: SearchItem[] = [
            ...students.map((s: Student) => ({ type: "student", id: s.id, title: s.name, subtitle: s.email })),
            ...batches.map((b: Batch) => ({ type: "batch", id: b.id, title: b.name, subtitle: b.subject })),
          ];
          setSearchItems(items);
          return;
        }

        // parent
        const kids = await getStudentsByParent(user.id);
        setSearchItems(kids.map((s) => ({ type: "student", id: s.id, title: s.name, subtitle: s.email })));
      } catch (e) {
        console.error("Failed to build search index:", e);
        setSearchItems([]);
      }
    };
    loadIndex();
  }, [user?.id, user?.role]);

  const rankedResults = useMemo(() => rankSearch(searchQuery, searchItems), [searchItems, searchQuery]);

  const goToResult = (item: SearchItem) => {
    if (!user?.role) return;

    // Most useful destinations today: fees filtered by studentId, attendance by batch/teacher.
    if (item.type === "student") {
      if (user.role === "admin") navigate(`/admin/fees?studentId=${encodeURIComponent(item.id)}`);
      if (user.role === "teacher") navigate(`/teacher/fees?studentId=${encodeURIComponent(item.id)}`);
      if (user.role === "parent") navigate(`/parent/fees`, { state: { studentId: item.id } });
    }

    if (item.type === "batch") {
      if (user.role === "admin") navigate(`/admin/attendance`, { state: { batchId: item.id } });
      if (user.role === "teacher") navigate(`/teacher/attendance`, { state: { batchId: item.id } });
    }

    if (item.type === "teacher") {
      if (user.role === "admin") navigate(`/admin/teachers`);
    }

    setSearchOpen(false);
    setSearchQuery("");
    setSidebarOpen(false);
  };

  const SidebarContent = () => (
    <>
      <div className="h-16 flex items-center px-6 border-b border-slate-200 bg-white/60">
        <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 shadow-sm">
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
        <div className="ml-3 leading-tight">
          <div className="text-sm font-semibold tracking-tight text-slate-900">InstiPilot</div>
          <div className="text-xs text-slate-500 capitalize">{user?.role}</div>
        </div>
      </div>

      <nav className="mt-4 space-y-1 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`relative w-full flex items-center gap-3 px-6 py-3 text-sm transition rounded-lg
                ${isActive ? "text-[#2563EB] font-semibold bg-[#2563EB]/5" : "text-slate-600 hover:bg-[#F9FAFB] hover:text-slate-900"}`}
            >
              {isActive && (
                <span className="absolute left-0 top-0 h-full w-1 bg-[#2563EB] rounded-r" />
              )}
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-6 py-3 text-sm text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition rounded-lg"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 [font-family:Poppins,system-ui,sans-serif]">
      
      {/* MOBILE SIDEBAR */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="w-64 p-0 bg-[#F9FAFB] border-r border-slate-200 lg:hidden"
        >
          <div className="flex flex-col h-full">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex lg:fixed inset-y-0 left-0 w-64 bg-[#F9FAFB] border-r border-slate-200 z-40 flex-col">
        <SidebarContent />
      </aside>

      {/* MAIN AREA */}
      <div className="lg:ml-64">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 gap-4">
          
          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-[#F9FAFB] transition"
            >
              <Menu className="h-5 w-5 text-slate-700" />
            </button>
          </div>

          <div ref={searchWrapRef} className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchOpen(false);
                if (e.key === "Enter" && rankedResults[0]) goToResult(rankedResults[0]);
              }}
              className="w-full pl-10 pr-10 py-2 text-sm rounded-xl border border-slate-200 bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
            {searchQuery ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-white hover:text-slate-700"
                onClick={() => {
                  setSearchQuery("");
                  setSearchOpen(false);
                }}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}

            {searchOpen && searchQuery.trim() ? (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <div className="max-h-80 overflow-auto p-2">
                  {rankedResults.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-600">No results</div>
                  ) : (
                    rankedResults.map((r) => (
                      <button
                        key={`${r.type}:${r.id}`}
                        type="button"
                        onClick={() => goToResult(r)}
                        className="w-full rounded-lg px-3 py-2 text-left hover:bg-[#F9FAFB]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">{r.title}</div>
                            {r.subtitle ? <div className="truncate text-xs text-slate-500">{r.subtitle}</div> : null}
                          </div>
                          <div className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {r.type}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
                  Tip: press <span className="font-semibold text-slate-700">Enter</span> to open the top result.
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-4">
            <Bell className="h-5 w-5 text-slate-500 hidden sm:block" />
            <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-semibold text-sm">
              {user?.name?.charAt(0)}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 bg-white">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
