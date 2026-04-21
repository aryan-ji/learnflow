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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sortedResults.map((result) => {
                      const test = testsById[result.testId];
                      const percentage = test?.totalMarks ? Math.round((result.marksObtained / test.totalMarks) * 100) : 0;
                      const hasFeedback = (result.improvementArea ?? "").trim() || (result.remark ?? "").trim();

                      return (
                        <div key={result.id} className="relative overflow-hidden bg-card border rounded-2xl p-0 hover:shadow-lg transition-all duration-300 group">
                          {/* Top accent bar based on grade */}
                          <div className={`h-1.5 w-full ${percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-primary' : 'bg-orange-500'}`} />
                          
                          <div className="p-5">
                            <div className="flex flex-col gap-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors truncate">{test?.name ?? "Special Assessment"}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-md">
                                      {test?.subject ?? "Academic"}
                                    </span>
                                    <span className="text-[11px] font-medium text-slate-400">
                                      {test?.date ? new Date(test.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                                    </span>
                                  </div>
                                </div>

                                <div className={`flex flex-col items-center justify-center h-12 w-12 rounded-xl shrink-0 ${getGradeColor(result.grade || "")} font-black text-lg shadow-sm border`}>
                                  {result.grade ?? "-"}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                                <div>
                                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Score</div>
                                  <div className="font-black text-slate-900 text-xl">
                                    {result.marksObtained}<span className="text-sm text-slate-400 font-bold">/{test?.totalMarks ?? "-"}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Percentage</div>
                                  <div className="font-black text-primary text-xl">
                                    {percentage}%
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tight text-slate-500">
                                  <span className="flex items-center gap-1.5">
                                    <Trophy className="h-3.5 w-3.5 text-primary" />
                                    Class Rank
                                  </span>
                                  <span className="text-slate-900 bg-primary/10 px-2.5 py-0.5 rounded-full">Rank #{result.rank ?? "-"}</span>
                                </div>

                                <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                  <div 
                                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-primary' : 'bg-orange-500'}`} 
                                    style={{ width: `${percentage}%` }} 
                                  />
                                </div>
                              </div>

                              {hasFeedback && (
                                <div className="mt-2 rounded-xl bg-slate-50/80 p-3.5 border border-slate-100 shadow-sm">
                                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
                                    <MessageSquareText className="h-3.5 w-3.5" />
                                    Instructor Comments
                                  </div>
                                  <div className="space-y-2">
                                    {(result.improvementArea ?? "").trim() && (
                                      <div className="text-xs leading-relaxed text-slate-600">
                                        <span className="font-bold text-slate-500 uppercase text-[9px] mr-1 underline decoration-primary/30 underline-offset-2">Focus Area:</span>
                                        {result.improvementArea}
                                      </div>
                                    )}
                                    {(result.remark ?? "").trim() && (
                                      <div className="text-xs leading-relaxed text-slate-600 italic border-l-2 border-primary/20 pl-3">
                                        "{result.remark}"
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
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

