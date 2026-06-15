import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import TeacherCourses from "./pages/TeacherCourses.tsx";
import ProtectedRoute from "./ProtectedRoute.tsx";
import AuthLoader from "./components/AuthLoader.tsx";
import CreateCourse from "./pages/teachers/CreateCourse.tsx";
import CourseDetail from "./CourseDetail.tsx";
import TeacherLayout from "./TeacherLayout";
import AdminLayout from "./AdminLayout.tsx";
import PendingCourses from "./PendingCourses.tsx";
import RoleRoute from "./RoleRoute.tsx";
import CourseList from "./pages/public/CourseList.tsx";
import CoursePublicDetail from "./pages/public/CoursePublicDetail.tsx";
import CourseLandingEdit from "./pages/CourseLandingEdit.tsx";
import CoursePageBuilder from "./pages/teachers/CoursePageBuilder.tsx";
import MyLearning from "./pages/MyLearning.tsx";
import LessonLearning from "./pages/LessonLearning.tsx";
import PaymentSuccess from "./pages/payment/PaymentSuccess.tsx";
import PaymentFailed from "./pages/payment/PaymentFailed.tsx";
import MyCertificates from "./pages/student/MyCertificates.tsx";
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthLoader>
      <Routes>
        {/* Public */}
        <Route path="/" element={<CourseList />} />
        <Route path="/courses/:slug" element={<CoursePublicDetail />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failed" element={<PaymentFailed />} />
        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/my-certificates"
          element={
            <ProtectedRoute>
              <MyCertificates />
            </ProtectedRoute>
          }
        />
        {/* Teacher */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["TEACHER", "ADMIN"]}>
                <TeacherLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route path="courses" element={<TeacherCourses />} />
          <Route path="courses/create" element={<CreateCourse />} />
          <Route path="courses/:id" element={<CourseDetail />} />
          <Route path="courses/:id/landing" element={<CourseLandingEdit />} />
          <Route
            path="courses/:id/page-builder"
            element={<CoursePageBuilder />}
          />
        </Route>
        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["ADMIN"]}>
                <AdminLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route path="pending-courses" element={<PendingCourses />} />
        </Route>
        <Route
          path="/my-learning"
          element={
            <ProtectedRoute>
              <MyLearning />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learning/lessons/:lessonId"
          element={
            <ProtectedRoute>
              <LessonLearning />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthLoader>
  </BrowserRouter>,
);

// Public:
// http://localhost:5173/
// http://localhost:5173/courses/:slug

// Teacher:
// http://localhost:5173/teacher/courses
// http://localhost:5173/teacher/courses/create
// http://localhost:5173/teacher/courses/:id
// http://localhost:5173/teacher/courses/:id/landing
// http://localhost:5173/teacher/courses/:id/page-builder

// Admin:
// http://localhost:5173/admin/pending-courses
