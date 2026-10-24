export type UserRole = 'STUDENT' | 'FACULTY' | 'PARENT' | 'ADMISSION' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  studentId?: string;
  facultyId?: string;
  parentId?: string;
  linkedStudentId?: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  rollNumber: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  branch: string;
  year: number;
  semester: number;
  section: string;
  academicYear: string;
  photograph: string;
  bleMac: string;
  parentName: string;
  parentPhone: string;
  address: string;
  admissionDate: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  firstEntryTime: string | null;
  lastExitTime: string | null;
  totalMinutesCampus: number;
  verificationMethod: 'BLE_ESP32' | 'MANUAL';
  verifiedBy?: string;
  eventsCount: number;
  notes?: string;
}

export interface SubjectAttendance {
  subjectCode: string;
  subjectName: string;
  totalConducted: number;
  attended: number;
  percentage: number;
  facultyName: string;
  isLowAttendance: boolean;
}

export interface TimetableSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  room: string;
  classGroup: string;
}

export interface CollegeEvent {
  id: string;
  title: string;
  category: string;
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
  isRegistered?: boolean;
}

export interface DocumentRecord {
  id: string;
  studentId: string;
  title: string;
  category: string;
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
  category: string;
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
  allowedFormats: string[];
  submission?: {
    id: string;
    submittedAt: string;
    fileName: string;
    fileSize: string;
    status: 'SUBMITTED' | 'EVALUATED' | 'LATE';
    marksObtained?: number;
    feedback?: string;
  } | null;
  submissions?: any[];
}

export interface MarksRecord {
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

export interface ESP32Device {
  nodeId: string;
  nodeName: string;
  nodeType: 'ENTRY' | 'EXIT';
  location: string;
  macAddress: string;
  ipAddress: string;
  firmwareVersion: string;
  status: 'ONLINE' | 'OFFLINE';
  lastSeen: string;
  signalStrengthRssi: number;
  detectionsToday: number;
  batteryLevel?: number;
  isRegistered: boolean;
}

export interface AdmissionApplication {
  id: string;
  refNumber: string;
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
  submittedAt: string;
  updatedAt: string;
  uploadedDocuments: {
    name: string;
    fileUrl: string;
    verified: boolean;
  }[];
}
