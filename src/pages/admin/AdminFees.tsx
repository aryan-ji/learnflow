import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { CreditCard, CheckCircle, Clock, MoreVertical, Eye, Send, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getBatches,
  getFees,
  getInstituteSettings,
  getStudents,
  updateFeeStatus,
  updateInstituteHideFeeAmounts,
  upsertFees,
} from "@/lib/supabaseQueries";
import type { Batch, Fee, Student } from "@/types";

const todayIso = () => new Date().toISOString().slice(0, 10);
const currentMonthKey = () => new Date().toISOString().slice(0, 7); // YYYY-MM
const DEFAULT_FEE_STORE_KEY = "instipilot.batchDefaultFeeByBatchId";

const monthEndUtc = (monthKey: string) => {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month, 0)); // last day of `monthKey` month
};

const isStudentEligibleForMonth = (student: Student, monthKey: string) => {
  const end = monthEndUtc(monthKey);
  if (!end) return true;
  const enrolled = new Date(`${student.enrollmentDate}T00:00:00Z`);
  if (Number.isNaN(enrolled.getTime())) return true;
  return enrolled.getTime() <= end.getTime();
};

const AdminFees = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isRemindDialogOpen, setIsRemindDialogOpen] = useState(false);
  const [selectedFeeId, setSelectedFeeId] = useState<string | null>(null);
  const { toast } = useToast();

  const [fees, setFees] = useState<Fee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [hideFeeAmounts, setHideFeeAmounts] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const [monthFilter, setMonthFilter] = useState(currentMonthKey());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addStudentId, setAddStudentId] = useState("");
  const [addBatchId, setAddBatchId] = useState(""); // student picker filter ("" = all)
  const [addMonth, setAddMonth] = useState(currentMonthKey());
  const [paidDate, setPaidDate] = useState(todayIso());
  const [batchDefaultFeeByBatchId, setBatchDefaultFeeByBatchId] = useState<Record<string, number>>({});
  const [batchDefaultAmountDraft, setBatchDefaultAmountDraft] = useState<string>("");
  const [studentPickerQuery, setStudentPickerQuery] = useState("");
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DEFAULT_FEE_STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, number>;
        if (parsed && typeof parsed === "object") setBatchDefaultFeeByBatchId(parsed);
      }
    } catch (e) {
      console.warn("Failed to read batch default fees from localStorage:", e);
    }

    const load = async () => {
      setLoading(true);
      try {
        const [f, s, b, settings] = await Promise.all([
          getFees(),
          getStudents(),
          getBatches(),
          getInstituteSettings(),
        ]);
        setFees(f);
        setStudents(s);
        setBatches(b);
        setHideFeeAmounts(settings.hideFeeAmounts);
      } catch (error) {
        console.error("Failed to load fees:", error);
        toast({
          title: "Error",
          description: "Failed to load fees from Supabase.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  useEffect(() => {
    try {
      localStorage.setItem(DEFAULT_FEE_STORE_KEY, JSON.stringify(batchDefaultFeeByBatchId));
    } catch (e) {
      console.warn("Failed to save batch default fees to localStorage:", e);
    }
  }, [batchDefaultFeeByBatchId]);

  const studentIdFilter = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("studentId") || "";
  }, [location.search]);

  const [batchFilterId, setBatchFilterId] = useState("");

  const studentsById = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  const batchNameById = useMemo(() => {
    const map = new Map<string, string>();
    batches.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [batches]);

  useEffect(() => {
    if (!batchFilterId) {
      setBatchDefaultAmountDraft("");
      return;
    }
    const def = batchDefaultFeeByBatchId[batchFilterId];
    setBatchDefaultAmountDraft(def !== undefined ? String(def) : "");
  }, [batchDefaultFeeByBatchId, batchFilterId]);

  const filteredFees = useMemo(() => {
    let next = fees;
    // month filter is applied at the "student rows" layer; keep this list for existing actions
    if (studentIdFilter) next = next.filter((f) => f.studentId === studentIdFilter);
    return next;
  }, [batchFilterId, fees, studentIdFilter, students]);

  const visibleStudents = useMemo(() => {
    let next = students;
    if (studentIdFilter) next = next.filter((s) => s.id === studentIdFilter);
    if (batchFilterId) next = next.filter((s) => s.batchId === batchFilterId);
    next = next.filter((s) => isStudentEligibleForMonth(s, monthFilter));
    return [...next].sort((a, b) => a.name.localeCompare(b.name));
  }, [batchFilterId, monthFilter, studentIdFilter, students]);

  const feeByStudentId = useMemo(() => {
    const map = new Map<string, Fee>();
    fees.forEach((f) => {
      if (f.month === monthFilter) map.set(f.studentId, f);
    });
    return map;
  }, [fees, monthFilter]);

  const studentRows = useMemo(() => {
    return visibleStudents.map((s) => {
      const fee = feeByStudentId.get(s.id) || null;
      const isPaid = fee?.status === "paid";
      const amount = fee?.amount ?? batchDefaultFeeByBatchId[s.batchId] ?? null;
      return {
        student: s,
        fee,
        status: isPaid ? "paid" : "not_paid",
        amount,
      } as const;
    });
  }, [batchDefaultFeeByBatchId, feeByStudentId, visibleStudents]);

  const paidCount = studentRows.filter((r) => r.status === "paid").length;
  const notPaidCount = studentRows.length - paidCount;
  const totalCollected = studentRows.reduce((sum, r) => sum + (r.status === "paid" ? r.fee?.amount ?? 0 : 0), 0);

  const handleViewFee = (feeId: string) => {
    setSelectedFeeId(feeId);
    toast({
      title: "Fee Details",
      description: `Selected fee ${feeId}`,
    });
  };

  const handleSendReminder = (feeId: string) => {
    setSelectedFeeId(feeId);
    setIsRemindDialogOpen(true);
  };

  const handleMarkAsPaid = async (feeId: string) => {
    setLoading(true);
    try {
      const updated = await updateFeeStatus(feeId, "paid", todayIso());
      if (!updated) {
        toast({
          title: "Error",
          description: "Failed to update fee status.",
          variant: "destructive",
        });
        return;
      }
      setFees((prev) => prev.map((f) => (f.id === feeId ? updated : f)));
      toast({
        title: "Success",
        description: "Fee marked as paid.",
      });
    } catch (error) {
      console.error("Failed to mark fee as paid:", error);
      toast({
        title: "Error",
        description: "Failed to update fee. Check Supabase permissions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminderEmail = () => {
    setIsRemindDialogOpen(false);
    toast({
      title: "Success",
      description: "Payment reminder (simulated) sent!",
    });
  };

  const handleMarkPaid = async () => {
    if (!addMonth) {
      toast({ title: "Missing month", description: "Please select a month.", variant: "destructive" });
      return;
    }
    const targetStudent = students.find((s) => s.id === addStudentId);
    if (!targetStudent) {
      toast({ title: "No student selected", description: "Please select a student.", variant: "destructive" });
      return;
    }

    const existing = fees.find((f) => f.studentId === targetStudent.id && f.month === addMonth) || null;
    if (existing?.status === "paid") {
      toast({ title: "Already paid", description: "This student's fees are already marked as paid for this month." });
      return;
    }

    setLoading(true);
    try {
      if (existing) {
        const updated = await updateFeeStatus(existing.id, "paid", paidDate || todayIso());
        if (!updated) {
          toast({ title: "Error", description: "Failed to mark as paid.", variant: "destructive" });
          return;
        }
        setFees((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        toast({ title: "Success", description: "Marked as paid." });
        setIsAddDialogOpen(false);
        return;
      }

      const defaultAmount = batchDefaultFeeByBatchId[targetStudent.batchId];
      if (!hideFeeAmounts && (defaultAmount === undefined || defaultAmount <= 0)) {
        toast({
          title: "Set default fee first",
          description: "Set a default fee amount for this student's batch (or enable Hide fee amounts).",
          variant: "destructive",
        });
        return;
      }

      const payload: Fee = {
        id: `fee-${targetStudent.id}-${addMonth}`,
        studentId: targetStudent.id,
        month: addMonth,
        amount: hideFeeAmounts ? 0 : defaultAmount,
        status: "paid",
        dueDate: paidDate || todayIso(),
        paidDate: paidDate || todayIso(),
      };

      const created = await upsertFees([payload]);
      if (created.length !== 1) {
        toast({ title: "Error", description: "Failed to mark as paid. Check Supabase permissions.", variant: "destructive" });
        return;
      }

      setFees((prev) => [created[0], ...prev]);
      toast({ title: "Success", description: "Marked as paid." });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Failed to mark paid:", error);
      toast({ title: "Error", description: "Failed to mark as paid.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectableStudents = useMemo(() => {
    const base = addBatchId ? students.filter((s) => s.batchId === addBatchId) : students;
    const eligible = base.filter((s) => isStudentEligibleForMonth(s, addMonth));
    const q = studentPickerQuery.trim().toLowerCase();
    if (!q) return eligible.slice(0, 50);
    return eligible
      .filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
      .slice(0, 50);
  }, [addBatchId, addMonth, studentPickerQuery, students]);

  useEffect(() => {
    if (!isAddDialogOpen) return;
    if (addStudentId) return; // don't override user selection

    // If the page is filtered by a student, preselect that student inside the dialog.
    if (studentIdFilter) {
      const s = students.find((x) => x.id === studentIdFilter);
      if (s && isStudentEligibleForMonth(s, addMonth)) {
        setAddBatchId(s.batchId);
        setAddStudentId(s.id);
        setStudentPickerQuery(`${s.name} • ${s.email}`);
        setStudentPickerOpen(false);
        return;
      }
    }

    // If the page is filtered by batch, carry that into the dialog's batch filter.
    if (batchFilterId) setAddBatchId(batchFilterId);
  }, [addStudentId, batchFilterId, isAddDialogOpen, studentIdFilter, students]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Fee Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Track and manage student fees
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <Switch
                checked={hideFeeAmounts}
                onCheckedChange={async (next) => {
                  setSavingPrivacy(true);
                  try {
                    const ok = await updateInstituteHideFeeAmounts(Boolean(next));
                    if (!ok) {
                      toast({ title: "Error", description: "Failed to update privacy setting.", variant: "destructive" });
                      return;
                    }
                    setHideFeeAmounts(Boolean(next));
                    toast({
                      title: "Updated",
                      description: Boolean(next)
                        ? "Fee amounts hidden (only paid/not paid)."
                        : "Fee amounts visible again.",
                    });
                  } finally {
                    setSavingPrivacy(false);
                  }
                }}
                disabled={savingPrivacy}
              />
              <span className="text-sm font-semibold text-slate-800">Hide fee amounts</span>
            </div>

            <Button
              onClick={() => {
                setAddMonth(monthFilter);
                setPaidDate(todayIso());
                setIsAddDialogOpen(true);
              }}
              className="rounded-xl bg-[#2563EB] text-white hover:bg-[#2563EB]/90"
              disabled={loading || students.length === 0}
            >
              <Check className="h-4 w-4" />
              Mark Paid
            </Button>

            {studentIdFilter && (
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Filter: {studentsById.get(studentIdFilter)?.name || studentIdFilter}
                </span>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => navigate("/admin/fees")}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="w-full sm:max-w-md">
            <label className="text-xs font-semibold text-slate-700">Filter by batch</label>
            <select
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              value={batchFilterId}
              onChange={(e) => setBatchFilterId(e.target.value)}
            >
              <option value="">All batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.id})
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:max-w-md">
            <label className="text-xs font-semibold text-slate-700">Month</label>
            <Input
              type="month"
              value={monthFilter}
              onChange={(e) => {
                const v = e.target.value;
                setMonthFilter(v);
                setAddMonth(v);
              }}
              className="mt-2 h-11 rounded-xl bg-white"
            />
          </div>

          {!hideFeeAmounts ? (
          <div className="w-full sm:max-w-md">
            <label className="text-xs font-semibold text-slate-700">Default fee amount (selected batch)</label>
            <div className="mt-2 flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">{"\u20B9"}</span>
                <Input
                  inputMode="numeric"
                  placeholder={batchFilterId ? "e.g. 1500" : "Select a batch first"}
                  value={batchDefaultAmountDraft}
                  onChange={(e) => setBatchDefaultAmountDraft(e.target.value)}
                  className="h-11 rounded-xl pl-8 bg-white"
                  disabled={!batchFilterId}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                disabled={!batchFilterId}
                onClick={() => {
                  const num = Number(batchDefaultAmountDraft);
                  if (!Number.isFinite(num) || num <= 0) {
                    toast({ title: "Invalid default", description: "Enter a valid default amount.", variant: "destructive" });
                    return;
                  }
                  setBatchDefaultFeeByBatchId((prev) => ({ ...prev, [batchFilterId]: num }));
                  toast({ title: "Saved", description: "Default fee saved for this batch." });
                }}
              >
                Save
              </Button>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Used when marking students as paid (for creating a paid record if one doesn't exist yet).
            </div>
          </div>
          ) : null}
        </div>

        {/* STATS */}
        {hideFeeAmounts ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title="Total Students" value={studentRows.length} icon={CreditCard} variant="primary" />
            <StatCard title="Paid" value={paidCount} icon={CheckCircle} variant="success" />
            <StatCard title="Not Paid" value={notPaidCount} icon={Clock} variant="warning" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Collected"
              value={loading ? "..." : `${"\u20B9"}${totalCollected.toLocaleString()}`}
              icon={CreditCard}
              variant="success"
            />
            <StatCard title="Paid" value={paidCount} icon={CheckCircle} variant="success" />
            <StatCard title="Not Paid" value={notPaidCount} icon={Clock} variant="warning" />
            <StatCard title="Students" value={studentRows.length} icon={Clock} variant="primary" />
          </div>
        )}

        {/* FEES TABLE */}
        <div className="border rounded-xl sm:rounded-2xl overflow-hidden bg-card shadow-sm">
          <div className="p-4 sm:p-6 border-b">
            <h2 className="text-base sm:text-lg font-semibold">
              {studentIdFilter ? "Student Fees" : "All Fees"}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm min-w-[720px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-3 px-4 sm:py-4 sm:px-6 font-semibold text-muted-foreground">
                    Student
                  </th>
                  <th className="text-left py-3 px-4 sm:py-4 sm:px-6 font-semibold text-muted-foreground">
                    Month
                  </th>
                  {!hideFeeAmounts ? (
                    <th className="text-left py-3 px-4 sm:py-4 sm:px-6 font-semibold text-muted-foreground">
                      Amount
                    </th>
                  ) : null}
                  <th className="text-left py-3 px-4 sm:py-4 sm:px-6 font-semibold text-muted-foreground">
                    Paid Date
                  </th>
                  <th className="text-left py-3 px-4 sm:py-4 sm:px-6 font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 sm:py-4 sm:px-6 font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {studentRows.map((row) => {
                  const fee = row.fee;
                  const student = row.student;
                  return (
                    <tr
                      key={`${student.id}:${monthFilter}`}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 sm:py-4 sm:px-6">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs sm:text-sm flex-shrink-0">
                            {(student?.name || "?").charAt(0)}
                          </div>
                          <span className="font-medium text-xs sm:text-sm truncate">
                            {student?.name || fee.studentId}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 sm:py-4 sm:px-6 text-muted-foreground whitespace-nowrap">
                        {monthFilter}
                      </td>

                      {!hideFeeAmounts ? (
                        <td className="py-3 px-4 sm:py-4 sm:px-6 font-semibold whitespace-nowrap">
                          {"\u20B9"}
                          {(row.amount ?? 0).toLocaleString()}
                        </td>
                      ) : null}

                      <td className="py-3 px-4 sm:py-4 sm:px-6 text-muted-foreground whitespace-nowrap">
                        {fee?.paidDate
                          ? new Date(fee.paidDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </td>

                      <td className="py-3 px-4 sm:py-4 sm:px-6">
                        {row.status === "paid" ? (
                          <StatusBadge status="paid" />
                        ) : (
                          <StatusBadge status="pending" labelOverride="Not Paid" />
                        )}
                      </td>

                      <td className="py-3 px-4 sm:py-4 sm:px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl h-8 w-8 sm:h-10 sm:w-10"
                              disabled={loading}
                            >
                              <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {fee ? (
                              <DropdownMenuItem onClick={() => handleViewFee(fee.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                              </DropdownMenuItem>
                            ) : null}

                            {fee && row.status !== "paid" ? (
                              <DropdownMenuItem onClick={() => handleSendReminder(fee.id)}>
                                <Send className="h-4 w-4 mr-2" />
                                Send Reminder
                              </DropdownMenuItem>
                            ) : null}

                            {row.status !== "paid" ? (
                              <>
                                {fee ? (
                                  <DropdownMenuItem onClick={() => handleMarkAsPaid(fee.id)}>
                                  <Check className="h-4 w-4 mr-2" />
                                  Mark as Paid
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setAddBatchId(student.batchId);
                                      setAddStudentId(student.id);
                                      setStudentPickerQuery(`${student.name} • ${student.email}`);
                                      setAddMonth(monthFilter);
                                      setPaidDate(todayIso());
                                      setIsAddDialogOpen(true);
                                    }}
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    Mark as Paid
                                  </DropdownMenuItem>
                                )}
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}

                {!loading && studentRows.length === 0 && (
                  <tr>
                    <td colSpan={hideFeeAmounts ? 5 : 6} className="py-8 text-center text-muted-foreground">
                      No students found for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SEND REMINDER DIALOG */}
      <Dialog open={isRemindDialogOpen} onOpenChange={setIsRemindDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Payment Reminder</DialogTitle>
            <DialogDescription>
              A reminder will be sent (simulated) for fee {selectedFeeId}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This is a prototype-open setup; reminder sending is UI-only for now.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setIsRemindDialogOpen(false)}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendReminderEmail}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                Send Reminder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADD FEES DIALOG */}
      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setStudentPickerOpen(false);
            setStudentPickerQuery("");
            setAddStudentId("");
            setAddBatchId("");
          }
        }}
      >
        <DialogContent className="p-0 sm:max-w-lg">
          <div className="flex max-h-[85vh] flex-col">
            <DialogHeader className="px-6 pt-6 pb-3">
              <DialogTitle>Mark Fees as Paid</DialogTitle>
              <DialogDescription>Marks a student as paid for the selected month.</DialogDescription>
            </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">Batch</label>
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                value={addBatchId}
                onChange={(e) => {
                  setAddBatchId(e.target.value);
                  setStudentPickerQuery("");
                  setAddStudentId("");
                  setStudentPickerOpen(false);
                }}
              >
                <option value="">All batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.id})
                  </option>
                ))}
              </select>
              <div className="text-xs text-slate-500">
                Students: {addBatchId ? students.filter((s) => s.batchId === addBatchId).length : students.length}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">Student</label>
              <div className="relative">
                <Input
                  placeholder="Search student by name/email/id..."
                  value={studentPickerQuery}
                  onChange={(e) => {
                    setStudentPickerQuery(e.target.value);
                    setStudentPickerOpen(true);
                  }}
                  onFocus={() => setStudentPickerOpen(true)}
                  onBlur={() => setTimeout(() => setStudentPickerOpen(false), 150)}
                  className="h-11 rounded-xl bg-white"
                />

                {studentPickerOpen ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    <div className="max-h-64 overflow-auto p-2">
                      {selectableStudents.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-600">No students found</div>
                      ) : (
                        selectableStudents.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setAddStudentId(s.id);
                              setStudentPickerQuery(`${s.name} • ${s.email}`);
                              setStudentPickerOpen(false);
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left hover:bg-[#F9FAFB]"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-900">{s.name}</div>
                                <div className="truncate text-xs text-slate-500">
                                  {s.email} • {batchNameById.get(s.batchId) || s.batchId}
                                </div>
                              </div>
                              <div className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                {s.id}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              {addStudentId ? (
                <div className="text-xs text-slate-500">
                  Selected: {studentsById.get(addStudentId)?.name || addStudentId} • Batch:{" "}
                  {batchNameById.get(studentsById.get(addStudentId)?.batchId || "") || "-"}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">Month</label>
                <Input type="month" value={addMonth} onChange={(e) => setAddMonth(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">Paid Date</label>
                <Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} className="h-11 rounded-xl" />
              </div>
            </div>

            {addStudentId ? (
              <div className="rounded-xl border border-slate-200 bg-[#F9FAFB] p-4 text-xs text-slate-600">
                Default amount for this batch:{" "}
                <span className="font-semibold text-slate-900">
                  {(() => {
                    const s = studentsById.get(addStudentId);
                    const def = s?.batchId ? batchDefaultFeeByBatchId[s.batchId] : undefined;
                    return def !== undefined ? `${"\u20B9"}${def.toLocaleString()}` : "Not set";
                  })()}
                </span>
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-[#F9FAFB] p-4 text-sm text-slate-700">
              {hideFeeAmounts
                ? "Fee amounts are hidden. This will only mark paid/not paid."
                : "This will mark the selected student's fees as paid for the chosen month."}
            </div>
          </div>
          </div>

          <DialogFooter className="border-t border-slate-100 px-6 py-4">
            <Button variant="outline" className="rounded-xl" onClick={() => setIsAddDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
              <Button
                className="rounded-xl bg-[#2563EB] text-white hover:bg-[#2563EB]/90"
                onClick={handleMarkPaid}
                disabled={loading}
              >
                Mark Paid
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminFees;
