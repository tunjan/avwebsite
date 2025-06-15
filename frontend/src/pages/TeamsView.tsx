import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axiosConfig";
import { useAppSelector } from "../hooks";
import Modal from "../components/Modal"; // <-- IMPORT MODAL

interface Team {
  id: string;
  name: string;
}

const TeamsView = () => {
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  // New state to track which teams the user has a pending request for
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"my" | "all">("my");

  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info" as "success" | "error" | "info",
  });
  const closeModal = () =>
    setModalState((prev) => ({ ...prev, isOpen: false }));

  const user = useAppSelector((state) => state.auth.user);
  const canManageAnyTeam = user && user.role !== "ACTIVIST";

  const fetchMyTeams = async () => {
    try {
      const { data } = await axios.get("/api/teams/my-teams");
      setMyTeams(data);
    } catch (error) {
      console.error("Failed to fetch my teams", error);
    }
  };

  const fetchAllTeams = async () => {
    try {
      const { data } = await axios.get("/api/teams");
      setAllTeams(data);
    } catch (error) {
      console.error("Failed to fetch all teams", error);
    }
  };

  const handleJoinTeam = async (teamId: string) => {
    // This now calls request-join, so we update the messages
    try {
      await axios.post(`/api/teams/${teamId}/request-join`);
      setModalState({
        isOpen: true,
        title: "Request Sent",
        message:
          "Your request to join the team has been sent to an organizer for approval.",
        type: "success",
      });
      // Optionally disable the button after request
    } catch (error: any) {
      setModalState({
        isOpen: true,
        title: "Request Failed",
        message:
          error.response?.data?.message ||
          "Could not send join request. You may have a pending request already.",
        type: "error",
      });
    }
  };

  const fetchPendingRequests = async () => {
    // This requires a new backend endpoint to get the user's own pending requests
    // For now, we'll manage this state locally after a request is sent.
    // A full implementation would fetch this on load.
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMyTeams(), fetchAllTeams()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleRequestJoin = async (teamId: string) => {
    try {
      await axios.post(`/api/teams/${teamId}/request-join`);
      alert("Your request to join the team has been sent for approval.");
      // Add the teamId to our local pending list to update the UI instantly
      setPendingRequests((prev) => [...prev, teamId]);
    } catch (error: any) {
      if (error.response?.status === 409) {
        alert(error.response.data.message);
      } else {
        alert("Failed to send join request.");
      }
      console.error(error);
    }
  };

  const TeamList = ({
    teams,
    showJoinButton,
  }: {
    teams: Team[];
    showJoinButton?: boolean;
  }) => {
    const isMember = (teamId: string) => myTeams.some((t) => t.id === teamId);
    const hasPendingRequest = (teamId: string) =>
      pendingRequests.includes(teamId);

    return (
      <div className="bg-white rounded-lg shadow">
        <ul className="divide-y divide-gray-200">
          {teams.length > 0 ? (
            teams.map((team) => (
              <li
                key={team.id}
                className="p-4 flex justify-between items-center"
              >
                <Link
                  to={`/teams/${team.id}/manage`}
                  className="text-lg font-medium text-blue-600 hover:underline"
                >
                  {team.name}
                </Link>
                <div className="flex items-center space-x-4">
                  {/* Show "Manage" button on both tabs, but only if user is an organiser AND a member */}
                  {canManageAnyTeam && isMember(team.id) && (
                    <Link
                      to={`/teams/${team.id}/manage`}
                      className="px-3 py-1 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300 text-sm"
                    >
                      Manage
                    </Link>
                  )}
                  {showJoinButton && !isMember(team.id) && (
                    <>
                      {hasPendingRequest(team.id) ? (
                        <span className="px-4 py-2 text-sm font-semibold text-gray-500">
                          Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => handleJoinTeam(team.id)}
                          className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 text-sm"
                        >
                          Request to Join
                        </button>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))
          ) : (
            <p className="p-4 text-gray-500">
              No teams to display in this list.
            </p>
          )}
        </ul>
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Teams</h1>

      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("my")}
            className={`${
              activeTab === "my"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            My Teams
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`${
              activeTab === "all"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            All Teams
          </button>
        </nav>
      </div>

      {loading ? (
        <p className="text-center mt-8">Loading teams...</p>
      ) : (
        <>
          <div className={activeTab === "my" ? "block" : "hidden"}>
            <h2 className="text-xl font-semibold mb-3">
              Teams you are a member of
            </h2>
            <TeamList teams={myTeams} />
          </div>
          <div className={activeTab === "all" ? "block" : "hidden"}>
            <h2 className="text-xl font-semibold mb-3">
              Discover and join other teams
            </h2>
            <TeamList teams={allTeams} showJoinButton={true} />
          </div>
        </>
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

export default TeamsView;
