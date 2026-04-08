import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Check, Clock, CreditCard, Save, Users, X, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { clearAttendanceDraft, loadAttendanceDraft, saveAttendanceDraft } from "@/lib/attendanceDraft";
import {
  getAttendanceByBatch,
  getAttendanceByBatchDate,
  getAttendanceByBatchDateRange,
  getAttendanceByStudent,
  getBatches,
  getStudentsByBatch,
  getTeachers,
  getFeesForStudentsByDueDateRange,
  upsertAttendanceForBatchDate,
} from "@/lib/supabaseQueries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AttendanceStatus = "present" | "absent" | "late";
type AttendanceRange = "all" | "month";

const todayIso = () => new Date().toISOString().split("T")[0];

const AdminAttendance = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [attendanceRange, setAttendanceRange] = useState<AttendanceRange>("month");

  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [hasDraftRestored, setHasDraftRestored] = useState(false);
  const [attendanceLoadedKey, setAttendanceLoadedKey] = useState<string | null>(null);

  const draftRef = useRef<{
    batchId: string;
    date: string;
    attendance: Record<string, AttendanceStatus>;
  }>({
    batchId: "",
    date: "",
    attendance: {},
  });
  const [attendancePctByStudentId, setAttendancePctByStudentId] = useState<
    Record<string, number | null>
  >({});

  const [batches, setBatches] = useState<Array<{ id: string; name: string; teacherId: string }>>([]);
  const [teachersById, setTeachersById] = useState<Record<string, string>>({});
  const [students, setStudents] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loading, setLoading] = useState(false);

  const [feeStatusByStudentId, setFeeStatusByStudentId] = useState<Record<string, "paid" | "not_paid">>({});
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);

  const selectedBatchObj = useMemo(
    () => batches.find((b) => b.id === selectedBatch),
    [batches, selectedBatch],
  );

  const selectedTeacherName = selectedBatchObj
    ? teachersById[selectedBatchObj.teacherId]
    : undefined;

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [b, t] = await Promise.all([getBatches(), getTeachers()]);
        setBatches(b.map((x) => ({ id: x.id, name: x.name, teacherId: x.teacherId })));
        const teacherMap: Record<string, string> = {};
        t.forEach((teacher) => {
          teacherMap[teacher.id] = teacher.name;
        });
        setTeachersById(teacherMap);
        setSelectedBatch((prev) => prev || b[0]?.id || "");
      } catch (error) {
        console.error("Failed to init attendance page:", error);
        toast({
          title: "Error",
          description: "Failed to load batches/teachers from Supabase.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [toast]);

  useEffect(() => {
    const loadStudents = async () => {
      if (!selectedBatch) {
        setStudents([]);
        return;
      }
      const rows = await getStudentsByBatch(selectedBatch);
      setStudents(rows.map((s) => ({ id: s.id, name: s.name, email: s.email })));
    };
    loadStudents();
  }, [selectedBatch]);

  useEffect(() => {
    if (!selectedBatch || !selectedDate) return;
    const load = async () => {
      setAttendanceLoadedKey(null);
      const rows = await getAttendanceByBatchDate(selectedBatch, selectedDate);
      const map: Record<string, AttendanceStatus> = {};
      for (const row of rows) map[row.studentId] = row.status;

      const draft = loadAttendanceDraft({ role: "admin", batchId: selectedBatch, date: selectedDate });
      if (draft && Object.keys(draft.attendance).length > 0) {
        setAttendance({ ...map, ...draft.attendance });
        setHasDraftRestored(true);
      } else {
        setAttendance(map);
        setHasDraftRestored(false);
      }
      setAttendanceLoadedKey(`${selectedBatch}:${selectedDate}`);
    };
    load();
  }, [selectedBatch, selectedDate]);

  useEffect(() => {
    if (!hasDraftRestored) return;
    toast({
      title: "Draft restored",
      description: "Your unsaved attendance was restored from this device.",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDraftRestored]);

  const persistDraftNow = () => {
    const { batchId, date, attendance: att } = draftRef.current;
    if (!batchId || !date) return;
    saveAttendanceDraft({
      role: "admin",
      batchId,
      date,
      attendance: att as any,
    });
  };

  useEffect(() => {
    draftRef.current = { batchId: selectedBatch, date: selectedDate, attendance };
  }, [attendance, selectedBatch, selectedDate]);

  useEffect(() => {
    if (!selectedBatch || !selectedDate) return;
    if (Object.keys(attendance).length === 0) return;
    if (attendanceLoadedKey !== `${selectedBatch}:${selectedDate}`) return;
    const t = setTimeout(() => {
      saveAttendanceDraft({
        role: "admin",
        batchId: selectedBatch,
        date: selectedDate,
        attendance: attendance as any,
      });
    }, 250);
    return () => {
      clearTimeout(t);
      persistDraftNow();
    };
  }, [attendance, selectedBatch, selectedDate]);

  useEffect(() => {
    const onBeforeUnload = () => persistDraftNow();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") persistDraftNow();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        for (const student of students) {
          const t = totals[student.id];
          pctMap[student.id] = t && t.total > 0 ? Math.round((t.present / t.total) * 100) : null;
        }
        setAttendancePctByStudentId(pctMap);
      } catch (error) {
        console.error("Failed to load attendance percentages:", error);
      }
    };
    loadPct();
  }, [attendanceRange, selectedBatch, selectedDate, students]);

  useEffect(() => {
    const loadFees = async () => {
      const studentIds = students.map((s) => s.id);
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
  }, [selectedBatch, selectedDate, students]);

  const handleAttendance = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSubmitAttendance = async () => {
    if (!selectedBatch) return;

    const entries = Object.entries(attendance).map(
      ([studentId, status]) => ({
        studentId,
        status,
      }),
    );

    if (entries.length === 0) {
      toast({
        title: "No attendance marked",
        description: "Please mark attendance for at least one student.",
      });
      return;
    }

    try {
      await upsertAttendanceForBatchDate({
        batchId: selectedBatch,
        date: selectedDate,
        entries,
      });
      clearAttendanceDraft({ role: "admin", batchId: selectedBatch, date: selectedDate });

      toast({
        title: "Success",
        description: `Attendance saved for ${entries.length} student(s).`,
      });
    } catch (error) {
      console.error("Failed to save attendance:", error);
      toast({
        title: "Error",
        description: "Failed to save attendance. Check Supabase configuration.",
        variant: "destructive",
      });
    }
  };

  const openHistory = (studentId: string) => {
    setHistoryStudentId(studentId);
    setIsHistoryOpen(true);
  };

  const historyStudent = historyStudentId
    ? students.find((s) => s.id === historyStudentId) || null
    : null;

  const [historyRecords, setHistoryRecords] = useState<
    Array<{ id: string; date: string; status: "present" | "absent" | "late" }>
  >([]);

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Attendance</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Mark and manage daily attendance
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

        {/* CONTROLS */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Batch</label>
            <select
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm sm:text-base"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
            >
              {batches.map((batch) => {
                const teacher = teachersById[batch.teacherId] || "Unassigned";
                return (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} ({teacher})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="sm:w-56">
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

        {/* ATTENDANCE LIST */}
        <div className="border rounded-2xl overflow-hidden bg-card shadow-sm">
          <div className="p-5 border-b bg-muted/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
              <h2 className="font-semibold truncate">
                {selectedBatchObj?.name || "Select a batch"}
              </h2>
              {selectedTeacherName && (
                <p className="text-sm text-muted-foreground truncate">
                  Teacher: {selectedTeacherName}
                </p>
              )}
            </div>

            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              {students.length} students
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
                        <p className="font-medium truncate">{student.name}</p>
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
                      <p className="text-sm text-muted-foreground truncate">
                        {student.email}
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
                          `/admin/fees?studentId=${encodeURIComponent(student.id)}`,
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
                      aria-label="Mark present"
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
                      aria-label="Mark absent"
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
                      aria-label="Mark late"
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
              disabled={!selectedBatch || !selectedDate}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Loading..." : "Save Attendance"}
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
              {historyStudent ? historyStudent.name : "Student"}
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

export default AdminAttendance;
