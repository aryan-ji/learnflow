import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { mockBatches, mockTests, mockTestResults, mockStudents } from '@/data/mockData';
import { Plus, FileText, Calendar, Award, MoreVertical, Eye, Edit, Users, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import StatusBadge from '@/components/dashboard/StatusBadge';

const TeacherTests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateTestDialogOpen, setIsCreateTestDialogOpen] = useState(false);
  const [isViewResultsDialogOpen, setIsViewResultsDialogOpen] = useState(false);
  const [isEnterMarksDialogOpen, setIsEnterMarksDialogOpen] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [marksData, setMarksData] = useState<Record<string, { marks: string; grade: string }>>({});

  const teacherBatches = mockBatches.filter(
    (b) => b.teacherId === user?.id
  );

  const teacherTests = mockTests.filter((t) =>
    teacherBatches.some((b) => b.id === t.batchId)
  );

  const handleCreateTest = () => {
    setIsCreateTestDialogOpen(true);
  };

  const handleSaveTest = () => {
    setIsCreateTestDialogOpen(false);
    toast({
      title: "Success",
      description: "Test created successfully!",
    });
  };

  const handleViewResults = (testId: string) => {
    setSelectedTestId(testId);
    setIsViewResultsDialogOpen(true);
  };

  const handleEnterMarks = (testId: string) => {
    setSelectedTestId(testId);
    // Initialize marks data for students in the batch
    const test = mockTests.find(t => t.id === testId);
    if (test) {
      const batch = mockBatches.find(b => b.id === test.batchId);
      const batchStudents = mockStudents.filter(s => s.batchId === test.batchId);
      const existingResults = mockTestResults.filter(r => r.testId === testId);
      
      const initialMarks: Record<string, { marks: string; grade: string }> = {};
      batchStudents.forEach(student => {
        const existingResult = existingResults.find(r => r.studentId === student.id);
        initialMarks[student.id] = {
          marks: existingResult ? existingResult.marksObtained.toString() : '',
          grade: existingResult?.grade || ''
        };
      });
      setMarksData(initialMarks);
    }
    setIsEnterMarksDialogOpen(true);
  };

  const handleMarksChange = (studentId: string, value: string) => {
    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marks: value,
        grade: calculateGrade(parseFloat(value) || 0, selectedTestId)
      }
    }));
  };

  const calculateGrade = (marks: number, testId: string | null): string => {
    if (!testId) return '';
    const test = mockTests.find(t => t.id === testId);
    if (!test) return '';
    
    const percentage = (marks / test.totalMarks) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    return 'D';
  };

  const handleSaveMarks = () => {
    if (!selectedTestId) return;
    
    const test = mockTests.find(t => t.id === selectedTestId);
    if (!test) return;

    let savedCount = 0;
    Object.entries(marksData).forEach(([studentId, data]) => {
      if (data.marks && data.marks.trim() !== '') {
        const marks = parseFloat(data.marks);
        if (marks >= 0 && marks <= test.totalMarks) {
          savedCount++;
        }
      }
    });

    if (savedCount === 0) {
      toast({
        title: "No marks entered",
        description: "Please enter marks for at least one student",
        variant: "destructive",
      });
      return;
    }

    setIsEnterMarksDialogOpen(false);
    toast({
      title: "Success",
      description: `Marks saved for ${savedCount} student(s)`,
    });
    setMarksData({});
    setSelectedTestId(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Tests & Results
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Create and manage assessments
            </p>
          </div>

          <Button 
            className="rounded-xl bg-primary text-primary-foreground shadow-md hover:shadow-lg"
            onClick={handleCreateTest}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Test
          </Button>
        </div>

        {/* TESTS GRID */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teacherTests.map((test) => {
            const batch = mockBatches.find(
              (b) => b.id === test.batchId
            );

            const results = mockTestResults.filter(
              (r) => r.testId === test.id
            );

            const avgMarks =
              results.length > 0
                ? Math.round(
                    results.reduce(
                      (sum, r) => sum + r.marksObtained,
                      0
                    ) / results.length
                  )
                : 0;

            return (
              <div
                key={test.id}
                className="border rounded-2xl p-6 bg-card shadow-sm hover:shadow-md transition"
              >
                {/* TOP */}
                <div className="flex items-start justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>

                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    {test.subject}
                  </span>
                </div>

                {/* TITLE */}
                <h3 className="text-lg font-semibold mb-1">
                  {test.name}
                </h3>

                <p className="text-sm text-muted-foreground mb-5">
                  {batch?.name}
                </p>

                {/* DETAILS */}
                <div className="space-y-3 pt-5 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(test.date).toLocaleDateString(
                        'en-IN',
                        {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }
                      )}
                    </span>

                    <span className="font-semibold">
                      {test.totalMarks} marks
                    </span>
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
                </div>

                {/* ACTIONS */}
                <div className="mt-5 pt-5 border-t flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl hover:border-primary hover:text-primary"
                    onClick={() => handleViewResults(test.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Results
                  </Button>

                  <Button 
                    className="flex-1 rounded-xl bg-primary text-primary-foreground"
                    onClick={() => handleEnterMarks(test.id)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Enter Marks
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* CREATE TEST DIALOG */}
      <Dialog open={isCreateTestDialogOpen} onOpenChange={setIsCreateTestDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Test</DialogTitle>
            <DialogDescription>
              Fill in the test details below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Test Name</label>
              <Input placeholder="e.g., Mid-term Exam" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Batch</label>
              <select className="w-full px-3 py-2 rounded-lg border bg-background">
                {teacherBatches.map(batch => (
                  <option key={batch.id} value={batch.id}>{batch.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Input placeholder="e.g., Physics" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Total Marks</label>
              <Input type="number" placeholder="100" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Test Date</label>
              <Input type="date" />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsCreateTestDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveTest}
                className="w-full sm:w-auto"
              >
                Create Test
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* VIEW RESULTS DIALOG */}
      <Dialog open={isViewResultsDialogOpen} onOpenChange={setIsViewResultsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test Results</DialogTitle>
            <DialogDescription>
              {selectedTestId && (() => {
                const test = mockTests.find(t => t.id === selectedTestId);
                return test ? `Results for ${test.name}` : '';
              })()}
            </DialogDescription>
          </DialogHeader>
          {selectedTestId && (() => {
            const test = mockTests.find(t => t.id === selectedTestId);
            const batch = test ? mockBatches.find(b => b.id === test.batchId) : null;
            const results = mockTestResults.filter(r => r.testId === selectedTestId);
            const studentsWithResults = results.map(result => {
              const student = mockStudents.find(s => s.id === result.studentId);
              return { student, result };
            });

            return (
              <div className="space-y-4">
                {test && (
                  <div className="border rounded-xl p-4 bg-muted/30">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Test Name</p>
                        <p className="font-semibold">{test.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Subject</p>
                        <p className="font-semibold">{test.subject}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Marks</p>
                        <p className="font-semibold">{test.totalMarks}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Batch</p>
                        <p className="font-semibold">{batch?.name}</p>
                      </div>
                    </div>
                  </div>
                )}

                {studentsWithResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No results available yet.</p>
                    <p className="text-sm mt-2">Enter marks to see results here.</p>
                  </div>
                ) : (
                  <div className="border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left py-3 px-4 font-semibold">Student</th>
                            <th className="text-left py-3 px-4 font-semibold">Marks Obtained</th>
                            <th className="text-left py-3 px-4 font-semibold">Percentage</th>
                            <th className="text-left py-3 px-4 font-semibold">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentsWithResults.map(({ student, result }) => {
                            const percentage = test 
                              ? Math.round((result.marksObtained / test.totalMarks) * 100)
                              : 0;
                            return (
                              <tr key={result.id} className="border-t hover:bg-muted/30">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                                      {student?.name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-medium">{student?.name}</p>
                                      <p className="text-xs text-muted-foreground">{student?.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-semibold">
                                    {result.marksObtained}/{test?.totalMarks}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-medium">{percentage}%</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                                    <Award className="h-3 w-3 mr-1" />
                                    {result.grade || 'N/A'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsViewResultsDialogOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ENTER MARKS DIALOG */}
      <Dialog open={isEnterMarksDialogOpen} onOpenChange={setIsEnterMarksDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enter Marks</DialogTitle>
            <DialogDescription>
              {selectedTestId && (() => {
                const test = mockTests.find(t => t.id === selectedTestId);
                return test ? `Enter marks for ${test.name} (Total: ${test.totalMarks} marks)` : '';
              })()}
            </DialogDescription>
          </DialogHeader>
          {selectedTestId && (() => {
            const test = mockTests.find(t => t.id === selectedTestId);
            const batch = test ? mockBatches.find(b => b.id === test.batchId) : null;
            const batchStudents = test ? mockStudents.filter(s => s.batchId === test.batchId) : [];

            return (
              <div className="space-y-4">
                {test && batch && (
                  <div className="border rounded-xl p-4 bg-muted/30">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Test</p>
                        <p className="font-semibold">{test.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Batch</p>
                        <p className="font-semibold">{batch.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Marks</p>
                        <p className="font-semibold">{test.totalMarks}</p>
                      </div>
                    </div>
                  </div>
                )}

                {batchStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No students found in this batch.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {batchStudents.map((student) => {
                      const studentMarks = marksData[student.id] || { marks: '', grade: '' };
                      const existingResult = mockTestResults.find(
                        r => r.testId === selectedTestId && r.studentId === student.id
                      );

                      return (
                        <div
                          key={student.id}
                          className="border rounded-xl p-4 bg-card"
                        >
                          <div className="flex items-center gap-4 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold">
                              {student.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{student.name}</p>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            </div>
                            {existingResult && (
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                Already marked
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`marks-${student.id}`} className="text-xs">
                                Marks Obtained
                              </Label>
                              <Input
                                id={`marks-${student.id}`}
                                type="number"
                                min="0"
                                max={test?.totalMarks || 100}
                                placeholder="Enter marks"
                                value={studentMarks.marks}
                                onChange={(e) => handleMarksChange(student.id, e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`grade-${student.id}`} className="text-xs">
                                Grade (Auto-calculated)
                              </Label>
                              <Input
                                id={`grade-${student.id}`}
                                value={studentMarks.grade}
                                readOnly
                                className="mt-1 bg-muted"
                                placeholder="Grade will appear here"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEnterMarksDialogOpen(false);
                      setMarksData({});
                    }}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveMarks}
                    className="w-full sm:w-auto"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Save Marks
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default TeacherTests;
