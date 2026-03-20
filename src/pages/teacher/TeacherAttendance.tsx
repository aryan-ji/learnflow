import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Check, Clock, CreditCard, History, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  getAttendanceByBatch,
  getAttendanceByBatchDate,
  getAttendanceByBatchDateRange,
  getAttendanceByStudent,
  getBatchesByTeacher,
  getFeesForStudentsByDueDateRange,
  getStudentsByBatch,
  upsertAttendanceForBatchDate,
} from "@/lib/supabaseQueries";
import type { Batch, Student } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AttendanceStatus = "present" | "absent" | "late";
type AttendanceRange = "all" | "month";

const TeacherAttendance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [attendanceRange, setAttendanceRange] = useState<AttendanceRange>("month");

  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(
    {},
  );
  const [attendancePctByStudentId, setAttendancePctByStudentId] = useState<
    Record<string, number | null>
  >({});
  const [feeStatusByStudentId, setFeeStatusByStudentId] = useState<
    Record<string, "paid" | "not_paid">
  >({});

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);
  const [historyRecords, setHistoryRecords] = useState<
    Array<{ id: string; date: string; status: AttendanceStatus }>
  >([]);

  const studentIds = useMemo(() => students.map((s) => s.id), [students]);
  const studentById = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoadingBatches(true);
      try {
        const rows = await getBatchesByTeacher(user.id);
        setBatches(rows);
        setSelectedBatch((prev) => prev || rows[0]?.id || "");
      } catch (error) {
        console.error("Failed to load batches:", error);
        toast({
          title: "Error",
          description: "Failed to load batches from Supabase.",
          variant: "destructive",
        });
      } finally {
        setLoadingBatches(false);
      }
    };
    load();
  }, [toast, user?.id]);

  useEffect(() => {
    const load = async () => {
      if (!selectedBatch) {
        setStudents([]);
        return;
      }
      setLoadingStudents(true);
      try {
        const rows = await getStudentsByBatch(selectedBatch);
        setStudents(rows);
      } catch (error) {
        console.error("Failed to load students:", error);
        toast({
          title: "Error",
          description: "Failed to load students from Supabase.",
          variant: "destructive",
        });
      } finally {
        setLoadingStudents(false);
      }
    };
    load();
  }, [selectedBatch, toast]);

  useEffect(() => {
    const load = async () => {
      if (!selectedBatch || !selectedDate) return;
      try {
        const rows = await getAttendanceByBatchDate(selectedBatch, selectedDate);
        const map: Record<string, AttendanceStatus> = {};
        for (const row of rows) {
          map[row.studentId] = row.status;
        }
        setAttendance(map);
      } catch (error) {
        console.error("Failed to load attendance:", error);
      }
    };
    load();
  }, [selectedBatch, selectedDate]);

  useEffect(() => {
    const loadPct = async () => {
      if (!selectedBatch) {
        setAttendancePctByStudentId({});
        return;
      }
      try {
        let rows = [];
        if (attendanceRange === "month") {
          const base = new Date(`${selectedDate}T00:00:00`);
          const start = new Date(base.getFullYear(), base.getMonth(), 1);
          const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
          const startIso = start.toISOString().slice(0, 10);
          const endIso = end.toISOString().slice(0, 10);
          rows = await getAttendanceByBatchDateRange({
            batchId: selectedBatch,
            startDate: startIso,
            endDate: endIso,
          });
        } else {
          rows = await getAttendanceByBatch(selectedBatch);
        }

        const totals: Record<string, { present: number; total: number }> = {};
        for (const row of rows) {
          totals[row.studentId] = totals[row.studentId] || { present: 0, total: 0 };
          totals[row.studentId].total += 1;
          if (row.status === "present") totals[row.studentId].present += 1;
        }

        const pctMap: Record<string, number | null> = {};
        for (const studentId of studentIds) {
          const t = totals[studentId];
          pctMap[studentId] = t && t.total > 0 ? Math.round((t.present / t.total) * 100) : null;
        }
        setAttendancePctByStudentId(pctMap);
      } catch (error) {
        console.error("Failed to load attendance percentages:", error);
      }
    };
    loadPct();
  }, [attendanceRange, selectedBatch, selectedDate, studentIds]);

  useEffect(() => {
    const loadFees = async () => {
      if (studentIds.length === 0) {
        setFeeStatusByStudentId({});
        return;
      }

      const base = new Date(`${selectedDate}T00:00:00`);
      const start = new Date(base.getFullYear(), base.getMonth(), 1);
      const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
      const startIso = start.toISOString().slice(0, 10);
      const endIso = end.toISOString().slice(0, 10);

      const fees = await getFeesForStudentsByDueDateRange({
        studentIds,
        startDate: startIso,
        endDate: endIso,
      });

      const paidSet = new Set(
        fees.filter((f) => f.status === "paid").map((f) => f.studentId),
      );
      const map: Record<string, "paid" | "not_paid"> = {};
      for (const id of studentIds) {
        map[id] = paidSet.has(id) ? "paid" : "not_paid";
      }
      setFeeStatusByStudentId(map);
    };
    loadFees();
  }, [selectedDate, studentIds]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!historyStudentId) {
        setHistoryRecords([]);
        return;
      }
      const rows = await getAttendanceByStudent(historyStudentId);
      setHistoryRecords(
        rows
          .map((r) => ({ id: r.id, date: r.date, status: r.status }))
          .sort((a, b) => b.date.localeCompare(a.date)),
      );
    };
    loadHistory();
  }, [historyStudentId]);

  const handleAttendance = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSubmitAttendance = async () => {
    const entries = Object.entries(attendance).map(([studentId, status]) => ({
      studentId,
      status,
    }));

    if (entries.length === 0) {
      toast({
        title: "No attendance marked",
        description: "Please mark attendance for at least one student.",
      });
      return;
    }

    setSaving(true);
    try {
      await upsertAttendanceForBatchDate({
        batchId: selectedBatch,
        date: selectedDate,
        entries,
      });
      toast({
        title: "Success",
        description: `Attendance saved for ${entries.length} student(s).`,
      });
    } catch (error) {
      console.error("Failed to save attendance:", error);
      toast({
        title: "Error",
        description: "Failed to save attendance. Check Supabase permissions.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openHistory = (studentId: string) => {
    setHistoryStudentId(studentId);
    setIsHistoryOpen(true);
  };

  const currentBatchName = batches.find((b) => b.id === selectedBatch)?.name;
  const historyStudent = historyStudentId
    ? studentById.get(historyStudentId) || null
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Attendance</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Mark daily attendance
            </p>
          </div>

          <div className="border rounded-xl px-4 sm:px-5 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 bg-card shadow-sm text-sm sm:text-base">
            <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-medium truncate">
              {new Date(selectedDate).toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>
        </div>

        {/* DATE + RANGE */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="max-w-xs">
            <label className="text-sm font-medium mb-2 block">Date</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm sm:text-base"
            />
          </div>

          <div className="sm:w-56">
            <label className="text-sm font-medium mb-2 block">Range</label>
            <select
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm sm:text-base"
              value={attendanceRange}
              onChange={(e) => setAttendanceRange(e.target.value as AttendanceRange)}
            >
              <option value="month">This month</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        {/* BATCH SELECTOR */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {loadingBatches && (
            <div className="text-sm text-muted-foreground">Loading batches...</div>
          )}
          {batches.map((batch) => (
            <button
              key={batch.id}
              onClick={() => setSelectedBatch(batch.id)}
              className={cn(
                "px-4 py-2.5 rounded-xl font-medium border transition-all whitespace-nowrap",
                selectedBatch === batch.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted",
              )}
            >
              {batch.name}
            </button>
          ))}
        </div>

        {/* ATTENDANCE LIST */}
        <div className="border rounded-2xl overflow-hidden bg-card shadow-sm">
          <div className="p-5 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{currentBatchName || "Batch"}</h2>
              <span className="text-sm text-muted-foreground">
                {loadingStudents ? "Loading..." : `${students.length} students`}
              </span>
            </div>
          </div>

          <div className="divide-y">
            {students.map((student) => {
              const status = attendance[student.id];
              const feeStatus = feeStatusByStudentId[student.id] ?? "not_paid";
              const pct = attendancePctByStudentId[student.id] ?? null;

              return (
                <div
                  key={student.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 hover:bg-muted/30 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold flex-shrink-0">
                      {student.name.charAt(0)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium truncate max-w-[14rem] sm:max-w-none">
                          {student.name}
                        </p>
                        <span
                          className={cn(
                            "text-[10px] leading-5 px-2 rounded-full border font-semibold",
                            pct === null
                              ? "bg-muted text-muted-foreground border-border"
                              : pct >= 75
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-yellow-50 text-yellow-700 border-yellow-200",
                          )}
                          title={
                            attendanceRange === "month"
                              ? "Attendance % (this month)"
                              : "Attendance % (all time)"
                          }
                        >
                          {pct === null ? "--" : `${pct}%`}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] leading-5 px-2 rounded-full border font-semibold",
                            feeStatus === "paid"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200",
                          )}
                          title={
                            feeStatus === "paid"
                              ? "Fees paid for this month"
                              : "Fees not paid for this month"
                          }
                        >
                          {feeStatus === "paid" ? "P" : "NP"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Roll: {student.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl h-9 w-9 sm:h-10 sm:w-10"
                      onClick={() =>
                        navigate(
                          `/teacher/fees?studentId=${encodeURIComponent(student.id)}`,
                        )
                      }
                      title="Go to fees"
                    >
                      <CreditCard className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl h-9 w-9 sm:h-10 sm:w-10"
                      onClick={() => openHistory(student.id)}
                      title="View attendance history"
                    >
                      <History className="h-4 w-4" />
                    </Button>

                    <button
                      onClick={() => handleAttendance(student.id, "present")}
                      className={cn(
                        "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border transition",
                        status === "present"
                          ? "bg-green-600 text-white"
                          : "bg-muted hover:bg-green-100",
                      )}
                    >
                      <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>

                    <button
                      onClick={() => handleAttendance(student.id, "absent")}
                      className={cn(
                        "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border transition",
                        status === "absent"
                          ? "bg-red-600 text-white"
                          : "bg-muted hover:bg-red-100",
                      )}
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>

                    <button
                      onClick={() => handleAttendance(student.id, "late")}
                      className={cn(
                        "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border transition",
                        status === "late"
                          ? "bg-yellow-500 text-white"
                          : "bg-muted hover:bg-yellow-100",
                      )}
                    >
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-5 border-t bg-muted/30">
            <Button
              className="w-full sm:w-auto rounded-xl bg-primary text-primary-foreground shadow-md hover:shadow-lg"
              onClick={handleSubmitAttendance}
              disabled={!selectedBatch || saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Attendance"}
            </Button>
          </div>
        </div>
      </div>

      {/* HISTORY DIALOG */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attendance History</DialogTitle>
            <DialogDescription>
              {historyStudent ? historyStudent.name : historyStudentId || "Student"}
            </DialogDescription>
          </DialogHeader>

          {historyStudentId && (
            <div className="space-y-3">
              {historyRecords.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No attendance records found.
                </div>
              ) : (
                <div className="max-h-[360px] overflow-auto space-y-2">
                  {historyRecords.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-xl border bg-card px-4 py-3"
                    >
                      <span className="text-sm">
                        {new Date(r.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span
                        className={cn(
                          "text-xs px-2 py-1 rounded-full border font-semibold",
                          r.status === "present" &&
                            "bg-green-50 text-green-700 border-green-200",
                          r.status === "absent" &&
                            "bg-red-50 text-red-700 border-red-200",
                          r.status === "late" &&
                            "bg-yellow-50 text-yellow-700 border-yellow-200",
                        )}
                      >
                        {r.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default TeacherAttendance;
