import { Attendance } from "@/types";
import { mockAttendance } from "@/data/mockData";

const STORAGE_KEY = "eduflow.attendance.v1";
const SEEDED_KEY = "eduflow.attendance.seeded.v1";

type AttendanceStatus = Attendance["status"];

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const parseJsonArray = (raw: string | null): Attendance[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Attendance[];
  } catch {
    return [];
  }
};

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const ensureAttendanceSeeded = () => {
  if (!canUseStorage()) return;

  const alreadySeeded = window.localStorage.getItem(SEEDED_KEY) === "true";
  if (alreadySeeded) return;

  const existing = parseJsonArray(window.localStorage.getItem(STORAGE_KEY));
  if (existing.length === 0) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mockAttendance));
  }
  window.localStorage.setItem(SEEDED_KEY, "true");
};

const loadAll = (): Attendance[] => {
  if (!canUseStorage()) return mockAttendance;
  ensureAttendanceSeeded();
  return parseJsonArray(window.localStorage.getItem(STORAGE_KEY));
};

const saveAll = (records: Attendance[]) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

export const listAttendance = (filter?: {
  studentId?: string;
  batchId?: string;
  date?: string;
}): Attendance[] => {
  const records = loadAll();
  if (!filter) return records;

  return records.filter((r) => {
    if (filter.studentId && r.studentId !== filter.studentId) return false;
    if (filter.batchId && r.batchId !== filter.batchId) return false;
    if (filter.date && r.date !== filter.date) return false;
    return true;
  });
};

export const getAttendanceForBatchDate = (
  batchId: string,
  date: string,
): Record<string, AttendanceStatus> => {
  const records = listAttendance({ batchId, date });
  const map: Record<string, AttendanceStatus> = {};
  for (const record of records) {
    map[record.studentId] = record.status;
  }
  return map;
};

export const upsertAttendanceForBatchDate = (params: {
  batchId: string;
  date: string;
  entries: Array<{ studentId: string; status: AttendanceStatus }>;
}): Attendance[] => {
  const { batchId, date, entries } = params;
  const records = loadAll();

  const keyFor = (r: { batchId: string; date: string; studentId: string }) =>
    `${r.batchId}||${r.date}||${r.studentId}`;

  const indexByKey = new Map<string, number>();
  records.forEach((r, idx) => {
    indexByKey.set(keyFor(r), idx);
  });

  const updatedOrCreated: Attendance[] = [];

  for (const entry of entries) {
    const key = keyFor({ batchId, date, studentId: entry.studentId });
    const existingIndex = indexByKey.get(key);

    if (existingIndex !== undefined) {
      const updated: Attendance = {
        ...records[existingIndex],
        status: entry.status,
      };
      records[existingIndex] = updated;
      updatedOrCreated.push(updated);
      continue;
    }

    const created: Attendance = {
      id: generateId(),
      studentId: entry.studentId,
      batchId,
      date,
      status: entry.status,
    };
    records.push(created);
    updatedOrCreated.push(created);
    indexByKey.set(key, records.length - 1);
  }

  saveAll(records);
  return updatedOrCreated;
};

