import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!session) return <Navigate to="/login" replace />;

  if (session.user.user_metadata.role !== 'admin') {
    return <Navigate to="/user/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
