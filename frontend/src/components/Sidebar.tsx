import React from 'react'; // Import React for JSX
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks'; // Our typed hooks
import { logout } from '../store/authSlice';
import { Link } from 'react-router-dom'; // Ensure Link is imported


const Sidebar = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'block py-2.5 px-4 rounded bg-white text-black' : 'block py-2.5 px-4 rounded hover:bg-gray-700';

  return (
    <aside className="w-64 bg-black text-white p-4 flex flex-col">
      <h1 className="text-2xl font-bold mb-8 text-center">AV</h1>
      
      <nav className="flex-grow space-y-1">
        <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
        <NavLink to="/events" className={navLinkClass}>Events</NavLink>
        <NavLink to="/teams" className={navLinkClass}>Teams</NavLink>
        <NavLink to="/trainings" className={navLinkClass}>Trainings</NavLink>
        <NavLink to="/announcements" className={navLinkClass}>Announcements</NavLink>
        <NavLink to="/resources" className={navLinkClass}>Resources</NavLink>
      </nav>
      <div className="mt-auto">
      <div className="pt-4 border-t border-gray-700">
  {user ? (
    // Wrap the user info in a Link to their profile page
    <Link to="/profile" className="block px-4 hover:bg-gray-700 py-2">
      <p className="font-semibold text-base truncate" title={user.name}>{user.name}</p>
      <p className="text-sm text-gray-400 truncate" title={user.email}>{user.email}</p>
    </Link>
          ) : (
            <div className="px-4">
              <p className="text-sm text-gray-500">Loading user...</p>
            </div>
          )}
          
          <button 
            onClick={handleLogout} 
            className="mt-4 w-full bg-primary hover:opacity-80 text-white font-bold py-2 px-4 transition-opacity"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
// Note: You'll need to create a `src/hooks.ts` file with:
// import { useDispatch, useSelector } from 'react-redux'
// import type { RootState, AppDispatch } from './store/store'
// export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
// export const useAppSelector = useSelector.withTypes<RootState>()