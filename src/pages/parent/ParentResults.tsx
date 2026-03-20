import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  getStudentsByParent,
  getTestResultsByStudent,
  getBatchById,
  getTestById,
} from '@/data/mockData';
import { FileText, Award, TrendingUp, Download } from 'lucide-react';

const ParentResults = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const children = getStudentsByParent(user?.id || '');

  const handleDownloadResults = (childName: string) => {
    toast({
      title: "Download Started",
      description: `Test results for ${childName} is being generated...`,
    });

    // Simulate generating a report
    const reportData = `Test Results Report - ${childName}\nGenerated: ${new Date().toLocaleDateString()}\n\nTest results exported successfully.`;
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(reportData));
    element.setAttribute("download", `results-${childName}-${Date.now()}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast({
      title: "Success",
      description: `Test results downloaded successfully!`,
    });
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-green-100 text-green-700';
      case 'B':
        return 'bg-primary/10 text-primary';
      case 'C':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Test Results
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            View test performance
          </p>
        </div>

        {/* CHILDREN RESULTS */}
        {children.map((child) => {
          const batch = getBatchById(child.batchId);
          const results = getTestResultsByStudent(child.id);

          const totalMarksObtained = results.reduce(
            (sum, r) => sum + r.marksObtained,
            0
          );

          const totalMaxMarks = results.reduce((sum, r) => {
            const test = getTestById(r.testId);
            return sum + (test?.totalMarks || 0);
          }, 0);

          const overallPercentage =
            totalMaxMarks > 0
              ? Math.round(
                  (totalMarksObtained / totalMaxMarks) * 100
                )
              : 0;

          return (
            <div
              key={child.id}
              className="border rounded-2xl overflow-hidden bg-card shadow-sm"
            >
              {/* HEADER */}
              <div className="p-6 border-b bg-muted/30">
                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-4">

                    <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                      {child.name.charAt(0)}
                    </div>

                    <div>
                      <h2 className="text-lg font-semibold">
                        {child.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {batch?.name}
                      </p>
                    </div>

                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="text-2xl font-bold text-primary">
                        {overallPercentage}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Overall
                    </p>
                  </div>

                </div>
              </div>

              {/* RESULTS GRID */}
              <div className="p-6">
                <h3 className="font-semibold mb-5 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Test Results
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  {results.map((result) => {
                    const test = getTestById(result.testId);

                    const percentage = test
                      ? Math.round(
                          (result.marksObtained /
                            test.totalMarks) *
                            100
                        )
                      : 0;

                    return (
                      <div
                        key={result.id}
                        className="bg-muted/40 rounded-2xl p-5 hover:bg-muted/60 transition"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-medium">
                              {test?.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {test?.subject}
                            </p>
                          </div>

                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getGradeColor(
                              result.grade || ''
                            )}`}
                          >
                            <Award className="h-4 w-4 mr-1" />
                            {result.grade}
                          </span>
                        </div>

                        <div className="space-y-2">

                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Marks
                            </span>
                            <span className="font-semibold">
                              {result.marksObtained} /{' '}
                              {test?.totalMarks}
                            </span>
                          </div>

                          {/* PROGRESS BAR */}
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {new Date(
                                test?.date || ''
                              ).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>

                            <span className="font-semibold text-primary">
                              {percentage}%
                            </span>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 pt-6 border-t">
                  <Button 
                    className="rounded-xl bg-primary text-primary-foreground"
                    onClick={() => handleDownloadResults(child.name)}
                  >
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
