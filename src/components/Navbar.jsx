import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { User, LogOut } from 'lucide-react';

const Navbar = () => {
  const [brand, setBrand] = useState({ name: 'Bookminton', logo_url: '' });
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBrand = async () => {
      const { data } = await supabase.from('arena_settings').select('*').single();
      if (data) setBrand(data);
    };
    fetchBrand();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAdmin(session?.user?.user_metadata?.role === 'admin');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAdmin(session?.user?.user_metadata?.role === 'admin');
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/user/login');
  };

  return (
    <nav className="bg-emerald-600 p-4 text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold flex items-center gap-2">
          {brand.logo_url ? <img src={brand.logo_url} alt="Logo" className="w-8 h-8 rounded bg-white object-contain" /> : '🏸'}
          {brand.name}
        </Link>
        <div className="space-x-4 flex items-center">
          {session ? (
            <>
              <Link to={isAdmin ? "/admin" : "/user/dashboard"} className="hover:text-emerald-200 flex items-center gap-1"><User size={18}/> Dashboard</Link>
              <button onClick={handleLogout} className="hover:text-emerald-200 flex items-center gap-1"><LogOut size={18}/> Logout</button>
            </>
          ) : (
            <>
              <Link to="/user/login" className="hover:text-emerald-200">Login</Link>
              <Link to="/register" className="bg-white text-emerald-600 px-3 py-1 rounded font-bold hover:bg-emerald-50">Daftar</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;