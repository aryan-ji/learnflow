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
import { mockBatches, mockTeachers } from '@/data/mockData';
import { Plus, Users, Clock, BookOpen, ArrowUpRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminBatches = () => {
  const [isCreateBatchDialogOpen, setIsCreateBatchDialogOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCreateBatch = () => {
    setIsCreateBatchDialogOpen(true);
  };

  const handleSaveBatch = () => {
    setIsCreateBatchDialogOpen(false);
    toast({
      title: "Success",
      description: "Batch created successfully!"
    });
  };

  const handleViewDetails = (batchId: string) => {
    setSelectedBatchId(batchId);
    toast({
      title: "Batch Details",
      description: `Loading details for batch ${batchId}`
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Batches</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Manage coaching batches
            </p>
          </div>

          <Button 
            className="rounded-xl bg-primary text-primary-foreground shadow-md hover:shadow-lg text-sm sm:text-base w-full sm:w-auto"
            onClick={handleCreateBatch}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Batch
          </Button>
        </div>

        {/* BATCHES GRID */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {mockBatches.map((batch) => {
            const teacher = mockTeachers.find(t => t.id === batch.teacherId);

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
                <h3 className="text-lg font-semibold mb-1">
                  {batch.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-5">
                  {batch.subject}
                </p>

                {/* DETAILS */}
                <div className="space-y-3 pt-5 border-t">
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Teacher:</span>
                    <span className="font-medium">
                      {teacher?.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {batch.schedule}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">
                      {batch.studentCount} Students
                    </span>
                  </div>
                </div>

                {/* ACTION BUTTON */}
                <Button
                  variant="outline"
                  className="w-full mt-5 rounded-xl hover:border-primary hover:text-primary"
                  onClick={() => handleViewDetails(batch.id)}
                >
                  View Details
                  <ArrowUpRight className="h-4 w-4 ml-2" />
                </Button>

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
            <DialogDescription>
              Fill in the batch details below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Batch Name</label>
              <Input placeholder="e.g., JEE Mains - Batch A" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Input placeholder="e.g., Physics" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Schedule</label>
              <Input placeholder="e.g., Mon-Wed-Fri 4:00 PM" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Teacher</label>
              <select className="w-full px-3 py-2 rounded-lg border bg-background">
                {mockTeachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsCreateBatchDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveBatch}
              >
                Create Batch
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminBatches;
