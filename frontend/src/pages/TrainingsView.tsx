import React, { useEffect, useState } from 'react';
import axios from '../api/axiosConfig';

interface Training {
  id: string;
  title: string;
  description: string;
  startTime: string;
  scope: string;
  team: { name: string } | null;
  region: { name: string } | null;
}

const TrainingsView = () => {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/trainings');
      setTrainings(data);
    } catch (error) {
      console.error('Failed to fetch trainings', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainings();
  }, []);
  
  const handleRsvp = async (trainingId: string) => {
      try {
          await axios.post(`/api/trainings/${trainingId}/rsvp`);
          alert('Successfully registered for training!');
          // A more advanced implementation would update the UI state
      } catch (error: any) {
          if (error.response?.status === 409) {
              alert('You are already registered for this training.');
          } else {
              alert('Failed to RSVP. Please try again.');
          }
          console.error('RSVP error', error);
      }
  }

  const getScopeLabel = (training: Training) => {
      switch(training.scope) {
          case 'CITY':
              return `City: ${training.team?.name}`;
          case 'REGIONAL':
              return `Region: ${training.region?.name}`;
          case 'GLOBAL':
              return 'Global';
          default:
              return 'General';
      }
  }

  if (loading) return <p>Loading trainings...</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Trainings</h1>
      <div className="space-y-4">
        {trainings.length > 0 ? (
          trainings.map((training) => (
            <div key={training.id} className="p-6 bg-white rounded-lg shadow">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-sm font-semibold text-indigo-600">{getScopeLabel(training)}</p>
                      <h2 className="text-2xl font-bold mt-1">{training.title}</h2>
                      <p className="text-md text-gray-500 mt-1">
                        {new Date(training.startTime).toLocaleString()}
                      </p>
                  </div>
                  <button
                    onClick={() => handleRsvp(training.id)}
                    className="px-5 py-2 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    RSVP
                  </button>
              </div>
              <p className="mt-4 text-gray-700">{training.description}</p>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 mt-10">No upcoming trainings scheduled.</p>
        )}
      </div>
    </div>
  );
};

export default TrainingsView;