import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getBatches, getFeesByStudent, getInstituteSettings, getStudentsByParent, updateFeeStatus } from "@/lib/supabaseQueries";
import type { Batch, Fee, Student } from "@/types";
import { CreditCard, Calendar, AlertCircle } from "lucide-react";

const todayIso = () => new Date().toISOString().slice(0, 10);

const ParentFees = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [children, setChildren] = useState<Student[]>([]);
  const [batchesById, setBatchesById] = useState<Record<string, Batch>>({});
  const [feesByStudentId, setFeesByStudentId] = useState<Record<string, Fee[]>>({});
  const [loading, setLoading] = useState(false);
  const [hideFeeAmounts, setHideFeeAmounts] = useState(false);

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);

  const effectiveStatus = (fee: Fee): Fee["status"] => {
    if (fee.status === "paid") return "paid";
    return fee.dueDate < todayIso() ? "overdue" : "pending";
  };

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const [kids, batches, settings] = await Promise.all([
          getStudentsByParent(user.id),
          getBatches(),
          getInstituteSettings(),
        ]);
        setHideFeeAmounts(settings.hideFeeAmounts);
        setChildren(kids);
        const batchMap: Record<string, Batch> = {};
        batches.forEach((b) => (batchMap[b.id] = b));
        setBatchesById(batchMap);

        const feeRows = await Promise.all(
          kids.map(async (c) => [c.id, await getFeesByStudent(c.id)] as const),
        );
        setFeesByStudentId(Object.fromEntries(feeRows));
      } catch (error) {
        console.error("Failed to load parent fees:", error);
        toast({
          title: "Error",
          description: "Failed to load fee data from Supabase.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast, user?.id]);

  const handlePayNow = (fee: Fee) => {
    setSelectedFee(fee);
    setIsPaymentDialogOpen(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedFee) return;
    setLoading(true);
    try {
      const updated = await updateFeeStatus(selectedFee.id, "paid", todayIso());
      if (!updated) {
        toast({
          title: "Error",
          description: "Payment update failed.",
          variant: "destructive",
        });
        return;
      }
      setFeesByStudentId((prev) => {
        const current = prev[updated.studentId] || [];
        return {
          ...prev,
          [updated.studentId]: current.map((f) => (f.id === updated.id ? updated : f)),
        };
      });

      setIsPaymentDialogOpen(false);
      toast({
        title: "Payment Successful",
        description: hideFeeAmounts
          ? "Fee payment processed successfully!"
          : `Fee payment of ${"\u20B9"}${updated.amount.toLocaleString()} processed successfully!`,
      });
      setSelectedFee(null);
    } catch (error) {
      console.error("Payment failed:", error);
      toast({
        title: "Error",
        description: "Payment failed. Check Supabase permissions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const childrenWithFees = useMemo(() => {
    return children.map((child) => ({
      child,
      fees: feesByStudentId[child.id] || [],
      batch: batchesById[child.batchId],
    }));
  }, [batchesById, children, feesByStudentId]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Fee Status</h1>
          <p className="text-muted-foreground mt-1">
            View payment status and history
          </p>
        </div>

        {loading && children.length === 0 && (
          <div className="text-sm text-muted-foreground">Loading...</div>
        )}

        {/* CHILDREN */}
        {childrenWithFees.map(({ child, fees, batch }) => {
          const totalPaid = fees
            .filter((f) => effectiveStatus(f) === "paid")
            .reduce((sum, f) => sum + f.amount, 0);

          const totalPending = fees
            .filter((f) => effectiveStatus(f) !== "paid")
            .reduce((sum, f) => sum + f.amount, 0);

          const hasOverdue = fees.some((f) => effectiveStatus(f) === "overdue");

          return (
            <div
              key={child.id}
              className="border rounded-2xl overflow-hidden bg-card shadow-sm"
            >
              {/* CHILD HEADER */}
              <div className="p-6 border-b bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                    {child.name.charAt(0)}
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold">{child.name}</h2>
                    <p className="text-sm text-muted-foreground">{batch?.name}</p>
                  </div>
                </div>
              </div>

              {/* SUMMARY */}
              <div className="grid sm:grid-cols-3 gap-4 p-6 border-b">
                <div className="bg-green-100 rounded-2xl p-5 border border-green-200">
                  <p className="text-sm text-muted-foreground mb-1">Total Paid</p>
                  <p className="text-2xl font-bold text-green-700">
                    {hideFeeAmounts ? (
                      "Hidden"
                    ) : (
                      <>
                        {"\u20B9"}
                        {totalPaid.toLocaleString()}
                      </>
                    )}
                  </p>
                </div>

                <div
                  className={`rounded-2xl p-5 border ${
                    totalPending > 0
                      ? "bg-yellow-100 border-yellow-200"
                      : "bg-muted/40 border-border"
                  }`}
                >
                  <p className="text-sm text-muted-foreground mb-1">Pending</p>
                  <p
                    className={`text-2xl font-bold ${
                      totalPending > 0 ? "text-yellow-600" : "text-foreground"
                    }`}
                  >
                    {hideFeeAmounts ? (
                      "Hidden"
                    ) : (
                      <>
                        {"\u20B9"}
                        {totalPending.toLocaleString()}
                      </>
                    )}
                  </p>
                </div>

                {hasOverdue && (
                  <div className="bg-red-100 rounded-2xl p-5 border border-red-200 flex items-center gap-4">
                    <AlertCircle className="h-10 w-10 text-red-600" />
                    <div>
                      <p className="font-semibold text-red-600">Overdue</p>
                      <p className="text-sm text-muted-foreground">Action needed</p>
                    </div>
                  </div>
                )}
              </div>

              {/* FEE HISTORY */}
              <div className="p-6">
                <h3 className="font-semibold mb-5 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Fee History
                </h3>

                {fees.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No fee records found for this student.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fees.map((fee) => (
                      <div
                        key={fee.id}
                        className="flex items-center justify-between bg-muted/40 rounded-2xl p-5 hover:bg-muted/60 transition"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>

                          <div>
                            <p className="font-medium">{fee.month}</p>
                            <p className="text-sm text-muted-foreground">
                              Due:{" "}
                              {new Date(fee.dueDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-4">
                          <div>
                            <p className="font-semibold text-lg">
                              {hideFeeAmounts ? (
                                "Hidden"
                              ) : (
                                <>
                                  {"\u20B9"}
                                  {fee.amount.toLocaleString()}
                                </>
                              )}
                            </p>

                            {fee.paidDate && (
                              <p className="text-xs text-muted-foreground">
                                Paid:{" "}
                                {new Date(fee.paidDate).toLocaleDateString("en-IN")}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {hideFeeAmounts ? (
                              effectiveStatus(fee) === "paid" ? (
                                <StatusBadge status="paid" />
                              ) : (
                                <StatusBadge status="pending" labelOverride="Not Paid" />
                              )
                            ) : (
                              <StatusBadge status={effectiveStatus(fee)} />
                            )}

                            {effectiveStatus(fee) !== "paid" && (
                              <Button
                                size="sm"
                                className="rounded-xl bg-primary text-primary-foreground"
                                onClick={() => handlePayNow(fee)}
                                disabled={loading}
                              >
                                Pay Now
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* PAYMENT DIALOG */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              Complete your fee payment (prototype)
            </DialogDescription>
          </DialogHeader>
          {selectedFee && (
            <div className="space-y-4">
              <div className="bg-muted/40 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">{hideFeeAmounts ? "Fee" : "Amount Due"}</p>
                {!hideFeeAmounts ? (
                  <p className="text-3xl font-bold">
                    {"\u20B9"}
                    {selectedFee.amount.toLocaleString()}
                  </p>
                ) : (
                  <p className="text-2xl font-bold">Amount hidden by institute</p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  For: {selectedFee.month}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select Payment Method
                </label>
                <select className="w-full px-3 py-2 rounded-lg border bg-background">
                  <option>Credit Card</option>
                  <option>Debit Card</option>
                  <option>Net Banking</option>
                  <option>UPI</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Card/Account Number
                </label>
                <Input placeholder="Enter your payment details" type="password" />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsPaymentDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-xl bg-primary text-primary-foreground"
                  onClick={handleProcessPayment}
                  disabled={loading}
                >
                  {hideFeeAmounts ? "Mark as Paid" : <>Pay {"\u20B9"}{selectedFee.amount.toLocaleString()}</>}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ParentFees;
