import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { useAppSelector } from '../hooks';
import CommentThread from '../components/CommentThread'; // <-- ADD THIS IMPORT


// --- Type Definitions for this View ---
interface Attendee {
  id: string;
  name: string;
}

interface EventDetails {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  scope: string;
  team: { name: string; } | null;
  region: { name: string; } | null;
  isRegistered: boolean; // Flag from the backend indicating if the current user has RSVP'd
}

// Helper function to format date and time intervals
const formatTimeInterval = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  const startTimeString = startDate.toLocaleTimeString('en-US', timeOptions);
  const endTimeString = endDate.toLocaleTimeString('en-US', timeOptions);
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateString = startDate.toLocaleDateString('en-US', dateOptions);
  return `${dateString} • ${startTimeString} - ${endTimeString}`;
};

const EventDetailView: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const user = useAppSelector(state => state.auth.user);

    const [event, setEvent] = useState<EventDetails | null>(null);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Using useCallback to memoize the fetch function
    const fetchData = useCallback(async () => {
        if (!eventId) return;
        setLoading(true);
        try {
            const eventPromise = axios.get(`/api/events/${eventId}`);
            const attendeesPromise = axios.get(`/api/events/${eventId}/attendees`);
            
            const [eventRes, attendeesRes] = await Promise.all([eventPromise, attendeesPromise]);

            setEvent(eventRes.data);
            setAttendees(attendeesRes.data);
        } catch (err) {
            setError("Failed to load event details. It may not exist.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRsvp = async () => {
        try {
            await axios.post(`/api/events/${eventId}/rsvp`);
            // Optimistically update the UI
            setEvent(prev => prev ? { ...prev, isRegistered: true } : null);
            if (user) {
                setAttendees(prev => [...prev, { id: user.id, name: user.name }]);
            }
        } catch (err) {
            alert("Failed to RSVP. You may already be registered.");
        }
    };

    const handleCancelRsvp = async () => {
        if (window.confirm("Are you sure you want to cancel your RSVP?")) {
            try {
                await axios.delete(`/api/events/${eventId}/rsvp`);
                // Optimistically update the UI
                setEvent(prev => prev ? { ...prev, isRegistered: false } : null);
                if (user) {
                    setAttendees(prev => prev.filter(att => att.id !== user.id));
                }
            } catch (err) {
                alert("Failed to cancel RSVP.");
            }
        }
    };

    if (loading) return <p className="text-center mt-8">Loading event...</p>;
    if (error) return <p className="text-center mt-8 text-primary">{error}</p>;
    if (!event) return <p className="text-center mt-8">Event not found.</p>;

    return (
        <div>
            <Link to="/events" className="text-gray-700 hover:text-primary mb-6 block font-semibold">← Back to Events List</Link>

            <div className="bg-white shadow p-8">
                <h1 className="text-4xl font-bold text-black">{event.title}</h1>
                <p className="text-lg text-gray-700 mt-2">{formatTimeInterval(event.startTime, event.endTime)}</p>
                <p className="text-md text-gray-500 mt-1">At {event.location}</p>

                <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-gray-800 whitespace-pre-wrap">{event.description}</p>
                </div>
                
                <div className="mt-8">
                    {event.isRegistered ? (
                        <div className="text-center p-4 bg-green-100 border border-green-300">
                            <p className="font-bold text-green-800">✓ You are attending this event.</p>
                            <button onClick={handleCancelRsvp} className="mt-2 text-sm text-gray-600 hover:underline">Cancel RSVP</button>
                        </div>
                    ) : (
                        <button onClick={handleRsvp} className="w-full p-3 bg-primary text-white font-bold text-lg hover:opacity-80">
                            RSVP Now
                        </button>
                    )}
                </div>

                <div className="mt-8">
                    <h3 className="text-xl font-bold text-black">Attendees ({attendees.length})</h3>
                    <ul className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {attendees.map(attendee => (
                            <li key={attendee.id} className="p-2 bg-gray-100 text-center">
                                <span className="font-medium text-gray-800">{attendee.name}</span>
                            </li>
                        ))}
                        {attendees.length === 0 && <p className="col-span-full text-gray-500">No one has registered yet. Be the first!</p>}
                    </ul>
                </div>
            </div>
            <CommentThread targetId={event.id} targetType="event" />

        </div>
    );
}

export default EventDetailView;