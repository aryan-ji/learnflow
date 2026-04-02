import { supabase } from '@/lib/supabase';
import { User, Student, Batch, Teacher, Attendance, Test, TestResult, Fee } from '@/types';

const INSTITUTE_ID: string = import.meta.env.VITE_INSTITUTE_ID ?? "inst_1";

type DbUser = {
  id: string;
  name: string;
  email: string;
  role: User["role"];
  avatar?: string | null;
};

type DbStudent = {
  id: string;
  name: string;
  email: string;
  phone: string;
  batch_id: string;
  parent_id: string;
  enrollment_date: string;
  status: Student["status"];
};

type DbBatch = {
  id: string;
  name: string;
  subject: string;
  teacher_id: string;
  schedule: string;
  student_count: number;
};

type DbTeacher = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subjects: string[];
  batch_ids: string[];
};

type DbAttendance = {
  id: string;
  student_id: string;
  batch_id: string;
  date: string;
  status: Attendance["status"];
};

type DbTest = {
  id: string;
  name: string;
  batch_id: string;
  subject: string;
  date: string;
  total_marks: number;
};

type DbTestResult = {
  id: string;
  test_id: string;
  student_id: string;
  marks_obtained: number;
  grade?: string | null;
};

type DbFee = {
  id: string;
  student_id: string;
  month: string;
  amount: number;
  status: Fee["status"];
  due_date: string;
  paid_date?: string | null;
};

type DbInstitute = {
  id: string;
  name: string;
  hide_fee_amounts?: boolean | null;
};

const mapUser = (row: DbUser): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  avatar: row.avatar ?? undefined,
});

const mapStudent = (row: DbStudent): Student => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  batchId: row.batch_id,
  parentId: row.parent_id,
  enrollmentDate: row.enrollment_date,
  status: row.status,
});

const mapBatch = (row: DbBatch): Batch => ({
  id: row.id,
  name: row.name,
  subject: row.subject,
  teacherId: row.teacher_id,
  schedule: row.schedule,
  studentCount: row.student_count,
});

const mapTeacher = (row: DbTeacher): Teacher => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  subjects: row.subjects ?? [],
  batchIds: row.batch_ids ?? [],
});

const mapAttendance = (row: DbAttendance): Attendance => ({
  id: row.id,
  studentId: row.student_id,
  batchId: row.batch_id,
  date: row.date,
  status: row.status,
});

const mapTest = (row: DbTest): Test => ({
  id: row.id,
  name: row.name,
  batchId: row.batch_id,
  subject: row.subject,
  date: row.date,
  totalMarks: row.total_marks,
});

const mapTestResult = (row: DbTestResult): TestResult => ({
  id: row.id,
  testId: row.test_id,
  studentId: row.student_id,
  marksObtained: row.marks_obtained,
  grade: row.grade ?? undefined,
});

const mapFee = (row: DbFee): Fee => ({
  id: row.id,
  studentId: row.student_id,
  month: row.month,
  amount: row.amount,
  status: row.status,
  dueDate: row.due_date,
  paidDate: row.paid_date ?? undefined,
});

// Institute settings
export const getInstituteSettings = async (): Promise<{ hideFeeAmounts: boolean }> => {
  const { data, error } = await supabase
    .from("institutes")
    .select("hide_fee_amounts")
    .eq("id", INSTITUTE_ID)
    .single();
  if (error) {
    if ((error as any)?.code === "PGRST204") {
      console.error(
        "Institute settings column missing (hide_fee_amounts). Run the migration and reload PostgREST schema cache.",
        error,
      );
    } else {
      console.error("Error fetching institute settings:", error);
    }
    return { hideFeeAmounts: false };
  }
  const row = data as DbInstitute;
  return { hideFeeAmounts: Boolean(row.hide_fee_amounts) };
};

export const updateInstituteHideFeeAmounts = async (hideFeeAmounts: boolean): Promise<boolean> => {
  const { error } = await supabase
    .from("institutes")
    .update({ hide_fee_amounts: hideFeeAmounts })
    .eq("id", INSTITUTE_ID);
  if (error) {
    if ((error as any)?.code === "PGRST204") {
      console.error(
        "Institute settings column missing (hide_fee_amounts). Run the migration and reload PostgREST schema cache.",
        error,
      );
    } else {
      console.error("Error updating institute settings:", error);
    }
    return false;
  }
  return true;
};

