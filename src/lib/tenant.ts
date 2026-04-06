const ACTIVE_INSTITUTE_ID_KEY = "instipilot.activeInstituteId";

export const getActiveInstituteId = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_INSTITUTE_ID_KEY);
  } catch {
    return null;
  }
};

export const setActiveInstituteId = (instituteId: string) => {
  try {
    localStorage.setItem(ACTIVE_INSTITUTE_ID_KEY, instituteId);
  } catch {
    // ignore
  }
};

export const clearActiveInstituteId = () => {
  try {
    localStorage.removeItem(ACTIVE_INSTITUTE_ID_KEY);
  } catch {
    // ignore
  }
};

