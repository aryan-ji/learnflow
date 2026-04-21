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
import { Award, Calendar, Check, ChevronDown, Edit, Eye, FileText, MoreVertical, Plus, Users, X } from "lucide-react";

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
                      .map((r) => {
                        const s = studentsById.get(r.studentId);
                        return (
                          <div
                            key={`${r.testId}:${r.studentId}`}
                            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border p-4"
                          >
                            <div className="min-w-0">
                              <div className="font-medium truncate">{s?.name ?? r.studentId}</div>
                              <div className="text-xs text-muted-foreground truncate">{s?.email ?? ""}</div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-4">
                              <div className="text-right">
                                <div className="font-semibold">
                                  {r.marksObtained}/{selectedTest.totalMarks}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Rank: {r.rank ?? "-"} • {r.grade ?? ""}
                                </div>
                              </div>
                              <StatusBadge status="paid" labelOverride="Recorded" />
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
                      .filter((s) => s.batchId === selectedTest.batchId)
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
                          <div
                            key={s.id}
                            className="rounded-xl border bg-background/40 p-4"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <div className="font-medium truncate">
                                  {s.name} <span className="text-xs text-muted-foreground">• Roll {s.rollNumber ?? "-"}</span>
                                </div>
                                <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                                <div className="mt-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 text-xs"
                                    onClick={() => openStudentHistory(s.id)}
                                  >
                                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                                    All tests
                                  </Button>
                                </div>
                              </div>

                              <div className="grid grid-cols-12 gap-2 sm:flex sm:items-center sm:justify-end sm:gap-3 sm:min-w-[240px]">
                                <div className="col-span-12 sm:w-32">
                                  <div className="text-[11px] font-medium text-muted-foreground sm:hidden mb-1">Marks</div>
                                  <Input
                                    value={val}
                                    onChange={(e) => handleMarksChange(s.id, e.target.value)}
                                    placeholder="Marks"
                                    inputMode="numeric"
                                    className="h-10"
                                  />
                                </div>

                                <div className="col-span-6 sm:w-16">
                                  <div className="text-[11px] font-medium text-muted-foreground sm:hidden mb-1">Grade</div>
                                  <div className="h-10 rounded-md border bg-muted/30 flex items-center justify-center text-sm font-semibold">
                                    {grade || "-"}
                                  </div>
                                </div>

                                <div className="col-span-6 sm:w-12">
                                  <div className="text-[11px] font-medium text-muted-foreground sm:hidden mb-1">Status</div>
                                  <div className="h-10 rounded-md border bg-muted/30 flex items-center justify-center">
                                    {val.trim() ? ok ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" /> : <span className="text-xs text-muted-foreground">—</span>}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <details className="group mt-3 rounded-xl border bg-muted/30 px-3 py-2">
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 select-none">
                                <span className="text-xs font-semibold text-muted-foreground">Feedback (optional)</span>
                                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                              </summary>

                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Improvement area</Label>
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
                                    placeholder="e.g. Improve speed, focus on weak chapters"
                                    className="min-h-[84px] resize-none bg-background"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Remark</Label>
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
                                    placeholder="e.g. Good improvement from last test"
                                    className="min-h-[84px] resize-none bg-background"
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
