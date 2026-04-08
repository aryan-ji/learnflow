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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Plus, Mail, Phone, BookOpen, MoreVertical, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Batch, Teacher } from "@/types";
import { createTeacher, deleteTeacher, getBatches, getTeachers, updateTeacher } from "@/lib/supabaseQueries";

const parseSubjects = (raw: string) =>
  raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const AdminTeachers = () => {
  const [isAddTeacherDialogOpen, setIsAddTeacherDialogOpen] = useState(false);
  const [isEditTeacherDialogOpen, setIsEditTeacherDialogOpen] = useState(false);
  const [teacherToDeleteId, setTeacherToDeleteId] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const { toast } = useToast();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);

  // add form
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formSubjects, setFormSubjects] = useState("");

  // edit form
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSubjects, setEditSubjects] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [t, b] = await Promise.all([getTeachers(), getBatches()]);
        setTeachers(t);
        setBatches(b);
      } catch (err) {
        console.error("Error loading teachers/batches:", err);
        toast({ title: "Error", description: "Failed to load teachers/batches.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const batchesByTeacherId = useMemo(() => {
    const map = new Map<string, Batch[]>();
    batches.forEach((b) => {
      const list = map.get(b.teacherId) ?? [];
      list.push(b);
      map.set(b.teacherId, list);
    });
    return map;
  }, [batches]);

  const selectedTeacher = useMemo(() => {
    if (!selectedTeacherId) return null;
    return teachers.find((t) => t.id === selectedTeacherId) ?? null;
  }, [selectedTeacherId, teachers]);

  const generateTeacherId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return `t-${crypto.randomUUID()}`;
    }
    return `t-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const resetAddForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormSubjects("");
  };

  const handleAddTeacher = () => {
    setIsAddTeacherDialogOpen(true);
  };

  const handleSaveTeacher = async () => {
    if (!formName.trim() || !formEmail.trim() || !formPhone.trim()) {
      toast({
        title: "Missing info",
        description: "Please fill Name, Email, and Phone.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const payload: Teacher = {
        id: generateTeacherId(),
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        subjects: parseSubjects(formSubjects),
        batchIds: [],
      };

      const created = await createTeacher(payload);
      if (!created) {
        toast({ title: "Error", description: "Failed to add teacher.", variant: "destructive" });
        return;
      }

      setTeachers((prev) => [created, ...prev]);
      setIsAddTeacherDialogOpen(false);
      resetAddForm();
      toast({ title: "Success", description: "Teacher added successfully!" });
    } catch (err) {
      console.error("Error creating teacher:", err);
      toast({ title: "Error", description: "Failed to add teacher.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEditTeacher = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    const t = teachers.find((x) => x.id === teacherId);
    if (!t) return;

    setEditName(t.name ?? "");
    setEditEmail(t.email ?? "");
    setEditPhone(t.phone ?? "");
    setEditSubjects((t.subjects ?? []).join(", "));
    setIsEditTeacherDialogOpen(true);
  };

  const handleSaveEditTeacher = async () => {
    if (!selectedTeacher) return;
    if (!editName.trim() || !editEmail.trim() || !editPhone.trim()) {
      toast({ title: "Missing info", description: "Please fill Name, Email, and Phone.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const updated = await updateTeacher({
        id: selectedTeacher.id,
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        subjects: parseSubjects(editSubjects),
      });

      if (!updated) {
        toast({ title: "Error", description: "Failed to update teacher.", variant: "destructive" });
        return;
      }

      setTeachers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setIsEditTeacherDialogOpen(false);
      toast({ title: "Updated", description: "Teacher updated successfully." });
    } catch (err) {
      console.error("Error updating teacher:", err);
      toast({ title: "Error", description: "Failed to update teacher.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeacher = (teacherId: string) => {
    setTeacherToDeleteId(teacherId);
  };

  const confirmDeleteTeacher = async () => {
    if (!teacherToDeleteId) return;
    setLoading(true);
    try {
      const ok = await deleteTeacher(teacherToDeleteId);
      if (!ok) {
        toast({
          title: "Could not delete",
          description: "This teacher may be assigned to batches. Reassign batches first, then delete.",
          variant: "destructive",
        });
        return;
      }
      setTeachers((prev) => prev.filter((t) => t.id !== teacherToDeleteId));
      toast({ title: "Deleted", description: "Teacher deleted successfully." });
      setTeacherToDeleteId(null);
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
            <h1 className="text-2xl sm:text-3xl font-bold">Teachers</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage teaching staff</p>
          </div>

          <Button
            className="rounded-xl bg-primary text-primary-foreground shadow-md hover:shadow-lg text-sm sm:text-base w-full sm:w-auto"
            onClick={handleAddTeacher}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Teacher
          </Button>
        </div>

        {/* TEACHERS GRID */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          {teachers.map((teacher) => {
            const teacherBatches = batchesByTeacherId.get(teacher.id) ?? [];
            return (
              <div
                key={teacher.id}
                className="border rounded-2xl p-6 bg-card shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-5">
                  {/* AVATAR */}
                  <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
                    {teacher.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{teacher.name}</h3>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {(teacher.subjects ?? []).map((subject) => (
                        <span
                          key={subject}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary"
                        >
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* ACTION MENU */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-xl" disabled={loading}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditTeacher(teacher.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDeleteTeacher(teacher.id)} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* CONTACT INFO */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="break-all">{teacher.email}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{teacher.phone}</span>
                  </div>
                </div>

                {/* BATCHES */}
                <div className="mt-6 pt-5 border-t">
                  <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Assigned Batches
                  </p>

                  <div className="space-y-2">
                    {teacherBatches.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No batches assigned yet.</div>
                    ) : (
                      teacherBatches.map((batch) => (
                        <div
                          key={batch.id}
                          className="flex items-center justify-between bg-muted/40 rounded-xl p-3"
                        >
                          <span className="text-sm font-medium">{batch.name}</span>
                          <span className="text-xs text-muted-foreground">{batch.studentCount} students</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADD TEACHER DIALOG */}
      <Dialog open={isAddTeacherDialogOpen} onOpenChange={setIsAddTeacherDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Teacher</DialogTitle>
            <DialogDescription>Fill in the teacher details below</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Teacher Name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} type="email" placeholder="teacher@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Phone</label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Subjects (comma-separated)</label>
              <Input value={formSubjects} onChange={(e) => setFormSubjects(e.target.value)} placeholder="e.g., Physics, Chemistry, Maths" />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddTeacherDialogOpen(false);
                  resetAddForm();
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveTeacher} disabled={loading}>
                {loading ? "Adding..." : "Add Teacher"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT TEACHER DIALOG */}
      <Dialog open={isEditTeacherDialogOpen} onOpenChange={setIsEditTeacherDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
            <DialogDescription>Update teacher details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Teacher Name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email" placeholder="teacher@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Phone</label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Subjects (comma-separated)</label>
              <Input value={editSubjects} onChange={(e) => setEditSubjects(e.target.value)} placeholder="e.g., Physics, Chemistry, Maths" />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setIsEditTeacherDialogOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSaveEditTeacher} disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE TEACHER CONFIRM */}
      <Dialog open={!!teacherToDeleteId} onOpenChange={(open) => !open && setTeacherToDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete teacher?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setTeacherToDeleteId(null)} disabled={loading}>
              Cancel
            </Button>
            <Button className="rounded-xl bg-red-600 text-white hover:bg-red-600/90" onClick={confirmDeleteTeacher} disabled={loading}>
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminTeachers;

