import { supabase } from './supabase';
import {
  mockUsers,
  mockBatches,
  mockStudents,
  mockTeachers,
  mockAttendance,
  mockTests,
  mockTestResults,
  mockFees,
} from '@/data/mockData';

const INSTITUTE_ID: string = import.meta.env.VITE_INSTITUTE_ID ?? "inst_1";

const toSnake = {
  batchId: "batch_id",
  teacherId: "teacher_id",
  studentId: "student_id",
  parentId: "parent_id",
  enrollmentDate: "enrollment_date",
  testId: "test_id",
  totalMarks: "total_marks",
  marksObtained: "marks_obtained",
  dueDate: "due_date",
  paidDate: "paid_date",
} as const;

const mapKeys = (obj: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const mappedKey = (toSnake as Record<string, string>)[key] ?? key;
    out[mappedKey] = value;
  }
  return out;
};

export const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    console.log("Ensuring institute exists...");
    const { error: instituteError } = await supabase
      .from("institutes")
      .upsert([{ id: INSTITUTE_ID, name: "Default Institute" }], { onConflict: "id" });
    if (instituteError) console.error("Error inserting institute:", instituteError);
    else console.log("Institute ready");

    // Insert Users
    console.log('Inserting users...');
    const { error: usersError } = await supabase
      .from('users')
      .upsert(mockUsers.map((u) => ({ ...mapKeys(u as any), institute_id: INSTITUTE_ID })), { onConflict: "id" });
    if (usersError) console.error('Error inserting users:', usersError);
    else console.log('Users inserted successfully');

    // Insert Batches
    console.log('Inserting batches...');
    const { error: teachersError } = await supabase
      .from("teachers")
      .upsert(mockTeachers.map((t) => ({ ...mapKeys(t as any), institute_id: INSTITUTE_ID })), { onConflict: "id" });
    if (teachersError) console.error("Error inserting teachers:", teachersError);
    else console.log("Teachers inserted successfully");

    console.log('Inserting batches...');
    const { error: batchesError } = await supabase
      .from('batches')
      .upsert(mockBatches.map((b) => ({ ...mapKeys(b as any), institute_id: INSTITUTE_ID })), { onConflict: "id" });
    if (batchesError) console.error('Error inserting batches:', batchesError);
    else console.log('Batches inserted successfully');

    // Insert Students
    console.log('Inserting students...');
    const { error: studentsError } = await supabase
      .from('students')
      .upsert(mockStudents.map((s) => ({ ...mapKeys(s as any), institute_id: INSTITUTE_ID })), { onConflict: "id" });
    if (studentsError) console.error('Error inserting students:', studentsError);
    else console.log('Students inserted successfully');

    // Insert Attendance
    console.log('Inserting attendance...');
    const { error: attendanceError } = await supabase
      .from('attendance')
      .upsert(mockAttendance.map((a) => ({ ...mapKeys(a as any), institute_id: INSTITUTE_ID })), {
        onConflict: "institute_id,student_id,batch_id,date",
      });
    if (attendanceError) console.error('Error inserting attendance:', attendanceError);
    else console.log('Attendance inserted successfully');

    // Insert Tests
    console.log('Inserting tests...');
    const { error: testsError } = await supabase
      .from('tests')
      .upsert(mockTests.map((t) => ({ ...mapKeys(t as any), institute_id: INSTITUTE_ID })), { onConflict: "id" });
    if (testsError) console.error('Error inserting tests:', testsError);
    else console.log('Tests inserted successfully');

    // Insert Test Results
    console.log('Inserting test results...');
    const { error: testResultsError } = await supabase
      .from('test_results')
      .upsert(mockTestResults.map((r) => ({ ...mapKeys(r as any), institute_id: INSTITUTE_ID })), {
        onConflict: "institute_id,test_id,student_id",
      });
    if (testResultsError) console.error('Error inserting test results:', testResultsError);
    else console.log('Test results inserted successfully');

    // Insert Fees
    console.log('Inserting fees...');
    const { error: feesError } = await supabase
      .from('fees')
      .upsert(mockFees.map((f) => ({ ...mapKeys(f as any), institute_id: INSTITUTE_ID })), { onConflict: "id" });
    if (feesError) console.error('Error inserting fees:', feesError);
    else console.log('Fees inserted successfully');

    console.log('Database seeding completed!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};
