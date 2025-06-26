import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { type AxiosError } from 'axios';
import Modal from '../components/Modal';

interface TrainingDetails {
  id: string;
  title: string;
  description: string;
  startTime: string;
  duration: number;
  author: { id: string; name: string; };
  canModify: boolean; // Flag from backend
}

const TrainingDetailView: React.FC = () => {
  const { trainingId } = useParams<{ trainingId: string }>();
  const navigate = useNavigate();

  const [training, setTraining] = useState<TrainingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editContent, setEditContent] = useState({ title: '', description: '', startTime: '', duration: 1 });
  const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '' });
  const closeModal = () => setModalState({ isOpen: false, title: '', message: '' });

  const fetchTraining = useCallback(async () => {
    if (!trainingId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`/api/trainings/${trainingId}`);
      setTraining(data);
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setError(error.response?.data?.message || "Could not load training.");
    } finally {
      setLoading(false);
    }
  }, [trainingId]);

  useEffect(() => {
    fetchTraining();
  }, [fetchTraining]);

  const handleEditClick = () => {
    if (!training) return;
    const localStartTime = new Date(new Date(training.startTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditContent({
      title: training.title, description: training.description,
      startTime: localStartTime, duration: training.duration,
    });
    setIsEditing(true);
  };

  const handleUpdateTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...editContent, duration: parseFloat(editContent.duration.toString()) };
      const { data: updatedTraining } = await axios.put(`/api/trainings/${trainingId}`, payload);
      setTraining(prev => prev ? { ...prev, ...updatedTraining } : updatedTraining);
      setIsEditing(false);
      setModalState({ isOpen: true, title: 'Success', message: 'Training updated successfully.' });
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setModalState({ isOpen: true, title: 'Error', message: error.response?.data?.message || 'Failed to update training.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to permanently delete this training?')) {
      setIsSubmitting(true);
      try {
        await axios.delete(`/api/trainings/${trainingId}`);
        setModalState({ isOpen: true, title: 'Success', message: 'Training deleted. Redirecting...' });
        setTimeout(() => navigate('/trainings'), 1500);
      } catch {
        setModalState({ isOpen: true, title: 'Error', message: 'Failed to delete training.' });
        setIsSubmitting(false);
      }
    }
  };

  if (loading) return <p className="text-center mt-8">Loading Training...</p>;
  if (error) return <p className="text-center mt-8 text-red-500">{error}</p>;
  if (!training) return <p className="text-center mt-8">Training not found.</p>;

  return (
    <div>
      <Link to="/trainings" className="text-gray-700 hover:text-primary mb-6 block font-semibold">← Back to Trainings</Link>
      
      {isEditing ? (
        <form onSubmit={handleUpdateTraining} className="bg-white p-8 border rounded-lg shadow-md mb-8 animate-fade-in">
          <h2 className="text-2xl font-bold mb-4">Editing Training</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
              <input id="title" type="text" value={editContent.title} onChange={(e) => setEditContent({...editContent, title: e.target.value})} className="w-full p-2 border border-gray-300 mt-1 rounded-md" required/>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea id="description" value={editContent.description} onChange={(e) => setEditContent({...editContent, description: e.target.value})} className="w-full p-2 border border-gray-300 mt-1 rounded-md" rows={10} required/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Start Time</label>
                    <input id="startTime" type="datetime-local" value={editContent.startTime} onChange={(e) => setEditContent({...editContent, startTime: e.target.value})} className="w-full p-2 border border-gray-300 mt-1 rounded-md" required/>
                </div>
                <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Duration (in hours)</label>
                    <input id="duration" type="number" value={editContent.duration} onChange={(e) => setEditContent({...editContent, duration: Number(e.target.value)})} className="w-full p-2 border border-gray-300 mt-1 rounded-md" required min="0.5" step="0.5" />
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
          {training.canModify && (
            <div className="absolute top-4 right-4 flex space-x-2">
              <button onClick={handleEditClick} className="px-3 py-1 bg-gray-200 text-gray-800 text-sm font-semibold rounded">Edit</button>
              <button onClick={handleDelete} disabled={isSubmitting} className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded disabled:bg-gray-400">
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
          <h1 className="text-4xl font-bold text-black pr-32">{training.title}</h1>
          <p className="text-lg text-gray-700 mt-2">Scheduled for: {new Date(training.startTime).toLocaleString()}</p>
          <p className="text-md text-gray-500 mt-1">Duration: {training.duration} hours</p>
          <p className="text-sm text-gray-500 mt-1">Posted by: {training.author.name}</p>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-gray-800 whitespace-pre-wrap">{training.description}</p>
          </div>
        </div>
      )}
      
      <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.title}>{modalState.message}</Modal>
    </div>
  );
};

export default TrainingDetailView;