import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import {
  createTest,
  getBatches,
  getStudents,
  getTestResults,
  getTests,
  upsertTestResultsForTest,
} from "@/lib/supabaseQueries";
import type { Batch, Student, Test, TestResult } from "@/types";
import { Award, Calendar, Check, ChevronDown, Edit, Eye, FileText, MoreVertical, Plus, TrendingUp, Users, X } from "lucide-react";

const todayIso = () => new Date().toISOString().slice(0, 10);

const generateTestId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `t-${crypto.randomUUID()}`;
  return `t-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const calculateGrade = (marks: number, totalMarks: number): string => {
  const percentage = totalMarks > 0 ? (marks / totalMarks) * 100 : 0;
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C+";
  if (percentage >= 40) return "C";
  return "D";
};

const AdminTests = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [tests, setTests] = useState<Test[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const [isCreateTestDialogOpen, setIsCreateTestDialogOpen] = useState(false);
  const [isViewResultsDialogOpen, setIsViewResultsDialogOpen] = useState(false);
  const [isEnterMarksDialogOpen, setIsEnterMarksDialogOpen] = useState(false);
  const [isStudentHistoryDialogOpen, setIsStudentHistoryDialogOpen] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedStudentIdForHistory, setSelectedStudentIdForHistory] = useState<string | null>(null);

  // Create form
  const [formName, setFormName] = useState("");
  const [formBatchId, setFormBatchId] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formDate, setFormDate] = useState(todayIso());
  const [formTotalMarks, setFormTotalMarks] = useState("100");

  // Marks entry per studentId
  const [marksData, setMarksData] = useState<
    Record<string, { marks: string; grade: string; improvementArea: string; remark: string }>
  >({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [t, b, s, r] = await Promise.all([getTests(), getBatches(), getStudents(), getTestResults()]);
        setTests(t);
        setBatches(b);
        setStudents(s);
        setTestResults(r);
        if (!formBatchId && b.length > 0) setFormBatchId(b[0].id);
      } catch (err) {
        console.error("Failed to load tests:", err);
        toast({ title: "Error", description: "Failed to load tests data from Supabase.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const batchesById = useMemo(() => {
    const map = new Map<string, Batch>();
    batches.forEach((b) => map.set(b.id, b));
    return map;
  }, [batches]);

  const studentsById = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  const resultsByTestId = useMemo(() => {
    const map = new Map<string, TestResult[]>();
    for (const r of testResults) {
      const list = map.get(r.testId) ?? [];
      list.push(r);
      map.set(r.testId, list);
    }
    return map;
  }, [testResults]);

  const resultByTestAndStudent = useMemo(() => {
    const map = new Map<string, TestResult>();
    for (const r of testResults) map.set(`${r.testId}:${r.studentId}`, r);
    return map;
  }, [testResults]);

  const selectedTest = selectedTestId ? tests.find((t) => t.id === selectedTestId) ?? null : null;
  const selectedBatch = selectedTest ? batchesById.get(selectedTest.batchId) ?? null : null;

  const studentHistoryRows = useMemo(() => {
    if (!selectedStudentIdForHistory) return [];
    const student = studentsById.get(selectedStudentIdForHistory);
    if (!student) return [];

    const relatedTests = tests
      .filter((t) => t.batchId === student.batchId)
      .slice()
      .sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.name.localeCompare(b.name));

    return relatedTests.map((t) => {
      const r = resultByTestAndStudent.get(`${t.id}:${student.id}`) ?? null;
      return { test: t, result: r };
    });
  }, [resultByTestAndStudent, selectedStudentIdForHistory, studentsById, tests]);

  const selectedHistoryStudent = selectedStudentIdForHistory ? studentsById.get(selectedStudentIdForHistory) ?? null : null;

  const handleCreateTest = () => setIsCreateTestDialogOpen(true);

  const resetForm = () => {
    setFormName("");
    setFormSubject("");
    setFormDate(todayIso());
    setFormTotalMarks("100");
    if (batches.length > 0) setFormBatchId(batches[0].id);
  };

  const handleSaveTest = async () => {
    if (!formName.trim() || !formBatchId || !formSubject.trim() || !formDate || !formTotalMarks.trim()) {
      toast({ title: "Missing info", description: "Please fill all test fields.", variant: "destructive" });
      return;
    }

    const totalMarks = Number(formTotalMarks);
    if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
      toast({ title: "Invalid marks", description: "Total marks must be a positive number.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const payload: Test = {
        id: generateTestId(),
        name: formName.trim(),
        batchId: formBatchId,
        subject: formSubject.trim(),
        date: formDate,
        totalMarks,
      };
      const created = await createTest(payload);
      if (!created) {
        toast({ title: "Error", description: "Failed to create test.", variant: "destructive" });
        return;
      }
      setTests((prev) => [created, ...prev]);
      setIsCreateTestDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Test created successfully!" });
    } catch (err) {
      console.error("Failed to create test:", err);
      toast({ title: "Error", description: "Failed to create test.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openResults = (testId: string) => {
    setSelectedTestId(testId);
    setIsViewResultsDialogOpen(true);
  };

  const openEnterMarks = (testId: string) => {
    setSelectedTestId(testId);
    const test = tests.find((t) => t.id === testId);
    if (!test) return;

    const batchStudents = students.filter((s) => s.batchId === test.batchId);
    const existing = (resultsByTestId.get(testId) ?? []).slice();

    const initial: Record<string, { marks: string; grade: string; improvementArea: string; remark: string }> = {};
    for (const student of batchStudents) {
      const hit = existing.find((r) => r.studentId === student.id) ?? null;
      const marks = hit ? String(hit.marksObtained) : "";
      initial[student.id] = {
        marks,
        grade: marks ? calculateGrade(Number(marks), test.totalMarks) : "",
        improvementArea: hit?.improvementArea ?? "",
        remark: hit?.remark ?? "",
      };
    }
    setMarksData(initial);
    setIsEnterMarksDialogOpen(true);
  };

  const openStudentHistory = (studentId: string) => {
    setSelectedStudentIdForHistory(studentId);
    setIsStudentHistoryDialogOpen(true);
  };

  const handleMarksChange = (studentId: string, value: string) => {
    const test = selectedTest;
    setMarksData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marks: value,
        grade: test ? calculateGrade(Number(value) || 0, test.totalMarks) : "",
      },
    }));
  };

  const handleSaveMarks = async () => {
    if (!selectedTest) return;
    const batchStudents = students.filter((s) => s.batchId === selectedTest.batchId);

    const entries = batchStudents
      .map((s) => {
        const row = marksData[s.id];
        const raw = (row?.marks ?? "").trim();
        if (!raw) return null;
        const marks = Number(raw);
        if (!Number.isFinite(marks)) return null;
        return {
          studentId: s.id,
          marksObtained: marks,
          grade: calculateGrade(marks, selectedTest.totalMarks),
          improvementArea: (row?.improvementArea ?? "").trim() || null,
          remark: (row?.remark ?? "").trim() || null,
        };
      })
      .filter(Boolean) as Array<{
        studentId: string;
        marksObtained: number;
        grade?: string | null;
        improvementArea?: string | null;
        remark?: string | null;
      }>;

    if (entries.length === 0) {
      toast({
        title: "No marks entered",
        description: "Please enter marks for at least one student.",
        variant: "destructive",
      });
      return;
    }

    const invalid = entries.some((e) => e.marksObtained < 0 || e.marksObtained > selectedTest.totalMarks);
    if (invalid) {
      toast({
        title: "Invalid marks",
        description: `Marks must be between 0 and ${selectedTest.totalMarks}.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const upserted = await upsertTestResultsForTest({ testId: selectedTest.id, entries });
      // Merge into local results list
      setTestResults((prev) => {
        const byKey = new Map<string, TestResult>();
        prev.forEach((r) => byKey.set(`${r.testId}:${r.studentId}`, r));
        upserted.forEach((r) => byKey.set(`${r.testId}:${r.studentId}`, r));
        return Array.from(byKey.values());
      });
      setIsEnterMarksDialogOpen(false);
      setMarksData({});
      toast({ title: "Success", description: `Marks saved for ${entries.length} student(s).` });
    } catch (err) {
      console.error("Failed to save marks:", err);
      toast({ title: "Error", description: "Failed to save marks. Check Supabase permissions.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const testsSorted = useMemo(() => {
    const copy = tests.slice();
    copy.sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.name.localeCompare(b.name));
    return copy;
  }, [tests]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Tests & Results</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Create tests and enter marks</p>
          </div>

          <Button className="rounded-xl bg-primary text-primary-foreground shadow-md hover:shadow-lg" onClick={handleCreateTest}>
            <Plus className="h-4 w-4 mr-2" />
            Create Test
          </Button>
        </div>

        {loading && tests.length === 0 && <div className="text-sm text-muted-foreground">Loading...</div>}

        {/* TESTS GRID */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testsSorted.map((test) => {
            const batch = batchesById.get(test.batchId) ?? null;
            const results = resultsByTestId.get(test.id) ?? [];

            const avgMarks =
              results.length > 0
                ? Math.round(results.reduce((sum, r) => sum + r.marksObtained, 0) / results.length)
                : 0;

            return (
              <div key={test.id} className="border rounded-2xl p-6 bg-card shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-xl">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openResults(test.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Results
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEnterMarks(test.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Enter Marks
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                  {test.subject}
                </span>

                <h3 className="text-lg font-semibold mt-3 mb-1">{test.name}</h3>
                <p className="text-sm text-muted-foreground mb-5">{batch?.name}</p>

                <div className="space-y-3 pt-5 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(test.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span className="font-semibold">{test.totalMarks} marks</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Award className="h-4 w-4" />
                      Average
                    </span>
                    <span className="font-semibold text-primary">
                      {avgMarks}/{test.totalMarks}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      Submissions
                    </span>
                    <span className="font-semibold">{results.length}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CREATE TEST DIALOG */}
        <Dialog open={isCreateTestDialogOpen} onOpenChange={setIsCreateTestDialogOpen}>
          <DialogContent className="p-0 sm:max-w-lg">
            <div className="flex max-h-[85vh] flex-col">
              <DialogHeader className="px-6 pt-6 pb-3">
                <DialogTitle>Create Test</DialogTitle>
                <DialogDescription>Create a new assessment for a batch.</DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 pb-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Test Name</Label>
                    <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Unit Test 1" />
                  </div>

                  <div className="space-y-2">
                    <Label>Batch</Label>
                    <select
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={formBatchId}
                      onChange={(e) => setFormBatchId(e.target.value)}
                    >
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input value={formSubject} onChange={(e) => setFormSubject(e.target.value)} placeholder="Physics" />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Marks</Label>
                      <Input value={formTotalMarks} onChange={(e) => setFormTotalMarks(e.target.value)} placeholder="100" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t bg-background flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateTestDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTest} disabled={loading}>
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* VIEW RESULTS DIALOG */}
        <Dialog open={isViewResultsDialogOpen} onOpenChange={setIsViewResultsDialogOpen}>
          <DialogContent className="p-0 sm:max-w-2xl">
            <div className="flex max-h-[85vh] flex-col">
              <DialogHeader className="px-6 pt-6 pb-3">
                <DialogTitle>Results</DialogTitle>
                <DialogDescription>
                  {selectedTest ? `${selectedTest.name} • ${selectedBatch?.name ?? selectedTest.batchId}` : "View results"}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 pb-6">
                {!selectedTest ? (
                  <div className="text-sm text-muted-foreground">No test selected.</div>
                ) : (
                  <div className="space-y-3">
                    {(resultsByTestId.get(selectedTest.id) ?? [])
                      .slice()
                      .sort((a, b) => b.marksObtained - a.marksObtained)
                      .map((r, idx) => {
                         const s = studentsById.get(r.studentId);
                         return (
                           <div
                             key={`${r.testId}:${r.studentId}`}
                             className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border p-5 bg-card/50 hover:bg-muted/30 transition-colors"
                           >
                             <div className="flex items-center gap-4 min-w-0">
                               <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                 {idx + 1}
                               </div>
                               <div className="min-w-0">
                                 <div className="font-semibold truncate text-slate-900">{s?.name ?? r.studentId}</div>
                                 <div className="text-[11px] text-muted-foreground truncate uppercase tracking-wider font-medium">Roll: {s?.rollNumber ?? "-"}</div>
                               </div>
                             </div>
                             
                             <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 border-t sm:border-t-0 pt-3 sm:pt-0">
                               <div className="text-left sm:text-right">
                                 <div className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Marks</div>
                                 <div className="font-bold text-primary text-lg leading-tight">
                                   {r.marksObtained}<span className="text-xs text-muted-foreground font-medium">/{selectedTest.totalMarks}</span>
                                 </div>
                               </div>
                               
                               <div className="text-center">
                                 <div className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Grade</div>
                                 <div className="font-bold text-slate-900 text-lg leading-tight">{r.grade ?? "-"}</div>
                               </div>

                               <div className="text-right">
                                 <div className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Rank</div>
                                 <div className="font-bold text-slate-900 text-lg leading-tight">#{r.rank ?? idx + 1}</div>
                               </div>
                             </div>
                           </div>
                         );
                      })}
                    {(resultsByTestId.get(selectedTest.id) ?? []).length === 0 && (
                      <div className="text-sm text-muted-foreground">No results yet.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ENTER MARKS DIALOG */}
        <Dialog open={isEnterMarksDialogOpen} onOpenChange={setIsEnterMarksDialogOpen}>
          <DialogContent className="p-0 sm:max-w-3xl">
            <div className="flex max-h-[85vh] flex-col">
              <DialogHeader className="px-6 pt-6 pb-3">
                <DialogTitle>Enter Marks</DialogTitle>
                <DialogDescription>{selectedTest ? `${selectedTest.name} • ${selectedBatch?.name ?? selectedTest.batchId}` : ""}</DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 pb-4">
                {!selectedTest ? (
                  <div className="text-sm text-muted-foreground">No test selected.</div>
                ) : (
                  <div className="space-y-3">
                    {students
                      .filter((s) => s.batchId === selectedTest.batchId && (s.status === "active" || !!marksData[s.id]))
                      .slice()
                      .sort((a, b) => (a.rollNumber ?? 9999) - (b.rollNumber ?? 9999) || a.name.localeCompare(b.name))
                      .map((s) => {
                        const val = marksData[s.id]?.marks ?? "";
                        const grade = marksData[s.id]?.grade ?? "";
                        const improvementArea = marksData[s.id]?.improvementArea ?? "";
                        const remark = marksData[s.id]?.remark ?? "";
                        const num = val.trim() ? Number(val) : null;
                        const ok = num !== null && Number.isFinite(num) && num >= 0 && num <= selectedTest.totalMarks;
                        return (
                          <div key={s.id} className="rounded-2xl border bg-card/30 p-5 shadow-sm hover:shadow-md transition-all">
                            <div className="flex flex-col gap-5">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm">
                                    {s.rollNumber || "?"}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold truncate text-slate-900 text-base">{s.name}</div>
                                    <div className="text-[11px] text-muted-foreground truncate uppercase font-medium tracking-wide">{s.email}</div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-lg text-[11px] font-bold uppercase tracking-tight px-3"
                                    onClick={() => openStudentHistory(s.id)}
                                  >
                                    <TrendingUp className="h-3 w-3 mr-1.5" />
                                    Performance
                                  </Button>
                                  <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${val.trim() ? ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-400'}`}>
                                    {val.trim() ? ok ? "Valid" : "Error" : "Pending"}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-12 sm:col-span-6 md:col-span-5">
                                  <Label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block px-1">Marks Obtained</Label>
                                  <div className="relative">
                                    <Input
                                      value={val}
                                      onChange={(e) => handleMarksChange(s.id, e.target.value)}
                                      placeholder="0"
                                      inputMode="numeric"
                                      className={`h-11 rounded-xl text-lg font-bold ${!ok && val.trim() ? 'border-red-300 ring-red-100' : 'border-slate-200'}`}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                      / {selectedTest.totalMarks}
                                    </div>
                                  </div>
                                </div>

                                <div className="col-span-6 sm:col-span-3 md:col-span-3">
                                  <Label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block px-1">Grade</Label>
                                  <div className="h-11 rounded-xl border-2 border-dashed border-slate-100 bg-slate-50/50 flex items-center justify-center text-xl font-black text-primary">
                                    {grade || "-"}
                                  </div>
                                </div>

                                <div className="col-span-6 sm:col-span-3 md:col-span-4">
                                  <Label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block px-1">Feedback</Label>
                                  <Button 
                                    variant="outline" 
                                    className="w-full h-11 rounded-xl justify-between px-3 text-xs font-medium bg-white"
                                    onClick={(e) => {
                                      const details = (e.currentTarget.closest('.rounded-2xl') as HTMLElement).querySelector('details');
                                      if (details) details.open = !details.open;
                                    }}
                                  >
                                    Add Remarks
                                    <ChevronDown className="h-4 w-4 opacity-50 transition-transform group-open:rotate-180" />
                                  </Button>
                                </div>
                              </div>
                            </div>

                            <details className="group mt-4 rounded-2xl border-2 border-slate-50 bg-slate-50/30 overflow-hidden transition-all duration-300">
                              <summary className="hidden"></summary>
                              <div className="p-4 grid gap-4 sm:grid-cols-2 bg-white/50 border-t border-slate-50">
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-bold uppercase text-slate-500 px-1">Improvement focus</Label>
                                  <Textarea
                                    value={improvementArea}
                                    onChange={(e) =>
                                      setMarksData((prev) => {
                                        const current =
                                          prev[s.id] ?? { marks: "", grade: "", improvementArea: "", remark: "" };
                                        return {
                                          ...prev,
                                          [s.id]: { ...current, improvementArea: e.target.value },
                                        };
                                      })
                                    }
                                    placeholder="Weak topics to work on..."
                                    className="min-h-[100px] rounded-xl resize-none bg-white text-sm focus-visible:ring-primary shadow-inner"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-bold uppercase text-slate-500 px-1">General performance remarks</Label>
                                  <Textarea
                                    value={remark}
                                    onChange={(e) =>
                                      setMarksData((prev) => {
                                        const current =
                                          prev[s.id] ?? { marks: "", grade: "", improvementArea: "", remark: "" };
                                        return {
                                          ...prev,
                                          [s.id]: { ...current, remark: e.target.value },
                                        };
                                      })
                                    }
                                    placeholder="Overall feedback for student..."
                                    className="min-h-[100px] rounded-xl resize-none bg-white text-sm focus-visible:ring-primary shadow-inner"
                                  />
                                </div>
                              </div>
                            </details>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {selectedTest && (
                <div className="px-6 py-4 border-t bg-background flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEnterMarksDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveMarks} disabled={loading}>
                    Save Marks
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* STUDENT HISTORY DIALOG */}
        <Dialog
          open={isStudentHistoryDialogOpen}
          onOpenChange={(open) => {
            setIsStudentHistoryDialogOpen(open);
            if (!open) setSelectedStudentIdForHistory(null);
          }}
        >
          <DialogContent className="p-0 sm:max-w-2xl">
            <div className="flex max-h-[85vh] flex-col">
              <DialogHeader className="px-6 pt-6 pb-3">
                <DialogTitle>All Test Marks</DialogTitle>
                <DialogDescription>
                  {selectedHistoryStudent
                    ? `${selectedHistoryStudent.name} • Roll ${selectedHistoryStudent.rollNumber ?? "-"}`
                    : "Student test history"}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 pb-6">
                {!selectedHistoryStudent ? (
                  <div className="text-sm text-muted-foreground">No student selected.</div>
                ) : studentHistoryRows.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No tests found for this student.</div>
                ) : (
                  <div className="space-y-3">
                    {studentHistoryRows.map(({ test, result }) => (
                      <div key={test.id} className="rounded-xl border p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{test.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {test.subject} • {String(test.date)}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4">
                            <div className="text-right">
                              <div className="font-semibold">
                                {result ? `${result.marksObtained}/${test.totalMarks}` : `—/${test.totalMarks}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Rank: {result?.rank ?? "-"} • {result?.grade ?? ""}
                              </div>
                            </div>
                            <StatusBadge status={result ? "paid" : "pending"} labelOverride={result ? "Recorded" : "Not recorded"} />
                          </div>
                        </div>

                        {(result?.improvementArea || result?.remark) && (
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {result?.improvementArea && (
                              <div className="rounded-lg border bg-muted/20 p-3">
                                <div className="text-xs font-semibold text-muted-foreground">Improvement area</div>
                                <div className="mt-1 text-sm whitespace-pre-wrap">{result.improvementArea}</div>
                              </div>
                            )}
                            {result?.remark && (
                              <div className="rounded-lg border bg-muted/20 p-3">
                                <div className="text-xs font-semibold text-muted-foreground">Remark</div>
                                <div className="mt-1 text-sm whitespace-pre-wrap">{result.remark}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminTests;
