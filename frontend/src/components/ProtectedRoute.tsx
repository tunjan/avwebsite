import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../hooks';
import { ReactNode } from 'react';
import React from 'react';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { token } = useAppSelector((state) => state.auth);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default ProtectedRoute;