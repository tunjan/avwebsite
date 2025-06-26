import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axiosConfig";
import { type AxiosError } from "axios";
import { useAppSelector } from "../hooks";
import Modal from "../components/Modal";
import { Chapter, Region } from "../types";
import DatePicker from 'react-datepicker';

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  scope: "CITY" | "REGIONAL" | "GLOBAL";
  chapter: { id: string; name: string; } | null;
  region: { id:string; name: string } | null;
  attendeeCount: number;
  isRegistered: boolean;
  canManage?: boolean;
}

const formatTimeInterval = (start: string): string => {
  const startDate = new Date(start);
  const timeOptions: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  return `${startDate.toLocaleDateString('en-US', dateOptions)} at ${startDate.toLocaleTimeString('en-US', timeOptions)}`;
};

const getScopeLabel = (event: Event): string => {
  if (event.scope === "CITY") return `City: ${event.chapter?.name || "N/A"}`;
  if (event.scope === "REGIONAL") return `Region: ${event.region?.name || "N/A"}`;
  return "Global";
};

const EventsView = () => {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "CITY" | "REGIONAL" | "GLOBAL">("ALL");
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, title: "", message: "" });
  
  const user = useAppSelector((state) => state.auth.user);
  const canCreateAnyEvent = user && user.role !== "ACTIVIST";

  const initialNewEventState = {
    title: "", description: "", location: "",
    startTime: new Date(), endTime: new Date(new Date().setHours(new Date().getHours() + 1)),
    scope: "CITY" as "CITY" | "REGIONAL" | "GLOBAL", chapterId: "", regionId: ""
  };
  const [newEvent, setNewEvent] = useState(initialNewEventState);
  
  const [managedChapters, setManagedChapters] = useState<Chapter[]>([]);
  const [managedRegions, setManagedRegions] = useState<Region[]>([]);

  const fetchEvents = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/events");
      setAllEvents(data);
    } catch (err) {
      setError("Failed to fetch events.");
      console.error(err);
    }
  }, []);

  const fetchFormData = useCallback(async () => {
    if (!canCreateAnyEvent || !user) return;
    try {
        const { data: manageableChapters } = await axios.get('/api/chapters/my-managed');
        setManagedChapters(manageableChapters);

        if (manageableChapters.length === 1 && user.role === 'CITY_ORGANISER') {
            setNewEvent(prev => ({ ...prev, chapterId: manageableChapters[0].id }));
        }

        if (user.role === 'COFOUNDER' || user.role === 'REGIONAL_ORGANISER') {
            const { data: allRegions } = await axios.get('/api/regions');
            const userManagedRegions = user.role === 'REGIONAL_ORGANISER' 
                ? allRegions.filter((r: Region) => r.id === user.managedRegionId) 
                : allRegions;
            setManagedRegions(userManagedRegions);
            if (userManagedRegions.length === 1) {
                setNewEvent(prev => ({...prev, scope: 'REGIONAL', regionId: userManagedRegions[0].id}));
            }
        }
    } catch (err) {
      console.error("Failed to fetch form data for event creation", err);
    }
  }, [canCreateAnyEvent, user]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchEvents(), fetchFormData()]).finally(() => setLoading(false));
  }, [fetchEvents, fetchFormData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewEvent((prev) => ({ ...prev, [name]: value, ...(name === "scope" && { chapterId: "", regionId: "" }) }));
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: createdEvent } = await axios.post('/api/events', {
          ...newEvent,
          startTime: newEvent.startTime.toISOString(),
          endTime: newEvent.endTime.toISOString(),
      });
      setAllEvents(prev => [createdEvent, ...prev].sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
      setModalState({ isOpen: true, title: "Success", message: "Event created successfully!" });
      setShowForm(false);
      setNewEvent(initialNewEventState);
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setModalState({ isOpen: true, title: "Error", message: error.response?.data?.message || "Failed to create event." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const rsvpAction = async (eventId: string, rsvp: boolean) => {
    try {
        const url = `/api/events/${eventId}/rsvp`;
        if (rsvp) {
            await axios.post(url);
        } else {
            if (!window.confirm("Are you sure you want to cancel your attendance?")) return;
            await axios.delete(url);
        }
        setAllEvents(prev => prev.map(e => e.id === eventId ? { ...e, isRegistered: rsvp, attendeeCount: e.attendeeCount + (rsvp ? 1 : -1) } : e));
    } catch (error) {
        const err = error as AxiosError<{ message: string }>;
        setModalState({ isOpen: true, title: "Error", message: err.response?.data?.message || "Action failed." });
    }
  };

  const filteredEvents = useMemo(() => {
    if (activeFilter === "ALL") return allEvents;
    return allEvents.filter((event) => event.scope === activeFilter);
  }, [allEvents, activeFilter]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Events</h1>
        {canCreateAnyEvent && (
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-black text-white font-semibold rounded-md hover:bg-gray-800 transition-colors">
            {showForm ? "Cancel" : "＋ Create Event"}
          </button>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {(["ALL", "CITY", "REGIONAL", "GLOBAL"] as const).map((filter) => (
          <button key={filter} onClick={() => setActiveFilter(filter)} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeFilter === filter ? "bg-primary text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}>
            {filter.charAt(0) + filter.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {showForm && canCreateAnyEvent && (
        <form onSubmit={handleCreateEvent} className="p-6 mb-8 bg-white border rounded-lg shadow-md animate-fade-in">
          <h2 className="text-xl font-bold mb-4">New Event Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><input type="text" name="title" value={newEvent.title} onChange={handleInputChange} placeholder="Event Title" className="p-2 border border-gray-300 w-full rounded-md" required /></div>
            <select name="scope" value={newEvent.scope} onChange={handleInputChange} className="p-2 border border-gray-300 bg-white rounded-md">
                {user?.role === 'CITY_ORGANISER' && <option value="CITY">City Event</option>}
                {(user?.role === 'REGIONAL_ORGANISER' || user?.role === 'COFOUNDER') && <option value="CITY">City Event</option>}
                {(user?.role === 'REGIONAL_ORGANISER' || user?.role === 'COFOUNDER') && <option value="REGIONAL">Regional Event</option>}
                {user?.role === 'COFOUNDER' && <option value="GLOBAL">Global Event</option>}
            </select>
            {newEvent.scope === "CITY" ? (
              <select name="chapterId" value={newEvent.chapterId} onChange={handleInputChange} className="p-2 border border-gray-300 bg-white rounded-md" required>
                <option value="" disabled>Select a Chapter...</option>
                {managedChapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}
              </select>
            ) : newEvent.scope === "REGIONAL" ? (
              <select name="regionId" value={newEvent.regionId} onChange={handleInputChange} className="p-2 border border-gray-300 bg-white rounded-md" required>
                <option value="" disabled>Select a Region...</option>
                {managedRegions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
              </select>
            ) : <div className="p-2 bg-gray-100 rounded-md text-gray-500">Global scope</div>}
            <div className="md:col-span-2"><input type="text" name="location" value={newEvent.location} onChange={handleInputChange} placeholder="Location" className="p-2 border w-full border-gray-300 rounded-md" required /></div>
            <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Start Time</label>
                {/* FIX: Handle null date from DatePicker and ensure valid date is passed to state setter. */}
                <DatePicker id="startTime" selected={newEvent.startTime} onChange={(date: Date | null) => { if(date) setNewEvent(prev => ({...prev, startTime: date, endTime: date > prev.endTime ? date : prev.endTime}))}} showTimeSelect dateFormat="Pp" className="p-2 border w-full border-gray-300 rounded-md" required />
            </div>
            <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">End Time</label>
                {/* FIX: Handle null date from DatePicker and ensure valid date is passed to state setter. */}
                <DatePicker id="endTime" selected={newEvent.endTime} onChange={(date: Date | null) => { if (date) setNewEvent(prev => ({...prev, endTime: date}))}} showTimeSelect dateFormat="Pp" minDate={newEvent.startTime} className="p-2 border w-full border-gray-300 rounded-md" required />
            </div>
            <div className="md:col-span-2"><textarea name="description" value={newEvent.description} onChange={handleInputChange} placeholder="Event Description" className="w-full p-2 border border-gray-300 rounded-md" rows={3} /></div>
            <div className="md:col-span-2"><button type="submit" disabled={isSubmitting} className="w-full p-2 text-white bg-primary rounded-md hover:opacity-90 disabled:bg-gray-400"> {isSubmitting ? "Submitting..." : "Submit Event"}</button></div>
          </div>
        </form>
      )}

      {!loading && error && <p className="text-center mt-8 text-red-500">{error}</p>}
      {loading ? <p className="text-center mt-8">Loading events...</p> : (
        <div className="space-y-4">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <div key={event.id} className="bg-white border rounded-lg shadow-sm transition-shadow hover:shadow-md">
                <Link to={`/events/${event.id}`} className="block p-6 group">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-grow">
                      <p className="text-sm font-semibold text-gray-500">{getScopeLabel(event)}</p>
                      <h2 className="text-xl font-bold text-gray-900 mt-1 group-hover:text-primary transition-colors">{event.title}</h2>
                      <p className="text-md font-medium text-gray-600 mt-1">{formatTimeInterval(event.startTime)}</p>
                      <p className="text-sm text-gray-500 mt-1">Location: {event.location}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      {event.isRegistered ? (
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); rsvpAction(event.id, false); }} className="px-5 py-2 bg-black text-white font-semibold rounded-md hover:bg-gray-800 shadow-sm">✓ Attending</button>
                      ) : (
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); rsvpAction(event.id, true); }} className="px-5 py-2 bg-primary text-white font-semibold rounded-md hover:opacity-90 shadow-sm">Attend</button>
                      )}
                      <p className="text-sm text-gray-500 mt-2 font-medium text-center">{event.attendeeCount} going</p>
                    </div>
                  </div>
                </Link>
                {event.canManage && (
                  <div className="p-3 border-t bg-gray-50 rounded-b-lg">
                    <Link to={`/events/${event.id}/attendance`} className="text-sm font-semibold text-gray-700 hover:text-primary">Manage Attendance →</Link>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 mt-10">No events match the current filter.</p>
          )}
        </div>
      )}
      <Modal isOpen={modalState.isOpen} onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))} title={modalState.title}>{modalState.message}</Modal>
    </div>
  );
};

export default EventsView;