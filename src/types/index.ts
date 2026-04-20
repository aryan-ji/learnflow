export type UserRole = 'admin' | 'teacher' | 'parent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Student {
  id: string;
  rollNumber?: number;
  name: string;
  email: string;
  phone: string;
  batchId: string;
  parentId: string;
  enrollmentDate: string;
  status: 'active' | 'inactive';
  motherName?: string;
  fatherName?: string;
  parentPhone?: string;
  parentEmail?: string;
  address?: string;
  school?: string;
}

export interface Batch {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  schedule: string;
  studentCount: number;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  subjects: string[];
  batchIds: string[];
}

export interface Attendance {
  id: string;
  studentId: string;
  batchId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
}

export interface Test {
  id: string;
  name: string;
  batchId: string;
  subject: string;
  date: string;
  totalMarks: number;
}

export interface TestResult {
  id: string;
  testId: string;
  studentId: string;
  marksObtained: number;
  rank?: number;
  grade?: string;
  improvementArea?: string;
  remark?: string;
}

export interface Fee {
  id: string;
  studentId: string;
  month: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  dueDate: string;
  paidDate?: string;
}