// Users
export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*').eq("institute_id", INSTITUTE_ID);
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return (data as DbUser[] | null)?.map(mapUser) || [];
};

export const getUserById = async (id: string): Promise<User | null> => {
  const { data, error } = await supabase.from('users').select('*').eq("institute_id", INSTITUTE_ID).eq('id', id).single();
  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  return data ? mapUser(data as DbUser) : null;
};

export const createUser = async (user: User): Promise<User | null> => {
  const payload = {
    id: user.id,
    institute_id: INSTITUTE_ID,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar ?? null,
  };
  const { data, error } = await supabase.from('users').insert([payload]).select().single();
  if (error) {
    console.error('Error creating user:', error);
    return null;
  }
  return data ? mapUser(data as DbUser) : null;
};

// Students
export const getStudents = async (): Promise<Student[]> => {
  const { data, error } = await supabase.from('students').select('*').eq("institute_id", INSTITUTE_ID);
  if (error) {
    console.error('Error fetching students:', error);
    return [];
  }
  return (data as DbStudent[] | null)?.map(mapStudent) || [];
};

export const createStudent = async (student: Student): Promise<Student | null> => {
  const payload = {
    id: student.id,
    institute_id: INSTITUTE_ID,
    name: student.name,
    email: student.email,
    phone: student.phone,
    batch_id: student.batchId,
    parent_id: student.parentId,
    enrollment_date: student.enrollmentDate,
    status: student.status,
  };
  const { data, error } = await supabase.from('students').insert([payload]).select().single();
  if (error) {
    console.error('Error creating student:', error);
    return null;
  }
  return data ? mapStudent(data as DbStudent) : null;
};

export const getStudentById = async (id: string): Promise<Student | null> => {
  const { data, error } = await supabase.from('students').select('*').eq("institute_id", INSTITUTE_ID).eq('id', id).single();
  if (error) {
    console.error('Error fetching student:', error);
    return null;
  }
  return data ? mapStudent(data as DbStudent) : null;
};

export const getStudentsByParent = async (parentId: string): Promise<Student[]> => {
  const { data, error } = await supabase.from('students').select('*').eq("institute_id", INSTITUTE_ID).eq('parent_id', parentId);
  if (error) {
    console.error('Error fetching students by parent:', error);
    return [];
  }
  return (data as DbStudent[] | null)?.map(mapStudent) || [];
};

export const getStudentsByBatch = async (batchId: string): Promise<Student[]> => {
  const { data, error } = await supabase.from("students").select("*").eq("institute_id", INSTITUTE_ID).eq("batch_id", batchId);
  if (error) {
    console.error("Error fetching students by batch:", error);
    return [];
  }
  return (data as DbStudent[] | null)?.map(mapStudent) || [];
};

// Batches
export const getBatches = async (): Promise<Batch[]> => {
  const { data, error } = await supabase.from('batches').select('*').eq("institute_id", INSTITUTE_ID);
  if (error) {
    console.error('Error fetching batches:', error);
    return [];
  }
  return (data as DbBatch[] | null)?.map(mapBatch) || [];
};

export const getBatchesByTeacher = async (teacherId: string): Promise<Batch[]> => {
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .eq("institute_id", INSTITUTE_ID)
    .eq("teacher_id", teacherId);
  if (error) {
    console.error("Error fetching batches by teacher:", error);
    return [];
  }
  return (data as DbBatch[] | null)?.map(mapBatch) || [];
};

export const getBatchById = async (id: string): Promise<Batch | null> => {
  const { data, error } = await supabase.from('batches').select('*').eq("institute_id", INSTITUTE_ID).eq('id', id).single();
  if (error) {
    console.error('Error fetching batch:', error);
    return null;
  }
  return data ? mapBatch(data as DbBatch) : null;
};

