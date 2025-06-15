import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { useAppSelector } from '../hooks';
import PromotionModal from '../components/PromotionModal';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface JoinRequest {
    id: string;
    user: { id: string; name: string; email: string; };
}

const ChapterMembersView: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const user = useAppSelector(state => state.auth.user);

  const [members, setMembers] = useState<Member[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const fetchViewData = useCallback(async () => {
    if (!chapterId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`/api/chapters/${chapterId}/members`);
      setMembers(data.members);
      setCanManage(data.canManage);

      if (data.canManage) {
        const requestsRes = await axios.get(`/api/chapters/${chapterId}/join-requests`);
        setJoinRequests(requestsRes.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "An error occurred while loading data.");
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    fetchViewData();
  }, [fetchViewData]);

  useEffect(() => {
    const handleSearch = async () => {
      if (!canManage || searchTerm.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const { data } = await axios.get(`/api/users/search?q=${searchTerm}`);
        setSearchResults(data.filter((userResult: Member) => !members.some(m => m.id === userResult.id)));
      } catch (error) { console.error("Search failed", error); }
    };
    const delayDebounce = setTimeout(() => handleSearch(), 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, members, canManage]);

  const handleAddMember = async (userId: string) => {
    try {
      await axios.post(`/api/chapters/${chapterId}/members/${userId}`);
      setSearchTerm('');
      setSearchResults([]);
      await fetchViewData();
    } catch (error) { alert("Failed to add member."); }
  };

  const handleRemoveMember = async (userId: string) => {
    if (window.confirm("Are you sure you want to remove this member from the chapter?")) {
      if (user?.id === userId) {
        alert("You cannot remove yourself from a chapter.");
        return;
      }
      try {
        await axios.delete(`/api/chapters/${chapterId}/members/${userId}`);
        await fetchViewData();
      } catch (error) { alert("Failed to remove member."); }
    }
  };

  const handleRequestAction = async (requestId: string, approve: boolean) => {
    try {
      await axios.post(`/api/chapters/${chapterId}/join-requests/${requestId}`, { approve });
      await fetchViewData();
    } catch (err) { alert("Failed to process request."); }
  };

  const handleOpenPromotionModal = (member: Member) => {
    setSelectedMember(member);
    setIsPromotionModalOpen(true);
  };

  if (loading) return <p className="text-center mt-8">Loading...</p>;
  if (error) return (
    <div className="text-center mt-8 p-4">
        <p className="text-red-500 font-semibold text-lg">{error}</p>
        <Link to="/chapters" className="text-black hover:underline mt-4 inline-block">← Go Back to Chapters</Link>
    </div>
  );

  return (
    <div>
      <Link to={`/chapters/${chapterId}`} className="text-black hover:text-primary mb-6 block font-semibold">← Back to Chapter Stats</Link>
      <h1 className="text-3xl font-bold mb-6">{canManage ? `Manage Chapter Members` : 'Chapter Members'}</h1>

      {canManage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200 shadow-sm">
            <h2 className="text-xl font-semibold mb-2">Pending Join Requests ({joinRequests.length})</h2>
            {joinRequests.length > 0 ? ( <ul className="divide-y divide-gray-200">{joinRequests.map(req => (<li key={req.id} className="py-2 flex justify-between items-center"><div><p className="font-medium">{req.user.name}</p><p className="text-sm text-gray-500">{req.user.email}</p></div><div className="flex space-x-2"><button onClick={() => handleRequestAction(req.id, true)} className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">Approve</button><button onClick={() => handleRequestAction(req.id, false)} className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">Deny</button></div></li>))}</ul> ) : (<p className="text-gray-600">No pending requests.</p>)}
          </div>
          <div className="p-4 border rounded-lg bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-2">Add New Member</h2>
            <div className="relative">
              <input type="search" placeholder="Search by name or email to add..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
              {searchResults.length > 0 && ( <ul className="absolute z-10 w-full border rounded-md mt-1 bg-white shadow-lg max-h-60 overflow-y-auto">{searchResults.map(userResult => ( <li key={userResult.id} className="p-2 flex justify-between items-center hover:bg-gray-100"><span>{userResult.name} ({userResult.email})</span><button onClick={() => handleAddMember(userResult.id)} className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Add</button></li>))}</ul> )}
            </div>
          </div>
        </div>
      )}
      
      <div>
        <h2 className="text-xl font-semibold mb-2">Current Members ({members.length})</h2>
        <div className="bg-white shadow-md border rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {members.length > 0 ? members.map(member => {
              
              const rolePower = { COFOUNDER: 1, REGIONAL_ORGANISER: 2, CITY_ORGANISER: 3, ACTIVIST: 4 };
              const managerPower = user ? rolePower[user.role as keyof typeof rolePower] : 5;
              const memberPower = rolePower[member.role as keyof typeof rolePower];
              const canPromoteThisUser = canManage && user?.id !== member.id && managerPower < memberPower;

              return (
                <li key={member.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-gray-500">{member.email} - <span className="font-semibold capitalize">{member.role.replace(/_/g, ' ').toLowerCase()}</span></p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {canPromoteThisUser && (
                      <button onClick={() => handleOpenPromotionModal(member)} className="px-3 py-1 bg-gray-800 text-white text-sm font-semibold rounded hover:bg-black transition-colors">Promote</button>
                    )}
                    {canManage && user?.id !== member.id && (
                      <button onClick={() => handleRemoveMember(member.id)} className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors">Remove</button>
                    )}
                  </div>
                </li>
              );
            }) : <p className="p-4 text-gray-500">This chapter has no members.</p>}
          </ul>
        </div>
      </div>

      {isPromotionModalOpen && selectedMember && (
        <PromotionModal isOpen={isPromotionModalOpen} onClose={() => setIsPromotionModalOpen(false)} onSuccess={fetchViewData} memberToPromote={selectedMember} />
      )}
    </div>
  );
};

export default ChapterMembersView;