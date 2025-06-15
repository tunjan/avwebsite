import React, { useEffect, useState, useCallback } from "react";
import axios from "../api/axiosConfig";
import { useAppSelector } from "../hooks";
import { Chapter, Region } from "../types";
import { Link } from "react-router-dom";
import Modal from "../components/Modal";

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  scope: "CITY" | "REGIONAL" | "GLOBAL";
  author: { name: string; id: string };
  chapter?: { name: string };
  region?: { name: string };
}

const AnnouncementsView = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, title: "", message: "" });
  const closeModal = () => setModalState((prev) => ({ ...prev, isOpen: false }));

  const user = useAppSelector((state) => state.auth.user);
  const canPost = user && user.role !== "ACTIVIST";

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "", content: "", scope: "CITY" as "CITY" | "REGIONAL" | "GLOBAL", targetId: "",
  });

  const [cityPostOptions, setCityPostOptions] = useState<Chapter[]>([]);
  const [regionPostOptions, setRegionPostOptions] = useState<Region[]>([]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/announcements");
      setAnnouncements(data);
    } catch (error) {
      console.error("Failed to fetch announcements", error);
    }
  }, []);

  const fetchFormData = useCallback(async () => {
    if (!canPost || !user) return;
    try {
        const { data: manageableChapters } = await axios.get('/api/chapters/my-managed');
        setCityPostOptions(manageableChapters);

        if (manageableChapters.length === 1 && user.role === 'CITY_ORGANISER') {
            setNewAnnouncement(prev => ({ ...prev, scope: 'CITY', targetId: manageableChapters[0].id }));
        }
        
        if (user.role === 'COFOUNDER' || user.role === 'REGIONAL_ORGANISER') {
            const { data: allRegions } = await axios.get('/api/regions');
            if (user.role === 'REGIONAL_ORGANISER') {
                setRegionPostOptions(allRegions.filter((r: Region) => r.id === user.managedRegionId));
            } else {
                setRegionPostOptions(allRegions);
            }
        }
    } catch (err) {
        console.error("Failed to fetch form data for announcements", err);
    }
  }, [canPost, user]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAnnouncements(), fetchFormData()]).finally(() => setLoading(false));
  }, [fetchAnnouncements, fetchFormData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewAnnouncement((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "scope" && { targetId: "" }),
    }));
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((newAnnouncement.scope === 'CITY' || newAnnouncement.scope === 'REGIONAL') && !newAnnouncement.targetId) {
        setModalState({ isOpen: true, title: 'Validation Error', message: 'Please select a target chapter or region for your announcement.' });
        return;
    }

    setIsSubmitting(true);
    const payload: any = {
      title: newAnnouncement.title,
      content: newAnnouncement.content,
      scope: newAnnouncement.scope,
    };
    if (newAnnouncement.scope === "CITY") payload.chapterId = newAnnouncement.targetId;
    if (newAnnouncement.scope === "REGIONAL") payload.regionId = newAnnouncement.targetId;

    try {
      await axios.post("/api/announcements", payload);
      setModalState({ isOpen: true, title: "Success", message: "Your announcement has been posted." });
      setShowForm(false);
      setNewAnnouncement({ title: "", content: "", scope: "CITY", targetId: "" });
      await fetchAnnouncements();
    } catch (error: any) {
      setModalState({ isOpen: true, title: "Error", message: error.response?.data?.message || "Failed to post announcement." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScopeBadge = (announcement: Announcement) => {
    let text = "Global";
    let color = "bg-primary text-white";
    if (announcement.scope === "REGIONAL") {
      text = `Region: ${announcement.region?.name || "N/A"}`;
      color = "bg-gray-800 text-white";
    } else if (announcement.scope === "CITY") {
      text = `City: ${announcement.chapter?.name || "N/A"}`;
      color = "bg-gray-200 text-gray-800";
    }
    return <span className={`px-2 py-1 text-xs font-bold uppercase rounded-full ${color}`}>{text}</span>;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Announcements</h1>
        {canPost && (
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-black text-white font-semibold rounded-md hover:bg-gray-800 transition-colors">
            {showForm ? "Cancel" : "＋ New Announcement"}
          </button>
        )}
      </div>

      {showForm && canPost && (
        <form onSubmit={handleCreateAnnouncement} className="p-6 mb-8 bg-white border rounded-lg shadow-md animate-fade-in">
          <h2 className="text-xl font-bold mb-4">Post a New Announcement</h2>
          <div className="space-y-4">
            <input type="text" name="title" value={newAnnouncement.title} onChange={handleInputChange} placeholder="Announcement Title" className="w-full p-2 border border-gray-300 rounded-md" required />
            <textarea name="content" value={newAnnouncement.content} onChange={handleInputChange} placeholder="Write your announcement here..." className="w-full p-2 border border-gray-300 rounded-md" rows={5} required />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Scope</label>
                <select name="scope" value={newAnnouncement.scope} onChange={handleInputChange} className="w-full p-2 border border-gray-300 bg-white mt-1 rounded-md">
                  {(user?.role === "CITY_ORGANISER" || user?.role === "REGIONAL_ORGANISER" || user?.role === "COFOUNDER") && <option value="CITY">City</option>}
                  {(user?.role === "REGIONAL_ORGANISER" || user?.role === "COFOUNDER") && <option value="REGIONAL">Regional</option>}
                  {user?.role === "COFOUNDER" && <option value="GLOBAL">Global</option>}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Target</label>
                {newAnnouncement.scope === "CITY" && (
                  <select name="targetId" value={newAnnouncement.targetId} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 bg-white mt-1 rounded-md">
                    <option value="" disabled>Select a Chapter...</option>
                    {cityPostOptions.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}
                  </select>
                )}
                {newAnnouncement.scope === "REGIONAL" && (
                  <select name="targetId" value={newAnnouncement.targetId} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 bg-white mt-1 rounded-md">
                    <option value="" disabled>Select a Region...</option>
                    {regionPostOptions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
                  </select>
                )}
                {newAnnouncement.scope === "GLOBAL" && <p className="p-2 text-gray-500 mt-1 h-[42px] flex items-center bg-gray-100 rounded-md">All members</p>}
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full p-2 text-white bg-primary rounded-md hover:opacity-90 disabled:bg-gray-400 transition-opacity">
              {isSubmitting ? "Posting..." : "Post Announcement"}
            </button>
          </div>
        </form>
      )}

      {loading && <p className="text-center">Loading announcements...</p>}

      {!loading && (
        <div className="space-y-6">
          {announcements.length > 0 ? (
            announcements.map((announcement) => (
              <div key={announcement.id} className="bg-white shadow-md border rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <h2 className="text-2xl font-bold">
                    <Link to={`/announcements/${announcement.id}`} className="hover:text-primary transition-colors">{announcement.title}</Link>
                  </h2>
                  {getScopeBadge(announcement)}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  By {announcement.author.name} on {new Date(announcement.createdAt).toLocaleDateString()}
                </p>
                <p className="mt-4 text-gray-700 whitespace-pre-wrap">{announcement.content}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-10">No announcements found.</p>
          )}
        </div>
      )}
      <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.title}>{modalState.message}</Modal>
    </div>
  );
};

export default AnnouncementsView;