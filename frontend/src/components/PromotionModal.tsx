import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useAppSelector } from '../hooks';
import axios from '../api/axiosConfig';

interface TargetOption { id: string; name: string; }
interface MemberToPromote { id: string; name: string; role: string; }

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  memberToPromote: MemberToPromote;
}

const PromotionModal: React.FC<PromotionModalProps> = ({ isOpen, onClose, onSuccess, memberToPromote }) => {
  const manager = useAppSelector(state => state.auth.user);

  const [newRole, setNewRole] = useState('');
  const [targetId, setTargetId] = useState('');
  const [targetOptions, setTargetOptions] = useState<TargetOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableRoles = useCallback((): { value: string; label: string }[] => {
    if (!manager) return [];
    // FIX: Explicitly type the array to prevent TypeScript from inferring it as 'never[]'.
    const roles: { value: string; label: string }[] = [];
    if (manager.role === 'COFOUNDER') {
        roles.push({ value: 'REGIONAL_ORGANISER', label: 'Regional Organiser' });
        if (memberToPromote.role === 'ACTIVIST') {
          roles.push({ value: 'CITY_ORGANISER', label: 'City Organiser' });
        }
    } else if (manager.role === 'REGIONAL_ORGANISER' && memberToPromote.role === 'ACTIVIST') {
        roles.push({ value: 'CITY_ORGANISER', label: 'City Organiser' });
    }
    return roles;
  }, [manager, memberToPromote]);

  useEffect(() => {
    const fetchTargets = async () => {
      setTargetOptions([]);
      setTargetId('');
      if (!newRole || !manager) return;
      try {
        if (newRole === 'CITY_ORGANISER') {
            const endpoint = manager.role === 'REGIONAL_ORGANISER' 
                ? `/api/chapters/in-region/${manager.managedRegionId}` 
                : '/api/chapters';
            const { data } = await axios.get<TargetOption[]>(endpoint);
            setTargetOptions(data);
        } else if (newRole === 'REGIONAL_ORGANISER') {
            const { data } = await axios.get<TargetOption[]>('/api/regions');
            setTargetOptions(data);
        }
      } catch (err) {
          console.error("Failed to fetch targets for promotion:", err);
          setError("Could not load available chapters or regions.");
      }
    };
    fetchTargets();
  }, [newRole, manager]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole || ((newRole === 'CITY_ORGANISER' || newRole === 'REGIONAL_ORGANISER') && !targetId)) {
        setError("Please select a new role and a target assignment.");
        return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
        await axios.post(`/api/promote/${memberToPromote.id}`, { newRole, targetId });
        onSuccess();
        onClose();
    } catch (err: any) {
        setError(err.response?.data?.message || "An unexpected error occurred during promotion.");
    } finally {
        setIsSubmitting(false);
    }
  };
  
  useEffect(() => {
      if (isOpen) {
          setNewRole('');
          setTargetId('');
          setTargetOptions([]);
          setError(null);
          setIsSubmitting(false);
      }
  }, [isOpen]);

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-40" onClose={onClose}>
        <Transition.Child as={React.Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={React.Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900">
                  Promote {memberToPromote.name}
                </Dialog.Title>
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="newRole" className="block text-sm font-medium text-gray-700">New Role</label>
                    <select id="newRole" value={newRole} onChange={(e) => setNewRole(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md">
                        <option value="" disabled>Select a role...</option>
                        {availableRoles().map(role => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                    </select>
                  </div>
                  {(newRole === 'CITY_ORGANISER' || newRole === 'REGIONAL_ORGANISER') && (
                    <div>
                        <label htmlFor="targetId" className="block text-sm font-medium text-gray-700">
                            {newRole === 'CITY_ORGANISER' ? 'Assign to Chapter' : 'Assign to Region'}
                        </label>
                        <select id="targetId" value={targetId} onChange={(e) => setTargetId(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md">
                            <option value="" disabled>Select a target...</option>
                            {targetOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                        </select>
                    </div>
                  )}
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300 transition-colors">Cancel</button>
                    <button type="submit" disabled={isSubmitting || !newRole} className="px-4 py-2 bg-primary text-white font-semibold rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
                        {isSubmitting ? 'Promoting...' : 'Confirm Promotion'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default PromotionModal;