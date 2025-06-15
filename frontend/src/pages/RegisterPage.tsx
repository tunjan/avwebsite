import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Chapter } from '../types';
import Modal from '../components/Modal';

const RegisterPage = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', chapterId: '' });
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '' });
  const closeModalAndRedirect = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    navigate('/login');
  }

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        // FIX: Use import.meta.env which is now correctly typed by vite-env.d.ts
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:9888';
        const response = await axios.get(`${apiUrl}/api/public/chapters`);
        setChapters(response.data);
      } catch (err) {
        console.error("Failed to fetch chapters for registration", err);
        setError("Could not load chapters. Please try again later.");
      }
    };
    fetchChapters();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (formData.password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
    }
    setLoading(true);
    setError(null);
    try {
      // FIX: Use import.meta.env which is now correctly typed by vite-env.d.ts
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:9888';
      await axios.post(`${apiUrl}/api/auth/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        chapterId: formData.chapterId,
      });
      setModalState({
        isOpen: true,
        title: 'Registration Successful',
        message: 'Your request to join the chapter has been sent to an organizer for approval. You will be able to log in after your request is approved.',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">Create a New Account</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input type="text" name="name" placeholder="Full Name" onChange={handleChange} required className="w-full p-3 border rounded-md" />
          <input type="email" name="email" placeholder="Email Address" onChange={handleChange} required className="w-full p-3 border rounded-md" />
          <input type="password" name="password" placeholder="Password (min. 6 characters)" onChange={handleChange} required className="w-full p-3 border rounded-md" />
          <input type="password" name="confirmPassword" placeholder="Confirm Password" onChange={handleChange} required className="w-full p-3 border rounded-md" />
          
          <select name="chapterId" value={formData.chapterId} onChange={handleChange} required className="w-full p-3 border rounded-md bg-white">
            <option value="" disabled>Select a Chapter to Join</option>
            {chapters.map(chapter => (
              <option key={chapter.id} value={chapter.id}>{chapter.name}</option>
            ))}
            {chapters.length === 0 && <option disabled>Loading chapters...</option>}
          </select>

          {error && <p className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-md">{error}</p>}

          <button type="submit" disabled={loading || !formData.chapterId} className="w-full p-3 text-white bg-primary rounded-md hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-opacity">
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="text-sm text-center text-gray-600">
          Already have an account? <Link to="/login" className="font-medium text-black hover:underline">Log in here</Link>
        </p>
      </div>

      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModalAndRedirect}
        title={modalState.title}
      >
        {modalState.message}
      </Modal>
    </div>
  );
};

export default RegisterPage;