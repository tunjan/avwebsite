import React, { useState } from "react"; // CORRECTED: Single import line
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hooks";
import { login } from "../store/authSlice";
import { Link } from "react-router-dom"; // Make sure Link is imported

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status } = useAppSelector((state) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(login({ email, password })).unwrap();
      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to login:", err);
      // You can add user-facing error messages here
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-200">
      <form
        onSubmit={handleSubmit}
        className="p-8 bg-white shadow-md w-96 space-y-6"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-2 border border-gray-300"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-2 border border-gray-300"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full p-2 text-white bg-primary hover:opacity-80 disabled:bg-gray-400"
        >
          {status === "loading" ? "Logging in..." : "Login"}
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