export const createBatch = async (batch: Batch): Promise<Batch | null> => {
  const payload = {
    id: batch.id,
    institute_id: INSTITUTE_ID,
    name: batch.name,
    subject: batch.subject,
    teacher_id: batch.teacherId,
    schedule: batch.schedule,
    student_count: batch.studentCount,
  };
  const { data, error } = await supabase.from('batches').insert([payload]).select().single();
  if (error) {
    console.error('Error creating batch:', error);
    return null;
  }
  return data ? mapBatch(data as DbBatch) : null;
};

// Teachers
export const getTeachers = async (): Promise<Teacher[]> => {
  const { data, error } = await supabase.from('teachers').select('*').eq("institute_id", INSTITUTE_ID);
  if (error) {
    console.error('Error fetching teachers:', error);
    return [];
  }
  return (data as DbTeacher[] | null)?.map(mapTeacher) || [];
};

export const getTeacherById = async (id: string): Promise<Teacher | null> => {
  const { data, error } = await supabase.from('teachers').select('*').eq("institute_id", INSTITUTE_ID).eq('id', id).single();
  if (error) {
    console.error('Error fetching teacher:', error);
    return null;
  }
  return data ? mapTeacher(data as DbTeacher) : null;
};

export const createTeacher = async (teacher: Teacher): Promise<Teacher | null> => {
  const payload = {
    id: teacher.id,
    institute_id: INSTITUTE_ID,
    name: teacher.name,
    email: teacher.email,
    phone: teacher.phone,
    subjects: teacher.subjects,
    batch_ids: teacher.batchIds,
  };
  const { data, error } = await supabase.from('teachers').insert([payload]).select().single();
  if (error) {
    console.error('Error creating teacher:', error);
    return null;
  }
  return data ? mapTeacher(data as DbTeacher) : null;
};

// Attendance
export const getAttendance = async (): Promise<Attendance[]> => {
  const { data, error } = await supabase.from('attendance').select('*').eq("institute_id", INSTITUTE_ID);
  if (error) {
    console.error('Error fetching attendance:', error);
    return [];
  }
  return (data as DbAttendance[] | null)?.map(mapAttendance) || [];
};

export const getAttendanceByStudent = async (studentId: string): Promise<Attendance[]> => {
  const { data, error } = await supabase.from('attendance').select('*').eq("institute_id", INSTITUTE_ID).eq('student_id', studentId);
  if (error) {
    console.error('Error fetching student attendance:', error);
    return [];
  }
  return (data as DbAttendance[] | null)?.map(mapAttendance) || [];
};

export const getAttendanceByBatch = async (batchId: string): Promise<Attendance[]> => {
  const { data, error } = await supabase.from('attendance').select('*').eq("institute_id", INSTITUTE_ID).eq('batch_id', batchId);
  if (error) {
    console.error('Error fetching batch attendance:', error);
    return [];
  }
  return (data as DbAttendance[] | null)?.map(mapAttendance) || [];
};

export const getAttendanceByBatchDateRange = async (params: {
  batchId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}): Promise<Attendance[]> => {
  const { batchId, startDate, endDate } = params;
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("institute_id", INSTITUTE_ID)
    .eq("batch_id", batchId)
    .gte("date", startDate)
    .lte("date", endDate);
  if (error) {
    console.error("Error fetching attendance by range:", error);
    return [];
  }
  return (data as DbAttendance[] | null)?.map(mapAttendance) || [];
};

export const getAttendanceByBatchDate = async (batchId: string, date: string): Promise<Attendance[]> => {
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("institute_id", INSTITUTE_ID)
    .eq("batch_id", batchId)
    .eq("date", date);
  if (error) {
    console.error("Error fetching attendance by batch/date:", error);
    return [];
  }
  return (data as DbAttendance[] | null)?.map(mapAttendance) || [];
};

