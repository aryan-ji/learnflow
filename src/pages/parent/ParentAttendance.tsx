import { useEffect, useState } from "react";
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Calendar, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import { getAttendanceByStudent, getBatches, getStudentsByParent } from "@/lib/supabaseQueries";
import type { Attendance, Batch, Student } from "@/types";

const ParentAttendance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [children, setChildren] = useState<Student[]>([]);
  const [batchesById, setBatchesById] = useState<Record<string, Batch>>({});

  const [attendanceByStudentId, setAttendanceByStudentId] = useState<
    Record<string, Attendance[]>
  >({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadChildrenAndBatches = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const [kids, batches] = await Promise.all([
          getStudentsByParent(user.id),
          getBatches(),
        ]);
        setChildren(kids);
        const map: Record<string, Batch> = {};
        batches.forEach((b) => {
          map[b.id] = b;
        });
        setBatchesById(map);
      } catch (error) {
        console.error("Failed to load children/batches:", error);
        toast({
          title: "Error",
          description: "Failed to load data from Supabase.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    loadChildrenAndBatches();
  }, [toast, user?.id]);

  useEffect(() => {
    const loadAttendance = async () => {
      if (children.length === 0) {
        setAttendanceByStudentId({});
        return;
      }
      setLoading(true);
      try {
        const results = await Promise.all(
          children.map(async (child) => {
            const rows = await getAttendanceByStudent(child.id);
            return [child.id, rows.sort((a, b) => b.date.localeCompare(a.date))] as const;
          }),
        );
        setAttendanceByStudentId(Object.fromEntries(results));
      } catch (error) {
        console.error("Failed to load attendance:", error);
        toast({
          title: "Error",
          description: "Failed to load attendance from Supabase.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    loadAttendance();
  }, [children, toast]);

  const handleDownloadReport = (childName: string) => {
    toast({
      title: "Download Started",
      description: `Attendance report for ${childName} is being generated...`,
    });

    // Simulate generating a report
    const reportData = `Attendance Report - ${childName}\nGenerated: ${new Date().toLocaleDateString()}\n\nAttendance records exported successfully.`;
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(reportData));
    element.setAttribute("download", `attendance-${childName}-${Date.now()}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast({
      title: "Success",
      description: `Attendance report downloaded successfully!`,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Attendance Records
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            View attendance history
          </p>
        </div>

        {/* CHILDREN */}
        {children.map((child) => {
          const batch = batchesById[child.batchId];
          const attendance = attendanceByStudentId[child.id] || [];

          const stats = {
            present: attendance.filter((a) => a.status === 'present').length,
            absent: attendance.filter((a) => a.status === 'absent').length,
            late: attendance.filter((a) => a.status === 'late').length,
          };

          const total = attendance.length;

          const attendanceRate =
            total > 0
              ? Math.round((stats.present / total) * 100)
              : 0;

          return (
            <div
              key={child.id}
              className="border rounded-2xl overflow-hidden bg-card shadow-sm"
            >
              {/* TOP HEADER */}
              <div className="p-6 border-b bg-muted/30">
                <div className="flex items-center gap-4">

                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                    {child.name.charAt(0)}
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold">
                      {child.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {batch?.name}
                    </p>
                  </div>

                </div>
              </div>

              {/* STATS */}
              <div className="grid grid-cols-4 gap-4 p-6 border-b">

                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    {attendanceRate}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Rate
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-2xl font-bold">
                      {stats.present}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Present
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="text-2xl font-bold">
                      {stats.absent}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Absent
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <span className="text-2xl font-bold">
                      {stats.late}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Late
                  </p>
                </div>

              </div>

              {/* ABSENCE DATES */}
              <div className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Absent Dates
                </h3>

                <div className="space-y-2">
                  {loading && attendance.length === 0 && (
                    <div className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-4">
                      Loading...
                    </div>
                  )}
                  {(() => {
                    const absences = attendance.filter(
                      (r) => r.status === "absent",
                    );
                    if (absences.length === 0) {
                      return (
                        <div className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-4">
                          No absences recorded.
                        </div>
                      );
                    }

                    return absences.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between bg-muted/40 rounded-xl p-4 hover:bg-muted/60 transition"
                      >
                        <span>
                          {new Date(record.date).toLocaleDateString(
                            "en-IN",
                            {
                              weekday: "long",
                              day: "numeric",
                              month: "short",
                            },
                          )}
                        </span>

                        <StatusBadge status={record.status} />
                      </div>
                    ));
                  })()}
                </div>

                <div className="mt-6 pt-6 border-t">
                  <Button 
                    className="rounded-xl bg-primary text-primary-foreground"
                    onClick={() => handleDownloadReport(child.name)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
};

export default ParentAttendance;
