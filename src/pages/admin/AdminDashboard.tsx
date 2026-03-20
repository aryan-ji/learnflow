import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import {
  Users,
  GraduationCap,
  CreditCard,
  ArrowUpRight,
  Download,
} from "lucide-react";
import {
  getStudents,
  getBatches,
  getFees,
  getTeachers,
} from "@/lib/supabaseQueries";
import { Student, Batch, Fee, Teacher } from "@/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [studentsData, batchesData, feesData, teachersData] = await Promise.all([
          getStudents(),
          getBatches(),
          getFees(),
          getTeachers(),
        ]);
        setStudents(studentsData);
        setBatches(batchesData);
        setFees(feesData);
        setTeachers(teachersData);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [toast]);

  const totalStudents = students.length;
  const totalBatches = batches.length;
  const totalTeachers = teachers.length;

  const totalFeeCollection = fees
    .filter((f) => f.status === "paid")
    .reduce((sum, f) => sum + f.amount, 0);

  const recentStudents = students.slice(0, 5);
  const recentFees = fees.slice(0, 5);

  const handleDownloadReport = () => {
    toast({
      title: "Download Started",
      description: "Your report is being generated and will download shortly.",
    });
    
    // Simulate report generation
    const reportData = {
      timestamp: new Date().toISOString(),
      totalStudents,
      totalBatches,
      totalTeachers,
      totalFeeCollection,
      feeStatus: {
        paid: fees.filter((f) => f.status === "paid").length,
        pending: fees.filter((f) => f.status === "pending").length,
        overdue: fees.filter((f) => f.status === "overdue").length,
      },
    };

    // Create a downloadable file
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," +
        encodeURIComponent(JSON.stringify(reportData, null, 2))
    );
    element.setAttribute("download", `admin-report-${Date.now()}.json`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleViewAllActivity = () => {
    toast({
      title: "Navigating",
      description: "Going to Fee Management page...",
    });
    navigate("/admin/fees");
  };

  const handleViewAllStudents = () => {
    toast({
      title: "Navigating",
      description: "Going to Students page...",
    });
    navigate("/admin/students");
  };

  const handleManageBatches = () => {
    toast({
      title: "Navigating",
      description: "Going to Batches Management...",
    });
    navigate("/admin/batches");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Overview of your institute's performance
            </p>
          </div>

          <Button
            variant="outline"
            className="rounded-xl hover:border-primary hover:text-primary text-sm sm:text-base w-full sm:w-auto"
            onClick={handleDownloadReport}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Students" value={totalStudents} icon={Users} />
          <StatCard title="Active Batches" value={totalBatches} icon={GraduationCap} />
          <StatCard title="Teachers" value={totalTeachers} icon={Users} />
          <StatCard
            title="Monthly Revenue"
            value={`₹${(totalFeeCollection / 1000).toFixed(1)}K`}
            icon={CreditCard}
          />
        </div>

        {/* MIDDLE SECTION */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* RECENT ACTIVITY */}
          <div className="border rounded-xl sm:rounded-2xl p-4 sm:p-5 bg-card shadow-sm">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold">Recent Activity</h2>

              <Button
                variant="ghost"
                size="sm"
                className="text-primary flex items-center gap-1 text-xs sm:text-sm"
                onClick={handleViewAllActivity}
              >
                View all <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-4">
              {recentFees.map((fee) => {
                const student = students.find(
                  (s) => s.id === fee.studentId
                );

                return (
                  <div
                    key={fee.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {student?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Paid fees for {fee.month}
                      </p>
                    </div>

                    <StatusBadge status={fee.status} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* NEW STUDENTS */}
          <div className="border rounded-xl sm:rounded-2xl p-4 sm:p-5 bg-card shadow-sm">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold">New Students</h2>

              <Button
                variant="ghost"
                size="sm"
                className="text-primary flex items-center gap-1 text-xs sm:text-sm"
                onClick={handleViewAllStudents}
              >
                View all <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-4">
              {recentStudents.map((student) => {
                const batch = batches.find(
                  (b) => b.id === student.batchId
                );

                return (
                  <div
                    key={student.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {student.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {batch?.name}
                      </p>
                    </div>

                    <StatusBadge status={student.status} />
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* BATCH TABLE */}
        <div className="border rounded-xl sm:rounded-2xl bg-card shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold">Batches</h2>

            <Button
              variant="ghost"
              size="sm"
              className="text-primary flex items-center gap-1 text-xs sm:text-sm"
              onClick={handleManageBatches}
            >
              Manage <ArrowUpRight className="h-3 w-3" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm">Batch</th>
                  <th className="text-left px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm">Subject</th>
                  <th className="text-left px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm">Schedule</th>
                  <th className="text-left px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm">Students</th>
                </tr>
              </thead>

              <tbody>
                {batches.map((batch) => (
                  <tr
                    key={batch.id}
                    className="border-t hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 sm:px-5 py-2 sm:py-3 font-medium text-xs sm:text-sm">
                      {batch.name}
                    </td>
                    <td className="px-4 sm:px-5 py-2 sm:py-3 text-muted-foreground text-xs sm:text-sm">
                      {batch.subject}
                    </td>
                    <td className="px-4 sm:px-5 py-2 sm:py-3 text-muted-foreground text-xs sm:text-sm">
                      {batch.schedule}
                    </td>
                    <td className="px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm">
                      {students.filter((s) => s.batchId === batch.id).length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
