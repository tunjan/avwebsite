import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axiosConfig";
import { useAppSelector } from "../hooks";
import Modal from "../components/Modal";
import { Team, Region } from "../types";
import DatePicker from 'react-datepicker';


// --- Type Definitions ---
interface Event {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  scope: "CITY" | "REGIONAL" | "GLOBAL";
  team: { id: string; name: string; regionId: string } | null;
  region: { id: string; name: string } | null;
  attendeeCount: number;
  isRegistered: boolean;
}

// --- Helper Functions ---
const formatTimeInterval = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  const startTimeString = startDate.toLocaleTimeString("en-US", timeOptions);
  const endTimeString = endDate.toLocaleTimeString("en-US", timeOptions);
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const dateString = startDate.toLocaleDateString("en-US", dateOptions);
  return `${dateString} • ${startTimeString} - ${endTimeString}`;
};

const getScopeLabel = (event: Event): string => {
  switch (event.scope) {
    case "CITY":
      return `City Event: ${event.team?.name || "N/A"}`;
    case "REGIONAL":
      return `Regional Event: ${event.region?.name || "N/A"}`;
    case "GLOBAL":
      return "Global Event";
    default:
      return "Event";
  }
};

const EventsView = () => {
  // --- State Hooks ---
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "CITY" | "REGIONAL" | "GLOBAL"
  >("ALL");

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    location: "",
    startTime: "",
    endTime: "",
    scope: "CITY" as "CITY" | "REGIONAL" | "GLOBAL",
    teamId: "",
    regionId: "",
  });

  const handleDateChange = (date: Date | null, field: 'startTime' | 'endTime') => {
    setNewEvent(prev => ({ ...prev, [field]: date }));
  };

  const [memberTeams, setMemberTeams] = useState<Team[]>([]);
  const [availableRegions, setAvailableRegions] = useState<Region[]>([]);
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    message: "",
  });
  const closeModal = () =>
    setModalState((prev) => ({ ...prev, isOpen: false }));

  const user = useAppSelector((state) => state.auth.user);
  const canCreateAnyEvent = user && user.role !== "ACTIVIST";

  // --- Data Fetching ---
  const fetchEvents = async () => {
    try {
      const response = await axios.get("/api/events");
      setAllEvents(response.data);
    } catch (err) {
      setError("Failed to fetch events.");
      console.error(err);
    }
  };

  const fetchFormData = async () => {
    if (!canCreateAnyEvent) return;
    try {
      const teamsRes = await axios.get("/api/teams/my-teams");
      setMemberTeams(teamsRes.data);
      if (teamsRes.data.length === 1) {
        setNewEvent((prev) => ({ ...prev, teamId: teamsRes.data[0].id }));
      }
    } catch (err) {
      console.error("Failed to fetch form data for event creation", err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchEvents(), fetchFormData()]).finally(() =>
      setLoading(false)
    );
  }, []);

  // --- Event Handlers ---
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setNewEvent((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "scope" && { teamId: "", regionId: "" }),
    }));
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      ...newEvent,
      startTime: newEvent.startTime ? new Date(newEvent.startTime).toISOString() : "",
      endTime: newEvent.endTime ? new Date(newEvent.endTime).toISOString() : "",
    };

    try {
      await axios.post('/api/events', payload);
      setModalState({
        isOpen: true,
        title: "Success",
        message: "Event created successfully!",
      });
      setShowForm(false);
      setNewEvent({
        title: "",
        description: "",
        location: "",
        startTime: "",
        endTime: "",
        scope: "CITY",
        teamId: memberTeams.length === 1 ? memberTeams[0].id : "",
        regionId: "",
      });
      await fetchEvents();
    } catch (err) {
      setModalState({
        isOpen: true,
        title: "Error",
        message: "Failed to create event.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRsvp = async (eventId: string) => {
    try {
      await axios.post(`/api/events/${eventId}/rsvp`);
      setAllEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, isRegistered: true, attendeeCount: e.attendeeCount + 1 }
            : e
        )
      );
    } catch (error: any) {
      setModalState({
        isOpen: true,
        title: "Already Registered",
        message:
          error.response?.data?.message ||
          "You are already registered for this event.",
      });
    }
  };

  const handleCancelRsvp = async (eventId: string) => {
    if (window.confirm("Are you sure you want to cancel your attendance?")) {
      try {
        await axios.delete(`/api/events/${eventId}/rsvp`);
        setAllEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? {
                ...e,
                isRegistered: false,
                attendeeCount: e.attendeeCount - 1,
              }
              : e
          )
        );
      } catch (error) {
        setModalState({
          isOpen: true,
          title: "Error",
          message: "Failed to cancel RSVP.",
        });
      }
    }
  };

  // --- New Permission Checking Function ---
  const userCanManageEvent = (event: Event): boolean => {
    if (!user) return false;

    switch (user.role) {
      case "COFOUNDER":
        // Co-founders have universal management rights over all events they see.
        return true;

      case "REGIONAL_ORGANISER":
        // A regional organiser must have a region assigned to them.
        if (!user.managedRegionId) {
          return false;
        }
        // They can manage events in THEIR region.
        if (
          event.scope === "REGIONAL" &&
          event.region?.id === user.managedRegionId
        ) {
          return true;
        }
        // They can manage city events that are part of THEIR region.
        if (
          event.scope === "CITY" &&
          event.team?.regionId === user.managedRegionId
        ) {
          return true;
        }
        // They CANNOT manage Global events. The check for event.scope === 'GLOBAL' is now removed.
        return false;

      case "CITY_ORGANISER":
        // A city organiser can ONLY manage events with a CITY scope.
        if (event.scope === "CITY" && event.team?.id) {
          // They must be a member of that specific city's team.
          return user.memberships.some((m) => m.teamId === event.team!.id);
        }
        // They cannot manage REGIONAL or GLOBAL events.
        return false;

      default: // 'ACTIVIST'
        return false;
    }
  };

  // --- Memoized Filtering ---
  const filteredEvents = useMemo(() => {
    if (activeFilter === "ALL") return allEvents;
    return allEvents.filter((event) => event.scope === activeFilter);
  }, [allEvents, activeFilter]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Events</h1>
        {canCreateAnyEvent && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-black text-white font-semibold hover:bg-gray-800"
          >
            {showForm ? "Cancel" : "＋ Create Event"}
          </button>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {(["ALL", "CITY", "REGIONAL", "GLOBAL"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-1.5 text-sm font-semibold transition-colors ${activeFilter === filter
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
          >
            {filter.charAt(0) + filter.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {showForm && canCreateAnyEvent && (
        <form
          onSubmit={handleCreateEvent}
          className="p-6 mb-8 bg-white shadow-md border animate-fade-in"
        >
          <h2 className="text-xl font-bold mb-4">New Event Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                name="title"
                value={newEvent.title}
                onChange={handleInputChange}
                placeholder="Event Title"
                className="p-2 border border-gray-300 w-full"
                required
              />
            </div>
            <select
              name="scope"
              value={newEvent.scope}
              onChange={handleInputChange}
              className="p-2 border border-gray-300 bg-white"
            >
              <option value="CITY">City Event</option>
              <option value="REGIONAL">Regional Event</option>
              <option value="GLOBAL">Global Event</option>
            </select>
            {newEvent.scope === "CITY" ? (
              <select
                name="teamId"
                value={newEvent.teamId}
                onChange={handleInputChange}
                className="p-2 border border-gray-300 bg-white"
                required
              >
                <option value="" disabled>
                  Select a Team...
                </option>
                {memberTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            ) : newEvent.scope === "REGIONAL" ? (
              <select
                name="regionId"
                value={newEvent.regionId}
                onChange={handleInputChange}
                className="p-2 border border-gray-300 bg-white"
                required
              >
                <option value="" disabled>
                  Select a Region...
                </option>
                {availableRegions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
                {availableRegions.length === 0 && (
                  <option disabled>No regions to manage</option>
                )}
              </select>
            ) : (
              <div />
            )}
            <div className="md:col-span-2">
              <textarea
                name="description"
                value={newEvent.description}
                onChange={handleInputChange}
                placeholder="Event Description"
                className="w-full p-2 border border-gray-300"
                rows={3}
              />
            </div>
            <input
              type="text"
              name="location"
              value={newEvent.location}
              onChange={handleInputChange}
              placeholder="Location"
              className="p-2 border border-gray-300"
              required
            />
             <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Start Time</label>
              <DatePicker
                id="startTime"
                selected={newEvent.startTime ? new Date(newEvent.startTime) : null}
                onChange={(date) => handleDateChange(date, 'startTime')}
                showTimeSelect
                dateFormat="MMMM d, yyyy h:mm aa"
                className="w-full p-2 border border-gray-300"
                placeholderText="Select start date and time"
                required
              />
            </div>

            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">End Time</label>
              <DatePicker
                id="endTime"
                selected={newEvent.endTime ? new Date(newEvent.endTime) : null}
                onChange={(date) => handleDateChange(date, 'endTime')}
                showTimeSelect
                dateFormat="MMMM d, yyyy h:mm aa"
                className="w-full p-2 border border-gray-300"
                placeholderText="Select end date and time"
                minDate={newEvent.startTime ? new Date(newEvent.startTime) : undefined} // Prevent selecting an end time before the start time
                required
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full p-2 text-white bg-primary hover:opacity-80 disabled:bg-gray-400"
              >
                {isSubmitting ? "Submitting..." : "Submit Event"}
              </button>
            </div>
          </div>
        </form>
      )}

      {loading && <p className="text-center mt-8">Loading events...</p>}
      {error && <p className="text-center mt-8 text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="space-y-4">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              // --- THIS IS THE CRITICAL CHANGE ---
              // Wrap the entire event card div in a Link component.
              // We also need to stop the propagation of clicks on buttons inside it.
              <div
                key={event.id}
                className="p-4 bg-white border border-black shadow-sm dark:border-gray-700"
              >
                <Link to={`/events/${event.id}`} className="block p-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-grow">
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-primary transition-colors">
                        {getScopeLabel(event)}
                      </p>
                      <h2 className="text-xl font-bold text-gray-900 mt-1 group-hover:text-primary transition-colors">
                        {event.title}
                      </h2>
                      <p className="text-md font-medium text-gray-600 mt-1">
                        {formatTimeInterval(event.startTime, event.endTime)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Location: {event.location}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      {event.isRegistered ? (
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCancelRsvp(event.id); }} className="px-5 py-2 bg-black text-white font-semibold hover:bg-gray-800 shadow-sm">
                          ✓ Attending
                        </button>
                      ) : (
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRsvp(event.id); }} className="px-5 py-2 bg-primary text-white font-semibold hover:opacity-80 shadow-sm">
                          Attend
                        </button>
                      )}
                      <p className="text-sm text-gray-500 mt-2 font-medium text-center">{event.attendeeCount} going</p>
                    </div>
                  </div>
                </Link>
                {userCanManageEvent(event) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Link
                      to={`/events/${event.id}/attendance`}
                      className="text-sm font-semibold text-gray-700 hover:text-primary"
                    >
                      Manage Attendance →
                    </Link>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 mt-10">
              No events match the current filter.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default EventsView;
