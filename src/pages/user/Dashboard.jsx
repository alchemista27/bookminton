import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { History, Calendar, User, CreditCard, ArrowLeft } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { format } from 'date-fns';

const UserDashboard = () => {
  const [user, setUser] = useState(null);
  const location = useLocation();
  // Mengambil state tab dari navigasi login, default ke 'history' jika tidak ada
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'history'); 
  const [bookings, setBookings] = useState([]);
  const navigate = useNavigate();

  // Booking State
  const [courts, setCourts] = useState([]);
  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [selectedSchedules, setSelectedSchedules] = useState([]);
  const [bookingForm, setBookingForm] = useState({ court_id: '', date: '' });
  const [paymentFile, setPaymentFile] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) navigate('/user/login');
      else {
        setUser(user);
        fetchUserBookings(user.user_metadata.phone);
      }
    };
    getUser();
    fetchCourts();
  }, []);

  useEffect(() => {
    if (bookingForm.court_id && bookingForm.date) {
      fetchAvailableSchedules();
    }
  }, [bookingForm.court_id, bookingForm.date]);

  const fetchUserBookings = async (phone) => {
    const { data } = await supabase.from('bookings').select('*, courts(name)').eq('user_phone', phone).order('created_at', { ascending: false });
    if (data) setBookings(data);
  };

  const fetchCourts = async () => {
    const { data } = await supabase.from('courts').select('*');
    if (data) setCourts(data);
  };

  const fetchAvailableSchedules = async () => {
    const { data } = await supabase.from('court_schedules')
      .select('*')
      .eq('court_id', bookingForm.court_id)
      .eq('date', bookingForm.date)
      .eq('is_booked', false)
      .order('start_time', { ascending: true });
    if (data) setAvailableSchedules(data);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (selectedSchedules.length === 0 || !paymentFile) {
      alert('Pilih jadwal dan upload bukti pembayaran.');
      return;
    }
    setBookingLoading(true);

    // Upload Proof
    const fileExt = paymentFile.name.split('.').pop();
    const fileName = `proof_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(fileName, paymentFile);
    
    if (uploadError) {
      alert('Upload gagal: ' + uploadError.message);
      setBookingLoading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(fileName);
    
    // Insert Bookings
    const bookingsToInsert = selectedSchedules.map(schedule => ({
      court_id: bookingForm.court_id,
      // user_id: user.id, // Dihapus sementara karena kolom belum ada di DB
      user_name: user.user_metadata.full_name,
      user_phone: user.user_metadata.phone,
      start_time: new Date(`${bookingForm.date}T${schedule.start_time}`).toISOString(),
      end_time: new Date(`${bookingForm.date}T${schedule.end_time}`).toISOString(),
      status: 'booked',
      qr_code_string: '',
      payment_proof_url: urlData.publicUrl,
      schedule_id: schedule.id
    }));

    const { data, error } = await supabase.from('bookings').insert(bookingsToInsert).select();

    if (error) {
      alert('Booking gagal: ' + error.message);
    } else {
      for (const booking of data) {
        await supabase.from('bookings').update({ qr_code_string: booking.id }).eq('id', booking.id);
        await supabase.from('court_schedules').update({ is_booked: true }).eq('id', booking.schedule_id);
      }
      alert('Booking Berhasil!');
      setBookingForm({ court_id: '', date: '' });
      setSelectedSchedules([]);
      setPaymentFile(null);
      fetchUserBookings(user.id);
      setActiveTab('history');
      setBookingStep(1);
    }
    setBookingLoading(false);
  };

  if (!user) return null;

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h2 className="text-3xl font-bold text-emerald-800 mb-6">Dashboard Pemesan</h2>
      
      <div className="flex gap-4 mb-6 border-b">
        <button onClick={() => setActiveTab('history')} className={`pb-2 px-4 font-semibold ${activeTab === 'history' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-gray-500'}`}>
          <History className="inline w-4 h-4 mr-1"/> Riwayat Booking
        </button>
        <button onClick={() => setActiveTab('booking')} className={`pb-2 px-4 font-semibold ${activeTab === 'booking' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-gray-500'}`}>
          <Calendar className="inline w-4 h-4 mr-1"/> Booking Baru
        </button>
        <button onClick={() => setActiveTab('profile')} className={`pb-2 px-4 font-semibold ${activeTab === 'profile' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-gray-500'}`}>
          <User className="inline w-4 h-4 mr-1"/> Profil
        </button>
      </div>

      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Tanggal</th>
                <th className="p-4">Lapangan</th>
                <th className="p-4">Jam</th>
                <th className="p-4">Status</th>
                <th className="p-4">QR Code</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? <tr><td colSpan="5" className="p-6 text-center text-gray-500">Belum ada riwayat booking.</td></tr> : 
              bookings.map(b => (
                <tr key={b.id} className="border-b">
                  <td className="p-4">{format(new Date(b.start_time), 'dd MMM yyyy')}</td>
                  <td className="p-4">{b.courts?.name}</td>
                  <td className="p-4">{format(new Date(b.start_time), 'HH:mm')} - {format(new Date(b.end_time), 'HH:mm')}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${b.status === 'booked' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {b.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4">
                    {b.qr_code_string && <QRCodeCanvas value={b.qr_code_string} size={40} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'booking' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">{bookingStep === 1 ? 'Buat Booking Baru' : 'Pembayaran & Konfirmasi'}</h3>
          
          {bookingStep === 1 ? (
            <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Pilih Lapangan</label>
                <select required className="w-full border p-2 rounded" value={bookingForm.court_id} onChange={e => setBookingForm({...bookingForm, court_id: e.target.value})}>
                  <option value="">-- Pilih --</option>
                  {courts.map(c => <option key={c.id} value={c.id}>{c.name} - Rp {c.price.toLocaleString()}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tanggal</label>
                <input type="date" required className="w-full border p-2 rounded" value={bookingForm.date} onChange={e => setBookingForm({...bookingForm, date: e.target.value})} />
              </div>
            </div>

            {bookingForm.court_id && bookingForm.date && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Jadwal</label>
                <div className="grid grid-cols-4 gap-2">
                  {availableSchedules.length === 0 ? <p className="text-gray-500 text-sm">Tidak ada jadwal tersedia.</p> :
                  availableSchedules.map(s => {
                    const isSelected = selectedSchedules.find(sel => sel.id === s.id);
                    return (
                      <button key={s.id} type="button" onClick={() => setSelectedSchedules(prev => isSelected ? prev.filter(x => x.id !== s.id) : [...prev, s])}
                        className={`py-2 px-1 text-sm rounded border ${isSelected ? 'bg-emerald-600 text-white' : 'bg-white hover:border-emerald-500'}`}>
                        {s.start_time.slice(0,5)} - {s.end_time.slice(0,5)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button 
              disabled={selectedSchedules.length === 0} 
              onClick={() => setBookingStep(2)}
              className="w-full bg-emerald-600 text-white py-3 rounded font-bold hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Lanjut Pembayaran
            </button>
            </div>
          ) : (
            <form onSubmit={handleBookingSubmit} className="space-y-6">
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <h4 className="font-bold text-gray-800 border-b pb-2 mb-3">Ringkasan Pesanan</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lapangan</span>
                    <span className="font-medium">{courts.find(c => c.id == bookingForm.court_id)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tanggal</span>
                    <span className="font-medium">{bookingForm.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jadwal ({selectedSchedules.length} slot)</span>
                    <div className="text-right font-medium">
                      {selectedSchedules.map(s => (
                        <div key={s.id}>{s.start_time.slice(0,5)} - {s.end_time.slice(0,5)}</div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2 text-lg font-bold text-emerald-700">
                    <span>Total Bayar</span>
                    <span>Rp {(selectedSchedules.length * (courts.find(c => c.id == bookingForm.court_id)?.price || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded border border-emerald-200">
                <div className="flex items-center gap-2 mb-3 text-emerald-800 font-bold">
                  <CreditCard size={20} /> Informasi Transfer
                </div>
                <p className="text-sm text-gray-700 mb-1">Silahkan transfer ke:</p>
                <p className="text-xl font-mono font-bold text-gray-900 mb-4">BCA 123-456-7890 <span className="text-sm font-normal text-gray-500">(a.n Badminton Arena)</span></p>
                
                <label className="block text-sm font-medium text-emerald-900 mb-2">Upload Bukti Transfer</label>
                <input type="file" required accept="image/*" onChange={e => setPaymentFile(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200" />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setBookingStep(1)} className="flex-1 bg-gray-200 text-gray-800 py-3 rounded font-bold hover:bg-gray-300 flex items-center justify-center gap-2">
                  <ArrowLeft size={18} /> Kembali
                </button>
                <button disabled={bookingLoading} type="submit" className="flex-[2] bg-emerald-600 text-white py-3 rounded font-bold hover:bg-emerald-700">
                  {bookingLoading ? 'Memproses...' : 'Kirim Bukti & Selesai'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="bg-white p-6 rounded-lg shadow max-w-md">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-2xl font-bold">
              {user.user_metadata.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h3 className="text-xl font-bold">{user.user_metadata.full_name}</h3>
              <p className="text-gray-500">{user.email}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">No. WhatsApp</span>
              <span className="font-medium">{user.user_metadata.phone}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Bergabung Sejak</span>
              <span className="font-medium">{format(new Date(user.created_at), 'dd MMM yyyy')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;