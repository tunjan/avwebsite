import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../api/axiosConfig';

interface TeamStats {
  name: string;
  totalEvents: number;
  totalHours: number;
}

const TeamDetailView = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    const fetchStats = async () => {
      try {
        const { data } = await axios.get(`/api/teams/${teamId}/stats`);
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch team stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [teamId]);

  if (loading) return <p>Loading team statistics...</p>;

  return (
    <div>
      <Link to="/teams" className="text-blue-500 hover:underline mb-6 block">← Back to Teams</Link>
      <h1 className="text-3xl font-bold mb-6">Team Statistics for {stats?.name || '...'}</h1>
      {stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-lg shadow text-center">
            <h3 className="text-lg font-bold text-gray-600">Total Events (Cubes)</h3>
            <p className="text-4xl font-bold mt-2">{stats.totalEvents}</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow text-center">
            <h3 className="text-lg font-bold text-gray-600">Total Hours</h3>
            <p className="text-4xl font-bold mt-2">{stats.totalHours}</p>
          </div>
        </div>
      ) : (
        <p>Could not load statistics for this team.</p>
      )}
    </div>
  );
};

export default TeamDetailView;