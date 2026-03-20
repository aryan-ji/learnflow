import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreditCard, CheckCircle, Clock, AlertCircle, MoreVertical, Eye, Send, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getFees, getStudents, updateFeeStatus } from "@/lib/supabaseQueries";
import type { Fee, Student } from "@/types";

const todayIso = () => new Date().toISOString().slice(0, 10);

const AdminFees = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isRemindDialogOpen, setIsRemindDialogOpen] = useState(false);
  const [selectedFeeId, setSelectedFeeId] = useState<string | null>(null);
  const { toast } = useToast();

  const [fees, setFees] = useState<Fee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [f, s] = await Promise.all([getFees(), getStudents()]);
        setFees(f);
        setStudents(s);
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

  const studentIdFilter = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("studentId") || "";
  }, [location.search]);

  const studentsById = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  const filteredFees = useMemo(() => {
    if (!studentIdFilter) return fees;
    return fees.filter((f) => f.studentId === studentIdFilter);
  }, [fees, studentIdFilter]);

  const paidFees = filteredFees.filter((f) => f.status === "paid");
  const pendingFees = filteredFees.filter((f) => f.status === "pending");
  const overdueFees = filteredFees.filter((f) => f.status === "overdue");

  const totalCollected = paidFees.reduce((sum, f) => sum + f.amount, 0);

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

        {/* STATS */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Collected"
            value={loading ? "..." : `₹${totalCollected.toLocaleString()}`}
            icon={CreditCard}
            variant="success"
          />
          <StatCard title="Paid" value={paidFees.length} icon={CheckCircle} variant="success" />
          <StatCard title="Pending" value={pendingFees.length} icon={Clock} variant="warning" />
          <StatCard title="Overdue" value={overdueFees.length} icon={AlertCircle} variant="warning" />
        </div>

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
                  const student = studentsById.get(fee.studentId);
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
                        ₹{fee.amount.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 sm:py-4 sm:px-6 text-muted-foreground whitespace-nowrap">
                        {new Date(fee.dueDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="py-3 px-4 sm:py-4 sm:px-6">
                        <StatusBadge status={fee.status} />
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
                              <>
                                <DropdownMenuItem onClick={() => handleSendReminder(fee.id)}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Send Reminder
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMarkAsPaid(fee.id)}>
                                  <Check className="h-4 w-4 mr-2" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              </>
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
    </DashboardLayout>
  );
};

export default AdminFees;
