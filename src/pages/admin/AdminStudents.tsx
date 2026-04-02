import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { deleteStudent, getStudents, getBatches, createStudent, getUsers } from "@/lib/supabaseQueries";
import { Student, Batch, User } from "@/types";
import { Search, Plus, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminStudents = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilterId, setBatchFilterId] = useState("");
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [parents, setParents] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // form fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBatchId, setFormBatchId] = useState<string>("");
  const [formParentId, setFormParentId] = useState<string>("");

  const filteredStudents = students.filter((student) => {
    const matchesQuery =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBatch = !batchFilterId || student.batchId === batchFilterId;
    return matchesQuery && matchesBatch;
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [s, b, u] = await Promise.all([getStudents(), getBatches(), getUsers()]);
        setStudents(s);
        setBatches(b);
        setParents(u.filter((x) => x.role === "parent"));
      } catch (err) {
        console.error('Error loading students/batches', err);
        toast({ title: 'Error', description: 'Failed to load data' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const handleAddStudent = () => {
    setIsAddStudentDialogOpen(true);
  };

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormBatchId("");
    setFormParentId("");
  };

  const generateStudentId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return `s-${crypto.randomUUID()}`;
    }
    return `s-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const handleSaveStudent = async () => {
    if (!formName.trim() || !formEmail.trim() || !formPhone.trim() || !formBatchId || !formParentId) {
      toast({
        title: "Missing info",
        description: "Please fill Name, Email, Phone, Batch, and Parent.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const newStudent: Student = {
        id: generateStudentId(),
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        batchId: formBatchId,
        parentId: formParentId,
        enrollmentDate: new Date().toISOString().slice(0, 10),
        status: "active",
      };

      const created = await createStudent(newStudent);
      if (!created) {
        toast({
          title: "Error",
          description: "Failed to add student. Check Supabase permissions.",
          variant: "destructive",
        });
        return;
      }

      setStudents((prev) => [created, ...prev]);
      setIsAddStudentDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Student added successfully!",
      });
    } catch (err) {
      console.error("Failed to create student:", err);
      toast({
        title: "Error",
        description: "Failed to add student. Check Supabase configuration.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditStudent = (studentId: string) => {
    toast({
      title: "Edit Student",
      description: `Opening edit dialog for student ${studentId}`
    });
    setSelectedStudentId(studentId);
  };

  const handleViewStudent = (studentId: string) => {
    toast({
      title: "View Details",
      description: `Loading student details for ${studentId}`
    });
    setSelectedStudentId(studentId);
  };

  const handleDeleteStudent = async (studentId: string) => {
    setLoading(true);
    try {
      await deleteStudent(studentId);
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      toast({
        title: "Deleted",
        description: "Student deleted successfully.",
      });
    } catch (err) {
      console.error("Failed to delete student:", err);
      toast({
        title: "Error",
        description: "Failed to delete student. Check Supabase permissions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Students</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Manage enrolled students
            </p>
          </div>

          <Button 
            className="rounded-xl bg-primary text-primary-foreground shadow-md hover:shadow-lg text-sm sm:text-base w-full sm:w-auto"
            onClick={handleAddStudent}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </div>

        {/* SEARCH */}
        <div className="grid w-full gap-3 sm:max-w-3xl sm:grid-cols-2">
          <div className="relative w-full">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 sm:pl-11 h-11 sm:h-12 rounded-xl bg-background border focus-visible:ring-2 focus-visible:ring-primary text-sm sm:text-base"
            />
          </div>

          <div className="w-full">
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary sm:h-12"
              value={batchFilterId}
              onChange={(e) => setBatchFilterId(e.target.value)}
            >
              <option value="">All batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* STUDENTS TABLE */}
        <div className="border rounded-xl sm:rounded-2xl overflow-hidden bg-card shadow-sm">

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm min-w-[640px]">

              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-3 px-4 sm:py-4 sm:px-6 font-semibold text-muted-foreground">
                    Student
                  </th>
                  <th className="text-left py-3 px-4 sm:py-4 sm:px-6 font-semibold text-muted-foreground">
                    Contact
                  </th>
                  <th className="text-left py-3 px-4 sm:py-4 sm:px-6 font-semibold text-muted-foreground">
                    Batch
                  </th>
                  <th className="text-left py-3 px-4 sm:py-4 sm:px-6 font-semibold text-muted-foreground">
                    Enrolled
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
                {filteredStudents.map((student) => {
                  const batch = batches.find(
                    b => b.id === student.batchId
                  );

                  return (
                    <tr
                      key={student.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      {/* STUDENT */}
                      <td className="py-3 px-4 sm:py-4 sm:px-6">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs sm:text-sm flex-shrink-0">
                            {student.name.charAt(0)}
                          </div>

                          <div className="min-w-0">
                            <p className="font-medium truncate text-xs sm:text-sm">
                              {student.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              ID: {student.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* CONTACT */}
                      <td className="py-3 px-4 sm:py-4 sm:px-6">
                        <p className="truncate max-w-[120px] sm:max-w-none">{student.email}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-none">
                          {student.phone}
                        </p>
                      </td>

                      {/* BATCH */}
                      <td className="py-3 px-4 sm:py-4 sm:px-6">
                        <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-lg sm:rounded-xl text-xs font-semibold bg-primary/10 text-primary">
                          {batch?.name}
                        </span>
                      </td>

                      {/* DATE */}
                      <td className="py-3 px-4 sm:py-4 sm:px-6 text-muted-foreground whitespace-nowrap">
                        {new Date(student.enrollmentDate).toLocaleDateString(
                          'en-IN',
                          {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="py-3 px-4 sm:py-4 sm:px-6">
                        <StatusBadge status={student.status} />
                      </td>

                      {/* ACTION */}
                      <td className="py-3 px-4 sm:py-4 sm:px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 sm:h-10 sm:w-10">
                              <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewStudent(student.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditStudent(student.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteStudent(student.id)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        </div>

      </div>

      {/* ADD STUDENT DIALOG */}
      <Dialog open={isAddStudentDialogOpen} onOpenChange={setIsAddStudentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Fill in the student details below
            </DialogDescription>
          </DialogHeader>
            <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input placeholder="Student Name" value={formName} onChange={e => setFormName(e.target.value)} className="text-sm sm:text-base" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input type="email" placeholder="student@example.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="text-sm sm:text-base" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Phone</label>
              <Input placeholder="+91 98765 43210" value={formPhone} onChange={e => setFormPhone(e.target.value)} className="text-sm sm:text-base" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Batch</label>
              <select className="w-full px-3 py-2 rounded-lg border bg-background text-sm sm:text-base" value={formBatchId} onChange={e => setFormBatchId(e.target.value)}>
                <option value="">Select batch</option>
                {batches.map(batch => (
                  <option key={batch.id} value={batch.id}>{batch.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Parent</label>
              <select
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm sm:text-base"
                value={formParentId}
                onChange={(e) => setFormParentId(e.target.value)}
              >
                <option value="">Select parent</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddStudentDialogOpen(false);
                  resetForm();
                }}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveStudent}
                disabled={loading}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                {loading ? 'Adding...' : 'Add Student'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminStudents;
