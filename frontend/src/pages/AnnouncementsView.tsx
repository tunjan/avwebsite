import React, { useEffect, useState, useMemo } from "react";
import axios from "../api/axiosConfig";
import { useAppSelector } from "../hooks";
import { Team, Region } from "../types";
import { Link } from "react-router-dom";
import Modal from '../components/Modal';


interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  scope: "CITY" | "REGIONAL" | "GLOBAL";
  author: { name: string };
  team?: { name: string };
  region?: { name: string };
}

const AnnouncementsView = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', type: 'info' as 'success' | 'error' | 'info' });
  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    scope: "CITY" as "CITY" | "REGIONAL" | "GLOBAL",
    targetId: "", // Will hold either a teamId or a regionId
  });

  const user = useAppSelector((state) => state.auth.user);
  const canPost = user && user.role !== "ACTIVIST";

  // Data for dynamic form dropdowns
  const [cityPostOptions, setCityPostOptions] = useState<Team[]>([]);
  const [regionPostOptions, setRegionPostOptions] = useState<Region[]>([]);

  const fetchAnnouncements = async () => {
    try {
      const { data } = await axios.get("/api/announcements");
      setAnnouncements(data);
    } catch (error) {
      console.error("Failed to fetch announcements", error);
    }
  };

  const fetchFormData = async () => {
    if (!canPost || !user) return;

    // This logic populates the dropdowns for the "New Announcement" form
    if (user.role === "COFOUNDER") {
      // A co-founder can post to any team or region. We fetch all of them.
      // NOTE: Requires a new endpoint for all regions.
      try {
        const allTeamsRes = await axios.get("/api/teams");
        setCityPostOptions(allTeamsRes.data);
      } catch (err) {
        console.error(err);
      }
    } else if (user.role === "REGIONAL_ORGANISER") {
      if (user.managedRegionId) {
        // For simplicity, we assume one managed region.
        // A better implementation would fetch the region's name.
        setRegionPostOptions([
          {
            id: user.managedRegionId,
            name: `Your Region (${user.managedRegionId})`,
          },
        ]);
        try {
          const teamsRes = await axios.get(
            `/api/teams/in-region/${user.managedRegionId}`
          );
          setCityPostOptions(teamsRes.data);
        } catch (err) {
          console.error(err);
        }
      }
    } else if (user.role === "CITY_ORGANISER") {
      try {
        const teamsRes = await axios.get("/api/teams/my-teams");
        setCityPostOptions(teamsRes.data);
        if (teamsRes.data.length === 1) {
          setNewAnnouncement((prev) => ({
            ...prev,
            scope: "CITY",
            targetId: teamsRes.data[0].id,
          }));
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAnnouncements(), fetchFormData()]).finally(() =>
      setLoading(false)
    );
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    // Reset targetId when scope changes
    if (name === "scope") {
      setNewAnnouncement((prev) => ({
        ...prev,
        scope: value as any,
        targetId: "",
      }));
    } else {
      setNewAnnouncement((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload: any = {
      title: newAnnouncement.title,
      content: newAnnouncement.content,
      scope: newAnnouncement.scope,
    };

    if (newAnnouncement.scope === "CITY") {
      payload.teamId = newAnnouncement.targetId;
    } else if (newAnnouncement.scope === "REGIONAL") {
      payload.regionId = newAnnouncement.targetId;
    }

    try {
        await axios.post('/api/announcements', payload);
        setModalState({ isOpen: true, title: "Success", message: "Your announcement has been posted.", type: 'success' });
        setShowForm(false);
      setNewAnnouncement({
        title: "",
        content: "",
        scope: "CITY",
        targetId: "",
      });
      await fetchAnnouncements();
    } catch (error) {
        setModalState({ isOpen: true, title: "Error", message: "Failed to post announcement.", type: 'error' });
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
      text = `City: ${announcement.team?.name || "N/A"}`;
      color = "bg-gray-200 text-gray-800";
    }
    return (
      <span className={`px-2 py-1 text-xs font-bold uppercase ${color}`}>
        {text}
      </span>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Announcements</h1>
        {canPost && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-black text-white font-semibold"
          >
            {showForm ? "Cancel" : "＋ New Announcement"}
          </button>
        )}
      </div>

      {showForm && canPost && (
        <form
          onSubmit={handleCreateAnnouncement}
          className="p-6 mb-8 bg-white shadow-md border animate-fade-in"
        >
          <h2 className="text-xl font-bold mb-4">Post a New Announcement</h2>
          <div className="space-y-4">
            <input
              type="text"
              name="title"
              value={newAnnouncement.title}
              onChange={handleInputChange}
              placeholder="Announcement Title"
              className="w-full p-2 border border-gray-300"
              required
            />
            <textarea
              name="content"
              value={newAnnouncement.content}
              onChange={handleInputChange}
              placeholder="Write your announcement here..."
              className="w-full p-2 border border-gray-300"
              rows={5}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Scope
                </label>
                <select
                  name="scope"
                  value={newAnnouncement.scope}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 bg-white mt-1"
                >
                  {(user?.role === "CITY_ORGANISER" ||
                    user?.role === "REGIONAL_ORGANISER" ||
                    user?.role === "COFOUNDER") && (
                    <option value="CITY">City</option>
                  )}
                  {(user?.role === "REGIONAL_ORGANISER" ||
                    user?.role === "COFOUNDER") && (
                    <option value="REGIONAL">Regional</option>
                  )}
                  {user?.role === "COFOUNDER" && (
                    <option value="GLOBAL">Global</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Target
                </label>
                {newAnnouncement.scope === "CITY" && (
                  <select
                    name="targetId"
                    value={newAnnouncement.targetId}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 border border-gray-300 bg-white mt-1"
                  >
                    <option value="" disabled>
                      Select a City...
                    </option>
                    {cityPostOptions.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                )}
                {newAnnouncement.scope === "REGIONAL" && (
                  <select
                    name="targetId"
                    value={newAnnouncement.targetId}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 border border-gray-300 bg-white mt-1"
                  >
                    <option value="" disabled>
                      Select a Region...
                    </option>
                    {regionPostOptions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                )}
                {newAnnouncement.scope === "GLOBAL" && (
                  <p className="p-2 text-gray-500 mt-1 h-[42px] flex items-center">
                    All members
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full p-2 text-white bg-primary hover:opacity-80 disabled:bg-gray-400"
            >
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
              <div key={announcement.id} className="bg-white shadow p-6">
                <div className="flex justify-between items-start">
                  <h2 className="text-2xl font-bold">
                    <Link
                      to={`/announcements/${announcement.id}`}
                      className="hover:text-primary"
                    >
                      {announcement.title}
                    </Link>
                  </h2>
                  {getScopeBadge(announcement)}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  By {announcement.author.name} on{" "}
                  {new Date(announcement.createdAt).toLocaleDateString()}
                </p>
                <p className="mt-4 text-gray-700 whitespace-pre-wrap">
                  {announcement.content}
                </p>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">No announcements found.</p>
          )}
        </div>
      )}
                  <Modal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                title={modalState.title}
            >
                {modalState.message}
            </Modal>
    </div>
  );
};

export default AnnouncementsView;
