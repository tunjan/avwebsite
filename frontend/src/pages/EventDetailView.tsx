import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { useAppSelector } from '../hooks';
import CommentThread from '../components/CommentThread';
import Modal from '../components/Modal';
import DatePicker from 'react-datepicker';

interface Attendee { id: string; name: string; }
interface EventDetails {
    id: string;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    location: string;
    scope: string;
    chapter: { id: string; name: string; regionId: string; } | null;
    region: { name: string; } | null;
    isRegistered: boolean;
    canModify: boolean; // Flag from backend
  }

const formatTimeInterval = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', dateOptions)} • ${startDate.toLocaleTimeString('en-US', timeOptions)} - ${endDate.toLocaleTimeString('en-US', timeOptions)}`;
};

const EventDetailView: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    const user = useAppSelector(state => state.auth.user);

    const [event, setEvent] = useState<EventDetails | null>(null);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '' });
    const closeModal = () => setModalState({ ...modalState, isOpen: false });

    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState({ title: '', description: '', location: '', startTime: new Date(), endTime: new Date() });
    const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const [eventRes, attendeesRes] = await Promise.all([
        axios.get(`/api/events/${eventId}`),
        axios.get(`/api/events/${eventId}/attendees`),
      ]);
      setEvent(eventRes.data);
      setAttendees(attendeesRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load event details.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditClick = () => {
      if (!event) return;
      setEditContent({
          title: event.title, description: event.description, location: event.location,
          startTime: new Date(event.startTime), endTime: new Date(event.endTime),
      });
      setIsEditing(true);
  };

  const handleRsvp = async () => {
    try {
      await axios.post(`/api/events/${eventId}/rsvp`);
      setEvent((prev) => (prev ? { ...prev, isRegistered: true } : null));
      if (user) setAttendees((prev) => [...prev, { id: user.id, name: user.name }]);
    } catch (err: any) {
      setModalState({ isOpen: true, title: 'Error', message: err.response?.data?.message || 'Failed to RSVP.' });
    }
  };

  const handleCancelRsvp = async () => {
    if (window.confirm('Are you sure you want to cancel your RSVP?')) {
      try {
        await axios.delete(`/api/events/${eventId}/rsvp`);
        setEvent((prev) => (prev ? { ...prev, isRegistered: false } : null));
        if (user) setAttendees((prev) => prev.filter((att) => att.id !== user.id));
      } catch (err: any) {
        setModalState({ isOpen: true, title: 'Error', message: err.response?.data?.message || 'Failed to cancel RSVP.' });
      }
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        const payload = { ...editContent, startTime: editContent.startTime.toISOString(), endTime: editContent.endTime.toISOString() };
        const { data } = await axios.put(`/api/events/${eventId}`, payload);
        setEvent(prev => prev ? { ...prev, ...data } : data);
        setIsEditing(false);
        setModalState({ isOpen: true, title: 'Success', message: 'Event updated successfully.' });
    } catch (err: any) {
        setModalState({ isOpen: true, title: 'Error', message: err.response?.data?.message || 'Failed to update event.' });
    } finally {
        setIsSubmitting(false);
    }
};

const handleDelete = async () => {
    if (window.confirm('Are you sure you want to permanently delete this event? This action cannot be undone.')) {
        setIsSubmitting(true);
        try {
            await axios.delete(`/api/events/${eventId}`);
            setModalState({ isOpen: true, title: 'Success', message: 'Event deleted.' });
            setTimeout(() => navigate('/events'), 1500);
        } catch (err: any) {
            setModalState({ isOpen: true, title: 'Error', message: err.response?.data?.message || 'Failed to delete event.' });
            setIsSubmitting(false);
        }
    }
};

  if (loading) return <p className="text-center mt-8">Loading event...</p>;
  if (error) return <p className="text-center mt-8 text-red-500">{error}</p>;
  if (!event) return <p className="text-center mt-8">Event not found.</p>;

  return (
    <div>
        <Link to="/events" className="text-gray-700 hover:text-primary mb-6 block font-semibold">← Back to Events List</Link>

        {isEditing ? (
            <form onSubmit={handleUpdateEvent} className="bg-white p-8 border rounded-lg shadow-md mb-8 animate-fade-in">
                <h2 className="text-2xl font-bold mb-4">Editing Event</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                        <input id="title" type="text" value={editContent.title} onChange={(e) => setEditContent({...editContent, title: e.target.value})} className="w-full p-2 border border-gray-300 mt-1 rounded-md" required />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea id="description" value={editContent.description} onChange={(e) => setEditContent({...editContent, description: e.target.value})} className="w-full p-2 border border-gray-300 mt-1 rounded-md" rows={5} />
                    </div>
                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                        <input id="location" type="text" value={editContent.location} onChange={(e) => setEditContent({...editContent, location: e.target.value})} className="w-full p-2 border border-gray-300 mt-1 rounded-md" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Start Time</label>
                            {/* FIX: Handle null date from DatePicker and ensure valid date is passed to state setter. */}
                            <DatePicker id="startTime" selected={editContent.startTime} onChange={(date: Date | null) => { if (date) setEditContent({...editContent, startTime: date, endTime: date > editContent.endTime ? date : editContent.endTime}); }} showTimeSelect dateFormat="MMMM d, yyyy h:mm aa" className="w-full p-2 border border-gray-300 mt-1 rounded-md" required />
                        </div>
                        <div>
                            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">End Time</label>
                            {/* FIX: Handle null date from DatePicker and ensure valid date is passed to state setter. */}
                            <DatePicker id="endTime" selected={editContent.endTime} onChange={(date: Date | null) => { if (date) setEditContent({...editContent, endTime: date}); }} showTimeSelect dateFormat="MMMM d, yyyy h:mm aa" className="w-full p-2 border border-gray-300 mt-1 rounded-md" minDate={editContent.startTime} required />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-4">
                        <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-primary text-white font-semibold rounded-md disabled:bg-gray-400">
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </form>
        ) : (
            <div className="bg-white p-8 border rounded-lg shadow-md mb-8 relative">
                {event.canModify && (
                    <div className="absolute top-4 right-4 flex space-x-2">
                        <button onClick={handleEditClick} className="px-3 py-1 bg-gray-200 text-gray-800 text-sm font-semibold rounded">Edit</button>
                        <button onClick={handleDelete} disabled={isSubmitting} className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded disabled:bg-gray-400">
                            {isSubmitting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                )}
                <h1 className="text-4xl font-bold text-black pr-32">{event.title}</h1>
                <p className="text-lg text-gray-700 mt-2">{formatTimeInterval(event.startTime, event.endTime)}</p>
                <p className="text-md text-gray-500 mt-1">At {event.location}</p>
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-gray-800 whitespace-pre-wrap">{event.description}</p>
                </div>
                <div className="mt-8">
                    {event.isRegistered ? (
                        <div className="text-center p-4 bg-green-600 text-white rounded-md">
                            <p className="font-bold">✓ You are attending this event.</p>
                            <button onClick={handleCancelRsvp} className="mt-2 text-sm text-green-100 hover:underline">Cancel RSVP</button>
                        </div>
                    ) : (
                        <button onClick={handleRsvp} className="w-full p-3 bg-primary text-white font-bold text-lg rounded-md hover:opacity-90 transition-opacity">
                            RSVP Now
                        </button>
                    )}
                </div>
            </div>
        )}
        
        <div className="bg-white p-8 border rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-black">Attendees ({attendees.length})</h3>
            {attendees.length > 0 ? (
                <ul className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {attendees.map(attendee => (
                        <li key={attendee.id} className="p-2 bg-gray-100 text-center rounded">
                            <span className="font-medium text-gray-800">{attendee.name}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="col-span-full text-gray-500 mt-4">No one has registered yet. Be the first!</p>
            )}
        </div>

        <CommentThread targetId={event.id} targetType="event" />

        <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.title}>{modalState.message}</Modal>
    </div>
);
};

export default EventDetailView;