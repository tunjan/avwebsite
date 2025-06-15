import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardView from './pages/DashboardView';
import EventsView from './pages/EventsView';
import EventDetailView from './pages/EventDetailView';
import EventAttendanceView from './pages/EventAttendanceView';
import ChaptersView from './pages/ChaptersView';
import ChapterDetailView from './pages/ChapterDetailView';
import ChapterMembersView from './pages/ChapterMembersView';
import TrainingsView from './pages/TrainingsView';
import TrainingDetailView from './pages/TrainingDetailView';
import AnnouncementsView from './pages/AnnouncementsView';
import AnnouncementDetailView from './pages/AnnouncementDetailView';
import ResourcesView from './pages/ResourcesView';
import ProfileView from './pages/ProfileView';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardView />} />
        <Route path="dashboard" element={<DashboardView />} />

        <Route path="events" element={<EventsView />} />
        <Route path="events/:eventId" element={<EventDetailView />} />
        <Route path="events/:eventId/attendance" element={<EventAttendanceView />} />
        
        <Route path="chapters" element={<ChaptersView />} />
        <Route path="chapters/:chapterId" element={<ChapterDetailView />} />
        <Route path="chapters/:chapterId/manage" element={<ChapterMembersView />} />
        
        <Route path="trainings" element={<TrainingsView />} />
        <Route path="trainings/:trainingId" element={<TrainingDetailView />} />

        <Route path="announcements" element={<AnnouncementsView />} />
        <Route path="announcements/:announcementId" element={<AnnouncementDetailView />} />
        
        <Route path="resources" element={<ResourcesView />} />
        <Route path="profile" element={<ProfileView />} />
      </Route>
    </Routes>
  );
}

export default App;