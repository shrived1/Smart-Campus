import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import PortalLayout from './layouts/PortalLayout.js';

// Public Pages
import LandingPage from './pages/public/LandingPage.js';
import LoginPage from './pages/public/LoginPage.js';
import AdmissionApplyPage from './pages/public/AdmissionApplyPage.js';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard.js';
import StudentDetailsPage from './pages/student/StudentDetailsPage.js';
import StudentAttendancePage from './pages/student/StudentAttendancePage.js';
import StudentTimetablePage from './pages/student/StudentTimetablePage.js';
import StudentAssignmentsPage from './pages/student/StudentAssignmentsPage.js';
import StudentMarksPage from './pages/student/StudentMarksPage.js';
import StudentFeesPage from './pages/student/StudentFeesPage.js';
import StudentEventsPage from './pages/student/StudentEventsPage.js';
import StudentDocumentsPage from './pages/student/StudentDocumentsPage.js';

// Faculty Pages
import FacultyDashboard from './pages/faculty/FacultyDashboard.js';
import FacultyStudentsPage from './pages/faculty/FacultyStudentsPage.js';
import FacultyAssignmentsPage from './pages/faculty/FacultyAssignmentsPage.js';
import FacultyMarksPage from './pages/faculty/FacultyMarksPage.js';

// Parent Pages
import ParentDashboard from './pages/parent/ParentDashboard.js';
import ParentAttendancePage from './pages/parent/ParentAttendancePage.js';
import ParentContactPage from './pages/parent/ParentContactPage.js';

// Admission Pages
import AdmissionDashboard from './pages/admission/AdmissionDashboard.js';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard.js';
import AdminStudentsPage from './pages/admin/AdminStudentsPage.js';
import AdminDevicesPage from './pages/admin/AdminDevicesPage.js';
import AdminAttendancePage from './pages/admin/AdminAttendancePage.js';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage.js';
import AdminSettingsPage from './pages/admin/AdminSettingsPage.js';
import AdminQRPage from './pages/admin/AdminQRPage.js';
import AdminSystemHealthPage from './pages/admin/AdminSystemHealthPage.js';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admission/apply" element={<AdmissionApplyPage />} />
          <Route path="/admission/track" element={<AdmissionApplyPage />} />

          {/* 1. Student Portal */}
          <Route element={<PortalLayout allowedRoles={['STUDENT']} portalTitle="Student Portal" />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/details" element={<StudentDetailsPage />} />
            <Route path="/student/attendance" element={<StudentAttendancePage />} />
            <Route path="/student/timetable" element={<StudentTimetablePage />} />
            <Route path="/student/subjects" element={<StudentTimetablePage />} />
            <Route path="/student/events" element={<StudentEventsPage />} />
            <Route path="/student/documents" element={<StudentDocumentsPage />} />
            <Route path="/student/certificates" element={<StudentDocumentsPage />} />
            <Route path="/student/fees" element={<StudentFeesPage />} />
            <Route path="/student/marks" element={<StudentMarksPage />} />
            <Route path="/student/assignments" element={<StudentAssignmentsPage />} />
            <Route path="/student/help" element={<StudentDetailsPage />} />
          </Route>

          {/* 2. Faculty Portal */}
          <Route element={<PortalLayout allowedRoles={['FACULTY', 'ADMIN']} portalTitle="Faculty Academic Portal" />}>
            <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
            <Route path="/faculty/classes" element={<FacultyStudentsPage />} />
            <Route path="/faculty/students" element={<FacultyStudentsPage />} />
            <Route path="/faculty/live-attendance" element={<AdminDevicesPage />} />
            <Route path="/faculty/attendance-analytics" element={<FacultyDashboard />} />
            <Route path="/faculty/assignments" element={<FacultyAssignmentsPage />} />
            <Route path="/faculty/marks" element={<FacultyMarksPage />} />
          </Route>

          {/* 3. Parent Portal */}
          <Route element={<PortalLayout allowedRoles={['PARENT', 'ADMIN']} portalTitle="Parent Portal" />}>
            <Route path="/parent/dashboard" element={<ParentDashboard />} />
            <Route path="/parent/child" element={<ParentDashboard />} />
            <Route path="/parent/attendance" element={<ParentAttendancePage />} />
            <Route path="/parent/timetable" element={<StudentTimetablePage />} />
            <Route path="/parent/marks" element={<StudentMarksPage />} />
            <Route path="/parent/fees" element={<StudentFeesPage />} />
            <Route path="/parent/assignments" element={<StudentAssignmentsPage />} />
            <Route path="/parent/events" element={<StudentEventsPage />} />
            <Route path="/parent/contact-faculty" element={<ParentContactPage />} />
          </Route>

          {/* 4. Admission Staff Portal */}
          <Route element={<PortalLayout allowedRoles={['ADMISSION', 'ADMIN']} portalTitle="Admissions Office Portal" />}>
            <Route path="/admission/dashboard" element={<AdmissionDashboard />} />
            <Route path="/admission/applications" element={<AdmissionDashboard />} />
          </Route>

          {/* 5. Admin Portal */}
          <Route element={<PortalLayout allowedRoles={['ADMIN']} portalTitle="Institutional Admin Command" />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/students" element={<AdminStudentsPage />} />
            <Route path="/admin/devices" element={<AdminDevicesPage />} />
            <Route path="/admin/attendance" element={<AdminAttendancePage />} />
            <Route path="/admin/qr" element={<AdminQRPage />} />
            <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
            <Route path="/admin/system-health" element={<AdminSystemHealthPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
          </Route>

          {/* Wildcard fallback to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
