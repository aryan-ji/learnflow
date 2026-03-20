import { User, Student, Batch, Teacher, Attendance, Test, TestResult, Fee } from '@/types';

export const mockUsers: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@coaching.com', role: 'admin' },
  { id: '2', name: 'Rahul Sharma', email: 'rahul@coaching.com', role: 'teacher' },
  { id: '3', name: 'Priya Verma', email: 'priya@coaching.com', role: 'teacher' },
  { id: '4', name: 'Amit Kumar', email: 'amit.parent@email.com', role: 'parent' },
  { id: '5', name: 'Sunita Devi', email: 'sunita.parent@email.com', role: 'parent' },
];

export const mockBatches: Batch[] = [
  { id: 'b1', name: 'JEE Advanced 2025', subject: 'Physics + Chemistry + Math', teacherId: '2', schedule: 'Mon, Wed, Fri - 4:00 PM', studentCount: 25 },
  { id: 'b2', name: 'NEET 2025', subject: 'Biology + Chemistry + Physics', teacherId: '3', schedule: 'Tue, Thu, Sat - 5:00 PM', studentCount: 30 },
  { id: 'b3', name: 'Foundation Class 10', subject: 'All Subjects', teacherId: '2', schedule: 'Mon-Fri - 3:00 PM', studentCount: 20 },
  { id: 'b4', name: 'Foundation Class 9', subject: 'All Subjects', teacherId: '3', schedule: 'Mon-Fri - 2:00 PM', studentCount: 18 },
];

export const mockStudents: Student[] = [
  { id: 's1', name: 'Arjun Kumar', email: 'arjun@email.com', phone: '9876543210', batchId: 'b1', parentId: '4', enrollmentDate: '2024-04-01', status: 'active' },
  { id: 's2', name: 'Sneha Gupta', email: 'sneha@email.com', phone: '9876543211', batchId: 'b1', parentId: '5', enrollmentDate: '2024-04-01', status: 'active' },
  { id: 's3', name: 'Vikram Singh', email: 'vikram@email.com', phone: '9876543212', batchId: 'b2', parentId: '4', enrollmentDate: '2024-04-15', status: 'active' },
  { id: 's4', name: 'Ananya Patel', email: 'ananya@email.com', phone: '9876543213', batchId: 'b2', parentId: '5', enrollmentDate: '2024-04-15', status: 'active' },
  { id: 's5', name: 'Rohan Mehta', email: 'rohan@email.com', phone: '9876543214', batchId: 'b3', parentId: '4', enrollmentDate: '2024-06-01', status: 'active' },
];

export const mockTeachers: Teacher[] = [
  { id: '2', name: 'Rahul Sharma', email: 'rahul@coaching.com', phone: '9876543220', subjects: ['Physics', 'Mathematics'], batchIds: ['b1', 'b3'] },
  { id: '3', name: 'Priya Verma', email: 'priya@coaching.com', phone: '9876543221', subjects: ['Chemistry', 'Biology'], batchIds: ['b2', 'b4'] },
  { id: '4', name: 'Aryan Gupta', email: 'aryan@coaching.com', phone: '9876543222', subjects: ['Chemistry', 'Mathematics'], batchIds: ['b2', 'b3'] },
];

export const mockAttendance: Attendance[] = [
  { id: 'a1', studentId: 's1', batchId: 'b1', date: '2024-12-16', status: 'present' },
  { id: 'a2', studentId: 's2', batchId: 'b1', date: '2024-12-16', status: 'present' },
  { id: 'a3', studentId: 's1', batchId: 'b1', date: '2024-12-18', status: 'present' },
  { id: 'a4', studentId: 's2', batchId: 'b1', date: '2024-12-18', status: 'absent' },
  { id: 'a5', studentId: 's3', batchId: 'b2', date: '2024-12-17', status: 'present' },
  { id: 'a6', studentId: 's4', batchId: 'b2', date: '2024-12-17', status: 'late' },
];

export const mockTests: Test[] = [
  { id: 't1', name: 'Unit Test 1 - Mechanics', batchId: 'b1', subject: 'Physics', date: '2024-12-10', totalMarks: 100 },
  { id: 't2', name: 'Monthly Test - Organic Chemistry', batchId: 'b1', subject: 'Chemistry', date: '2024-12-05', totalMarks: 50 },
  { id: 't3', name: 'Weekly Quiz - Biology', batchId: 'b2', subject: 'Biology', date: '2024-12-15', totalMarks: 25 },
];

export const mockTestResults: TestResult[] = [
  { id: 'tr1', testId: 't1', studentId: 's1', marksObtained: 85, grade: 'A' },
  { id: 'tr2', testId: 't1', studentId: 's2', marksObtained: 72, grade: 'B' },
  { id: 'tr3', testId: 't2', studentId: 's1', marksObtained: 42, grade: 'A' },
  { id: 'tr4', testId: 't2', studentId: 's2', marksObtained: 38, grade: 'B' },
  { id: 'tr5', testId: 't3', studentId: 's3', marksObtained: 22, grade: 'A' },
  { id: 'tr6', testId: 't3', studentId: 's4', marksObtained: 18, grade: 'B' },
];

export const mockFees: Fee[] = [
  { id: 'f1', studentId: 's1', month: 'December 2024', amount: 5000, status: 'paid', dueDate: '2024-12-05', paidDate: '2024-12-03' },
  { id: 'f2', studentId: 's2', month: 'December 2024', amount: 5000, status: 'pending', dueDate: '2024-12-05' },
  { id: 'f3', studentId: 's3', month: 'December 2024', amount: 6000, status: 'paid', dueDate: '2024-12-05', paidDate: '2024-12-04' },
  { id: 'f4', studentId: 's4', month: 'December 2024', amount: 6000, status: 'overdue', dueDate: '2024-12-05' },
  { id: 'f5', studentId: 's5', month: 'December 2024', amount: 4000, status: 'pending', dueDate: '2024-12-10' },
];

export const getStudentsByParent = (parentId: string) => 
  mockStudents.filter(s => s.parentId === parentId);

export const getBatchById = (batchId: string) => 
  mockBatches.find(b => b.id === batchId);

export const getAttendanceByStudent = (studentId: string) => 
  mockAttendance.filter(a => a.studentId === studentId);

export const getTestResultsByStudent = (studentId: string) => 
  mockTestResults.filter(tr => tr.studentId === studentId);

export const getFeesByStudent = (studentId: string) => 
  mockFees.filter(f => f.studentId === studentId);

export const getTestById = (testId: string) => 
  mockTests.find(t => t.id === testId);
