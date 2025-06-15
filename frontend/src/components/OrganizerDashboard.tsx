import React from 'react';
import { Link } from 'react-router-dom';

// Define types for the summary data
interface PendingRequest { id: string; user: { name: string }; team: { name: string }; }
interface ManagedEvent { id: string; title: string; startTime: string; }
interface OrganizerStats { totalMembers: number; recentGrowth: number; }

interface OrganizerDashboardProps {
  summary: {
    pendingJoinRequests: PendingRequest[];
    upcomingManagedEvents: ManagedEvent[];
    stats: OrganizerStats;
  };
}

const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({ summary }) => {
  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold mb-2">Quick Actions</h2>
        <div className="flex space-x-4">
          <Link to="/events" className="flex-1 p-4 bg-black text-white text-center font-bold hover:bg-gray-800">Create Event</Link>
          <Link to="/announcements" className="flex-1 p-4 bg-black text-white text-center font-bold hover:bg-gray-800">New Announcement</Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white border-black border shadow-sm text-center">
            <h3 className="text-lg font-bold text-gray-600">Total Members in Your Teams</h3>
            <p className="text-4xl font-bold mt-2">{summary.stats.totalMembers}</p>
        </div>
        <div className="p-6 bg-white border-black border shadow-sm text-center">
            <h3 className="text-lg font-bold text-gray-600">New Members (Last 30 Days)</h3>
            <p className="text-4xl font-bold mt-2 text-primary">+{summary.stats.recentGrowth}</p>
        </div>
      </div>

      {/* Pending Requests & Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
            <h2 className="text-xl font-bold mb-2">Pending Join Requests</h2>
            <div className="bg-white border border-black p-4 space-y-2">
                {summary.pendingJoinRequests.length > 0 ? summary.pendingJoinRequests.map(req => (
                    <div key={req.id} className="p-2">
                        <p className="font-semibold">{req.user.name}</p>
                        <p className="text-sm text-gray-500">Wants to join {req.team.name}</p>
                    </div>
                )) : <p className="text-gray-500">No pending requests.</p>}
            </div>
        </div>
        <div>
            <h2 className="text-xl font-bold mb-2">Upcoming Managed Events</h2>
            <div className="bg-white border border-black p-4 space-y-2">
                {summary.upcomingManagedEvents.length > 0 ? summary.upcomingManagedEvents.map(event => (
                    <div key={event.id} className="p-2 ">
                        <p className="font-semibold">{event.title}</p>
                        <p className="text-sm text-gray-500">{new Date(event.startTime).toLocaleDateString()}</p>
                    </div>
                )) : <p className="text-gray-500">No upcoming events.</p>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;