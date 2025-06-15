import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../api/axiosConfig';

interface Registration {
  userId: string;
  eventId: string;
  attended: boolean;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

const EventAttendanceView = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRegistrations = useCallback(async () => {
    if (!eventId) return;
    try {
      const { data } = await axios.get(`/api/events/${eventId}/registrations`);
      setRegistrations(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not load attendance data.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleToggleAttendance = async (userId: string, currentStatus: boolean) => {
    try {
      // Optimistically update the UI
      setRegistrations(regs => regs.map(reg => 
        reg.userId === userId ? { ...reg, attended: !currentStatus } : reg
      ));

      await axios.patch(`/api/events/${eventId}/registrations/${userId}`, {
        attended: !currentStatus,
      });
    } catch (err) {
      alert("Failed to update status. Reverting change.");
      console.error(err);
      // Revert the UI change on failure
      setRegistrations(regs => regs.map(reg => 
        reg.userId === userId ? { ...reg, attended: currentStatus } : reg
      ));
    }
  };

  if (loading) return <p className="text-center mt-8">Loading attendance list...</p>;

  if (error) return (
    <div className="text-center mt-8 p-4">
        <p className="text-red-500 font-semibold text-lg">{error}</p>
        <Link to="/events" className="text-blue-500 hover:underline mt-4 inline-block">← Back to Events</Link>
    </div>
  );

  return (
    <div>
      <Link to="/events" className="text-blue-500 hover:underline mb-6 block">← Back to Events</Link>
      <h1 className="text-3xl font-bold mb-4">Manage Event Attendance</h1>
      <p className="mb-6 text-gray-600">Toggle the switch to mark a user as "Attended". This will affect their contribution stats.</p>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {registrations.length > 0 ? registrations.map(reg => (
            <li key={reg.userId} className="p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{reg.user.name}</p>
                <p className="text-sm text-gray-500">{reg.user.email}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`text-sm font-bold ${reg.attended ? 'text-green-600' : 'text-gray-400'}`}>
                  {reg.attended ? 'Attended' : 'Registered'}
                </span>
                <button
                  onClick={() => handleToggleAttendance(reg.userId, reg.attended)}
                  className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${reg.attended ? 'bg-indigo-600' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${reg.attended ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </li>
          )) : <p className="p-4 text-gray-500">No one has registered for this event yet.</p>}
        </ul>
      </div>
    </div>
  );
};

export default EventAttendanceView;