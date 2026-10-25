import crypto from 'crypto';
import type {
  User,
  StudentProfile,
  FacultyProfile,
  ParentProfile,
  Subject,
  TimetableSlot,
  ESP32Device,
  BLEAttendanceEvent,
  AttendanceDayRecord,
  SubjectAttendanceSummary,
  AdmissionApplication,
  CollegeEvent,
  DocumentRecord,
  CertificateRecord,
  FeeInvoice,
  Assignment,
  StudentMarksRecord,
  CampusNotification,
  AuditLogEntry,
  SystemSettings
} from './types.js';

// Password hasher using crypto SHA-256
export function hashPassword(password: string, salt: string): string {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  return hashPassword(password, salt) === hash;
}

class Database {
  users: User[] = [];
  students: StudentProfile[] = [];
  faculty: FacultyProfile[] = [];
  parents: ParentProfile[] = [];
  subjects: Subject[] = [];
  timetable: TimetableSlot[] = [];
  devices: ESP32Device[] = [];
  bleEvents: BLEAttendanceEvent[] = [];
  attendanceRecords: AttendanceDayRecord[] = [];
  subjectAttendance: Map<string, SubjectAttendanceSummary[]> = new Map();
  applications: AdmissionApplication[] = [];
  events: CollegeEvent[] = [];
  documents: DocumentRecord[] = [];
  certificates: CertificateRecord[] = [];
  feeInvoices: FeeInvoice[] = [];
  assignments: Assignment[] = [];
  marksRecords: StudentMarksRecord[] = [];
  notifications: CampusNotification[] = [];
  auditLogs: AuditLogEntry[] = [];
  settings: SystemSettings = {
    collegeName: "Apex Institute of Science & Technology",
    collegeShortCode: "AIST",
    campusAddress: "400 Silicon Corridor, Knowledge Park IV",
    academicYear: "2025-2026",
    attendanceThresholdPercent: 75,
    bleDetectionWindowSeconds: 300,
    enableManualAttendanceOverride: true,
    contactEmail: "admin@smartcampus.edu",
    contactPhone: "+1 (800) 555-CAMPUS"
  };

  constructor() {
    this.seedDatabase();
  }

