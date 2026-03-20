import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminBatches from "./pages/admin/AdminBatches";
import AdminTeachers from "./pages/admin/AdminTeachers";
import AdminFees from "./pages/admin/AdminFees";
import AdminAttendance from "./pages/admin/AdminAttendance";

// Teacher Pages
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import TeacherTests from "./pages/teacher/TeacherTests";
import TeacherFees from "./pages/teacher/TeacherFees";

// Parent Pages
import ParentDashboard from "./pages/parent/ParentDashboard";
import ParentAttendance from "./pages/parent/ParentAttendance";
import ParentResults from "./pages/parent/ParentResults";
import ParentFees from "./pages/parent/ParentFees";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!allowedRoles.includes(user?.role || '')) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={isAuthenticated ? <Navigate to={`/${user?.role}`} replace /> : <Landing />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to={`/${user?.role}`} replace /> : <Login />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><AdminStudents /></ProtectedRoute>} />
      <Route path="/admin/batches" element={<ProtectedRoute allowedRoles={['admin']}><AdminBatches /></ProtectedRoute>} />
      <Route path="/admin/teachers" element={<ProtectedRoute allowedRoles={['admin']}><AdminTeachers /></ProtectedRoute>} />
      <Route path="/admin/fees" element={<ProtectedRoute allowedRoles={['admin']}><AdminFees /></ProtectedRoute>} />
      <Route path="/admin/attendance" element={<ProtectedRoute allowedRoles={['admin']}><AdminAttendance /></ProtectedRoute>} />

      {/* Teacher Routes */}
      <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/attendance" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherAttendance /></ProtectedRoute>} />
      <Route path="/teacher/tests" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherTests /></ProtectedRoute>} />
      <Route path="/teacher/fees" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherFees /></ProtectedRoute>} />

      {/* Parent Routes */}
      <Route path="/parent" element={<ProtectedRoute allowedRoles={['parent']}><ParentDashboard /></ProtectedRoute>} />
      <Route path="/parent/attendance" element={<ProtectedRoute allowedRoles={['parent']}><ParentAttendance /></ProtectedRoute>} />
      <Route path="/parent/results" element={<ProtectedRoute allowedRoles={['parent']}><ParentResults /></ProtectedRoute>} />
      <Route path="/parent/fees" element={<ProtectedRoute allowedRoles={['parent']}><ParentFees /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
