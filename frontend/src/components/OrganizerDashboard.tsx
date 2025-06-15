import React from 'react';
import { Link } from 'react-router-dom';

interface PendingRequest { id: string; user: { name: string }; chapter: { name: string }; }
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
      <div>
        <h2 className="text-xl font-bold mb-3">Quick Actions</h2>
        <div className="flex space-x-4">
          <Link to="/events" className="flex-1 p-4 bg-black text-white text-center font-bold rounded-md hover:bg-gray-800 transition-colors">Create Event</Link>
          <Link to="/announcements" className="flex-1 p-4 bg-black text-white text-center font-bold rounded-md hover:bg-gray-800 transition-colors">New Announcement</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm text-center">
            <h3 className="text-lg font-bold text-gray-600">Total Members in Your Chapters</h3>
            <p className="text-4xl font-bold mt-2">{summary.stats.totalMembers}</p>
        </div>
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm text-center">
            <h3 className="text-lg font-bold text-gray-600">New Members (Last 30 Days)</h3>
            <p className="text-4xl font-bold mt-2 text-primary">+{summary.stats.recentGrowth}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
            <h2 className="text-xl font-bold mb-3">Pending Join Requests</h2>
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2 shadow-sm">
                {summary.pendingJoinRequests.length > 0 ? summary.pendingJoinRequests.map(req => (
                    <div key={req.id} className="p-2 border-b last:border-b-0 border-gray-100">
                        <p className="font-semibold">{req.user.name}</p>
                        <p className="text-sm text-gray-500">Wants to join {req.chapter.name}</p>
                    </div>
                )) : <p className="text-gray-500 p-2">No pending requests.</p>}
            </div>
        </div>
        <div>
            <h2 className="text-xl font-bold mb-3">Upcoming Managed Events</h2>
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2 shadow-sm">
                {summary.upcomingManagedEvents.length > 0 ? summary.upcomingManagedEvents.map(event => (
                    <div key={event.id} className="p-2 border-b last:border-b-0 border-gray-100">
                        <p className="font-semibold">{event.title}</p>
                        <p className="text-sm text-gray-500">{new Date(event.startTime).toLocaleDateString(undefined, { month: 'long', day: 'numeric'})}</p>
                    </div>
                )) : <p className="text-gray-500 p-2">No upcoming events.</p>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;