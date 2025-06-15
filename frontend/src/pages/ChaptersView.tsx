import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { useAppSelector } from '../hooks';
import Modal from '../components/Modal';
import { Chapter, Region } from '../types';

const ChaptersView: React.FC = () => {
  const [myChapters, setMyChapters] = useState<Chapter[]>([]);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newChapter, setNewChapter] = useState({ name: '', description: '', regionId: '' });
  const [availableRegions, setAvailableRegions] = useState<Region[]>([]);
  const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '' });
  const closeModal = () => setModalState({ ...modalState, isOpen: false });

  const user = useAppSelector((state) => state.auth.user);
  const canCreate = user && (user.role === 'COFOUNDER' || user.role === 'REGIONAL_ORGANISER');

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const allChaptersPromise = axios.get<Chapter[]>('/api/chapters');
      const myChaptersPromise = axios.get<Chapter[]>('/api/chapters/my-chapters');
      const regionsPromise = canCreate ? axios.get<Region[]>('/api/regions') : Promise.resolve({ data: [] });

      const [allChaptersRes, myChaptersRes, regionsRes] = await Promise.all([
        allChaptersPromise, myChaptersPromise, regionsPromise
      ]);

      setAllChapters(allChaptersRes.data);
      setMyChapters(myChaptersRes.data);

      if (myChaptersRes.data.length === 0 && allChaptersRes.data.length > 0) {
        setActiveTab('all');
      }

      if (canCreate && user) {
        if (user.role === 'REGIONAL_ORGANISER' && user.managedRegionId) {
            const managed = regionsRes.data.filter((r) => r.id === user.managedRegionId);
            setAvailableRegions(managed);
            if (managed.length === 1) setNewChapter(prev => ({...prev, regionId: managed[0].id}));
        } else if (user.role === 'COFOUNDER') {
            setAvailableRegions(regionsRes.data);
        }
      }
    } catch (err) {
      console.error("Failed to load chapter data", err);
      setModalState({ isOpen: true, title: "Error", message: "Could not load chapter data." });
    } finally {
      setLoading(false);
    }
  }, [user, canCreate]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setNewChapter(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.post('/api/chapters', newChapter);
      setModalState({ isOpen: true, title: "Success", message: `Chapter "${newChapter.name}" created successfully.` });
      setShowForm(false);
      setNewChapter({ name: '', description: '', regionId: '' });
      await fetchAllData();
    } catch (err: any) {
      setModalState({ isOpen: true, title: "Error", message: err.response?.data?.message || "Failed to create chapter." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRequestToJoin = async (chapterId: string) => {
    try {
      await axios.post(`/api/chapters/${chapterId}/request-join`);
      setModalState({ isOpen: true, title: "Request Sent", message: "Your request to join the chapter has been sent for approval." });
    } catch (error: any) {
      setModalState({ isOpen: true, title: "Request Failed", message: error.response?.data?.message || "Could not send join request." });
    }
  };
  
  const handleBecomeMember = async (chapterId: string) => {
    try {
        await axios.post(`/api/chapters/${chapterId}/become-member`);
        setModalState({ isOpen: true, title: "Success", message: "You are now an official member of this chapter." });
        await fetchAllData();
    } catch (error: any) {
        setModalState({ isOpen: true, title: "Error", message: error.response?.data?.message || "Could not join chapter." });
    }
  };

  const ChapterList = ({ chapters, showJoinOptions }: { chapters: Chapter[], showJoinOptions?: boolean }) => {
    const myChapterIds = new Set(myChapters.map(c => c.id));
    return (
        <div className="bg-white border rounded-lg shadow-md">
            <ul className="divide-y divide-gray-200">
                {chapters.length > 0 ? chapters.map((chapter) => {
                    const isMember = myChapterIds.has(chapter.id);
                    const canBecomeOfficialMember = user?.role === 'COFOUNDER' || (user?.role === 'REGIONAL_ORGANISER' && chapter.regionId === user.managedRegionId);

                    return (
                        <li key={chapter.id} className="p-4 flex justify-between items-center group">
                            <Link to={`/chapters/${chapter.id}`} className="text-lg font-medium text-black group-hover:text-primary transition-colors">
                                {chapter.name}
                                {isMember && <span className="ml-2 text-xs text-green-600 font-bold">[MEMBER]</span>}
                            </Link>
                            {showJoinOptions && !isMember && (
                                <div className="flex items-center space-x-4">
                                    {canBecomeOfficialMember ? (
                                        <button onClick={() => handleBecomeMember(chapter.id)} className="px-3 py-2 bg-gray-800 text-white font-semibold text-sm rounded-md hover:bg-black transition-colors">Become Official Member</button>
                                    ) : (
                                        <button onClick={() => handleRequestToJoin(chapter.id)} className="px-3 py-2 bg-black text-white font-semibold text-sm rounded-md hover:bg-gray-800 transition-colors">Request to Join</button>
                                    )}
                                </div>
                            )}
                        </li>
                    );
                }) : <p className="p-6 text-gray-500">{activeTab === 'my' ? "You are not a member of any chapters yet. Find one in 'All Chapters'." : "No chapters have been created."}</p>}
            </ul>
        </div>
    );
};

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Chapters</h1>
        {canCreate && (
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-black text-white font-semibold rounded-md hover:bg-gray-800 transition-colors">
            {showForm ? 'Cancel' : '＋ New Chapter'}
          </button>
        )}
      </div>

      {showForm && canCreate && (
        <form onSubmit={handleCreateChapter} className="p-6 mb-8 bg-white border rounded-lg shadow-md animate-fade-in">
          <h2 className="text-xl font-bold mb-4">Create a New Chapter</h2>
          <div className="space-y-4">
            <input type="text" name="name" value={newChapter.name} onChange={handleInputChange} placeholder="Chapter Name (e.g., Madrid)" required className="w-full p-2 border border-gray-300 rounded-md"/>
            <textarea name="description" value={newChapter.description} onChange={handleInputChange} placeholder="Short description (optional)" className="w-full p-2 border border-gray-300 rounded-md" rows={2}/>
            <select name="regionId" value={newChapter.regionId} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 bg-white rounded-md">
              <option value="" disabled>Select a Region (Country)...</option>
              {availableRegions.map(region => <option key={region.id} value={region.id}>{region.name}</option>)}
            </select>
            <button type="submit" disabled={isSubmitting || !newChapter.regionId} className="w-full p-2 text-white bg-primary rounded-md hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-opacity">
              {isSubmitting ? 'Creating...' : 'Create Chapter'}
            </button>
          </div>
        </form>
      )}

      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button onClick={() => setActiveTab('my')} className={`${activeTab === 'my' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all`}>My Chapters</button>
          <button onClick={() => setActiveTab('all')} className={`${activeTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all`}>All Chapters</button>
        </nav>
      </div>

      {loading ? (<p className="text-center mt-8">Loading chapters...</p>) : (
        <>
          <div className={activeTab === 'my' ? 'block' : 'hidden'}><ChapterList chapters={myChapters} /></div>
          <div className={activeTab === 'all' ? 'block' : 'hidden'}><ChapterList chapters={allChapters} showJoinOptions={true} /></div>
        </>
      )}
      
      <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.title}>{modalState.message}</Modal>
    </div>
  );
};

export default ChaptersView;