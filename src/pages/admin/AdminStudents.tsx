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
import {
  createStudent,
  deleteStudent,
  getBatches,
  getOrCreateParentUserByEmail,
  getOrCreateUnassignedParentUser,
  getStudents,
  updateStudent,
} from "@/lib/supabaseQueries";
import { Batch, Student } from "@/types";
import { Search, Plus, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminStudents = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilterId, setBatchFilterId] = useState("");
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [isViewStudentDialogOpen, setIsViewStudentDialogOpen] = useState(false);
  const [isEditStudentDialogOpen, setIsEditStudentDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedStudent = selectedStudentId ? students.find((s) => s.id === selectedStudentId) ?? null : null;
  const batchNameById = (id: string) => batches.find((b) => b.id === id)?.name ?? id;

  // form fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formMotherName, setFormMotherName] = useState("");
  const [formFatherName, setFormFatherName] = useState("");
  const [formParentPhone, setFormParentPhone] = useState("");
  const [formParentEmail, setFormParentEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formSchool, setFormSchool] = useState("");
  const [formBatchId, setFormBatchId] = useState<string>("");

  // edit form fields
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editMotherName, setEditMotherName] = useState("");
  const [editFatherName, setEditFatherName] = useState("");
  const [editParentPhone, setEditParentPhone] = useState("");
  const [editParentEmail, setEditParentEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editSchool, setEditSchool] = useState("");
  const [editBatchId, setEditBatchId] = useState<string>("");
  const [editStatus, setEditStatus] = useState<Student["status"]>("active");

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
        const [s, b] = await Promise.all([getStudents(), getBatches()]);
        setStudents(s);
        setBatches(b);
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
    setFormMotherName("");
    setFormFatherName("");
    setFormParentPhone("");
    setFormParentEmail("");
    setFormAddress("");
    setFormSchool("");
    setFormBatchId("");
  };

  const deriveParentPassword = (studentName: string) => {
    const first = studentName.trim().split(/\s+/).filter(Boolean)[0] ?? "";
    const base = first ? first.toLowerCase() : "parent";

    // Supabase Auth enforces a minimum password length (commonly 6+).
    // Keep it "child first name in lowercase" by repeating the same token if it's short.
    let out = base;
    while (out.length < 6) out += base;
    return out;
  };

  const resolveParentEmail = (parentEmailRaw: string) => {
    const candidate = parentEmailRaw.trim().toLowerCase();
    if (!candidate) return "";

    // Simple sanity check; DB will still enforce constraints.
    if (!candidate.includes("@")) return "";

    return candidate;
  };

  const handleSaveStudent = async () => {
    if (
      !formName.trim() ||
      !formBatchId
    ) {
      toast({
        title: "Missing info",
        description: "Please fill Name and Batch.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const parentName = formFatherName.trim() || formMotherName.trim() || `Parent of ${formName.trim()}`;
      const parentEmailForAccount = resolveParentEmail(formParentEmail);
      const parent = parentEmailForAccount
        ? await getOrCreateParentUserByEmail({
            parentEmail: parentEmailForAccount,
            parentName,
            password: deriveParentPassword(formName),
          })
        : await getOrCreateUnassignedParentUser();

      if (!parent) {
        toast({
          title: "Error",
          description: "Could not set a parent user for this student.",
          variant: "destructive",
        });
        return;
      }

      const storedParentEmail = parentEmailForAccount || formParentEmail.trim();

      const newStudent: Student = {
        id: "",
        name: formName.trim(),
        email: formEmail.trim() || `student-${Date.now()}@student.local`,
        phone: formPhone.trim() || "",
        motherName: formMotherName.trim() || undefined,
        fatherName: formFatherName.trim() || undefined,
        parentPhone: formParentPhone.trim() || undefined,
        parentEmail: storedParentEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
        school: formSchool.trim() || undefined,
        batchId: formBatchId,
        parentId: parent.id,
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
    setSelectedStudentId(studentId);
    const s = students.find((x) => x.id === studentId);
    if (!s) return;

    setEditName(s.name ?? "");
    setEditEmail(s.email ?? "");
    setEditPhone(s.phone ?? "");
    setEditMotherName(s.motherName ?? "");
    setEditFatherName(s.fatherName ?? "");
    setEditParentPhone(s.parentPhone ?? "");
    setEditParentEmail(s.parentEmail ?? "");
    setEditAddress(s.address ?? "");
    setEditSchool(s.school ?? "");
    setEditBatchId(s.batchId ?? "");
    setEditStatus(s.status ?? "active");
    setIsEditStudentDialogOpen(true);
  };

  const handleViewStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsViewStudentDialogOpen(true);
  };

  const handleSaveEditStudent = async () => {
    const s = selectedStudent;
    if (!s) return;

    if (!editName.trim() || !editBatchId) {
      toast({ title: "Missing info", description: "Please fill Name and Batch.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const parentName = editFatherName.trim() || editMotherName.trim() || `Parent of ${editName.trim()}`;
      let parentId = s.parentId;
      const nextParentEmail = editParentEmail.trim().toLowerCase();
      const prevParentEmail = (s.parentEmail ?? "").trim().toLowerCase();

      if (nextParentEmail && nextParentEmail !== prevParentEmail) {
        const parent = await getOrCreateParentUserByEmail({
          parentEmail: nextParentEmail,
          parentName,
          password: deriveParentPassword(editName),
        });
        if (!parent) {
          toast({ title: "Error", description: "Could not find/create the parent user. Check Parent Email.", variant: "destructive" });
          return;
        }
        parentId = parent.id;
      }

      if (!parentId) {
        const unassigned = await getOrCreateUnassignedParentUser();
        if (!unassigned) {
          toast({ title: "Error", description: "Could not set a parent user for this student.", variant: "destructive" });
          return;
        }
        parentId = unassigned.id;
      }

      const updated = await updateStudent({
        id: s.id,
        name: editName.trim(),
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
        batchId: editBatchId,
        parentId,
        enrollmentDate: s.enrollmentDate,
        status: editStatus,
        motherName: editMotherName.trim() || undefined,
        fatherName: editFatherName.trim() || undefined,
        parentPhone: editParentPhone.trim() || undefined,
        parentEmail: editParentEmail.trim() || undefined,
        address: editAddress.trim() || undefined,
        school: editSchool.trim() || undefined,
      });

      if (!updated) {
        toast({ title: "Error", description: "Failed to update student. Check Supabase permissions.", variant: "destructive" });
        return;
      }

      setStudents((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setIsEditStudentDialogOpen(false);
      toast({ title: "Updated", description: "Student updated successfully." });
    } catch (err) {
      console.error("Failed to update student:", err);
      toast({ title: "Error", description: "Failed to update student.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
                              Roll: {student.rollNumber ?? "-"}
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
        <DialogContent className="p-0 sm:max-w-lg">
          <div className="flex max-h-[85vh] flex-col">
            <DialogHeader className="px-6 pt-6 pb-3">
              <DialogTitle>Add New Student</DialogTitle>
              <DialogDescription>Fill in the student details below</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 pb-4">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-800">Name</label>
                    <Input
                      placeholder="Student Name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="h-11 rounded-xl bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-800">Phone No.</label>
                    <Input
                      placeholder="+91 98765 43210"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="h-11 rounded-xl bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">Email ID</label>
                  <Input
                    type="email"
                    placeholder="student@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="h-11 rounded-xl bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">Batch</label>
                  <select
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    value={formBatchId}
                    onChange={(e) => setFormBatchId(e.target.value)}
                  >
                    <option value="">Select batch</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-800">Father Name</label>
                    <Input
                      placeholder="Father Name"
                      value={formFatherName}
                      onChange={(e) => setFormFatherName(e.target.value)}
                      className="h-11 rounded-xl bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-800">Mother Name</label>
                    <Input
                      placeholder="Mother Name"
                      value={formMotherName}
                      onChange={(e) => setFormMotherName(e.target.value)}
                      className="h-11 rounded-xl bg-white"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-800">Parent Email Address</label>
                    <Input
                      type="email"
                      placeholder="parent@example.com"
                      value={formParentEmail}
                      onChange={(e) => setFormParentEmail(e.target.value)}
                      className="h-11 rounded-xl bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-800">Parent Mobile Number</label>
                    <Input
                      placeholder="+91 98765 43210"
                      value={formParentPhone}
                      onChange={(e) => setFormParentPhone(e.target.value)}
                      className="h-11 rounded-xl bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">Address</label>
                  <Input
                    placeholder="Address"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="h-11 rounded-xl bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">School</label>
                  <Input
                    placeholder="School"
                    value={formSchool}
                    onChange={(e) => setFormSchool(e.target.value)}
                    className="h-11 rounded-xl bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end border-t border-slate-100 px-6 py-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddStudentDialogOpen(false);
                  resetForm();
                }}
                className="w-full sm:w-auto rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveStudent}
                disabled={loading}
                className="w-full sm:w-auto rounded-xl bg-[#2563EB] text-white hover:bg-[#2563EB]/90"
              >
                {loading ? "Adding..." : "Add Student"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* VIEW STUDENT DIALOG */}
      <Dialog
        open={isViewStudentDialogOpen}
        onOpenChange={(open) => {
          setIsViewStudentDialogOpen(open);
        }}
      >
        <DialogContent className="p-0 sm:max-w-lg">
          <div className="flex max-h-[85vh] flex-col">
            <DialogHeader className="px-6 pt-6 pb-3">
              <DialogTitle>Student Details</DialogTitle>
              <DialogDescription>View student information</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 pb-4">
              {!selectedStudent ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  Student not found.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold text-slate-500">Name</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{selectedStudent.name}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold text-slate-500">Batch</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {batchNameById(selectedStudent.batchId)}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold text-slate-500">Email</div>
                      <div className="mt-1 text-sm text-slate-900 break-all">{selectedStudent.email || "-"}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold text-slate-500">Phone</div>
                      <div className="mt-1 text-sm text-slate-900">{selectedStudent.phone || "-"}</div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold text-slate-500">Enrollment Date</div>
                      <div className="mt-1 text-sm text-slate-900">
                        {selectedStudent.enrollmentDate
                          ? new Date(selectedStudent.enrollmentDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold text-slate-500">Status</div>
                      <div className="mt-2">
                        <StatusBadge status={selectedStudent.status} />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold text-slate-500">Father Name</div>
                      <div className="mt-1 text-sm text-slate-900">{selectedStudent.fatherName || "-"}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold text-slate-500">Mother Name</div>
                      <div className="mt-1 text-sm text-slate-900">{selectedStudent.motherName || "-"}</div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold text-slate-500">Parent Email</div>
                      <div className="mt-1 text-sm text-slate-900 break-all">{selectedStudent.parentEmail || "-"}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold text-slate-500">Parent Mobile</div>
                      <div className="mt-1 text-sm text-slate-900">{selectedStudent.parentPhone || "-"}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-500">Address</div>
                    <div className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{selectedStudent.address || "-"}</div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-500">School</div>
                    <div className="mt-1 text-sm text-slate-900">{selectedStudent.school || "-"}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end border-t border-slate-100 px-6 py-4">
              <Button
                variant="outline"
                onClick={() => setIsViewStudentDialogOpen(false)}
                className="w-full sm:w-auto rounded-xl"
              >
                Close
              </Button>
              {selectedStudent ? (
                <Button
                  onClick={() => {
                    setIsViewStudentDialogOpen(false);
                    handleEditStudent(selectedStudent.id);
                  }}
                  className="w-full sm:w-auto rounded-xl bg-[#2563EB] text-white hover:bg-[#2563EB]/90"
                >
                  Edit
                </Button>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT STUDENT DIALOG */}
      <Dialog
        open={isEditStudentDialogOpen}
        onOpenChange={(open) => {
          setIsEditStudentDialogOpen(open);
        }}
      >
        <DialogContent className="p-0 sm:max-w-lg">
          <div className="flex max-h-[85vh] flex-col">
            <DialogHeader className="px-6 pt-6 pb-3">
              <DialogTitle>Edit Student</DialogTitle>
              <DialogDescription>Update student information</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 pb-4">
              {!selectedStudent ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  Student not found.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-800">Name</label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-11 rounded-xl bg-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-800">Batch</label>
                      <select
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                        value={editBatchId}
                        onChange={(e) => setEditBatchId(e.target.value)}
                      >
                        <option value="">Select batch</option>
                        {batches.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-800">Email ID</label>
                      <Input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="h-11 rounded-xl bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-800">Phone No.</label>
                      <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="h-11 rounded-xl bg-white" />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-800">Father Name</label>
                      <Input
                        value={editFatherName}
                        onChange={(e) => setEditFatherName(e.target.value)}
                        className="h-11 rounded-xl bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-800">Mother Name</label>
                      <Input
                        value={editMotherName}
                        onChange={(e) => setEditMotherName(e.target.value)}
                        className="h-11 rounded-xl bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-800">Parent Email Address</label>
                      <Input
                        type="email"
                        value={editParentEmail}
                        onChange={(e) => setEditParentEmail(e.target.value)}
                        className="h-11 rounded-xl bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-800">Parent Mobile Number</label>
                      <Input
                        value={editParentPhone}
                        onChange={(e) => setEditParentPhone(e.target.value)}
                        className="h-11 rounded-xl bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-800">Address</label>
                    <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="h-11 rounded-xl bg-white" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-800">School</label>
                    <Input value={editSchool} onChange={(e) => setEditSchool(e.target.value)} className="h-11 rounded-xl bg-white" />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-800">Status</label>
                      <select
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as Student["status"])}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-800">Enrollment Date</label>
                      <Input value={selectedStudent.enrollmentDate} disabled className="h-11 rounded-xl bg-white" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end border-t border-slate-100 px-6 py-4">
              <Button
                variant="outline"
                onClick={() => setIsEditStudentDialogOpen(false)}
                className="w-full sm:w-auto rounded-xl"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEditStudent}
                className="w-full sm:w-auto rounded-xl bg-[#2563EB] text-white hover:bg-[#2563EB]/90"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminStudents;
