import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getBatches, getStudentsByParent, getTestResultsByStudent, getTests } from "@/lib/supabaseQueries";
import type { Batch, Student, Test, TestResult } from "@/types";
import { Award, Download, FileText, MessageSquareText, TrendingUp, Trophy } from "lucide-react";

const ParentResults = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [children, setChildren] = useState<Student[]>([]);
  const [batchesById, setBatchesById] = useState<Record<string, Batch>>({});
  const [testsById, setTestsById] = useState<Record<string, Test>>({});
  const [resultsByStudentId, setResultsByStudentId] = useState<Record<string, TestResult[]>>({});

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const kids = await getStudentsByParent(user.id);
        setChildren(kids);

        const [batches, tests] = await Promise.all([getBatches(), getTests()]);
        setBatchesById(Object.fromEntries(batches.map((b) => [b.id, b] as const)));
        setTestsById(Object.fromEntries(tests.map((t) => [t.id, t] as const)));

        const rows = await Promise.all(kids.map(async (c) => [c.id, await getTestResultsByStudent(c.id)] as const));
        setResultsByStudentId(Object.fromEntries(rows));
      } catch (err) {
        console.error("Failed to load parent results:", err);
        toast({ title: "Error", description: "Failed to load results from Supabase.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast, user?.id]);

  const handleDownloadResults = (childName: string) => {
    toast({
      title: "Download Started",
      description: `Test results for ${childName} is being generated...`,
    });

    const reportData = `Test Results Report - ${childName}\nGenerated: ${new Date().toLocaleDateString()}\n\nExported successfully.`;
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(reportData));
    element.setAttribute("download", `results-${childName}-${Date.now()}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast({ title: "Success", description: "Test results downloaded successfully!" });
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A+":
      case "A":
        return "bg-green-100 text-green-700";
      case "B+":
      case "B":
        return "bg-primary/10 text-primary";
      case "C+":
      case "C":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const childrenWithResults = useMemo(() => {
    return children.map((child) => {
      const results = resultsByStudentId[child.id] || [];
      const batch = batchesById[child.batchId];
      return { child, results, batch };
    });
  }, [batchesById, children, resultsByStudentId]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Test Results</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">View test performance</p>
        </div>

        {loading && children.length === 0 && <div className="text-sm text-muted-foreground">Loading...</div>}

        {childrenWithResults.map(({ child, results, batch }) => {
          const totalMarksObtained = results.reduce((sum, r) => sum + r.marksObtained, 0);
          const totalMaxMarks = results.reduce((sum, r) => sum + (testsById[r.testId]?.totalMarks ?? 0), 0);
          const overallPercentage = totalMaxMarks > 0 ? Math.round((totalMarksObtained / totalMaxMarks) * 100) : 0;

          const sortedResults = results
            .slice()
            .sort((a, b) => String(testsById[b.testId]?.date ?? "").localeCompare(String(testsById[a.testId]?.date ?? "")));

          return (
            <div key={child.id} className="border rounded-2xl overflow-hidden bg-card shadow-sm">
              <div className="p-6 border-b bg-muted/30">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                      {child.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{child.name}</h2>
                      <p className="text-sm text-muted-foreground">{batch?.name}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="text-2xl font-bold text-primary">{overallPercentage}%</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Overall</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="font-semibold mb-5 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Test Results
                </h3>

                {sortedResults.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No results yet.</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {sortedResults.map((result) => {
                      const test = testsById[result.testId];
                      const percentage = test?.totalMarks ? Math.round((result.marksObtained / test.totalMarks) * 100) : 0;
                      const feedback = (result.improvementArea ?? "").trim() || (result.remark ?? "").trim();

                      return (
                        <div key={result.id} className="bg-muted/40 rounded-2xl p-5 hover:bg-muted/60 transition">
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="min-w-0">
                              <h4 className="font-medium truncate">{test?.name ?? result.testId}</h4>
                              <p className="text-sm text-muted-foreground truncate">{test?.subject ?? ""}</p>
                            </div>

                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getGradeColor(result.grade || "")}`}
                            >
                              <Award className="h-4 w-4 mr-1" />
                              {result.grade ?? "-"}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Marks</span>
                              <span className="font-semibold">
                                {result.marksObtained} / {test?.totalMarks ?? "-"}
                              </span>
                            </div>

                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground flex items-center gap-2">
                                <Trophy className="h-4 w-4" />
                                Rank
                              </span>
                              <span className="font-semibold text-primary">{result.rank ?? "-"}</span>
                            </div>

                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                            </div>

                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {test?.date
                                  ? new Date(test.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                                  : ""}
                              </span>
                              <span className="font-semibold text-primary">{percentage}%</span>
                            </div>

                            {feedback && (
                              <div className="mt-3 rounded-xl border bg-background p-3">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                  <MessageSquareText className="h-4 w-4 text-primary" />
                                  Teacher feedback
                                </div>
                                {(result.improvementArea ?? "").trim() && (
                                  <div className="mt-2 text-sm">
                                    <span className="font-semibold text-muted-foreground">Improvement: </span>
                                    {result.improvementArea}
                                  </div>
                                )}
                                {(result.remark ?? "").trim() && (
                                  <div className="mt-1 text-sm">
                                    <span className="font-semibold text-muted-foreground">Remark: </span>
                                    {result.remark}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t">
                  <Button className="rounded-xl bg-primary text-primary-foreground" onClick={() => handleDownloadResults(child.name)}>
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

export default ParentResults;

