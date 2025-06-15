import React, { useEffect, useState } from 'react';
import axios from '../api/axiosConfig';
import { useAppSelector } from '../hooks';
import OrganizerDashboard from '../components/OrganizerDashboard';

interface UserStats {
  participatedEvents: number;
  totalHours: number;
}

interface PendingRequest { id: string; user: { name: string }; chapter: { name: string }; }
interface ManagedEvent { id: string; title: string; startTime: string; }
interface OrganizerStats { totalMembers: number; recentGrowth: number; }
interface OrganizerSummary {
  pendingJoinRequests: PendingRequest[];
  upcomingManagedEvents: ManagedEvent[];
  stats: OrganizerStats;
}

const DashboardView = () => {
  const user = useAppSelector((state) => state.auth.user);
  const isOrganizer = user && user.role !== 'ACTIVIST';

  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [organizerSummary, setOrganizerSummary] = useState<OrganizerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const userStatsPromise = axios.get('/api/dashboard/stats');
        const organizerSummaryPromise = isOrganizer 
          ? axios.get('/api/dashboard/organizer-summary') 
          : Promise.resolve(null);

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
  }, [user, isOrganizer]);

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
              <p className="text-red-500">{error}</p>
          </div>
      );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <h2 className="text-xl mb-8">Welcome, {user?.name}!</h2>

      {isOrganizer && organizerSummary ? (
        <OrganizerDashboard summary={organizerSummary} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white border rounded-lg shadow-md text-center">
            <h3 className="text-lg font-bold text-gray-600">Attended Events</h3>
            <p className="text-4xl font-bold mt-2 text-primary">{userStats?.participatedEvents ?? 0}</p>
          </div>
          <div className="p-6 bg-white border rounded-lg shadow-md text-center">
            <h3 className="text-lg font-bold text-gray-600">Total Hours Contributed</h3>
            <p className="text-4xl font-bold mt-2 text-primary">{userStats?.totalHours ?? 0}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;