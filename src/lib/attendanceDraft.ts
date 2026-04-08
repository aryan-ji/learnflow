import { getActiveInstituteId } from "@/lib/tenant";

export type DraftAttendanceStatus = "present" | "absent" | "late";

type AttendanceDraftV1 = {
  version: 1;
  savedAt: number; // epoch ms
  attendance: Record<string, DraftAttendanceStatus>;
};

const instituteId = () => getActiveInstituteId() ?? (import.meta.env.VITE_INSTITUTE_ID ?? "inst_1");

const keyFor = (params: { role: "admin" | "teacher"; batchId: string; date: string }) => {
  const iid = instituteId();
  return `instipilot.attendanceDraft.v1:${iid}:${params.role}:${params.batchId}:${params.date}`;
};

export const loadAttendanceDraft = (params: {
  role: "admin" | "teacher";
  batchId: string;
  date: string;
}): AttendanceDraftV1 | null => {
  try {
    const raw = localStorage.getItem(keyFor(params));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AttendanceDraftV1;
    if (!parsed || parsed.version !== 1 || typeof parsed.savedAt !== "number" || typeof parsed.attendance !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const saveAttendanceDraft = (params: {
  role: "admin" | "teacher";
  batchId: string;
  date: string;
  attendance: Record<string, DraftAttendanceStatus>;
}) => {
  try {
    const keys = Object.keys(params.attendance ?? {});
    if (keys.length === 0) return;

    const payload: AttendanceDraftV1 = {
      version: 1,
      savedAt: Date.now(),
      attendance: params.attendance,
    };
    localStorage.setItem(keyFor(params), JSON.stringify(payload));
  } catch {
    // ignore
  }
};

export const clearAttendanceDraft = (params: { role: "admin" | "teacher"; batchId: string; date: string }) => {
  try {
    localStorage.removeItem(keyFor(params));
  } catch {
    // ignore
  }
};
