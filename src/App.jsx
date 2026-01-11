import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Calendar, CheckCircle, QrCode, Trash2, Play, LogOut, Lock, FileText, ArrowLeft, CreditCard, Plus, Clock, List, Edit, Save, X, Image, Upload, MapPin, Download } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { format, differenceInSeconds } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- COMPONENTS ---

// 1. Navbar Dinamis
const Navbar = () => {
  const [brand, setBrand] = useState({ name: 'Bookminton', logo_url: '' });

  useEffect(() => {
    const fetchBrand = async () => {
      const { data } = await supabase.from('arena_settings').select('*').single();
      if (data) setBrand(data);
    };
    fetchBrand();
  }, []);

  return (
    <nav className="bg-emerald-600 p-4 text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold flex items-center gap-2">
          {brand.logo_url ? <img src={brand.logo_url} alt="Logo" className="w-8 h-8 rounded bg-white object-contain" /> : '🏸'}
          {brand.name}
        </Link>
        <div className="space-x-4">
          <Link to="/" className="hover:text-emerald-200">User</Link>
          <Link to="/admin" className="hover:text-emerald-200 font-semibold border border-white px-3 py-1 rounded">Admin</Link>
        </div>
      </div>
    </nav>
  );
};

// 2. Login Page (Admin Only)
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg('Login Gagal: ' + error.message);
      setLoading(false);
    } else {
      navigate('/admin');
      // Tidak perlu setLoading(false) di sini karena komponen akan unmount (pindah halaman)
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold text-emerald-800 mb-6 flex items-center gap-2">
          <Lock className="w-6 h-6" /> Admin Login
        </h2>
        {errorMsg && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm">
            {errorMsg}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded p-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded p-2" required />
          </div>
          <button disabled={loading} type="submit" className="w-full bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700">
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

// 3. Protected Route Wrapper
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
  return children;
};

// 3.5. Admin: Set Schedule Page
const SetSchedule = () => {
  const [courts, setCourts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [formData, setFormData] = useState({
    court_id: '',
    date: '',
    start_time: '',
    end_time: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourts();
  }, []);

  useEffect(() => {
    if (formData.court_id && formData.date) {
      fetchSchedules();
    }
  }, [formData.court_id, formData.date]);

  const fetchCourts = async () => {
    const { data } = await supabase.from('courts').select('*');
    if (data) setCourts(data);
  };

  const fetchSchedules = async () => {
    if (!formData.court_id || !formData.date) return;

    const { data, error } = await supabase
      .from('court_schedules')
      .select('*')
      .eq('court_id', parseInt(formData.court_id)) // Pastikan dikirim sebagai Integer
      .eq('date', formData.date)
      .order('start_time', { ascending: true });
    
    if (error) console.error('Error fetch schedules:', error);
    else if (data) setSchedules(data);
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!formData.court_id || !formData.date || !formData.start_time || !formData.end_time) return;

    const { error } = await supabase.from('court_schedules').insert([{
      court_id: parseInt(formData.court_id),
      date: formData.date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      is_booked: false
    }]);

    if (error) alert('Gagal tambah jadwal: ' + error.message + '\n\nTips: Pastikan RLS di tabel court_schedules dimatikan (OFF) di Supabase.');
    else fetchSchedules();
  };

  const handleDelete = async (id) => {
    if (confirm('Hapus slot jadwal ini?')) {
      await supabase.from('court_schedules').delete().eq('id', id);
      fetchSchedules();
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <button onClick={() => navigate('/admin')} className="mb-4 flex items-center gap-2 text-gray-600 hover:text-emerald-600">
        <ArrowLeft size={20} /> Kembali ke Dashboard
      </button>
      <h2 className="text-2xl font-bold text-emerald-800 mb-6 flex items-center gap-2">
        <Clock className="w-6 h-6" /> Atur Jadwal Lapangan
      </h2>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <form onSubmit={handleAddSchedule} className="grid md:grid-cols-5 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Lapangan</label>
            <select required className="w-full border p-2 rounded" value={formData.court_id} onChange={e => setFormData({...formData, court_id: e.target.value})}>
              <option value="">Pilih...</option>
              {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Tanggal</label>
            <input required type="date" className="w-full border p-2 rounded" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Mulai</label>
            <input required type="time" className="w-full border p-2 rounded" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Selesai</label>
            <input required type="time" className="w-full border p-2 rounded" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
          </div>
          <button type="submit" className="bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700 font-bold flex justify-center items-center gap-1">
            <Plus size={18} /> Tambah
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-4">Jam</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {schedules.length === 0 ? (
              <tr><td colSpan="3" className="p-6 text-center text-gray-500">Belum ada jadwal dibuat untuk tanggal ini.</td></tr>
            ) : (
              schedules.map(s => (
                <tr key={s.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-mono font-medium">{s.start_time.slice(0,5)} - {s.end_time.slice(0,5)}</td>
                  <td className="p-4">
                    {s.is_booked ? 
                      <span className="text-red-600 font-bold text-xs bg-red-100 px-2 py-1 rounded">Booked</span> : 
                      <span className="text-emerald-600 font-bold text-xs bg-emerald-100 px-2 py-1 rounded">Available</span>
                    }
                  </td>
                  <td className="p-4 text-right">
                    {!s.is_booked && (
                      <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 3.6. Admin: Manage Courts Page
const ManageCourts = () => {
  const [courts, setCourts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '' });
  const [newCourt, setNewCourt] = useState({ name: '', price: '' });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourts();
  }, []);

  const fetchCourts = async () => {
    const { data, error } = await supabase.from('courts').select('*').order('id');
    if (error) console.error('Error fetching courts:', error);
    else setCourts(data);
  };

  const handleEditClick = (court) => {
    setEditingId(court.id);
    setEditForm({ name: court.name, price: court.price });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', price: '' });
  };

  const handleSave = async (id) => {
    if (!editForm.name || !editForm.price) return;

    const { error } = await supabase
      .from('courts')
      .update({ name: editForm.name, price: parseInt(editForm.price) })
      .eq('id', id);

    if (error) {
      alert('Gagal update lapangan: ' + error.message);
    } else {
      setEditingId(null);
      fetchCourts();
    }
  };

  const handleAddCourt = async (e) => {
    e.preventDefault();
    if (!newCourt.name || !newCourt.price) return;

    const { error } = await supabase.from('courts').insert([{
      name: newCourt.name,
      price: parseInt(newCourt.price)
    }]);

    if (error) {
      alert('Gagal tambah lapangan: ' + error.message);
    } else {
      setNewCourt({ name: '', price: '' });
      fetchCourts();
    }
  };

  const handleDeleteCourt = async (id) => {
    if (confirm('Hapus lapangan ini?')) {
      const { error } = await supabase.from('courts').delete().eq('id', id);
      if (error) alert('Gagal hapus: ' + error.message);
      else fetchCourts();
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <button onClick={() => navigate('/admin')} className="mb-4 flex items-center gap-2 text-gray-600 hover:text-emerald-600">
        <ArrowLeft size={20} /> Kembali ke Dashboard
      </button>
      <h2 className="text-2xl font-bold text-emerald-800 mb-6 flex items-center gap-2">
        <List className="w-6 h-6" /> Kelola Lapangan
      </h2>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="font-bold text-lg mb-4">Tambah Lapangan Baru</h3>
        <form onSubmit={handleAddCourt} className="grid md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nama Lapangan</label>
            <input 
              type="text" 
              required 
              className="w-full border p-2 rounded" 
              value={newCourt.name} 
              onChange={e => setNewCourt({...newCourt, name: e.target.value})} 
              placeholder="Contoh: Lapangan 1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Harga per Jam</label>
            <input 
              type="number" 
              required 
              className="w-full border p-2 rounded" 
              value={newCourt.price} 
              onChange={e => setNewCourt({...newCourt, price: e.target.value})} 
              placeholder="Contoh: 50000"
            />
          </div>
          <button type="submit" className="bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700 font-bold flex justify-center items-center gap-1">
            <Plus size={18} /> Tambah
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-4">Nama Lapangan / Jenis</th>
              <th className="p-4">Harga per Jam</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {courts.map((court) => (
              <tr key={court.id} className="border-b hover:bg-gray-50">
                <td className="p-4">
                  {editingId === court.id ? (
                    <input
                      type="text"
                      className="border p-2 rounded w-full focus:ring-emerald-500 focus:border-emerald-500"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  ) : (
                    <span className="font-medium">{court.name}</span>
                  )}
                </td>
                <td className="p-4">
                  {editingId === court.id ? (
                    <input
                      type="number"
                      className="border p-2 rounded w-full focus:ring-emerald-500 focus:border-emerald-500"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    />
                  ) : (
                    <span>Rp {court.price.toLocaleString()}</span>
                  )}
                </td>
                <td className="p-4 text-right flex justify-end gap-2">
                  {editingId === court.id ? (
                    <>
                      <button onClick={() => handleSave(court.id)} className="text-emerald-600 hover:text-emerald-800 p-2 bg-emerald-100 rounded" title="Simpan">
                        <Save size={18} />
                      </button>
                      <button onClick={handleCancelEdit} className="text-gray-600 hover:text-gray-800 p-2 bg-gray-200 rounded" title="Batal">
                        <X size={18} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEditClick(court)} className="text-blue-600 hover:text-blue-800 p-2 bg-blue-100 rounded" title="Edit">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDeleteCourt(court.id)} className="text-red-600 hover:text-red-800 p-2 bg-red-100 rounded" title="Hapus">
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 3.7. Admin: Manage Arena (Logo, Info, Carousel)
const ManageArena = () => {
  const [settings, setSettings] = useState({ name: '', address: '', logo_url: '' });
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: set } = await supabase.from('arena_settings').select('*').single();
    if (set) setSettings(set);
    
    const { data: imgs } = await supabase.from('carousel_images').select('*').order('created_at', { ascending: false });
    if (imgs) setImages(imgs);
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('arena_settings').update({ name: settings.name, address: settings.address }).eq('id', 1);
    if (error) alert('Gagal update: ' + error.message);
    else alert('Info Arena berhasil diupdate!');
  };

  const handleUpload = async (file, type) => {
    if (!file) return;
    setUploading(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('arena-assets').upload(fileName, file);

    if (error) {
      alert('Upload gagal: ' + error.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('arena-assets').getPublicUrl(fileName);
    const publicUrl = data.publicUrl;

    if (type === 'logo') {
      await supabase.from('arena_settings').update({ logo_url: publicUrl }).eq('id', 1);
      setSettings(prev => ({ ...prev, logo_url: publicUrl }));
    } else {
      await supabase.from('carousel_images').insert([{ image_url: publicUrl }]);
      fetchData(); // Refresh list
    }
    setUploading(false);
  };

  const handleDeleteImage = async (id) => {
    if (confirm('Hapus foto ini?')) {
      await supabase.from('carousel_images').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <button onClick={() => navigate('/admin')} className="mb-4 flex items-center gap-2 text-gray-600 hover:text-emerald-600"><ArrowLeft size={20} /> Kembali</button>
      <h2 className="text-2xl font-bold text-emerald-800 mb-6 flex items-center gap-2"><Image className="w-6 h-6" /> Pengaturan Arena</h2>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Identitas Arena */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-bold text-lg mb-4">Identitas Arena</h3>
          <form onSubmit={handleUpdateSettings} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nama Arena</label>
              <input value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Alamat</label>
              <textarea value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} className="w-full border p-2 rounded" />
            </div>
            <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 w-full">Simpan Info</button>
          </form>
          <div className="mt-6 pt-6 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo Arena</label>
            <div className="flex items-center gap-4">
              {settings.logo_url && <img src={settings.logo_url} alt="Logo" className="w-16 h-16 object-contain border rounded" />}
              <label className="cursor-pointer bg-gray-100 px-4 py-2 rounded border hover:bg-gray-200 flex items-center gap-2">
                <Upload size={16} /> Ganti Logo
                <input type="file" hidden accept="image/*" onChange={(e) => handleUpload(e.target.files[0], 'logo')} disabled={uploading} />
              </label>
            </div>
          </div>
        </div>

        {/* Carousel Images */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-bold text-lg mb-4">Foto Carousel</h3>
          <label className="cursor-pointer bg-emerald-50 text-emerald-700 px-4 py-2 rounded border border-emerald-200 hover:bg-emerald-100 flex items-center justify-center gap-2 mb-4">
            <Plus size={18} /> Tambah Foto
            <input type="file" hidden accept="image/*" onChange={(e) => handleUpload(e.target.files[0], 'carousel')} disabled={uploading} />
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
            {images.map(img => (
              <div key={img.id} className="relative group">
                <img src={img.image_url} className="w-full h-32 object-cover rounded" />
                <button onClick={() => handleDeleteImage(img.id)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. UserView: Booking & Carousel
const UserView = () => {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null); // Menyimpan data booking sukses
  const [paymentFile, setPaymentFile] = useState(null);
  const [step, setStep] = useState(1); // 1: Form Input, 2: Payment & Upload
  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [arenaInfo, setArenaInfo] = useState({ name: '', address: '' });
  const [carouselImages, setCarouselImages] = useState([]);
  const [selectedSchedules, setSelectedSchedules] = useState([]);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    court_id: '',
    date: '',
  });

  useEffect(() => {
    fetchCourts();
    fetchArenaInfo();
  }, []);

  const fetchArenaInfo = async () => {
    const { data: info } = await supabase.from('arena_settings').select('*').single();
    if (info) setArenaInfo(info);
    const { data: imgs } = await supabase.from('carousel_images').select('*').order('created_at', { ascending: false });
    if (imgs) setCarouselImages(imgs);
  };

  useEffect(() => {
    if (formData.court_id && formData.date) {
      fetchAvailableSchedules();
    }
  }, [formData.court_id, formData.date]);

  const fetchCourts = async () => {
    const { data, error } = await supabase.from('courts').select('*');
    if (!error) setCourts(data);
  };

  const fetchAvailableSchedules = async () => {
    const { data } = await supabase
      .from('court_schedules')
      .select('*')
      .eq('court_id', formData.court_id)
      .eq('date', formData.date)
      .eq('is_booked', false)
      .order('start_time', { ascending: true });
    
    if (data) setAvailableSchedules(data);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSlotSelect = (schedule) => {
    setSelectedSchedules(prev => {
      if (prev.find(s => s.id === schedule.id)) {
        return prev.filter(s => s.id !== schedule.id);
      }
      return [...prev, schedule];
    });
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.court_id || !formData.date || selectedSchedules.length === 0) {
      alert('Mohon lengkapi semua data formulir.');
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!paymentFile) {
      alert('Mohon upload bukti transfer terlebih dahulu.');
      return;
    }
    setLoading(true);

    // 0. Upload Bukti Transfer (Jika ada)
    const fileExt = paymentFile.name.split('.').pop();
    const fileName = `proof_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(fileName, paymentFile);

    if (uploadError) {
      console.error('Upload Error:', uploadError);
      alert(`Gagal upload bukti: ${uploadError.message}\n\n(Tips: Jika sedang login Admin, coba Logout dulu atau update Policy Supabase agar 'authenticated' user juga bisa upload)`);
      setLoading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(fileName);
    const paymentProofUrl = urlData.publicUrl;

    // 1. Insert Multiple Bookings
    const bookingsToInsert = selectedSchedules.map(schedule => {
        const startDateTime = new Date(`${formData.date}T${schedule.start_time}`);
        const endDateTime = new Date(`${formData.date}T${schedule.end_time}`);
        return {
            court_id: formData.court_id,
            user_name: formData.name,
            user_phone: formData.phone,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            status: 'booked',
            qr_code_string: '', // Update later
            payment_proof_url: paymentProofUrl,
            schedule_id: schedule.id
        };
    });

    const { data, error } = await supabase
      .from('bookings')
      .insert(bookingsToInsert)
      .select();

    if (error) {
      alert('Gagal booking: ' + error.message);
    } else {
      // 2. Update qr_code_string & schedule status for each
      for (const booking of data) {
         await supabase.from('bookings').update({ qr_code_string: booking.id }).eq('id', booking.id);
         await supabase.from('court_schedules').update({ is_booked: true }).eq('id', booking.schedule_id);
      }
      
      setBookingSuccess(data); // Array of bookings
    }
    setLoading(false);
  };

  if (bookingSuccess && bookingSuccess.length > 0) {
    const firstBooking = bookingSuccess[0];
    const bookedCourt = courts.find(c => c.id == firstBooking.court_id);

    const handleDownloadPDF = async () => {
      const element = document.getElementById('invoice-content');
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2 });
      const data = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProperties = pdf.getImageProperties(data);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;
      
      pdf.addImage(data, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice-${firstBooking.id.slice(0, 8).toUpperCase()}.pdf`);
    };

    return (
      <div className="max-w-lg mx-auto mt-8">
        <div id="invoice-content" className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Header Invoice */}
        <div className="bg-emerald-600 p-6 text-white text-center relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex flex-col items-center gap-2 mb-2">
              {arenaInfo.logo_url ? (
                <img src={arenaInfo.logo_url} alt="Logo" className="w-16 h-16 bg-white rounded-full object-contain p-1 shadow-md" />
              ) : (
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-emerald-600 text-2xl shadow-md">🏸</div>
              )}
              <h1 className="text-2xl font-bold tracking-wide">{arenaInfo.name || 'Bookminton Arena'}</h1>
            </div>
            <p className="text-emerald-100 text-sm max-w-xs mx-auto leading-relaxed">{arenaInfo.address || 'Alamat Arena'}</p>
          </div>
          {/* Dekorasi Background */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full -translate-x-10 -translate-y-10"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full translate-x-8 translate-y-8"></div>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-emerald-600 font-bold text-xl mb-1">
              <CheckCircle className="w-6 h-6" /> BOOKING CONFIRMED
            </div>
            <p className="text-gray-500 text-sm">Silahkan screenshot bukti booking ini.</p>
          </div>

          {/* Detail Booking */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 space-y-3 text-sm mb-6">
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500">Kode Booking (Utama)</span>
              <span className="font-mono font-bold text-gray-800">{firstBooking.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Nama Pemesan</span>
              <span className="font-medium text-gray-800">{firstBooking.user_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Lapangan</span>
              <span className="font-medium text-gray-800">{bookedCourt?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tanggal</span>
              <span className="font-medium text-gray-800">{format(new Date(firstBooking.start_time), 'dd MMMM yyyy')}</span>
            </div>
            <div className="flex flex-col gap-1 mt-2 border-t pt-2">
              <span className="text-gray-500 text-sm">Jadwal Main:</span>
              {bookingSuccess.map((b, idx) => (
                  <div key={idx} className="flex justify-between font-bold text-emerald-600">
                    <span>Sesi {idx + 1}</span>
                    <span>{format(new Date(b.start_time), 'HH:mm')} - {format(new Date(b.end_time), 'HH:mm')}</span>
                  </div>
              ))}
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="bg-white p-3 border-2 border-dashed border-gray-300 rounded-lg">
              <QRCodeCanvas value={firstBooking.qr_code_string} size={160} />
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Tunjukkan QR Code ini kepada petugas<br />saat check-in di arena.</p>
          </div>

        </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleDownloadPDF}
            className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition shadow-lg flex items-center justify-center gap-2"
          >
            <Download size={20} /> Download PDF
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition shadow-lg"
          >
            Selesai / Pesan Lagi
          </button>
        </div>
      </div>
    );
  }

  const selectedCourt = courts.find(c => c.id == formData.court_id);
  
  // Hitung durasi dan total harga
  let duration = 0;
  let totalPrice = 0;
  if (selectedSchedules.length > 0 && selectedCourt) {
    duration = selectedSchedules.reduce((acc, curr) => {
        const start = new Date(`1970-01-01T${curr.start_time}`);
        const end = new Date(`1970-01-01T${curr.end_time}`);
        return acc + (end - start) / (1000 * 60 * 60);
    }, 0);
    totalPrice = duration * selectedCourt.price;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Carousel Dinamis */}
      <div className="mb-8 overflow-hidden rounded-xl shadow-lg relative h-64 bg-gray-200 group">
        <div className="flex overflow-x-auto snap-x snap-mandatory h-full scrollbar-hide">
          {carouselImages.length > 0 ? carouselImages.map((img) => (
            <img key={img.id} src={img.image_url} className="w-full h-full object-cover flex-shrink-0 snap-center" alt="Arena" />
          )) : (
            <img src="https://images.unsplash.com/photo-1626224583764-84786c719088?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover" alt="Default" />
          )}
        </div>
        <div className="absolute bottom-0 left-0 bg-gradient-to-t from-black/70 to-transparent w-full p-4">
          <h2 className="text-white text-2xl font-bold">{arenaInfo.name || 'Arena Badminton'}</h2>
          <p className="text-emerald-200 flex items-center gap-1">
            <MapPin size={16} /> {arenaInfo.address || 'Alamat belum diatur'}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" /> {step === 1 ? 'Form Booking' : 'Pembayaran'}
          </h3>
          
          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                <input required name="name" value={formData.name} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">No. WhatsApp</label>
                <input required name="phone" value={formData.phone} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Pilih Lapangan</label>
                <select required name="court_id" value={formData.court_id} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500">
                  <option value="">-- Pilih --</option>
                  {courts.map(c => (
                    <option key={c.id} value={c.id}>{c.name} - Rp {c.price.toLocaleString()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tanggal</label>
                <input required type="date" name="date" value={formData.date} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Jadwal Tersedia (Bisa pilih lebih dari 1)</label>
                {!formData.court_id || !formData.date ? (
                  <p className="text-sm text-gray-500 italic">Pilih lapangan dan tanggal dulu.</p>
                ) : availableSchedules.length === 0 ? (
                  <p className="text-sm text-red-500 italic">Tidak ada jadwal tersedia.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSchedules.map(s => {
                      const isSelected = selectedSchedules.find(sel => sel.id === s.id);
                      return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSlotSelect(s)}
                        className={`py-2 px-1 text-sm rounded border ${isSelected ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-500'}`}
                      >
                        {s.start_time.slice(0,5)} - {s.end_time.slice(0,5)}
                      </button>
                    )})}
                  </div>
                )}
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition mt-4">
                Lanjut ke Pembayaran
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                <h4 className="font-bold text-gray-800 border-b pb-2 mb-2">Ringkasan Pesanan</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Lapangan:</span>
                  <span className="font-medium">{selectedCourt?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Jadwal:</span>
                  <div className="text-right">
                      <div className="font-medium">{formData.date}</div>
                      {selectedSchedules.map(s => (
                          <div key={s.id} className="text-xs text-gray-500">
                              {s.start_time.slice(0,5)} - {s.end_time.slice(0,5)}
                          </div>
                      ))}
                      <div className="font-medium mt-1">({duration.toFixed(1)} Jam)</div>
                  </div>
                </div>
                <div className="flex justify-between text-lg font-bold text-emerald-700 pt-2 border-t mt-2">
                  <span>Total Bayar:</span>
                  <span>Rp {totalPrice.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-2 mb-3 text-emerald-800 font-bold">
                  <CreditCard size={20} /> Informasi Transfer
                </div>
                <p className="text-sm text-gray-700 mb-1">Silahkan transfer sesuai nominal ke:</p>
                <p className="text-xl font-mono font-bold text-gray-900">BCA 123-456-7890</p>
                <p className="text-xs text-gray-500 mb-4">a.n Badminton Arena</p>
                
                <label className="block text-sm font-medium text-emerald-900 mb-2">Upload Bukti Transfer (.jpg/.png)</label>
                <input type="file" accept="image/png, image/jpeg" onChange={(e) => setPaymentFile(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-300 transition flex items-center justify-center gap-2">
                  <ArrowLeft size={18} /> Kembali
                </button>
                <button onClick={handleFinalSubmit} disabled={loading} className="flex-[2] bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition">
                  {loading ? 'Memproses...' : 'Kirim Bukti & Selesai'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Side */}
        <div className="space-y-4">
           <div className="bg-white p-6 rounded-lg shadow-md">
             <h3 className="font-bold text-gray-800 mb-2">Peraturan</h3>
             <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
               <li>Wajib menggunakan sepatu badminton.</li>
               <li>Dilarang merokok di area lapangan.</li>
               <li>Datang 10 menit sebelum jadwal.</li>
             </ul>
           </div>
        </div>
      </div>
    </div>
  );
};

// 5. Admin View: Dashboard & Check-in
const AdminView = () => {
  const [bookings, setBookings] = useState([]);
  const [scanInput, setScanInput] = useState('');
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchBookings();
    // Realtime subscription (Optional, but good for admin)
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
      // Ambil data booking dulu untuk dapat schedule_id (jika ada)
      const { data: booking } = await supabase.from('bookings').select('schedule_id').eq('id', id).single();
      
      await supabase.from('bookings').delete().eq('id', id);
      
      // Kembalikan status jadwal jadi available
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

  // Komponen Countdown Kecil
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

      {/* Manual Check-in / Scan */}
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

      {/* Booking List */}
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

// 6. Main App
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
        <Navbar />
        <Routes>
          <Route path="/" element={<UserView />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminView />
            </ProtectedRoute>
          } />
          <Route path="/admin/schedule" element={
            <ProtectedRoute>
              <SetSchedule />
            </ProtectedRoute>
          } />
          <Route path="/admin/courts" element={
            <ProtectedRoute>
              <ManageCourts />
            </ProtectedRoute>
          } />
          <Route path="/admin/arena" element={
            <ProtectedRoute>
              <ManageArena />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;