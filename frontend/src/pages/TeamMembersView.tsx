import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { useAppSelector } from '../hooks';
import Modal from '../components/Modal'; // <-- IMPORT MODAL


// Type definition for a team member or a user in search results
interface Member {
  id: string;
  name: string;
  email: string;
}

// Type definition for a pending join request
interface JoinRequest {
    id: string;
    user: {
        id: string;
        name: string;
        email: string;
    };
}

const TeamMembersView = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const user = useAppSelector(state => state.auth.user);

  const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', type: 'info' as 'success' | 'error' | 'info' });
  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  // State for data fetched from the API
  const [members, setMembers] = useState<Member[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for the management UI
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);

  // Fetches the primary data for the view: member list and permissions
  const fetchViewData = useCallback(async () => {
    if (!teamId) return;
    try {
      const { data } = await axios.get(`/api/teams/${teamId}/members`);
      setMembers(data.members);
      setCanManage(data.canManage);
    } catch (err: any) {
      setError(err.response?.data?.message || "An error occurred while loading team data.");
    }
  }, [teamId]);

  // Fetches the list of pending join requests, only if the user can manage
  const fetchJoinRequests = useCallback(async () => {
    if (!teamId) return;
    try {
      const { data } = await axios.get(`/api/teams/${teamId}/join-requests`);
      setJoinRequests(data);
    } catch (err) {
      console.error("Failed to fetch join requests", err);
    }
  }, [teamId]);

  // Initial data load when the component mounts
  useEffect(() => {
    setLoading(true);
    // Fetch primary data first
    fetchViewData().then(() => {
      // Conditionally fetch secondary data
      if (canManage) {
        fetchJoinRequests();
      }
      setLoading(false);
    });
  }, [fetchViewData, canManage, fetchJoinRequests]); // Rerun if canManage changes

  // Handles the user search functionality with debouncing
  useEffect(() => {
    const handleSearch = async () => {
      if (!canManage || searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const { data } = await axios.get(`/api/users/search?q=${searchTerm}`);
        // Filter out users who are already members from the search results
        setSearchResults(data.filter((user: Member) => !members.some(m => m.id === user.id)));
      } catch (error) {
        console.error("Search failed", error);
      }
    };

    const delayDebounce = setTimeout(() => handleSearch(), 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, members, canManage]);

  const handleAddMember = async (userId: string) => {
    try {
      await axios.post(`/api/teams/${teamId}/members/${userId}`);
      setModalState({ isOpen: true, title: "Success", message: "Member has been added to the team.", type: 'success' });
      setSearchTerm('');
      setSearchResults([]);
      await fetchViewData();
    } catch (error) {
      setModalState({ isOpen: true, title: "Error", message: "Failed to add member. They might already be on the team.", type: 'error' });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (window.confirm("Are you sure you want to remove this member from the team?")) {
      if (user?.id === userId) {
        alert("You cannot remove yourself from a team.");
        return;
      }
      try {
        await axios.delete(`/api/teams/${teamId}/members/${userId}`);
        setModalState({ isOpen: true, title: "Success", message: "Member has been removed.", type: 'success' });
        await fetchViewData();
      } catch (error) {
        setModalState({ isOpen: true, title: "Error", message: "Failed to remove member.", type: 'error' });
      }
    }
  };

  const handleRequestAction = async (requestId: string, approve: boolean) => {
    try {
        await axios.post(`/api/teams/${teamId}/join-requests/${requestId}`, { approve });
        // Refresh both lists after the action
        await fetchJoinRequests();
        if (approve) {
            await fetchViewData(); // Refetch members if a user was approved
        }
    } catch (err) {
        alert("Failed to process the request.");
    }
  };
  
  if (loading) return <p className="text-center mt-8">Loading...</p>;
  
  if (error) return (
      <div className="text-center mt-8 p-4">
          <p className="text-red-500 font-semibold text-lg">{error}</p>
          <Link to="/teams" className="text-blue-500 hover:underline mt-4 inline-block">← Back to Teams</Link>
      </div>
  );

  return (
    <div>
      <Link to="/teams" className="text-blue-500 hover:underline mb-6 block">← Back to Teams</Link>
      
      <h1 className="text-3xl font-bold mb-2">
        {canManage ? 'Manage Team' : 'Team Members'}
      </h1>

      {canManage && (
        <>
          <div className="my-6 p-4 border rounded-lg bg-yellow-50 shadow-sm">
            <h2 className="text-xl font-semibold mb-2">Pending Join Requests ({joinRequests.length})</h2>
            {joinRequests.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {joinRequests.map(req => (
                  <li key={req.id} className="p-2 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{req.user.name}</p>
                      <p className="text-sm text-gray-500">{req.user.email}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => handleRequestAction(req.id, true)} className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600">Approve</button>
                      <button onClick={() => handleRequestAction(req.id, false)} className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">Deny</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">No pending requests.</p>
            )}
          </div>
        
          <div className="my-6 p-4 border rounded-lg bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-2">Add New Member</h2>
            <div className="relative">
              <input 
                type="search" 
                placeholder="Search by name or email to add..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full p-2 border rounded-md"
              />
              {searchResults.length > 0 && (
                <ul className="absolute z-10 w-full border rounded-md mt-1 bg-white shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map(userResult => (
                    <li key={userResult.id} className="p-2 flex justify-between items-center hover:bg-gray-100">
                      <span>{userResult.name} ({userResult.email})</span>
                      <button onClick={() => handleAddMember(userResult.id)} className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600">Add</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
      
      <div>
        <h2 className="text-xl font-semibold mb-2">Current Members ({members.length})</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {members.length > 0 ? members.map(member => (
              <li key={member.id} className="p-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
                {canManage && (
                  <button onClick={() => handleRemoveMember(member.id)} className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">Remove</button>
                )}
              </li>
            )) : <p className="p-4 text-gray-500">This team has no members.</p>}
          </ul>
        </div>
      </div>
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

export default TeamMembersView;