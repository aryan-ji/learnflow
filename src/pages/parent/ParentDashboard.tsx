import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/dashboard/StatCard';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  getTestResultsByStudent,
  getTestById,
} from '@/data/mockData';
import { Users, Calendar, FileText, CreditCard, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAttendanceByStudent, getBatches, getFeesByStudent, getStudentsByParent } from "@/lib/supabaseQueries";
import type { Attendance, Batch, Fee, Student } from "@/types";

const ParentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [children, setChildren] = useState<Student[]>([]);
  const [batchesById, setBatchesById] = useState<Record<string, Batch>>({});

  const [attendanceByStudentId, setAttendanceByStudentId] = useState<
    Record<string, Attendance[]>
  >({});
  const [feesByStudentId, setFeesByStudentId] = useState<Record<string, Fee[]>>({});

  useEffect(() => {
    const load = async () => {
      try {
        if (!user?.id) return;
        const [kids, batches] = await Promise.all([
          getStudentsByParent(user.id),
          getBatches(),
        ]);
        setChildren(kids);
        const map: Record<string, Batch> = {};
        batches.forEach((b) => (map[b.id] = b));
        setBatchesById(map);
      } catch (error) {
        console.error("Failed to load parent dashboard:", error);
      }
    };
    load();
  }, [user?.id]);

  useEffect(() => {
    const load = async () => {
      if (children.length === 0) {
        setAttendanceByStudentId({});
        setFeesByStudentId({});
        return;
      }
      try {
        const [attendanceRows, feeRows] = await Promise.all([
          Promise.all(children.map(async (c) => [c.id, await getAttendanceByStudent(c.id)] as const)),
          Promise.all(children.map(async (c) => [c.id, await getFeesByStudent(c.id)] as const)),
        ]);
        setAttendanceByStudentId(Object.fromEntries(attendanceRows));
        setFeesByStudentId(Object.fromEntries(feeRows));
      } catch (error) {
        console.error("Failed to load attendance/fees:", error);
      }
    };
    load();
  }, [children]);

  const handleViewAttendance = (childName: string) => {
    toast({
      title: "View Attendance",
      description: `Loading attendance records for ${childName}...`,
    });
    navigate("/parent/attendance");
  };

  const handleViewResults = (childName: string) => {
    toast({
      title: "View Results",
      description: `Loading test results for ${childName}...`,
    });
    navigate("/parent/results");
  };

  const handleViewFees = (childName: string) => {
    toast({
      title: "View Fee Status",
      description: `Loading fee information for ${childName}...`,
    });
    navigate("/parent/fees");
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">

        {/* HEADER */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Welcome, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Track your children's academic progress
          </p>
        </div>

        {/* CHILDREN */}
        {children.map((child) => {
          const batch = batchesById[child.batchId];
          const attendance = attendanceByStudentId[child.id] || [];
          const results = getTestResultsByStudent(child.id);
          const fees = feesByStudentId[child.id] || [];

          const presentDays = attendance.filter(
            (a) => a.status === 'present'
          ).length;

          const totalDays = attendance.length;

          const attendanceRate =
            totalDays > 0
              ? Math.round((presentDays / totalDays) * 100)
              : 0;

          const avgMarks =
            results.length > 0
              ? Math.round(
                  results.reduce(
                    (sum, r) => sum + r.marksObtained,
                    0
                  ) / results.length
                )
              : 0;

          const pendingFees = fees.filter(
            (f) => f.status !== 'paid'
          );

          return (
            <div
              key={child.id}
              className="border rounded-2xl overflow-hidden bg-card shadow-sm"
            >
              {/* CHILD HEADER */}
              <div className="p-4 sm:p-6 border-b bg-muted/30">
                <div className="flex items-center gap-3 sm:gap-4">

                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-xl sm:text-2xl font-bold flex-shrink-0">
                    {child.name.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-xl font-semibold truncate">
                      {child.name}
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground truncate">
                      {batch?.name}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {batch?.schedule}
                    </p>
                  </div>

                </div>
              </div>

              <div className="p-4 sm:p-6">

                {/* STATS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <StatCard
                    title="Attendance"
                    value={`${attendanceRate}%`}
                    icon={Calendar}
                    variant={attendanceRate >= 75 ? 'success' : 'warning'}
                  />

                  <StatCard
                    title="Avg. Marks"
                    value={avgMarks}
                    icon={FileText}
                    variant="primary"
                  />

                  <StatCard
                    title="Tests Taken"
                    value={results.length}
                    icon={Users}
                  />

                  <StatCard
                    title="Pending Fees"
                    value={pendingFees.length}
                    icon={CreditCard}
                    variant={
                      pendingFees.length > 0 ? 'warning' : 'success'
                    }
                  />
                </div>

                {/* RECENT ACTIVITY */}
                <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">

                  {/* RECENT TESTS */}
                  <div className="bg-muted/40 rounded-xl sm:rounded-2xl p-4 sm:p-5">
                    <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">
                      Recent Tests
                    </h3>

                    <div className="space-y-3">
                      {results.slice(0, 3).map((result) => {
                        const test = getTestById(result.testId);

                        return (
                          <div
                            key={result.id}
                            className="flex items-center justify-between bg-card rounded-xl p-4"
                          >
                            <div>
                              <p className="font-medium text-sm">
                                {test?.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {test?.subject}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="font-semibold">
                                {result.marksObtained}/{test?.totalMarks}
                              </p>

                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                Grade {result.grade}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* FEE STATUS */}
                  <div className="bg-muted/40 rounded-xl sm:rounded-2xl p-4 sm:p-5">
                    <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">
                      Fee Status
                    </h3>

                    <div className="space-y-3">
                      {fees.slice(0, 3).map((fee) => (
                        <div
                          key={fee.id}
                          className="flex items-center justify-between bg-card rounded-xl p-4"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {fee.month}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Due:{' '}
                              {new Date(
                                fee.dueDate
                              ).toLocaleDateString('en-IN')}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-semibold">
                              ₹{fee.amount.toLocaleString()}
                            </p>

                            <StatusBadge status={fee.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* ACTION BUTTONS */}
                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                  <Button 
                    variant="outline" 
                    className="rounded-xl hover:border-primary hover:text-primary text-sm sm:text-base w-full sm:w-auto"
                    onClick={() => handleViewAttendance(child.name)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    View Attendance
                  </Button>

                  <Button 
                    variant="outline" 
                    className="rounded-xl hover:border-primary hover:text-primary text-sm sm:text-base w-full sm:w-auto"
                    onClick={() => handleViewResults(child.name)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Results
                  </Button>

                  <Button 
                    className="rounded-xl bg-primary text-primary-foreground text-sm sm:text-base w-full sm:w-auto"
                    onClick={() => handleViewFees(child.name)}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    View Fees
                    <ArrowRight className="h-4 w-4 ml-2" />
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

export default ParentDashboard;
