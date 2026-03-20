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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { mockTeachers, mockBatches } from '@/data/mockData';
import { Plus, Mail, Phone, BookOpen, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminTeachers = () => {
  const [isAddTeacherDialogOpen, setIsAddTeacherDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleAddTeacher = () => {
    setIsAddTeacherDialogOpen(true);
  };

  const handleSaveTeacher = () => {
    setIsAddTeacherDialogOpen(false);
    toast({
      title: "Success",
      description: "Teacher added successfully!"
    });
  };

  const handleEditTeacher = (teacherId: string) => {
    toast({
      title: "Edit Teacher",
      description: `Opening edit dialog for teacher ${teacherId}`
    });
  };

  const handleDeleteTeacher = (teacherId: string) => {
    toast({
      title: "Delete Confirmation",
      description: `Teacher ${teacherId} would be deleted`,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Teachers</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Manage teaching staff
            </p>
          </div>

          <Button 
            className="rounded-xl bg-primary text-primary-foreground shadow-md hover:shadow-lg text-sm sm:text-base w-full sm:w-auto"
            onClick={handleAddTeacher}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Teacher
          </Button>
        </div>

        {/* TEACHERS GRID */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          {mockTeachers.map((teacher) => {
            const teacherBatches = mockBatches.filter(
              (b) => teacher.batchIds.includes(b.id)
            );

            return (
              <div
                key={teacher.id}
                className="border rounded-2xl p-6 bg-card shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-5">

                  {/* AVATAR */}
                  <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
                    {teacher.name.split(' ').map(n => n[0]).join('')}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">
                      {teacher.name}
                    </h3>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {teacher.subjects.map(subject => (
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
                      <Button variant="ghost" size="icon" className="rounded-xl">
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
                    <span>{teacher.email}</span>
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
                    {teacherBatches.map(batch => (
                      <div
                        key={batch.id}
                        className="flex items-center justify-between bg-muted/40 rounded-xl p-3"
                      >
                        <span className="text-sm font-medium">
                          {batch.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {batch.studentCount} students
                        </span>
                      </div>
                    ))}
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
            <DialogDescription>
              Fill in the teacher details below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input placeholder="Teacher Name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input type="email" placeholder="teacher@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Phone</label>
              <Input placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Subjects (comma-separated)</label>
              <Input placeholder="e.g., Physics, Chemistry, Maths" />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsAddTeacherDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveTeacher}
              >
                Add Teacher
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminTeachers;
