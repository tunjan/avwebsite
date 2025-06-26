import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { type AxiosError } from 'axios';
import CommentThread from '../components/CommentThread';
import Modal from '../components/Modal';

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  scope: 'CITY' | 'REGIONAL' | 'GLOBAL';
  author: { id: string; name: string; };
  authorRole: 'CITY_ORGANISER' | 'REGIONAL_ORGANISER' | 'COFOUNDER';
  chapter?: { id: string; name: string; regionId: string; };
  region?: { id: string; name: string; };
  canModify: boolean; // Flag from backend
}

const AnnouncementDetailView: React.FC = () => {
    const { announcementId } = useParams<{ announcementId: string }>();
    const navigate = useNavigate();
  
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState({ title: '', content: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '' });
    const closeModal = () => setModalState({ isOpen: false, title: '', message: '' });

  const fetchAnnouncement = useCallback(async () => {
    if (!announcementId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`/api/announcements/${announcementId}`);
      setAnnouncement(data);
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setError(error.response?.data?.message || "Could not load announcement. It may not exist or you may not have permission to view it.");
    } finally {
      setLoading(false);
    }
  }, [announcementId]);

  useEffect(() => {
    fetchAnnouncement();
  }, [fetchAnnouncement]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to permanently delete this announcement?')) {
      setIsSubmitting(true);
      try {
        await axios.delete(`/api/announcements/${announcementId}`);
        setModalState({ isOpen: true, title: 'Success', message: 'Announcement deleted.' });
        setTimeout(() => navigate('/announcements'), 1500);
      } catch {
        setModalState({ isOpen: true, title: 'Error', message: 'Failed to delete announcement.' });
        setIsSubmitting(false);
      }
    }
  };

  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: updatedAnnouncement } = await axios.put(
        `/api/announcements/${announcementId}`,
        editContent
      );
      setAnnouncement(prev => prev ? { ...prev, ...updatedAnnouncement } : updatedAnnouncement);
      setIsEditing(false);
      setModalState({ isOpen: true, title: 'Success', message: 'Announcement updated.' });
    } catch {
      setModalState({ isOpen: true, title: 'Error', message: 'Failed to update announcement.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = () => {
    if (!announcement) return;
    setEditContent({ title: announcement.title, content: announcement.content });
    setIsEditing(true);
  };

  if (loading) return <p className="text-center mt-8">Loading Announcement...</p>;
  if (error) return <p className="text-center mt-8 text-red-500">{error}</p>;
  if (!announcement) return <p className="text-center mt-8">Announcement not found.</p>;

  return (
    <div>
      <Link to="/announcements" className="text-gray-700 hover:text-primary mb-6 block font-semibold">← Back to Announcements</Link>
      
      {isEditing ? (
        <form onSubmit={handleUpdateAnnouncement} className="bg-white p-8 border rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold mb-4">Editing Announcement</h2>
            <div className="space-y-4">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                    <input id="title" type="text" value={editContent.title} onChange={(e) => setEditContent({...editContent, title: e.target.value})} className="w-full p-2 border border-gray-300 mt-1 rounded-md" required />
                </div>
                <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
                    <textarea id="content" value={editContent.content} onChange={(e) => setEditContent({...editContent, content: e.target.value})} className="w-full p-2 border border-gray-300 mt-1 rounded-md" rows={10} required />
                </div>
                <div className="flex space-x-2 justify-end">
                    <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300 transition-colors">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-primary text-white font-semibold rounded-md hover:opacity-90 disabled:bg-gray-400 transition-opacity">
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </form>
      ) : (
        <div className="bg-white p-8 border rounded-lg shadow-md mb-8 relative">
            {announcement.canModify && (
              <div className="absolute top-4 right-4 flex space-x-2">
                <button onClick={handleEditClick} className="px-3 py-1 bg-gray-200 text-gray-800 text-sm font-semibold rounded hover:bg-gray-300 transition-colors">Edit</button>
                <button onClick={handleDelete} disabled={isSubmitting} className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded hover:opacity-90 disabled:bg-gray-400 transition-opacity">
                  {isSubmitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
            <h1 className="text-4xl font-bold text-black pr-32">{announcement.title}</h1>
            <p className="text-sm text-gray-500 mt-2">
                Posted by {announcement.author.name} on {new Date(announcement.createdAt).toLocaleDateString()}
            </p>
            <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-gray-800 whitespace-pre-wrap">{announcement.content}</p>
            </div>
        </div>
      )}

      <CommentThread targetId={announcement.id} targetType="announcement" />

      <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.title}>
        {modalState.message}
      </Modal>
    </div>
  );
};

export default AnnouncementDetailView;