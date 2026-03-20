import { ReactNode, useState } from "react";
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
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const LOGO_SRC = "/learnflow-mark.png"; // Place your logo file at `public/learnflow-mark.png`

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const SidebarContent = () => (
    <>
      <div className="h-16 flex items-center px-6 border-b border-slate-200 bg-white/60">
        <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 shadow-sm">
          <img src={LOGO_SRC} alt="Learn Flow" className="h-8 w-8 object-contain" loading="eager" />
        </div>
        <div className="ml-3 leading-tight">
          <div className="text-sm font-semibold tracking-tight text-slate-900">Learn Flow</div>
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

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
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
