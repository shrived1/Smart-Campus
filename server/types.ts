export type UserRole = 'STUDENT' | 'FACULTY' | 'PARENT' | 'ADMISSION' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  name: string;
  avatarUrl?: string;
  studentId?: string;
  facultyId?: string;
  parentId?: string;
  linkedStudentId?: string; // For PARENT role
  isActive: boolean;
  createdAt: string;
}

export interface StudentProfile {
  id: string; // matches studentId e.g. STU-2023-042
  userId: string;
  rollNumber: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  branch: string;
  year: number; // e.g. 3
  semester: number; // e.g. 5
  section: string; // 'A'
  academicYear: string; // '2025-2026'
  photograph: string;
  bleMac: string; // Registered BLE MAC address for smart attendance
  parentName: string;
  parentPhone: string;
  address: string;
  admissionDate: string;
}

export interface FacultyProfile {
  id: string; // e.g. FAC-101
  userId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  assignedSubjects: string[]; // Subject codes
  assignedClasses: string[]; // Class identifiers e.g. "CS-3A", "CS-3B"
  officeLocation: string;
}

export interface ParentProfile {
  id: string; // e.g. PAR-501
  userId: string;
  name: string;
  email: string;
  phone: string;
  linkedStudentId: string;
  relationship: string; // 'Father' | 'Mother' | 'Guardian'
  occupation: string;
}

export interface Subject {
  code: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
  facultyId: string;
  facultyName: string;
  lectureRoom: string;
  weeklyHours: number;
}

export interface TimetableSlot {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  startTime: string; // "09:00"
  endTime: string; // "10:00"
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  room: string;
  classGroup: string; // "CS-3A"
}

export interface ESP32Device {
  nodeId: string; // e.g. "ESP32-GATE-01"
  nodeName: string;
  nodeType: 'ENTRY' | 'EXIT';
  location: string;
  macAddress: string;
  ipAddress: string;
  firmwareVersion: string;
  status: 'ONLINE' | 'OFFLINE';
  lastSeen: string;
  signalStrengthRssi: number; // e.g. -58
  detectionsToday: number;
  batteryLevel?: number; // 95%
  isRegistered: boolean;
}

export interface BLEAttendanceEvent {
  id: string;
  nodeId: string;
  nodeType: 'ENTRY' | 'EXIT';
  bleMac: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  rssi: number;
  timestamp: string;
  processed: boolean;
}

export interface AttendanceDayRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  firstEntryTime: string | null; // "08:42 AM"
  lastExitTime: string | null; // "04:15 PM"
  totalMinutesCampus: number;
  verificationMethod: 'BLE_ESP32' | 'MANUAL';
  verifiedBy?: string;
  eventsCount: number;
  notes?: string;
}

export interface SubjectAttendanceSummary {
  subjectCode: string;
  subjectName: string;
  totalConducted: number;
  attended: number;
  percentage: number;
  facultyName: string;
  isLowAttendance: boolean; // below threshold (default 75%)
}

export interface AdmissionApplication {
  id: string;
  refNumber: string; // e.g. "SC-ADM-2026-7842"
  applicantName: string;
  email: string;
  phone: string;
  gender: string;
  dob: string;
  courseRequested: string;
  department: string;
  previousSchool: string;
  previousQualification: string;
  marksPercentage: number;
  applicationFeePaid: boolean;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'DOCUMENTS_REQUIRED' | 'APPROVED' | 'REJECTED' | 'WAITLISTED';
  reviewNotes?: string;
  reviewerId?: string;
  submittedAt: string;
  updatedAt: string;
  uploadedDocuments: {
    name: string;
    fileUrl: string;
    verified: boolean;
  }[];
}

export interface CollegeEvent {
  id: string;
  title: string;
  category: 'Technical' | 'Cultural' | 'Sports' | 'Seminar' | 'Workshop';
  description: string;
  posterUrl: string;
  date: string;
  time: string;
  venue: string;
  organizer: string;
  capacity: number;
  registeredCount: number;
  registrationDeadline: string;
  isRegistrationOpen: boolean;
  registeredStudentIds: string[];
}