  seedDatabase() {
    const salt = "smartcampus2026staticSalt";

    // 1. Seed Users for each of the 5 roles
    this.users = [
      {
        id: "usr-admin-01",
        email: "admin@smartcampus.edu",
        passwordHash: hashPassword("Admin@2026!", salt),
        salt,
        role: "ADMIN",
        name: "Dr. Evelyn Vance (Admin)",
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: "usr-faculty-01",
        email: "prof.sharma@smartcampus.edu",
        passwordHash: hashPassword("Faculty@2026!", salt),
        salt,
        role: "FACULTY",
        name: "Dr. Ramesh Sharma",
        facultyId: "FAC-101",
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: "usr-student-01",
        email: "alex.rivers@smartcampus.edu",
        passwordHash: hashPassword("Student@2026!", salt),
        salt,
        role: "STUDENT",
        name: "Alex Rivers",
        studentId: "STU-2023-042",
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: "usr-parent-01",
        email: "parent.rivers@smartcampus.edu",
        passwordHash: hashPassword("Parent@2026!", salt),
        salt,
        role: "PARENT",
        name: "Marcus Rivers",
        parentId: "PAR-501",
        linkedStudentId: "STU-2023-042",
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: "usr-admission-01",
        email: "admission.officer@smartcampus.edu",
        passwordHash: hashPassword("Admission@2026!", salt),
        salt,
        role: "ADMISSION",
        name: "Sarah Jenkins (Admissions)",
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];

    // 2. Student Profile
    this.students = [
      {
        id: "STU-2023-042",
        userId: "usr-student-01",
        rollNumber: "CS2023-042",
        name: "Alex Rivers",
        email: "alex.rivers@smartcampus.edu",
        phone: "+1 (555) 234-8901",
        department: "Computer Science & Engineering",
        branch: "B.Tech Computer Science",
        year: 3,
        semester: 5,
        section: "A",
        academicYear: "2025-2026",
        photograph: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        bleMac: "AA:BB:CC:11:22:33",
        parentName: "Marcus Rivers",
        parentPhone: "+1 (555) 987-6543",
        address: "742 Evergreen Terrace, Tech District",
        admissionDate: "2023-08-15"
      },
      {
        id: "STU-2023-088",
        userId: "usr-student-02",
        rollNumber: "CS2023-088",
        name: "Liam Chen",
        email: "liam.chen@smartcampus.edu",
        phone: "+1 (555) 345-6789",
        department: "Computer Science & Engineering",
        branch: "B.Tech Computer Science",
        year: 3,
        semester: 5,
        section: "A",
        academicYear: "2025-2026",
        photograph: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        bleMac: "BB:CC:DD:22:33:44",
        parentName: "David Chen",
        parentPhone: "+1 (555) 876-5432",
        address: "128 Innovation Way, Sector 9",
        admissionDate: "2023-08-15"
      },
      {
        id: "STU-2023-104",
        userId: "usr-student-03",
        rollNumber: "CS2023-104",
        name: "Sophia Martinez",
        email: "sophia.m@smartcampus.edu",
        phone: "+1 (555) 456-7890",
        department: "Computer Science & Engineering",
        branch: "B.Tech Computer Science",
        year: 3,
        semester: 5,
        section: "A",
        academicYear: "2025-2026",
        photograph: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
        bleMac: "CC:DD:EE:33:44:55",
        parentName: "Elena Martinez",
        parentPhone: "+1 (555) 765-4321",
        address: "512 Pinecrest Blvd, Campus Heights",
        admissionDate: "2023-08-15"
      }
    ];

    // 3. Faculty Profile
    this.faculty = [
      {
        id: "FAC-101",
        userId: "usr-faculty-01",
        name: "Dr. Ramesh Sharma",
        email: "prof.sharma@smartcampus.edu",
        phone: "+1 (555) 890-1234",
        department: "Computer Science & Engineering",
        designation: "Professor & Academic Dean",
        assignedSubjects: ["CS501", "CS502"],
        assignedClasses: ["CS-3A", "CS-3B"],
        officeLocation: "CS Block, Room 304"
      },
      {
        id: "FAC-102",
        userId: "usr-faculty-02",
        name: "Prof. Priya Nair",
        email: "priya.nair@smartcampus.edu",
        phone: "+1 (555) 890-5678",
        department: "Computer Science & Engineering",
        designation: "Assistant Professor",
        assignedSubjects: ["CS503"],
        assignedClasses: ["CS-3A"],
        officeLocation: "CS Block, Room 212"
      }
    ];

    // 4. Parent Profile
    this.parents = [
      {
        id: "PAR-501",
        userId: "usr-parent-01",
        name: "Marcus Rivers",
        email: "parent.rivers@smartcampus.edu",
        phone: "+1 (555) 987-6543",
        linkedStudentId: "STU-2023-042",
        relationship: "Father",
        occupation: "Lead Cloud Architect"
      }
    ];

    // 5. Subjects
    this.subjects = [
      {
        code: "CS501",
        name: "Design & Analysis of Algorithms",
        department: "Computer Science & Engineering",
        semester: 5,
        credits: 4,
        facultyId: "FAC-101",
        facultyName: "Dr. Ramesh Sharma",
        lectureRoom: "Lab 301 / Hall B",
        weeklyHours: 4
      },
      {
        code: "CS502",
        name: "Operating Systems & Kernel Arch",
        department: "Computer Science & Engineering",
        semester: 5,
        credits: 4,
        facultyId: "FAC-101",
        facultyName: "Dr. Ramesh Sharma",
        lectureRoom: "Lecture Hall 4A",
        weeklyHours: 4
      },
      {
        code: "CS503",
        name: "Database Management Systems",
        department: "Computer Science & Engineering",
        semester: 5,
        credits: 3,
        facultyId: "FAC-102",
        facultyName: "Prof. Priya Nair",
        lectureRoom: "CS Lab 102",
        weeklyHours: 3
      },
      {
        code: "CS504",
        name: "Computer Networks & Protocols",
        department: "Computer Science & Engineering",
        semester: 5,
        credits: 3,
        facultyId: "FAC-103",
        facultyName: "Prof. Alan Vance",
        lectureRoom: "Lecture Hall 2B",
        weeklyHours: 3
      },
      {
        code: "CS505",
        name: "Machine Learning & Neural Networks",
        department: "Computer Science & Engineering",
        semester: 5,
        credits: 4,
        facultyId: "FAC-104",
        facultyName: "Dr. Clara O'Connor",
        lectureRoom: "AI Studio Lab 405",
        weeklyHours: 4
      }
    ];

    // 6. Timetable Slots
    this.timetable = [
      { id: "tt-mon-1", day: "Monday", startTime: "09:00", endTime: "10:15", subjectCode: "CS501", subjectName: "Design & Analysis of Algorithms", facultyName: "Dr. Ramesh Sharma", room: "Lab 301", classGroup: "CS-3A" },
      { id: "tt-mon-2", day: "Monday", startTime: "10:30", endTime: "11:45", subjectCode: "CS502", subjectName: "Operating Systems", facultyName: "Dr. Ramesh Sharma", room: "Hall 4A", classGroup: "CS-3A" },
      { id: "tt-mon-3", day: "Monday", startTime: "13:00", endTime: "14:15", subjectCode: "CS503", subjectName: "Database Systems", facultyName: "Prof. Priya Nair", room: "CS Lab 102", classGroup: "CS-3A" },
      
      { id: "tt-tue-1", day: "Tuesday", startTime: "09:00", endTime: "10:15", subjectCode: "CS504", subjectName: "Computer Networks", facultyName: "Prof. Alan Vance", room: "Hall 2B", classGroup: "CS-3A" },
      { id: "tt-tue-2", day: "Tuesday", startTime: "10:30", endTime: "12:30", subjectCode: "CS505", subjectName: "Machine Learning Lab", facultyName: "Dr. Clara O'Connor", room: "AI Lab 405", classGroup: "CS-3A" },
      { id: "tt-tue-3", day: "Tuesday", startTime: "14:00", endTime: "15:15", subjectCode: "CS501", subjectName: "Design & Analysis of Algorithms", facultyName: "Dr. Ramesh Sharma", room: "Lab 301", classGroup: "CS-3A" },

      { id: "tt-wed-1", day: "Wednesday", startTime: "09:00", endTime: "10:15", subjectCode: "CS502", subjectName: "Operating Systems", facultyName: "Dr. Ramesh Sharma", room: "Hall 4A", classGroup: "CS-3A" },
      { id: "tt-wed-2", day: "Wednesday", startTime: "10:30", endTime: "11:45", subjectCode: "CS503", subjectName: "Database Systems", facultyName: "Prof. Priya Nair", room: "CS Lab 102", classGroup: "CS-3A" },
      { id: "tt-wed-3", day: "Wednesday", startTime: "13:00", endTime: "15:00", subjectCode: "CS501", subjectName: "Algorithms Practical Lab", facultyName: "Dr. Ramesh Sharma", room: "Lab 301", classGroup: "CS-3A" },

      { id: "tt-thu-1", day: "Thursday", startTime: "09:00", endTime: "10:15", subjectCode: "CS505", subjectName: "Machine Learning", facultyName: "Dr. Clara O'Connor", room: "Hall 4A", classGroup: "CS-3A" },
      { id: "tt-thu-2", day: "Thursday", startTime: "10:30", endTime: "11:45", subjectCode: "CS504", subjectName: "Computer Networks", facultyName: "Prof. Alan Vance", room: "Hall 2B", classGroup: "CS-3A" },
      { id: "tt-thu-3", day: "Thursday", startTime: "14:00", endTime: "16:00", subjectCode: "CS503", subjectName: "DBMS Mini Project Lab", facultyName: "Prof. Priya Nair", room: "CS Lab 102", classGroup: "CS-3A" },

      { id: "tt-fri-1", day: "Friday", startTime: "09:00", endTime: "10:15", subjectCode: "CS501", subjectName: "Design & Analysis of Algorithms", facultyName: "Dr. Ramesh Sharma", room: "Lab 301", classGroup: "CS-3A" },
      { id: "tt-fri-2", day: "Friday", startTime: "10:30", endTime: "11:45", subjectCode: "CS502", subjectName: "Operating Systems", facultyName: "Dr. Ramesh Sharma", room: "Hall 4A", classGroup: "CS-3A" },
      { id: "tt-fri-3", day: "Friday", startTime: "13:30", endTime: "15:00", subjectCode: "CS505", subjectName: "AI/ML Seminar & Presentations", facultyName: "Dr. Clara O'Connor", room: "Auditorium C", classGroup: "CS-3A" }
    ];

    // 7. ESP32 Smart Attendance Devices
    this.devices = [
      {
        nodeId: "ESP32-GATE-MAIN-01",
        nodeName: "Main Entrance BLE Scanner",
        nodeType: "ENTRY",
        location: "Campus Main Gate - Turnstile 1",
        macAddress: "24:6F:28:AB:12:01",
        ipAddress: "192.168.10.41",
        firmwareVersion: "v2.4.1-BLE-PROD",
        status: "ONLINE",
        lastSeen: new Date().toISOString(),
        signalStrengthRssi: -54,
        detectionsToday: 842,
        batteryLevel: 98,
        isRegistered: true
      },
      {
        nodeId: "ESP32-GATE-NORTH-02",
        nodeName: "North Academic Gate BLE Node",
        nodeType: "ENTRY",
        location: "CS & Tech Block Entry",
        macAddress: "24:6F:28:AB:12:02",
        ipAddress: "192.168.10.42",
        firmwareVersion: "v2.4.1-BLE-PROD",
        status: "ONLINE",
        lastSeen: new Date().toISOString(),
        signalStrengthRssi: -62,
        detectionsToday: 419,
        batteryLevel: 95,
        isRegistered: true
      },
      {
        nodeId: "ESP32-EXIT-MAIN-01",
        nodeName: "Main Exit Turnstile BLE Node",
        nodeType: "EXIT",
        location: "Campus Main Gate - Exit Corridor",
        macAddress: "24:6F:28:AB:12:03",
        ipAddress: "192.168.10.43",
        firmwareVersion: "v2.4.1-BLE-PROD",
        status: "ONLINE",
        lastSeen: new Date().toISOString(),
        signalStrengthRssi: -58,
        detectionsToday: 620,
        batteryLevel: 97,
        isRegistered: true
      },
      {
        nodeId: "ESP32-LIB-ENTRY-01",
        nodeName: "Central Library BLE Node",
        nodeType: "ENTRY",
        location: "Library Main Foyer",
        macAddress: "24:6F:28:AB:12:04",
        ipAddress: "192.168.10.44",
        firmwareVersion: "v2.4.0-BLE-PROD",
        status: "ONLINE",
        lastSeen: new Date(Date.now() - 4000).toISOString(),
        signalStrengthRssi: -68,
        detectionsToday: 215,
        batteryLevel: 92,
        isRegistered: true
      }
    ];

    // 8. Live / Recent BLE Events
    this.bleEvents = [
      {
        id: "ble-evt-001",
        nodeId: "ESP32-GATE-MAIN-01",
        nodeType: "ENTRY",
        bleMac: "AA:BB:CC:11:22:33",
        studentId: "STU-2023-042",
        studentName: "Alex Rivers",
        rollNumber: "CS2023-042",
        rssi: -52,
        timestamp: new Date(new Date().setHours(8, 42, 10, 0)).toISOString(),
        processed: true
      },
      {
        id: "ble-evt-002",
        nodeId: "ESP32-GATE-NORTH-02",
        nodeType: "ENTRY",
        bleMac: "BB:CC:DD:22:33:44",
        studentId: "STU-2023-088",
        studentName: "Liam Chen",
        rollNumber: "CS2023-088",
        rssi: -59,
        timestamp: new Date(new Date().setHours(8, 48, 25, 0)).toISOString(),
        processed: true
      },
      {
        id: "ble-evt-003",
        nodeId: "ESP32-EXIT-MAIN-01",
        nodeType: "EXIT",
        bleMac: "AA:BB:CC:11:22:33",
        studentId: "STU-2023-042",
        studentName: "Alex Rivers",
        rollNumber: "CS2023-042",
        rssi: -61,
        timestamp: new Date(new Date().setHours(16, 18, 40, 0)).toISOString(),
        processed: true
      }
    ];

    // 9. Attendance Day Records for Alex Rivers
    const today = new Date().toISOString().split('T')[0];
    this.attendanceRecords = [
      {
        id: "att-rec-today",
        studentId: "STU-2023-042",
        date: today,
        status: "PRESENT",
        firstEntryTime: "08:42 AM",
        lastExitTime: "04:18 PM",
        totalMinutesCampus: 456,
        verificationMethod: "BLE_ESP32",
        eventsCount: 4,
        notes: "Automated verification via ESP32-GATE-MAIN-01"
      },
      {
        id: "att-rec-d1",
        studentId: "STU-2023-042",
        date: "2026-10-23",
        status: "PRESENT",
        firstEntryTime: "08:35 AM",
        lastExitTime: "04:30 PM",
        totalMinutesCampus: 475,
        verificationMethod: "BLE_ESP32",
        eventsCount: 3
      },
      {
        id: "att-rec-d2",
        studentId: "STU-2023-042",
        date: "2026-10-22",
        status: "PRESENT",
        firstEntryTime: "08:50 AM",
        lastExitTime: "03:55 PM",
        totalMinutesCampus: 425,
        verificationMethod: "BLE_ESP32",
        eventsCount: 2
      },
      {
        id: "att-rec-d3",
        studentId: "STU-2023-042",
        date: "2026-10-21",
        status: "LATE",
        firstEntryTime: "09:22 AM",
        lastExitTime: "04:15 PM",
        totalMinutesCampus: 413,
        verificationMethod: "BLE_ESP32",
        eventsCount: 2,
        notes: "Entered post-first lecture grace period"
      },
      {
        id: "att-rec-d4",
        studentId: "STU-2023-042",
        date: "2026-10-20",
        status: "ABSENT",
        firstEntryTime: null,
        lastExitTime: null,
        totalMinutesCampus: 0,
        verificationMethod: "BLE_ESP32",
        eventsCount: 0,
        notes: "No BLE scan registered within detection window"
      },
      {
        id: "att-rec-d5",
        studentId: "STU-2023-042",
        date: "2026-10-17",
        status: "PRESENT",
        firstEntryTime: "08:40 AM",
        lastExitTime: "04:45 PM",
        totalMinutesCampus: 485,
        verificationMethod: "BLE_ESP32",
        eventsCount: 3
      }
    ];

    // Subject Attendance Summaries for Alex Rivers
    this.subjectAttendance.set("STU-2023-042", [
      {
        subjectCode: "CS501",
        subjectName: "Design & Analysis of Algorithms",
        totalConducted: 42,
        attended: 38,
        percentage: 90.5,
        facultyName: "Dr. Ramesh Sharma",
        isLowAttendance: false
      },
      {
        subjectCode: "CS502",
        subjectName: "Operating Systems & Kernel Arch",
        totalConducted: 40,
        attended: 34,
        percentage: 85.0,
        facultyName: "Dr. Ramesh Sharma",
        isLowAttendance: false
      },
      {
        subjectCode: "CS503",
        subjectName: "Database Management Systems",
        totalConducted: 36,
        attended: 30,
        percentage: 83.3,
        facultyName: "Prof. Priya Nair",
        isLowAttendance: false
      },
      {
        subjectCode: "CS504",
        subjectName: "Computer Networks & Protocols",
        totalConducted: 35,
        attended: 25,
        percentage: 71.4, // Warning! Below 75% threshold
        facultyName: "Prof. Alan Vance",
        isLowAttendance: true
      },
      {
        subjectCode: "CS505",
        subjectName: "Machine Learning & Neural Networks",
        totalConducted: 38,
        attended: 35,
        percentage: 92.1,
        facultyName: "Dr. Clara O'Connor",
        isLowAttendance: false
      }
    ]);

    // 10. Admission Applications
    this.applications = [
      {
        id: "adm-app-01",
        refNumber: "SC-ADM-2026-7842",
        applicantName: "Maya Lin",
        email: "maya.lin@applicant.net",
        phone: "+1 (555) 777-8899",
        gender: "Female",
        dob: "2006-04-12",
        courseRequested: "B.Tech Computer Science & AI",
        department: "Computer Science & Engineering",
        previousSchool: "St. Xavier Senior Secondary",
        previousQualification: "High School Diploma (12th Grade)",
        marksPercentage: 94.2,
        applicationFeePaid: true,
        status: "APPROVED",
        reviewNotes: "Academic transcripts verified. Outstanding mathematics percentile.",
        reviewerId: "usr-admission-01",
        submittedAt: "2026-10-15T14:30:00.000Z",
        updatedAt: "2026-10-18T11:20:00.000Z",
        uploadedDocuments: [
          { name: "Grade 12 Transcript.pdf", fileUrl: "/docs/adm/grade12-maya.pdf", verified: true },
          { name: "Identity Proof (Passport).pdf", fileUrl: "/docs/adm/id-maya.pdf", verified: true }
        ]
      },
      {
        id: "adm-app-02",
        refNumber: "SC-ADM-2026-9021",
        applicantName: "Jordan Blake",
        email: "jordan.blake@example.com",
        phone: "+1 (555) 888-9900",
        gender: "Male",
        dob: "2006-09-28",
        courseRequested: "B.Tech Electronics & Communication",
        department: "Electronics & Communication Engineering",
        previousSchool: "Horizon International Academy",
        previousQualification: "High School Diploma (12th Grade)",
        marksPercentage: 86.5,
        applicationFeePaid: true,
        status: "UNDER_REVIEW",
        reviewNotes: "Awaiting secondary verification of physics certificate.",
        reviewerId: "usr-admission-01",
        submittedAt: "2026-10-20T09:15:00.000Z",
        updatedAt: "2026-10-22T16:45:00.000Z",
        uploadedDocuments: [
          { name: "High School Transcripts.pdf", fileUrl: "/docs/adm/transcripts-jordan.pdf", verified: true },
          { name: "Physics Merit Cert.pdf", fileUrl: "/docs/adm/physics-jordan.pdf", verified: false }
        ]
      },
      {
        id: "adm-app-03",
        refNumber: "SC-ADM-2026-3310",
        applicantName: "Ananya Deshmukh",
        email: "ananya.d@gmail.com",
        phone: "+1 (555) 333-4411",
        gender: "Female",
        dob: "2006-01-19",
        courseRequested: "B.Tech Computer Science & Engineering",
        department: "Computer Science & Engineering",
        previousSchool: "Kendriya Vidyalaya No. 1",
        previousQualification: "CBSE Class XII",
        marksPercentage: 96.8,
        applicationFeePaid: true,
        status: "SUBMITTED",
        submittedAt: "2026-10-23T18:00:00.000Z",
        updatedAt: "2026-10-23T18:00:00.000Z",
        uploadedDocuments: [
          { name: "CBSE_XII_Marksheet.pdf", fileUrl: "/docs/adm/ananya_marks.pdf", verified: false }
        ]
      }
    ];

    // 11. College Events
    this.events = [
      {
        id: "evt-01",
        title: "HackCampus 2026: AI & IoT Smart Systems",
        category: "Technical",
        description: "Annual 36-hour flagship hackathon focusing on edge computing, BLE telematics, and LLM autonomous agents.",
        posterUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80",
        date: "2026-11-14",
        time: "09:00 AM - 09:00 PM (Next Day)",
        venue: "Innovation Pavilion & CS Labs",
        organizer: "Department of CSE & IEEE Student Branch",
        capacity: 250,
        registeredCount: 184,
        registrationDeadline: "2026-11-10",
        isRegistrationOpen: true,
        registeredStudentIds: ["STU-2023-042", "STU-2023-088"]
      },
      {
        id: "evt-02",
        title: "National Tech Symposium & Paper Presentation",
        category: "Seminar",
        description: "Scholarly sessions featuring invited keynote addresses from industry architects and peer-reviewed research papers.",
        posterUrl: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80",
        date: "2026-11-20",
        time: "10:00 AM - 04:30 PM",
        venue: "Dr. APJ Abdul Kalam Auditorium",
        organizer: "Research & Development Cell",
        capacity: 400,
        registeredCount: 312,
        registrationDeadline: "2026-11-17",
        isRegistrationOpen: true,
        registeredStudentIds: ["STU-2023-042"]
      },
      {
        id: "evt-03",
        title: "Inter-Collegiate Sports Championship 2026",
        category: "Sports",
        description: "Track and field, basketball, badminton, football, and table tennis championship tournaments across all university divisions.",
        posterUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80",
        date: "2026-12-05",
        time: "08:00 AM - 06:00 PM",
        venue: "University Sports Complex",
        organizer: "Physical Education Board",
        capacity: 500,
        registeredCount: 220,
        registrationDeadline: "2026-11-28",
        isRegistrationOpen: true,
        registeredStudentIds: []
      }
    ];

    // 12. Documents
    this.documents = [
      {
        id: "doc-01",
        studentId: "STU-2023-042",
        title: "Official Digital Student ID Card",
        category: "ID_CARD",
        fileName: "SmartCampus_ID_CS2023-042.pdf",
        fileSize: "1.2 MB",
        issuedDate: "2025-08-01",
        status: "VERIFIED",
        verificationHash: "SHA256:d8a9f3e4b7c1265fae34"
      },
      {
        id: "doc-02",
        studentId: "STU-2023-042",
        title: "Bonafide Student Certificate (Academic Year 2025-26)",
        category: "BONAFIDE",
        fileName: "Bonafide_AlexRivers_2025-26.pdf",
        fileSize: "840 KB",
        issuedDate: "2025-09-10",
        status: "VERIFIED",
        verificationHash: "SHA256:7c9e12bf4083aef190da"
      },
      {
        id: "doc-03",
        studentId: "STU-2023-042",
        title: "Semester 4 Official Grade Transcript",
        category: "MARKSHEET",
        fileName: "Transcript_Sem4_CS2023-042.pdf",
        fileSize: "2.1 MB",
        issuedDate: "2025-07-22",
        status: "VERIFIED",
        verificationHash: "SHA256:94ef0184b2c1587d60ae"
      },
      {
        id: "doc-04",
        studentId: "STU-2023-042",
        title: "Term-1 Tuition Fee Receipt",
        category: "FEE_RECEIPT",
        fileName: "FeeReceipt_Term1_2025.pdf",
        fileSize: "450 KB",
        issuedDate: "2025-08-14",
        status: "VERIFIED",
        verificationHash: "SHA256:11bb22cc33dd44ee55ff"
      }
    ];

    // 13. Certificates & Achievements
    this.certificates = [
      {
        id: "cert-01",
        studentId: "STU-2023-042",
        title: "1st Runner Up - National IoT Smart Campus Hackathon",
        category: "Hackathon",
        issuer: "National Innovation Foundation & IEEE",
        issueDate: "2026-03-12",
        verificationId: "CERT-NIF-2026-9812",
        badge: "Silver Medalist",
        description: "Engineered ultra-low latency ESP32 BLE proximity beacons with cryptographic timestamping."
      },
      {
        id: "cert-02",
        studentId: "STU-2023-042",
        title: "Certificate of Excellence: Advanced Cloud Infrastructure",
        category: "Workshop",
        issuer: "Google Cloud Academic Alliance",
        issueDate: "2025-11-28",
        verificationId: "GCP-ACAD-54890",
        badge: "Special Distinction",
        description: "Completed intensive 40-hour hands-on capstone on containerized microservices and Kubernetes."
      },
      {
        id: "cert-03",
        studentId: "STU-2023-042",
        title: "Inter-College Badminton Mens Doubles Champion",
        category: "Sports",
        issuer: "State University Sports Council",
        issueDate: "2026-01-18",
        verificationId: "SPRT-BADM-2026-104",
        badge: "Gold Trophy",
        description: "Secured first position representing AIST in state collegiate badminton invitational."
      }
    ];

    // 14. Fee Invoices
    this.feeInvoices = [
      {
        id: "inv-2025-5",
        studentId: "STU-2023-042",
        academicYear: "2025-2026",
        semester: 5,
        totalFee: 6250,
        tuitionFee: 4800,
        libraryFee: 350,
        labFee: 800,
        sportsFee: 300,
        paidAmount: 5000,
        pendingBalance: 1250,
        dueDate: "2026-11-30",
        status: "PARTIAL",
        payments: [
          {
            id: "pay-01",
            date: "2025-08-14",
            amount: 5000,
            method: "Online Bank Wire / ACH",
            transactionRef: "TXN-98421048-AIST",
            receiptNumber: "RCPT-2025-0842"
          }
        ]
      }
    ];

    // 15. Assignments
    this.assignments = [
      {
        id: "asg-01",
        subjectCode: "CS501",
        subjectName: "Design & Analysis of Algorithms",
        facultyId: "FAC-101",
        facultyName: "Dr. Ramesh Sharma",
        classGroup: "CS-3A",
        title: "Assignment 3: Dynamic Programming & Network Flow",
        instructions: "Implement the Edmonds-Karp maximum flow algorithm in TypeScript or Python. Include benchmark comparisons against naive BFS augmentations with synthetic bipartite graphs.",
        issuedDate: "2026-10-18",
        deadline: "2026-10-31",
        maxMarks: 50,
        allowedFormats: ["PDF", "ZIP", "TAR.GZ"],
        submissions: [
          {
            id: "sub-01",
            assignmentId: "asg-01",
            studentId: "STU-2023-042",
            studentName: "Alex Rivers",
            rollNumber: "CS2023-042",
            submittedAt: "2026-10-22T15:20:00.000Z",
            fileName: "AlexRivers_CS501_Assignment3.zip",
            fileSize: "3.4 MB",
            status: "EVALUATED",
            marksObtained: 48,
            feedback: "Exceptional complexity analysis and test coverage. Clean implementation of residual graph updates.",
            evaluatedBy: "Dr. Ramesh Sharma",
            evaluatedAt: "2026-10-23T11:00:00.000Z"
          }
        ]
      },
      {
        id: "asg-02",
        subjectCode: "CS502",
        subjectName: "Operating Systems & Kernel Arch",
        facultyId: "FAC-101",
        facultyName: "Dr. Ramesh Sharma",
        classGroup: "CS-3A",
        title: "Assignment 4: Custom Concurrency & Mutex Semaphore Simulator",
        instructions: "Design an inverted page table simulator with least-recently-used (LRU) clock page replacement policy. Document cache miss ratios across varying memory frames.",
        issuedDate: "2026-10-20",
        deadline: "2026-11-05",
        maxMarks: 50,
        allowedFormats: ["PDF", "ZIP"],
        submissions: []
      },
      {
        id: "asg-03",
        subjectCode: "CS504",
        subjectName: "Computer Networks & Protocols",
        facultyId: "FAC-103",
        facultyName: "Prof. Alan Vance",
        classGroup: "CS-3A",
        title: "Assignment 2: Wireshark Packet Capture & TLS Handshake Audit",
        instructions: "Capture and analyze a complete TLS 1.3 cryptographic handshake. Document key exchange parameters and certificate chain validation steps.",
        issuedDate: "2026-10-15",
        deadline: "2026-10-28",
        maxMarks: 40,
        allowedFormats: ["PDF"],
        submissions: [
          {
            id: "sub-03",
            assignmentId: "asg-03",
            studentId: "STU-2023-042",
            studentName: "Alex Rivers",
            rollNumber: "CS2023-042",
            submittedAt: "2026-10-23T10:14:00.000Z",
            fileName: "AlexRivers_TLS13_Audit.pdf",
            fileSize: "1.8 MB",
            status: "SUBMITTED"
          }
        ]
      }
    ];

    // 16. Marks & Results
    this.marksRecords = [
      {
        studentId: "STU-2023-042",
        semester: 4,
        academicYear: "2024-2025",
        sgpa: 9.15,
        cgpa: 8.92,
        isPublished: true,
        subjects: [
          { subjectCode: "CS401", subjectName: "Theory of Computation", credits: 4, internalMarks: 28, maxInternal: 30, theoryMarks: 64, maxTheory: 70, practicalMarks: 0, maxPractical: 0, total: 92, grade: "A+" },
          { subjectCode: "CS402", subjectName: "Computer Architecture", credits: 4, internalMarks: 27, maxInternal: 30, theoryMarks: 60, maxTheory: 70, practicalMarks: 0, maxPractical: 0, total: 87, grade: "A" },
          { subjectCode: "CS403", subjectName: "Software Engineering", credits: 3, internalMarks: 29, maxInternal: 30, theoryMarks: 65, maxTheory: 70, practicalMarks: 0, maxPractical: 0, total: 94, grade: "O" },
          { subjectCode: "CS404", subjectName: "Object Oriented Design Lab", credits: 2, internalMarks: 0, maxInternal: 0, theoryMarks: 0, maxTheory: 0, practicalMarks: 49, maxPractical: 50, total: 49, grade: "O" }
        ]
      },
      {
        studentId: "STU-2023-042",
        semester: 5,
        academicYear: "2025-2026",
        sgpa: 8.85,
        cgpa: 8.90,
        isPublished: true, // Mid-term & internals published
        subjects: [
          { subjectCode: "CS501", subjectName: "Design & Analysis of Algorithms", credits: 4, internalMarks: 29, maxInternal: 30, theoryMarks: 58, maxTheory: 70, practicalMarks: 0, maxPractical: 0, total: 87, grade: "A" },
          { subjectCode: "CS502", subjectName: "Operating Systems", credits: 4, internalMarks: 28, maxInternal: 30, theoryMarks: 61, maxTheory: 70, practicalMarks: 0, maxPractical: 0, total: 89, grade: "A" },
          { subjectCode: "CS503", subjectName: "Database Management Systems", credits: 3, internalMarks: 27, maxInternal: 30, theoryMarks: 62, maxTheory: 70, practicalMarks: 0, maxPractical: 0, total: 89, grade: "A" },
          { subjectCode: "CS504", subjectName: "Computer Networks & Protocols", credits: 3, internalMarks: 24, maxInternal: 30, theoryMarks: 54, maxTheory: 70, practicalMarks: 0, maxPractical: 0, total: 78, grade: "B+" },
          { subjectCode: "CS505", subjectName: "Machine Learning & Neural Networks", credits: 4, internalMarks: 30, maxInternal: 30, theoryMarks: 66, maxTheory: 70, practicalMarks: 0, maxPractical: 0, total: 96, grade: "O" }
        ]
      }
    ];

    // 17. Campus Notifications
    this.notifications = [
      {
        id: "notif-01",
        title: "ESP32 Smart Attendance Node Firmware Update Completed",
        message: "Gate scanners have been upgraded to v2.4.1. Students must ensure Bluetooth is active upon approach.",
        category: "ATTENDANCE",
        targetRole: "ALL",
        priority: "HIGH",
        createdAt: "2026-10-24T08:00:00.000Z"
      },
      {
        id: "notif-02",
        title: "Semester 5 Mid-Term Examination Schedule Released",
        message: "Mid-term examinations will commence on Nov 24, 2026. Hall tickets available in E-Documents.",
        category: "EXAM",
        targetRole: "STUDENT",
        priority: "HIGH",
        createdAt: "2026-10-23T14:00:00.000Z"
      },
      {
        id: "notif-03",
        title: "Spring 2027 Admissions Application Cycle Now Active",
        message: "Direct online application portal open for undergraduate engineering and postgraduate programs.",
        category: "ACADEMIC",
        targetRole: "ADMISSION",
        priority: "NORMAL",
        createdAt: "2026-10-22T09:30:00.000Z"
      },
      {
        id: "notif-04",
        title: "Parent-Faculty Conference Scheduled for November 8th",
        message: "Interactive one-on-one sessions with department heads and mentors. Slots open for scheduling.",
        category: "ACADEMIC",
        targetRole: "PARENT",
        priority: "NORMAL",
        createdAt: "2026-10-21T11:15:00.000Z"
      }
    ];

    // 18. Audit Logs
    this.auditLogs = [
      {
        id: "audit-01",
        action: "ESP32_NODE_REGISTERED",
        actorId: "usr-admin-01",
        actorRole: "ADMIN",
        actorName: "Dr. Evelyn Vance",
        details: "Node ESP32-GATE-MAIN-01 certified and bound to Main Gate Turnstile 1.",
        timestamp: "2026-10-24T07:30:00.000Z",
        ipAddress: "192.168.10.1"
      },
      {
        id: "audit-02",
        action: "MARKS_EVALUATION_SAVED",
        actorId: "usr-faculty-01",
        actorRole: "FACULTY",
        actorName: "Dr. Ramesh Sharma",
        details: "Graded assignment 3 submission for student Alex Rivers (CS2023-042).",
        timestamp: "2026-10-23T11:00:00.000Z",
        ipAddress: "192.168.10.88"
      },
      {
        id: "audit-03",
        action: "ADMISSION_STATUS_UPDATED",
        actorId: "usr-admission-01",
        actorRole: "ADMISSION",
        actorName: "Sarah Jenkins",
        details: "Application SC-ADM-2026-7842 approved for Maya Lin (B.Tech CS & AI).",
        timestamp: "2026-10-18T11:20:00.000Z",
        ipAddress: "192.168.10.12"
      }
    ];
  }
}

export const db = new Database();
