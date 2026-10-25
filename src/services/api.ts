const rawApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
export const API_BASE = rawApiBase
  ? rawApiBase.replace(/\/+$/, '').endsWith('/api')
    ? rawApiBase.replace(/\/+$/, '')
    : `${rawApiBase.replace(/\/+$/, '')}/api`
  : '/api';

export function getStoredToken(): string | null {
  return localStorage.getItem('smartcampus_token');
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem('smartcampus_token', token);
  } else {
    localStorage.removeItem('smartcampus_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : {};

  if (!response.ok) {
    const errorMsg =
      data?.error ||
      (response.status === 404
        ? `API endpoint not found (404): ${API_BASE}${endpoint}`
        : `Request failed with status ${response.status}`);
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (identifier: string, password: string) =>
    request<{ success: boolean; token: string; user: any; redirectUrl: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),
  getMe: () => request<{ success: boolean; user: any }>('/auth/me'),
  logout: () =>
    request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    }),
  getDemoAccounts: () => request<{ success: boolean; accounts: any[] }>('/auth/demo-accounts'),
  forgotPassword: (email: string) =>
    request<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // Public
  getCollegeInfo: () =>
    request<{ success: boolean; settings: any; announcements: any[]; publicEvents: any[] }>('/public/college-info'),

  // Attendance & BLE
  getAttendanceHistory: (studentId?: string) =>
    request<{
      success: boolean;
      overallPercentage: number;
      threshold: number;
      isLowAttendance: boolean;
      stats: { totalDays: number; presentDays: number; absentDays: number };
      records: any[];
      subjectSummaries: any[];
    }>(`/attendance/history${studentId ? `?studentId=${studentId}` : ''}`),
  getDevices: () =>
    request<{ success: boolean; devices: any[]; activeNodesCount: number; totalNodesCount: number }>('/attendance/devices'),
  getLiveBleEvents: () => request<{ success: boolean; events: any[] }>('/attendance/live'),
  recordBleEvent: (payload: { nodeId: string; bleMac: string; rssi: number; timestamp?: string }) =>
    request<any>('/attendance/ble-event', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  manualAttendanceCorrection: (payload: { studentId: string; date: string; status: string; notes?: string }) =>
    request<any>('/attendance/manual-correction', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Student
  getStudentProfile: (studentId?: string) =>
    request<{ success: boolean; profile: any }>(`/student/profile${studentId ? `?studentId=${studentId}` : ''}`),
  updateStudentContact: (payload: { phone?: string; address?: string; bleMac?: string }) =>
    request<{ success: boolean; profile: any }>('/student/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getStudentTimetable: (day?: string) =>
    request<{ success: boolean; timetable: any[] }>(`/student/timetable${day ? `?day=${day}` : ''}`),
  getStudentSubjects: () => request<{ success: boolean; subjects: any[] }>('/student/subjects'),
  getStudentEvents: () => request<{ success: boolean; events: any[] }>('/student/events'),
  registerForEvent: (eventId: string) =>
    request<any>(`/student/events/${eventId}/register`, { method: 'POST' }),
  cancelEventRegistration: (eventId: string) =>
    request<any>(`/student/events/${eventId}/cancel`, { method: 'POST' }),
  getStudentDocuments: () => request<{ success: boolean; documents: any[] }>('/student/documents'),
  getStudentCertificates: () => request<{ success: boolean; certificates: any[] }>('/student/certificates'),
  getStudentFees: () => request<{ success: boolean; invoice: any; paymentGatewayStatus: any }>('/student/fees'),
  getStudentMarks: () => request<{ success: boolean; marksRecords: any[] }>('/student/marks'),
  getStudentAssignments: () => request<{ success: boolean; assignments: any[] }>('/student/assignments'),
  submitAssignment: (assignmentId: string, payload: { fileName: string; fileData?: string }) =>
    request<any>(`/student/assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Faculty
  getFacultyOverview: () => request<any>('/faculty/overview'),
  getFacultyStudents: () => request<{ success: boolean; students: any[] }>('/faculty/students'),
  createAssignment: (payload: any) =>
    request<any>('/faculty/assignments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  gradeSubmission: (assignmentId: string, submissionId: string, payload: { marksObtained: number; feedback: string }) =>
    request<any>(`/faculty/assignments/${assignmentId}/submissions/${submissionId}/evaluate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateMarksEntry: (payload: any) =>
    request<any>('/faculty/marks/entry', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Parent
  getParentChildData: () => request<any>('/parent/child'),
  getParentTimetable: () => request<{ success: boolean; timetable: any[] }>('/parent/timetable'),
  getParentAssignments: () => request<{ success: boolean; assignments: any[] }>('/parent/assignments'),
  contactFaculty: (payload: { facultyId: string; subject: string; message: string; phoneCallbackRequested?: boolean }) =>
    request<any>('/parent/contact-faculty', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Admission
  submitApplication: (payload: any) =>
    request<any>('/admission/apply', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  trackApplication: (refNumber: string) => request<any>(`/admission/track/${encodeURIComponent(refNumber)}`),
  getApplications: (status?: string) =>
    request<{ success: boolean; applications: any[]; stats: any }>(`/admission/applications${status ? `?status=${status}` : ''}`),
  updateApplicationStatus: (id: string, payload: { status: string; reviewNotes?: string }) =>
    request<any>(`/admission/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Admin
  getAdminOverview: () => request<any>('/admin/overview'),
  getAdminStudents: () => request<{ success: boolean; students: any[] }>('/admin/students'),
  enrollStudent: (payload: any) =>
    request<any>('/admin/students', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAdminFaculty: () => request<{ success: boolean; faculty: any[] }>('/admin/faculty'),
  registerDevice: (payload: any) =>
    request<any>('/admin/devices/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getSystemHealth: () => request<any>('/admin/system-health'),
  triggerDatabaseMaintenance: (options?: {
    rebuildIndexes?: boolean;
    vacuumAnalyze?: boolean;
    purgeTempTelemetry?: boolean;
    compressAuditLogs?: boolean;
  }) =>
    request<{
      success: boolean;
      message: string;
      executionTimeMs: number;
      reclaimedGB: number;
      reclaimedMB: number;
      routineSteps: Array<{
        step: number;
        name: string;
        target?: string;
        status: string;
        durationMs: number;
        reclaimedMB: number;
        details: string;
      }>;
      newStorage: {
        totalGB: number;
        usedGB: number;
        freeGB: number;
        usagePercentage: number;
        breakdown: Array<{ name: string; sizeGB: number; percentage: number; color: string }>;
        maintenanceInfo?: any;
      };
      maintenanceLog?: any;
    }>('/admin/maintenance/database-cleanup', {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),
  getAuditLogs: () => request<{ success: boolean; logs: any[] }>('/admin/audit-logs'),
  getSettings: () => request<{ success: boolean; settings: any }>('/admin/settings'),
  updateSettings: (payload: any) =>
    request<any>('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // QR
  generateQR: (type: string, ref?: string) =>
    request<{ success: boolean; type: string; targetUrl: string; qrDataUrl: string }>(
      `/qr/generate?type=${encodeURIComponent(type)}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`
    ),
};
