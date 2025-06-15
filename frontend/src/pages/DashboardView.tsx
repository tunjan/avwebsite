import React, { useEffect, useState } from 'react';
import axios from '../api/axiosConfig';
import { useAppSelector } from '../hooks';
import OrganizerDashboard from '../components/OrganizerDashboard'; // The new component for organizers

// --- Type Definitions for Dashboard Data ---

// For the standard activist view
interface UserStats {
  participatedEvents: number;
  totalHours: number;
}

// For the organizer's mission control view
interface PendingRequest {
  id: string;
  user: { name: string };
  team: { name: string };
}
interface ManagedEvent {
  id: string;
  title: string;
  startTime: string;
}
interface OrganizerStats {
  totalMembers: number;
  recentGrowth: number;
}
interface OrganizerSummary {
  pendingJoinRequests: PendingRequest[];
  upcomingManagedEvents: ManagedEvent[];
  stats: OrganizerStats;
}

const DashboardView = () => {
  const user = useAppSelector((state) => state.auth.user);
  const isOrganizer = user && user.role !== 'ACTIVIST';

  // State to hold data for BOTH dashboard types
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [organizerSummary, setOrganizerSummary] = useState<OrganizerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // This effect runs once on component mount to fetch all necessary data
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);

      // We always fetch the basic user stats for the header/welcome message
      const userStatsPromise = axios.get('/api/dashboard/stats');
      
      // We ONLY fetch the organizer summary if the user has the appropriate role
      const organizerSummaryPromise = isOrganizer 
        ? axios.get('/api/dashboard/organizer-summary') 
        : Promise.resolve(null); // Return a resolved promise for non-organizers

      try {
        const [userStatsRes, organizerSummaryRes] = await Promise.all([userStatsPromise, organizerSummaryPromise]);
        
        setUserStats(userStatsRes.data);

        if (organizerSummaryRes) {
          setOrganizerSummary(organizerSummaryRes.data);
        }

      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
        setError("Could not load dashboard data. Please try refreshing the page.");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
        fetchDashboardData();
    }
  }, [user, isOrganizer]); // Rerun if the user or their role changes

  if (loading) {
    return (
        <div>
            <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
            <p>Loading dashboard...</p>
        </div>
    );
  }

  if (error) {
      return (
          <div>
              <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
              <p className="text-primary">{error}</p>
          </div>
      );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <h2 className="text-xl mb-6">Welcome, {user?.name}!</h2>

      {/* --- Conditional Rendering Logic --- */}
      {isOrganizer && organizerSummary ? (
        // If the user is an organizer AND we have their summary data, render the mission control
        <OrganizerDashboard summary={organizerSummary} />
      ) : (
        // Otherwise, render the standard activist dashboard
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white shadow text-center">
            <h3 className="text-lg font-bold text-gray-600">Attended Events</h3>
            <p className="text-4xl font-bold mt-2 text-primary">{userStats?.participatedEvents ?? 0}</p>
          </div>
          <div className="p-6 bg-white shadow text-center">
            <h3 className="text-lg font-bold text-gray-600">Total Hours Contributed</h3>
            <p className="text-4xl font-bold mt-2 text-primary">{userStats?.totalHours ?? 0}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;