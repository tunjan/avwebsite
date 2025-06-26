import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { type AxiosError } from 'axios';

interface ChapterStats {
  name: string;
  totalEvents: number;
  totalHours: number;
}

const ChapterDetailView: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const [stats, setStats] = useState<ChapterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chapterId) {
        setError("Chapter ID is missing from the URL.");
        setLoading(false);
        return;
    }

    const fetchStats = async () => {
      try {
        const { data } = await axios.get(`/api/chapters/${chapterId}/stats`);
        setStats(data);
      } catch (err) {
        const error = err as AxiosError<{ message: string }>;
        console.error('Failed to fetch chapter stats', error);
        setError(error.response?.data?.message || "Could not load statistics for this chapter.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [chapterId]);

  if (loading) return <p className="text-center mt-8">Loading chapter statistics...</p>;
  if (error) return <p className="text-center mt-8 text-red-500">{error}</p>;
  if (!stats) return <p className="text-center mt-8">No statistics found for this chapter.</p>;

  return (
    <div>
      <Link to="/chapters" className="text-black hover:text-primary mb-6 block font-semibold">← Back to Chapters</Link>
      <h1 className="text-3xl font-bold mb-6">Chapter Statistics: {stats.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 bg-white border rounded-lg shadow-md text-center">
          <h3 className="text-lg font-bold text-gray-600">Total Events Hosted</h3>
          <p className="text-5xl font-bold mt-2 text-black">{stats.totalEvents}</p>
        </div>
        <div className="p-8 bg-white border rounded-lg shadow-md text-center">
          <h3 className="text-lg font-bold text-gray-600">Total Hours Contributed</h3>
          <p className="text-5xl font-bold mt-2 text-black">{stats.totalHours}</p>
        </div>
      </div>
       <div className="mt-8">
            <Link to={`/chapters/${chapterId}/manage`} className="text-center block w-full p-3 bg-gray-800 text-white font-bold rounded-md hover:bg-black transition-colors">
                View & Manage Chapter Members
            </Link>
       </div>
    </div>
  );
};

export default ChapterDetailView;