export const upsertAttendanceForBatchDate = async (params: {
  batchId: string;
  date: string;
  entries: Array<{ studentId: string; status: Attendance["status"] }>;
}): Promise<Attendance[]> => {
  const { batchId, date, entries } = params;
  const payload = entries.map((e) => ({
    id: `${batchId}-${e.studentId}-${date}`,
    institute_id: INSTITUTE_ID,
    batch_id: batchId,
    student_id: e.studentId,
    date,
    status: e.status,
  }));

  const { data, error } = await supabase
    .from("attendance")
    .upsert(payload, { onConflict: "institute_id,student_id,batch_id,date" })
    .select();
  if (error) {
    console.error("Error upserting attendance:", error);
    throw error;
  }
  return (data as DbAttendance[] | null)?.map(mapAttendance) || [];
};

export const deleteStudent = async (studentId: string): Promise<boolean> => {
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("institute_id", INSTITUTE_ID)
    .eq("id", studentId);
  if (error) {
    console.error("Error deleting student:", error);
    throw error;
  }
  return true;
};

export const addAttendance = async (attendance: Omit<Attendance, 'id'>): Promise<Attendance | null> => {
  const payload = {
    id: `${attendance.batchId}-${attendance.studentId}-${attendance.date}`,
    institute_id: INSTITUTE_ID,
    student_id: attendance.studentId,
    batch_id: attendance.batchId,
    date: attendance.date,
    status: attendance.status,
  };
  const { data, error } = await supabase.from('attendance').insert([payload]).select().single();
  if (error) {
    console.error('Error adding attendance:', error);
    return null;
  }
  return data ? mapAttendance(data as DbAttendance) : null;
};

// Tests
export const getTests = async (): Promise<Test[]> => {
  const { data, error } = await supabase.from('tests').select('*').eq("institute_id", INSTITUTE_ID);
  if (error) {
    console.error('Error fetching tests:', error);
    return [];
  }
  return (data as DbTest[] | null)?.map(mapTest) || [];
};

export const getTestById = async (id: string): Promise<Test | null> => {
  const { data, error } = await supabase.from('tests').select('*').eq("institute_id", INSTITUTE_ID).eq('id', id).single();
  if (error) {
    console.error('Error fetching test:', error);
    return null;
  }
  return data ? mapTest(data as DbTest) : null;
};

export const getTestsByBatch = async (batchId: string): Promise<Test[]> => {
  const { data, error } = await supabase.from('tests').select('*').eq("institute_id", INSTITUTE_ID).eq('batch_id', batchId);
  if (error) {
    console.error('Error fetching batch tests:', error);
    return [];
  }
  return (data as DbTest[] | null)?.map(mapTest) || [];
};

export const createTest = async (test: Test): Promise<Test | null> => {
  const payload = {
    id: test.id,
    institute_id: INSTITUTE_ID,
    name: test.name,
    batch_id: test.batchId,
    subject: test.subject,
    date: test.date,
    total_marks: test.totalMarks,
  };
  const { data, error } = await supabase.from('tests').insert([payload]).select().single();
  if (error) {
    console.error('Error creating test:', error);
    return null;
  }
  return data ? mapTest(data as DbTest) : null;
};

// Test Results
export const getTestResults = async (): Promise<TestResult[]> => {
  const { data, error } = await supabase.from('test_results').select('*').eq("institute_id", INSTITUTE_ID);
  if (error) {
    console.error('Error fetching test results:', error);
    return [];
  }
  return (data as DbTestResult[] | null)?.map(mapTestResult) || [];
};

export const getTestResultsByStudent = async (studentId: string): Promise<TestResult[]> => {
  const { data, error } = await supabase.from('test_results').select('*').eq("institute_id", INSTITUTE_ID).eq('student_id', studentId);
  if (error) {
    console.error('Error fetching student test results:', error);
    return [];
  }
  return (data as DbTestResult[] | null)?.map(mapTestResult) || [];
};

export const getTestResultsByTest = async (testId: string): Promise<TestResult[]> => {
  const { data, error } = await supabase.from('test_results').select('*').eq("institute_id", INSTITUTE_ID).eq('test_id', testId);
  if (error) {
    console.error('Error fetching test results:', error);
    return [];
  }
  return (data as DbTestResult[] | null)?.map(mapTestResult) || [];
};