export interface DocumentRecord {
  id: string;
  studentId: string;
  title: string;
  category: 'ID_CARD' | 'BONAFIDE' | 'FEE_RECEIPT' | 'MARKSHEET' | 'TRANSFER_CERTIFICATE';
  fileName: string;
  fileSize: string;
  issuedDate: string;
  status: 'VERIFIED' | 'PENDING_APPROVAL';
  verificationHash: string;
}

export interface CertificateRecord {
  id: string;
  studentId: string;
  title: string;
  category: 'Workshop' | 'Hackathon' | 'Sports' | 'Cultural' | 'Academic';
  issuer: string;
  issueDate: string;
  verificationId: string;
  badge: string;
  description: string;
}

export interface FeeInvoice {
  id: string;
  studentId: string;
  academicYear: string;
  semester: number;
  totalFee: number;
  tuitionFee: number;
  libraryFee: number;
  labFee: number;
  sportsFee: number;
  paidAmount: number;
  pendingBalance: number;
  dueDate: string;
  status: 'PAID' | 'PARTIAL' | 'OVERDUE';
  payments: {
    id: string;
    date: string;
    amount: number;
    method: string;
    transactionRef: string;
    receiptNumber: string;
  }[];
}

export interface Assignment {
  id: string;
  subjectCode: string;
  subjectName: string;
  facultyId: string;
  facultyName: string;
  classGroup: string;
  title: string;
  instructions: string;
  issuedDate: string;
  deadline: string;
  maxMarks: number;
  allowedFormats: string[]; // e.g. ["PDF", "ZIP", "DOCX"]
  submissions: AssignmentSubmission[];
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  submittedAt: string;
  fileName: string;
  fileSize: string;
  status: 'SUBMITTED' | 'EVALUATED' | 'LATE';
  marksObtained?: number;
  feedback?: string;
  evaluatedBy?: string;
  evaluatedAt?: string;
}

export interface StudentMarksRecord {
  studentId: string;
  semester: number;
  academicYear: string;
  sgpa: number;
  cgpa: number;
  isPublished: boolean;
  subjects: {
    subjectCode: string;
    subjectName: string;
    credits: number;
    internalMarks: number;
    maxInternal: number;
    theoryMarks: number;
    maxTheory: number;
    practicalMarks: number;
    maxPractical: number;
    total: number;
    grade: string;
  }[];
}

export interface CampusNotification {
  id: string;
  title: string;
  message: string;
  category: 'ACADEMIC' | 'EXAM' | 'EVENT' | 'ATTENDANCE' | 'SYSTEM';
  targetRole: 'ALL' | 'STUDENT' | 'FACULTY' | 'PARENT' | 'ADMISSION' | 'ADMIN';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  createdAt: string;
  isRead?: boolean;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string;
  actorRole: UserRole;
  actorName: string;
  details: string;
  timestamp: string;
  ipAddress: string;
}

export interface SystemSettings {
  collegeName: string;
  collegeShortCode: string;
  campusAddress: string;
  academicYear: string;
  attendanceThresholdPercent: number; // default 75
  bleDetectionWindowSeconds: number; // default 300
  enableManualAttendanceOverride: boolean;
  contactEmail: string;
  contactPhone: string;
}

export interface SystemDiagnosticLog {
  id: string;
  timestamp: string;
  level: 'ERROR' | 'WARNING' | 'INFO';
  subsystem: 'Database' | 'IoT Gateway' | 'Security / Auth' | 'Storage' | 'API Gateway' | 'Network' | 'Worker';
  message: string;
  traceId: string;
  details?: string;
  metricContext?: string;
}

export interface UptimeHistoryPoint {
  time: string;
  uptime: number;
  latencyMs: number;
  requestsPerMin: number;
  errorRate: number;
  prevWeekLatencyMs: number;
  prevWeekUptime: number;
  prevWeekRequestsPerMin: number;
  latencyDeltaMs: number;
  latencyDeltaPct: number;
}

export interface SystemPerformanceComparison {
  currentAvgLatencyMs: number;
  prevWeekAvgLatencyMs: number;
  latencyDeltaMs: number;
  latencyDeltaPct: number;
  currentAvgUptime: number;
  prevWeekAvgUptime: number;
  uptimeDeltaPct: number;
  currentAvgRequestsPerMin: number;
  prevWeekAvgRequestsPerMin: number;
  trafficGrowthPct: number;
}

