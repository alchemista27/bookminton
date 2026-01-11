import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const UserLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert('Login Gagal: ' + error.message);
      setLoading(false);
    } else {
      // Redirect ke dashboard dengan state tab: 'booking' sesuai permintaan
      navigate('/user/dashboard', { state: { tab: 'booking' } });
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-emerald-800 mb-6 text-center">Login Pemesan</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" required className="mt-1 block w-full border p-2 rounded" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type="password" required className="mt-1 block w-full border p-2 rounded" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button disabled={loading} type="submit" className="w-full bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700 font-bold">
            {loading ? 'Loading...' : 'Masuk'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Belum punya akun? <Link to="/register" className="text-emerald-600 font-bold hover:underline">Daftar disini</Link>
        </p>
      </div>
    </div>
  );
};

export default UserLogin;