export const addTestResult = async (result: Omit<TestResult, 'id'>): Promise<TestResult | null> => {
  const payload = {
    id: `${result.testId}-${result.studentId}`,
    institute_id: INSTITUTE_ID,
    test_id: result.testId,
    student_id: result.studentId,
    marks_obtained: result.marksObtained,
    grade: result.grade ?? null,
  };
  const { data, error } = await supabase.from('test_results').insert([payload]).select().single();
  if (error) {
    console.error('Error adding test result:', error);
    return null;
  }
  return data ? mapTestResult(data as DbTestResult) : null;
};

// Fees
export const getFees = async (): Promise<Fee[]> => {
  const { data, error } = await supabase.from('fees').select('*').eq("institute_id", INSTITUTE_ID);
  if (error) {
    console.error('Error fetching fees:', error);
    return [];
  }
  return (data as DbFee[] | null)?.map(mapFee) || [];
};

export const getFeesByStudent = async (studentId: string): Promise<Fee[]> => {
  const { data, error } = await supabase.from('fees').select('*').eq("institute_id", INSTITUTE_ID).eq('student_id', studentId);
  if (error) {
    console.error('Error fetching student fees:', error);
    return [];
  }
  return (data as DbFee[] | null)?.map(mapFee) || [];
};

export const getFeesForStudentsByDueDateRange = async (params: {
  studentIds: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}): Promise<Fee[]> => {
  const { studentIds, startDate, endDate } = params;
  if (studentIds.length === 0) return [];

  const { data, error } = await supabase
    .from("fees")
    .select("*")
    .eq("institute_id", INSTITUTE_ID)
    .in("student_id", studentIds)
    .gte("due_date", startDate)
    .lte("due_date", endDate);
  if (error) {
    console.error("Error fetching fees for students by range:", error);
    return [];
  }
  return (data as DbFee[] | null)?.map(mapFee) || [];
};

export const getFeesForStudents = async (studentIds: string[]): Promise<Fee[]> => {
  if (studentIds.length === 0) return [];
  const { data, error } = await supabase
    .from("fees")
    .select("*")
    .eq("institute_id", INSTITUTE_ID)
    .in("student_id", studentIds);
  if (error) {
    console.error("Error fetching fees for students:", error);
    return [];
  }
  return (data as DbFee[] | null)?.map(mapFee) || [];
};

export const updateFeeStatus = async (
  feeId: string,
  status: Fee["status"],
  paidDate?: string,
): Promise<Fee | null> => {
  const updateData: any = { status };
  if (status === "paid") {
    updateData.paid_date = paidDate ?? null;
  } else {
    updateData.paid_date = null;
  }

  const { data, error } = await supabase
    .from("fees")
    .update(updateData)
    .eq("institute_id", INSTITUTE_ID)
    .eq("id", feeId)
    .select()
    .single();
  if (error) {
    console.error('Error updating fee:', error);
    return null;
  }
  return data ? mapFee(data as DbFee) : null;
};

export const createFee = async (fee: Fee): Promise<Fee | null> => {
  const payload = {
    id: fee.id,
    institute_id: INSTITUTE_ID,
    student_id: fee.studentId,
    month: fee.month,
    amount: fee.amount,
    status: fee.status,
    due_date: fee.dueDate,
    paid_date: fee.paidDate ?? null,
  };
  const { data, error } = await supabase.from('fees').insert([payload]).select().single();
  if (error) {
    console.error('Error creating fee:', error);
    return null;
  }
  return data ? mapFee(data as DbFee) : null;
};

export const upsertFees = async (fees: Fee[]): Promise<Fee[]> => {
  if (fees.length === 0) return [];
  const payloads = fees.map((fee) => ({
    id: fee.id,
    institute_id: INSTITUTE_ID,
    student_id: fee.studentId,
    month: fee.month,
    amount: fee.amount,
    status: fee.status,
    due_date: fee.dueDate,
    paid_date: fee.paidDate ?? null,
  }));

  const { data, error } = await supabase
    .from("fees")
    .upsert(payloads, { onConflict: "id" })
    .select();

  if (error) {
    console.error("Error upserting fees:", error);
    return [];
  }
  return (data as DbFee[] | null)?.map(mapFee) || [];
};
