import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { Users, BookOpen, Calendar, FileText, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getBatchesByTeacher, getStudentsByBatch } from "@/lib/supabaseQueries";
import type { Batch } from "@/types";

const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [teacherBatches, setTeacherBatches] = useState<Batch[]>([]);
  const [studentCountByBatchId, setStudentCountByBatchId] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(false);

  const totalStudents = useMemo(() => {
    return teacherBatches.reduce(
      (sum, b) => sum + (studentCountByBatchId[b.id] ?? 0),
      0,
    );
  }, [studentCountByBatchId, teacherBatches]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const batches = await getBatchesByTeacher(user.id);
        setTeacherBatches(batches);

        const counts = await Promise.all(
          batches.map(async (b) => {
            const students = await getStudentsByBatch(b.id);
            return [b.id, students.length] as const;
          }),
        );
        setStudentCountByBatchId(Object.fromEntries(counts));
      } catch (error) {
        console.error("Failed to load teacher dashboard:", error);
        toast({
          title: "Error",
          description: "Failed to load teacher data from Supabase.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast, user?.id]);

  const handleViewAllTests = () => {
    toast({
      title: "Navigating",
      description: "Going to Tests & Results page...",
    });
    navigate("/teacher/tests");
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* HEADER */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Welcome, {user?.name?.split(" ")[0]}!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Here's an overview of your classes
          </p>
        </div>

        {/* STATS */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="My Batches"
            value={loading ? "..." : teacherBatches.length}
            icon={BookOpen}
            variant="primary"
          />
          <StatCard
            title="Total Students"
            value={loading ? "..." : totalStudents}
            icon={Users}
          />
          <StatCard title="Tests Created" value={0} icon={FileText} />
          <StatCard
            title="Today's Classes"
            value={2}
            icon={Calendar}
            variant="success"
          />
        </div>

        {/* MY BATCHES */}
        <div>
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <h2 className="text-lg sm:text-xl font-semibold">My Batches</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {teacherBatches.map((batch) => (
              <div
                key={batch.id}
                className="border rounded-xl sm:rounded-2xl p-4 sm:p-6 bg-card shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base sm:text-lg truncate">
                      {batch.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {batch.subject}
                    </p>
                  </div>

                  <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-primary/10 text-primary flex-shrink-0">
                    {studentCountByBatchId[batch.id] ?? 0} students
                  </span>
                </div>

                <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t">
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">{batch.schedule}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RECENT TESTS */}
        <div className="border rounded-xl sm:rounded-2xl p-4 sm:p-6 bg-card shadow-sm">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold">Recent Tests</h2>

            <Button
              variant="ghost"
              size="sm"
              className="text-primary flex items-center gap-1 text-xs sm:text-sm"
              onClick={handleViewAllTests}
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Tests are still using mock data; next step is wiring tests/results
            to Supabase.
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;

