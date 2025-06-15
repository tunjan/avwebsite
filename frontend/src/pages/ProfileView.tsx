import React, { useEffect, useState } from 'react';
import axios from '../api/axiosConfig';
import { useAppSelector } from '../hooks';
import { Link } from 'react-router-dom';

interface AttendedEvent {
    id: string;
    title: string;
    startTime: string;
    chapter: { name: string } | null;
}

interface ProfileData {
    attendedEventsCount: number;
    totalHours: number;
    attendanceHistory: AttendedEvent[];
}

const ProfileView = () => {
    const user = useAppSelector((state) => state.auth.user);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const { data } = await axios.get('/api/profile/me');
                setProfileData(data);
            } catch (error) {
                console.error("Failed to fetch profile data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, []);

    if (loading) return <p className="text-center mt-8">Loading profile...</p>;
    if (!profileData) return <p className="text-center mt-8 text-red-500">Could not load your profile data.</p>;

    return (
        <div>
            <div className="p-8 bg-black text-white rounded-lg">
                <h1 className="text-4xl font-bold">{user?.name}</h1>
                <p className="text-lg text-gray-300">{user?.email}</p>
                <p className="mt-2 text-sm uppercase font-bold tracking-wider text-gray-400">{user?.role.replace('_', ' ')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="p-6 bg-white border rounded-lg shadow-md text-center">
                    <h3 className="text-lg font-bold text-gray-600">Total Events Attended</h3>
                    <p className="text-4xl font-bold mt-2 text-primary">{profileData.attendedEventsCount}</p>
                </div>
                <div className="p-6 bg-white border rounded-lg shadow-md text-center">
                    <h3 className="text-lg font-bold text-gray-600">Total Hours Contributed</h3>
                    <p className="text-4xl font-bold mt-2 text-primary">{profileData.totalHours}</p>
                </div>
            </div>

            <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Attendance History</h2>
                <div className="bg-white border rounded-lg shadow-md overflow-hidden">
                    <ul className="divide-y divide-gray-200">
                        {profileData.attendanceHistory.length > 0 ? (
                            profileData.attendanceHistory.map(event => (
                                <li key={event.id}>
                                    <Link to={`/events/${event.id}`} className="block hover:bg-gray-50 p-4 transition-colors">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-black">{event.title}</p>
                                                <p className="text-sm text-gray-600">
                                                    {new Date(event.startTime).toLocaleDateString()} · {event.chapter?.name || 'Global/Regional Event'}
                                                </p>
                                            </div>
                                            <span className="text-gray-400 text-xl">→</span>
                                        </div>
                                    </Link>
                                </li>
                            ))
                        ) : (
                            <p className="p-6 text-gray-500">You have no attended events yet. Go join one!</p>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ProfileView;