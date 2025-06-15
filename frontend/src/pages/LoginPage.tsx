import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAppDispatch } from "../hooks";
import { login } from "../store/authSlice";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await dispatch(login({ email, password })).unwrap();
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to login. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="p-8 bg-white shadow-lg w-full max-w-sm rounded-lg space-y-6"
      >
        <h2 className="text-2xl font-bold text-center">Login</h2>
        {error && <p className="text-sm text-center text-red-500 bg-red-50 p-3 rounded-md">{error}</p>}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-3 border border-gray-300 rounded-md"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-3 border border-gray-300 rounded-md"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 text-white bg-primary hover:opacity-90 disabled:bg-gray-400 font-bold rounded-md transition-opacity"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        <p className="text-sm text-center text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-black hover:underline">
                Register here
            </Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;