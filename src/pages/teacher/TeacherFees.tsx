import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  getBatchesByTeacher,
  getFeesForStudents,
  getInstituteSettings,
  getStudentsByBatch,
  updateFeeStatus,
} from "@/lib/supabaseQueries";
import type { Fee, Student } from "@/types";
import { CreditCard, CheckCircle, Clock, AlertCircle, MoreVertical, Eye, Check } from "lucide-react";

const todayIso = () => new Date().toISOString().slice(0, 10);
const SHOW_AMOUNTS_KEY = "instipilot.teacherFees.showAmounts";

const TeacherFees = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [fees, setFees] = useState<Fee[]>([]);
  const [studentsById, setStudentsById] = useState<Record<string, Student>>({});
  const [loading, setLoading] = useState(false);
  const [hideFeeAmounts, setHideFeeAmounts] = useState(false);
  const [showAmounts, setShowAmounts] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(SHOW_AMOUNTS_KEY);
      return raw !== "false";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SHOW_AMOUNTS_KEY, String(showAmounts));
    } catch {
      // ignore
    }
  }, [showAmounts]);

  const studentIdFilter = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("studentId") || "";
  }, [location.search]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const settings = await getInstituteSettings();
        setHideFeeAmounts(settings.hideFeeAmounts);

        const batches = await getBatchesByTeacher(user.id);
        const studentLists = await Promise.all(
          batches.map((b) => getStudentsByBatch(b.id)),
        );
        const students = studentLists.flat();
        const uniqueStudents = Array.from(
          new Map(students.map((s) => [s.id, s])).values(),
        );

        const map: Record<string, Student> = {};
        uniqueStudents.forEach((s) => (map[s.id] = s));
        setStudentsById(map);

        const fees = await getFeesForStudents(uniqueStudents.map((s) => s.id));
        setFees(fees);
      } catch (error) {
        console.error("Failed to load teacher fees:", error);
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
  }, [toast, user?.id]);

  const effectiveShowAmounts = hideFeeAmounts ? false : showAmounts;

  const filteredFees = useMemo(() => {
    if (!studentIdFilter) return fees;
    return fees.filter((f) => f.studentId === studentIdFilter);
  }, [fees, studentIdFilter]);

  const effectiveStatus = (fee: Fee): Fee["status"] => {
    if (fee.status === "paid") return "paid";
    return fee.dueDate < todayIso() ? "overdue" : "pending";
  };

  const paidFees = filteredFees.filter((f) => effectiveStatus(f) === "paid");
  const pendingFees = filteredFees.filter((f) => effectiveStatus(f) === "pending");
  const overdueFees = filteredFees.filter((f) => effectiveStatus(f) === "overdue");
  const notPaidCount = filteredFees.length - paidFees.length;

  const totalCollected = paidFees.reduce((sum, f) => sum + f.amount, 0);

  const handleViewFee = (feeId: string) => {
    toast({ title: "Fee Details", description: `Selected fee ${feeId}` });
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
      toast({ title: "Success", description: "Fee marked as paid." });
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Fees</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              View and manage fees for your students
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {!hideFeeAmounts ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <Switch checked={showAmounts} onCheckedChange={setShowAmounts} />
                <span className="text-sm font-semibold text-slate-800">Show amounts</span>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-[#F9FAFB] px-3 py-2 text-sm text-slate-700">
                Amounts hidden by Admin
              </div>
            )}

            {studentIdFilter && (
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Filter: {studentsById[studentIdFilter]?.name || studentIdFilter}
                </span>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => navigate("/teacher/fees")}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>

        {hideFeeAmounts ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title="Total Fees" value={filteredFees.length} icon={CreditCard} variant="primary" />
            <StatCard title="Paid" value={paidFees.length} icon={CheckCircle} variant="success" />
            <StatCard title="Not Paid" value={notPaidCount} icon={Clock} variant="warning" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Collected"
              value={loading ? "..." : effectiveShowAmounts ? `${"\u20B9"}${totalCollected.toLocaleString()}` : "Hidden"}
              icon={CreditCard}
              variant="success"
            />
            <StatCard title="Paid" value={paidFees.length} icon={CheckCircle} variant="success" />
            <StatCard title="Pending" value={pendingFees.length} icon={Clock} variant="warning" />
            <StatCard title="Overdue" value={overdueFees.length} icon={AlertCircle} variant="warning" />
          </div>
        )}

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
                  <th className="text-left py-3 px-4 sm:py-4 sm:px-6 font-semibold text-muted-foreground">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 sm:py-4 sm:px-6 font-semibold text-muted-foreground">
                    Due Date
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
                {filteredFees.map((fee) => {
                  const student = studentsById[fee.studentId];
                  return (
                    <tr
                      key={fee.id}
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
                        {fee.month}
                      </td>

                      <td className="py-3 px-4 sm:py-4 sm:px-6 font-semibold whitespace-nowrap">
                        {effectiveShowAmounts ? (
                          <>
                            {"\u20B9"}
                            {fee.amount.toLocaleString()}
                          </>
                        ) : (
                          <span className="text-slate-500">•••</span>
                        )}
                      </td>

                      <td className="py-3 px-4 sm:py-4 sm:px-6 text-muted-foreground whitespace-nowrap">
                        {new Date(fee.dueDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="py-3 px-4 sm:py-4 sm:px-6">
                        {hideFeeAmounts ? (
                          effectiveStatus(fee) === "paid" ? (
                            <StatusBadge status="paid" />
                          ) : (
                            <StatusBadge status="pending" labelOverride="Not Paid" />
                          )
                        ) : (
                          <StatusBadge status={effectiveStatus(fee)} />
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
                            <DropdownMenuItem onClick={() => handleViewFee(fee.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            {fee.status !== "paid" && (
                              <DropdownMenuItem onClick={() => handleMarkAsPaid(fee.id)}>
                                <Check className="h-4 w-4 mr-2" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}

                {!loading && filteredFees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No fees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherFees;
