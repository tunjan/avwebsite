import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardView from './pages/DashboardView';
import EventsView from './pages/EventsView';
import TeamsView from './pages/TeamsView';
import TeamDetailView from './pages/TeamDetailView';
import TrainingsView from './pages/TrainingsView';
import ResourcesView from './pages/ResourcesView';
import TeamMembersView from './pages/TeamMembersView'; // <-- Use the new name
import EventAttendanceView from './pages/EventAttendanceView'; // <-- ADD THIS
import RegisterPage from './pages/RegisterPage'; // <-- ADD THIS
import AnnouncementsView from './pages/AnnouncementsView'; // <-- ADD THIS
import AnnouncementDetailView from './pages/AnnouncementDetailView';
import EventDetailView from './pages/EventDetailView'; // <-- Ensure this import is here
import ProfileView from './pages/ProfileView'; // <-- ADD THIS







function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} /> {/* <-- ADD THIS ROUTE */}

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
        <Route path="teams" element={<TeamsView />} />
        <Route path="teams/:teamId" element={<TeamDetailView />} />
        <Route path="teams/:teamId/manage" element={<TeamMembersView />} /> {/* <-- Use the new name */}
        <Route path="trainings" element={<TrainingsView />} />
        <Route path="announcements" element={<AnnouncementsView />} />
        <Route path="resources" element={<ResourcesView />} />
        <Route path="/events/:eventId/attendance" element={<EventAttendanceView />} /> 
        <Route path="/announcements/:announcementId" element={<AnnouncementDetailView />} />
        <Route path="/events/:eventId" element={<EventDetailView />} /> {/* <-- Ensure this route is here */}
        <Route path="/profile" element={<ProfileView />} /> 


        

      </Route>
    </Routes>
  );
}

export default App;