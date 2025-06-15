import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { token } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (!token) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to. This allows us to send them along to that page after they
    // log in, which is a nicer user experience.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;