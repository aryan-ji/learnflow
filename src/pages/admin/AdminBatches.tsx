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
import { Plus, Users, Clock, BookOpen, ArrowUpRight, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Batch, Teacher } from "@/types";
import { createBatch, getBatches, getTeachers, updateBatch } from "@/lib/supabaseQueries";

const parseScheduleTimeMinutes = (schedule: string): number | null => {
  const s = (schedule ?? "").trim();
  if (!s) return null;

  // Prefer explicit AM/PM.
  const ampmMatch = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (ampmMatch) {
    const hoursRaw = Number(ampmMatch[1]);
    const minutesRaw = ampmMatch[2] ? Number(ampmMatch[2]) : 0;
    const meridiem = ampmMatch[3].toLowerCase();
    if (!Number.isFinite(hoursRaw) || !Number.isFinite(minutesRaw)) return null;
    if (hoursRaw < 1 || hoursRaw > 12 || minutesRaw < 0 || minutesRaw > 59) return null;

    let hours24 = hoursRaw % 12;
    if (meridiem === "pm") hours24 += 12;
    return hours24 * 60 + minutesRaw;
  }

  // Fallback: 24h-like HH:MM anywhere in the string.
  const time24Match = s.match(/\b(\d{1,2}):(\d{2})\b/);
  if (time24Match) {
    const hours = Number(time24Match[1]);
    const minutes = Number(time24Match[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  return null;
};

const AdminBatches = () => {
  const [isCreateBatchDialogOpen, setIsCreateBatchDialogOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [isEditBatchDialogOpen, setIsEditBatchDialogOpen] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // form
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formSchedule, setFormSchedule] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");

  // edit form
  const [editBatchId, setEditBatchId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editSchedule, setEditSchedule] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [b, t] = await Promise.all([getBatches(), getTeachers()]);
        setBatches(b);
        setTeachers(t);
        if (!formTeacherId && t.length > 0) setFormTeacherId(t[0].id);
      } catch (err) {
        console.error("Error loading batches/teachers:", err);
        toast({ title: "Error", description: "Failed to load batches/teachers.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const teachersById = useMemo(() => {
    const map = new Map<string, Teacher>();
    teachers.forEach((t) => map.set(t.id, t));
    return map;
  }, [teachers]);

  const selectedBatch = useMemo(() => {
    if (!selectedBatchId) return null;
    return batches.find((b) => b.id === selectedBatchId) ?? null;
  }, [batches, selectedBatchId]);

  const batchesSorted = useMemo(() => {
    const copy = batches.slice();
    copy.sort((a, b) => {
      const ta = parseScheduleTimeMinutes(a.schedule);
      const tb = parseScheduleTimeMinutes(b.schedule);
      if (ta === null && tb === null) return a.name.localeCompare(b.name);
      if (ta === null) return 1;
      if (tb === null) return -1;
      return ta - tb || a.name.localeCompare(b.name);
    });
    return copy;
  }, [batches]);

  const handleCreateBatch = () => {
    setIsCreateBatchDialogOpen(true);
  };

  const resetForm = () => {
    setFormName("");
    setFormSubject("");
    setFormSchedule("");
    setFormTeacherId(teachers[0]?.id ?? "");
  };

  const openEditBatch = (batch: Batch) => {
    setEditBatchId(batch.id);
    setEditName(batch.name);
    setEditSubject(batch.subject);
    setEditSchedule(batch.schedule);
    setEditTeacherId(batch.teacherId);
    setIsEditBatchDialogOpen(true);
  };

  const resetEditForm = () => {
    setEditBatchId(null);
    setEditName("");
    setEditSubject("");
    setEditSchedule("");
    setEditTeacherId("");
  };

  const handleSaveBatch = async () => {
    if (!formName.trim() || !formSubject.trim() || !formSchedule.trim() || !formTeacherId) {
      toast({
        title: "Missing info",
        description: "Please fill Batch Name, Subject, Schedule, and Teacher.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const payload: Batch = {
        id: "",
        name: formName.trim(),
        subject: formSubject.trim(),
        teacherId: formTeacherId,
        schedule: formSchedule.trim(),
        studentCount: 0,
      };

      const created = await createBatch(payload);
      if (!created) {
        toast({ title: "Error", description: "Failed to create batch.", variant: "destructive" });
        return;
      }

      setBatches((prev) => [created, ...prev]);
      setIsCreateBatchDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Batch created successfully!" });
    } catch (err) {
      console.error("Error creating batch:", err);
      toast({ title: "Error", description: "Failed to create batch.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBatch = async () => {
    if (!editBatchId) return;

    if (!editName.trim() || !editSubject.trim() || !editSchedule.trim() || !editTeacherId) {
      toast({
        title: "Missing info",
        description: "Please fill Batch Name, Subject, Schedule, and Teacher.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const updated = await updateBatch({
        id: editBatchId,
        name: editName.trim(),
        subject: editSubject.trim(),
        schedule: editSchedule.trim(),
        teacherId: editTeacherId,
      });

      if (!updated) {
        toast({ title: "Error", description: "Failed to update batch.", variant: "destructive" });
        return;
      }

      setBatches((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setIsEditBatchDialogOpen(false);
      resetEditForm();
      toast({ title: "Success", description: "Batch updated successfully!" });
    } catch (err) {
      console.error("Error updating batch:", err);
      toast({ title: "Error", description: "Failed to update batch.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (batchId: string) => {
    setSelectedBatchId(batchId);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Batches</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage coaching batches</p>
          </div>

          <Button
            className="rounded-xl bg-primary text-primary-foreground shadow-md hover:shadow-lg text-sm sm:text-base w-full sm:w-auto"
            onClick={handleCreateBatch}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Batch
          </Button>
        </div>

        {/* BATCHES GRID */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {batchesSorted.map((batch) => {
            const teacher = teachersById.get(batch.teacherId) ?? null;
            return (
              <div
                key={batch.id}
                className="border rounded-2xl p-6 bg-card shadow-sm hover:shadow-md transition-all duration-300"
              >
                {/* TOP */}
                <div className="flex items-start justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-primary-foreground" />
                  </div>

                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                    Active
                  </span>
                </div>

                {/* TITLE */}
                <h3 className="text-lg font-semibold mb-1">{batch.name}</h3>
                <p className="text-sm text-muted-foreground mb-5">{batch.subject}</p>

                {/* DETAILS */}
                <div className="space-y-3 pt-5 border-t">
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Teacher:</span>
                    <span className="font-medium">{teacher?.name ?? batch.teacherId}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{batch.schedule}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{batch.studentCount} Students</span>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="grid grid-cols-2 gap-2 mt-5">
                  <Button
                    variant="outline"
                    className="rounded-xl hover:border-primary hover:text-primary"
                    onClick={() => handleViewDetails(batch.id)}
                  >
                    View
                    <ArrowUpRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl hover:border-primary hover:text-primary"
                    onClick={() => openEditBatch(batch)}
                    disabled={loading}
                  >
                    Edit
                    <Edit className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CREATE BATCH DIALOG */}
      <Dialog open={isCreateBatchDialogOpen} onOpenChange={setIsCreateBatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Batch</DialogTitle>
            <DialogDescription>Fill in the batch details below</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Batch Name</label>
              <Input placeholder="e.g., JEE Mains - Batch A" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Input placeholder="e.g., Physics" value={formSubject} onChange={(e) => setFormSubject(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Schedule</label>
              <Input
                placeholder="e.g., Mon-Wed-Fri 4:00 PM"
                value={formSchedule}
                onChange={(e) => setFormSchedule(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Teacher</label>
              <select
                className="w-full px-3 py-2 rounded-lg border bg-background"
                value={formTeacherId}
                onChange={(e) => setFormTeacherId(e.target.value)}
              >
                <option value="">Select teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateBatchDialogOpen(false);
                  resetForm();
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveBatch} disabled={loading}>
                {loading ? "Creating..." : "Create Batch"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT BATCH DIALOG */}
      <Dialog
        open={isEditBatchDialogOpen}
        onOpenChange={(open) => {
          setIsEditBatchDialogOpen(open);
          if (!open) resetEditForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Batch</DialogTitle>
            <DialogDescription>Update the batch details below</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Batch Name</label>
              <Input placeholder="e.g., JEE Mains - Batch A" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Input placeholder="e.g., Physics" value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Schedule</label>
              <Input
                placeholder="e.g., Mon-Wed-Fri 4:00 PM"
                value={editSchedule}
                onChange={(e) => setEditSchedule(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Teacher</label>
              <select
                className="w-full px-3 py-2 rounded-lg border bg-background"
                value={editTeacherId}
                onChange={(e) => setEditTeacherId(e.target.value)}
              >
                <option value="">Select teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditBatchDialogOpen(false);
                  resetEditForm();
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateBatch} disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* VIEW DETAILS DIALOG */}
      <Dialog open={!!selectedBatchId} onOpenChange={(open) => !open && setSelectedBatchId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Batch Details</DialogTitle>
            <DialogDescription>Batch information</DialogDescription>
          </DialogHeader>
          {!selectedBatch ? (
            <div className="text-sm text-muted-foreground">Batch not found.</div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Name</span>
                <span className="font-semibold">{selectedBatch.name}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Subject</span>
                <span className="font-semibold">{selectedBatch.subject}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Teacher</span>
                <span className="font-semibold">{teachersById.get(selectedBatch.teacherId)?.name ?? selectedBatch.teacherId}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Schedule</span>
                <span className="font-semibold">{selectedBatch.schedule}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Students</span>
                <span className="font-semibold">{selectedBatch.studentCount}</span>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            {selectedBatch && (
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  openEditBatch(selectedBatch);
                  setSelectedBatchId(null);
                }}
              >
                Edit
                <Edit className="h-4 w-4 ml-2" />
              </Button>
            )}
            <Button variant="outline" className="rounded-xl" onClick={() => setSelectedBatchId(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminBatches;
