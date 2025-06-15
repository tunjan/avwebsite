import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { useAppSelector } from '../hooks';
import Modal from '../components/Modal';
import { Chapter, Region } from '../types';

interface Training {
  id: string;
  title: string;
  description: string;
  startTime: string;
  scope: 'CITY' | 'REGIONAL' | 'GLOBAL';
  author: { name: string; };
  chapter?: { name: string; };
  region?: { name: string; };
  isRegistered: boolean;
}

const getScopeBadge = (training: Training) => {
    let text = 'Global';
    let color = 'bg-primary text-white';
    if (training.scope === 'REGIONAL') {
        text = `Region: ${training.region?.name || 'N/A'}`;
        color = 'bg-gray-800 text-white';
    } else if (training.scope === 'CITY') {
        text = `City: ${training.chapter?.name || 'N/A'}`;
        color = 'bg-gray-200 text-gray-800';
    }
    return <span className={`px-2 py-1 text-xs font-bold uppercase rounded-full ${color}`}>{text}</span>;
};

const TrainingsView = () => {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '' });
  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  const user = useAppSelector(state => state.auth.user);
  const canPost = user && user.role !== 'ACTIVIST';

  const [newTraining, setNewTraining] = useState({
    title: '', description: '', startTime: '', duration: 1,
    scope: 'CITY' as 'CITY' | 'REGIONAL' | 'GLOBAL', targetId: '',
  });

  const [managedChapters, setManagedChapters] = useState<Chapter[]>([]);
  const [managedRegions, setManagedRegions] = useState<Region[]>([]);

  const fetchTrainings = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/trainings');
      setTrainings(data);
    } catch (error) { console.error("Failed to fetch trainings", error); }
  }, []);

  const fetchFormData = useCallback(async () => {
    if (!canPost || !user) return;
    try {
      const { data: manageableChapters } = await axios.get('/api/chapters/my-managed');
      setManagedChapters(manageableChapters);

      if (user.role === 'COFOUNDER' || user.role === 'REGIONAL_ORGANISER') {
        const { data: allRegions } = await axios.get('/api/regions');
        setManagedRegions(user.role === 'REGIONAL_ORGANISER' ? allRegions.filter((r: Region) => r.id === user.managedRegionId) : allRegions);
      }
      if (manageableChapters.length === 1 && user.role === 'CITY_ORGANISER') {
        setNewTraining(prev => ({ ...prev, scope: 'CITY', targetId: manageableChapters[0].id }));
      }
    } catch (err) { console.error("Failed to fetch form data for training creation", err); }
  }, [canPost, user]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTrainings(), fetchFormData()]).finally(() => setLoading(false));
  }, [fetchTrainings, fetchFormData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTraining(prev => ({ ...prev, [name]: value, ...(name === 'scope' && { targetId: '' }) }));
  };

  const handleCreateTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((newTraining.scope !== 'GLOBAL') && !newTraining.targetId) {
        setModalState({ isOpen: true, title: 'Validation Error', message: 'Please select a target for this training.' });
        return;
    }
    setIsSubmitting(true);
    const payload: any = {
      ...newTraining, duration: parseFloat(newTraining.duration.toString()),
    };
    if (newTraining.scope === "CITY") payload.chapterId = newTraining.targetId;
    if (newTraining.scope === "REGIONAL") payload.regionId = newTraining.targetId;

    try {
      await axios.post('/api/trainings', payload);
      setModalState({ isOpen: true, title: "Success", message: "New training has been created." });
      setShowForm(false);
      setNewTraining({ title: '', description: '', startTime: '', duration: 1, scope: 'CITY', targetId: '' });
      await fetchTrainings();
    } catch (error: any) {
      setModalState({ isOpen: true, title: "Error", message: error.response?.data?.message || "Failed to create training." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRsvp = async (trainingId: string, rsvp: boolean) => {
    if (!rsvp && !window.confirm("Cancel your registration for this training?")) return;
    try {
        const url = `/api/trainings/${trainingId}/rsvp`;
        rsvp ? await axios.post(url) : await axios.delete(url);
        setTrainings(prev => prev.map(t => t.id === trainingId ? { ...t, isRegistered: rsvp } : t));
    } catch (error: any) {
        setModalState({ isOpen: true, title: "Error", message: error.response?.data?.message || "Action failed."});
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Trainings</h1>
        {canPost && (
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-black text-white font-semibold rounded-md hover:bg-gray-800 transition-colors">
            {showForm ? 'Cancel' : '＋ New Training'}
          </button>
        )}
      </div>

      {showForm && canPost && (
        <form onSubmit={handleCreateTraining} className="p-6 mb-8 bg-white border rounded-lg shadow-md animate-fade-in">
          <h2 className="text-xl font-bold mb-4">Create a New Training</h2>
          <div className="space-y-4">
            <input type="text" name="title" value={newTraining.title} onChange={handleInputChange} placeholder="Training Title" required className="w-full p-2 border border-gray-300 rounded-md" />
            <textarea name="description" value={newTraining.description} onChange={handleInputChange} placeholder="Training Description..." required className="w-full p-2 border border-gray-300 rounded-md" rows={4} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Start Time</label>
                <input type="datetime-local" name="startTime" value={newTraining.startTime} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 mt-1 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium">Duration (hours)</label>
                <input type="number" name="duration" value={newTraining.duration} onChange={handleInputChange} required min="0.5" step="0.5" className="w-full p-2 border border-gray-300 mt-1 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium">Scope</label>
                <select name="scope" value={newTraining.scope} onChange={handleInputChange} className="w-full p-2 border border-gray-300 bg-white mt-1 rounded-md">
                  { (user?.role === "CITY_ORGANISER" || user?.role === "REGIONAL_ORGANISER" || user?.role === "COFOUNDER") && <option value="CITY">City</option> }
                  { (user?.role === "REGIONAL_ORGANISER" || user?.role === "COFOUNDER") && <option value="REGIONAL">Regional</option> }
                  { user?.role === "COFOUNDER" && <option value="GLOBAL">Global</option> }
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Target</label>
                {newTraining.scope === "CITY" && <select name="targetId" value={newTraining.targetId} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 bg-white mt-1 rounded-md"><option value="" disabled>Select Chapter...</option>{managedChapters.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select>}
                {newTraining.scope === "REGIONAL" && <select name="targetId" value={newTraining.targetId} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 bg-white mt-1 rounded-md"><option value="" disabled>Select Region...</option>{managedRegions.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}</select>}
                {newTraining.scope === "GLOBAL" && <p className="p-2 text-gray-500 mt-1 h-[42px] flex items-center bg-gray-100 rounded-md">All members</p>}
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full p-2 text-white bg-primary rounded-md hover:opacity-90 disabled:bg-gray-400 transition-opacity">
              {isSubmitting ? 'Creating...' : 'Create Training'}
            </button>
          </div>
        </form>
      )}

      {loading && <p className="text-center">Loading trainings...</p>}
      {!loading && (
        <div className="space-y-6">
          {trainings.length > 0 ? (
            trainings.map(training => (
              <div key={training.id} className="bg-white border rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-grow">
                      <div className="mb-2">{getScopeBadge(training)}</div>
                      <h2 className="text-2xl font-bold mt-1">
                          <Link to={`/trainings/${training.id}`} className="hover:text-primary transition-colors">{training.title}</Link>
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">By {training.author.name} on {new Date(training.startTime).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                      {training.isRegistered ? (
                          <button onClick={() => handleRsvp(training.id, false)} className="px-5 py-2 bg-black text-white font-semibold rounded-md hover:bg-gray-800">✓ Registered</button>
                      ) : (
                          <button onClick={() => handleRsvp(training.id, true)} className="px-5 py-2 bg-primary text-white font-semibold rounded-md hover:opacity-90">RSVP</button>
                      )}
                  </div>
                </div>
                <p className="mt-4 text-gray-700">{training.description}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-10">No trainings scheduled.</p>
          )}
        </div>
      )}
      <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.title}>{modalState.message}</Modal>
    </div>
  );
};

export default TrainingsView;