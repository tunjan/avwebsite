import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// Eagerly load core layout and public components
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// A simple loading spinner component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
  </div>
);

// Define components for lazy loading
const DashboardView = lazy(() => import('./pages/DashboardView'));
const EventsView = lazy(() => import('./pages/EventsView'));
const EventDetailView = lazy(() => import('./pages/EventDetailView'));
const EventAttendanceView = lazy(() => import('./pages/EventAttendanceView'));
const ChaptersView = lazy(() => import('./pages/ChaptersView'));
const ChapterDetailView = lazy(() => import('./pages/ChapterDetailView'));
const ChapterMembersView = lazy(() => import('./pages/ChapterMembersView'));
const TrainingsView = lazy(() => import('./pages/TrainingsView'));
const TrainingDetailView = lazy(() => import('./pages/TrainingDetailView'));
const AnnouncementsView = lazy(() => import('./pages/AnnouncementsView'));
const AnnouncementDetailView = lazy(() => import('./pages/AnnouncementDetailView'));
const ResourcesView = lazy(() => import('./pages/ResourcesView'));
const ProfileView = lazy(() => import('./pages/ProfileView'));

// Define the route structure in an array for clarity
const protectedRoutes = [
  { path: 'dashboard', element: <DashboardView /> },
  { path: 'events', element: <EventsView /> },
  { path: 'events/:eventId', element: <EventDetailView /> },
  { path: 'events/:eventId/attendance', element: <EventAttendanceView /> },
  { path: 'chapters', element: <ChaptersView /> },
  { path: 'chapters/:chapterId', element: <ChapterDetailView /> },
  { path: 'chapters/:chapterId/manage', element: <ChapterMembersView /> },
  { path: 'trainings', element: <TrainingsView /> },
  { path: 'trainings/:trainingId', element: <TrainingDetailView /> },
  { path: 'announcements', element: <AnnouncementsView /> },
  { path: 'announcements/:announcementId', element: <AnnouncementDetailView /> },
  { path: 'resources', element: <ResourcesView /> },
  { path: 'profile', element: <ProfileView /> },
];

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes Wrapper */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Default route inside protected area */}
          <Route index element={<DashboardView />} />

          {/* Map over the routes array to generate Route components */}
          {protectedRoutes.map((route, index) => (
            <Route key={index} path={route.path} element={route.element} />
          ))}
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;