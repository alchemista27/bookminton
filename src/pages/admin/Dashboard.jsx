import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Calendar, List, Image, LogOut, QrCode, FileText, Play, Trash2 } from 'lucide-react';
import { differenceInSeconds, format } from 'date-fns';

const AdminDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [scanInput, setScanInput] = useState('');
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchBookings();
    const subscription = supabase
      .channel('bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchBookings)
      .subscribe();

    return () => { supabase.removeChannel(subscription); }
  }, []);

  const fetchBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select(`*, courts(name)`)
      .order('start_time', { ascending: true });
    if (data) setBookings(data);
  };

  const handleCheckIn = async (bookingId) => {
    if (!bookingId) return;
    
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'occupied' })
      .eq('id', bookingId);

    if (error) alert('Error check-in');
    else {
      alert('Check-in Berhasil! Waktu berjalan.');
      setScanInput('');
      fetchBookings();
    }
  };

  const handleCancel = async (id) => {
    if(confirm('Batalkan booking ini?')) {
      const { data: booking } = await supabase.from('bookings').select('schedule_id').eq('id', id).single();
      
      await supabase.from('bookings').delete().eq('id', id);
      
      if (booking?.schedule_id) {
        await supabase.from('court_schedules').update({ is_booked: false }).eq('id', booking.schedule_id);
      }
      
      fetchBookings();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const SessionTimer = ({ endTime }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
      const interval = setInterval(() => {
        const diff = differenceInSeconds(new Date(endTime), new Date());
        if (diff <= 0) {
          setTimeLeft('Selesai');
          clearInterval(interval);
        } else {
          const m = Math.floor(diff / 60);
          const s = diff % 60;
          setTimeLeft(`${m}m ${s}s`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }, [endTime]);

    return <span className="font-mono font-bold text-red-600 animate-pulse">{timeLeft}</span>;
  };

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-emerald-900">Admin Dashboard</h2>
        <div className="flex gap-2">
          <button onClick={() => navigate('/admin/schedule')} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 transition">
            <Calendar size={18} /> Atur Jadwal
          </button>
          <button onClick={() => navigate('/admin/courts')} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            <List size={18} /> Kelola Lapangan
          </button>
          <button onClick={() => navigate('/admin/arena')} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition">
            <Image size={18} /> Info Arena
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-8 flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-bold text-gray-700 mb-1">Scan QR / Input Booking ID</label>
          <div className="flex gap-2">
            <input 
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Paste UUID here..."
              className="flex-1 border border-gray-300 rounded p-2 font-mono text-sm"
            />
            <button 
              onClick={() => handleCheckIn(scanInput)}
              className="bg-emerald-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-emerald-700"
            >
              <QrCode size={18} /> Check In
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-emerald-100 text-emerald-800">
            <tr>
              <th className="p-4">Kode</th>
              <th className="p-4">Lapangan</th>
              <th className="p-4">User</th>
              <th className="p-4">Jadwal</th>
              <th className="p-4">Bukti</th>
              <th className="p-4">Status</th>
              <th className="p-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b hover:bg-gray-50">
                <td className="p-4 font-mono font-bold text-gray-700">{b.id.slice(0, 8).toUpperCase()}</td>
                <td className="p-4 font-medium">{b.courts?.name}</td>
                <td className="p-4">
                  <div className="font-bold">{b.user_name}</div>
                  <div className="text-xs text-gray-500">{b.user_phone}</div>
                </td>
                <td className="p-4">
                  {format(new Date(b.start_time), 'dd MMM HH:mm')} - {format(new Date(b.end_time), 'HH:mm')}
                </td>
                <td className="p-4">
                  {b.payment_proof_url ? (
                    <a href={b.payment_proof_url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline flex items-center gap-1">
                      <FileText size={16} /> Lihat
                    </a>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>
                <td className="p-4">
                  {b.status === 'booked' && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">Booked</span>}
                  {b.status === 'occupied' && (
                    <div className="flex flex-col">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold mb-1">Occupied</span>
                      <SessionTimer endTime={b.end_time} />
                    </div>
                  )}
                </td>
                <td className="p-4 flex gap-2">
                  {b.status === 'booked' && (
                    <button 
                      onClick={() => handleCheckIn(b.id)}
                      title="Manual Check In"
                      className="p-2 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200"
                    >
                      <Play size={16} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleCancel(b.id)}
                    title="Cancel Booking"
                    className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500">Belum ada booking.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;