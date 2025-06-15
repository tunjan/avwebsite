import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks';
import { logout } from '../store/authSlice';

const Sidebar = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block py-2.5 px-4 rounded transition-colors ${
      isActive ? 'bg-white text-black' : 'hover:bg-gray-700'
    }`;
    
  const navLinks = [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/events", label: "Events" },
      { to: "/chapters", label: "Chapters" },
      { to: "/trainings", label: "Trainings" },
      { to: "/announcements", label: "Announcements" },
      { to: "/resources", label: "Resources" },
  ];

  return (
    <aside className="w-64 bg-black text-white p-4 flex flex-col h-screen sticky top-0">
      <h1 className="text-2xl font-bold mb-8 text-center tracking-widest">AV</h1>
      
      <nav className="flex-grow space-y-2">
        {navLinks.map(link => (
            <NavLink key={link.to} to={link.to} className={navLinkClass}>
                {link.label}
            </NavLink>
        ))}
      </nav>

      <div className="mt-auto">
        <div className="pt-4 border-t border-gray-700">
          {user ? (
            <Link to="/profile" className="block p-2 rounded hover:bg-gray-700 transition-colors">
              <p className="font-semibold text-base truncate" title={user.name}>{user.name}</p>
              <p className="text-sm text-gray-400 truncate" title={user.email}>{user.email}</p>
            </Link>
          ) : (
            <div className="p-2">
              <p className="text-sm text-gray-500">Loading user...</p>
            </div>
          )}
          
          <button 
            onClick={handleLogout} 
            className="mt-4 w-full bg-primary hover:opacity-90 text-white font-bold py-2 px-4 rounded-md transition-opacity"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;