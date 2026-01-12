import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { MapPin, Calendar, LogIn, Info } from 'lucide-react';

const Home = () => {
  const [courts, setCourts] = useState([]);
  const [arenaInfo, setArenaInfo] = useState({ name: '', address: '' });
  const [carouselImages, setCarouselImages] = useState([]);
  
  // View State
  const [viewCourtId, setViewCourtId] = useState('');
  const [viewDate, setViewDate] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [bookings, setBookings] = useState([]);
  
  const navigate = useNavigate();

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
    if (viewCourtId && viewDate) {
      fetchSchedules();
    } else {
      setSchedules([]);
    }
  }, [viewCourtId, viewDate]);

  const fetchCourts = async () => {
    const { data, error } = await supabase.from('courts').select('*');
    if (!error) setCourts(data);
  };

  const fetchSchedules = async () => {
    const { data: schedData } = await supabase
      .from('court_schedules')
      .select('*')
      .eq('court_id', viewCourtId)
      .eq('date', viewDate)
      .order('start_time', { ascending: true });
    
    if (schedData) {
      setSchedules(schedData);
      
      // Fetch bookings status for booked schedules
      const bookedScheduleIds = schedData.filter(s => s.is_booked).map(s => s.id);
      if (bookedScheduleIds.length > 0) {
        const { data: bookData } = await supabase
          .from('bookings')
          .select('schedule_id, status')
          .in('schedule_id', bookedScheduleIds);
        if (bookData) setBookings(bookData);
      } else {
        setBookings([]);
      }
    }
  };

  const getSlotStyle = (schedule) => {
    if (!schedule.is_booked) {
      // Available
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    
    const booking = bookings.find(b => b.schedule_id === schedule.id);
    if (booking?.status === 'occupied') {
      // Occupied
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    
    // Booked
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getStatusLabel = (schedule) => {
    if (!schedule.is_booked) return 'Available';
    const booking = bookings.find(b => b.schedule_id === schedule.id);
    if (booking?.status === 'occupied') return 'Occupied';
    return 'Booked';
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Carousel Section */}
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

      {/* Info & Filter Section */}
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Cek Jadwal Lapangan
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Lapangan</label>
                <select 
                  className="w-full border p-2 rounded focus:ring-emerald-500 focus:border-emerald-500"
                  value={viewCourtId}
                  onChange={e => setViewCourtId(e.target.value)}
                >
                  <option value="">-- Pilih Lapangan --</option>
                  {courts.map(c => (
                    <option key={c.id} value={c.id}>{c.name} - Rp {c.price.toLocaleString()}/jam</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input 
                  type="date" 
                  className="w-full border p-2 rounded focus:ring-emerald-500 focus:border-emerald-500"
                  value={viewDate}
                  onChange={e => setViewDate(e.target.value)}
                />
              </div>
            </div>

            {viewCourtId && viewDate ? (
              <div>
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h4 className="font-bold text-gray-700">Status Jadwal</h4>
                  <div className="flex gap-3 text-xs font-medium">
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300"></span> Available</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-100 border border-red-300"></span> Booked</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300"></span> Occupied</div>
                  </div>
                </div>

                {schedules.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Tidak ada jadwal yang diatur untuk tanggal ini.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {schedules.map(s => (
                      <div 
                        key={s.id}
                        className={`py-3 px-2 text-center rounded border text-sm font-bold flex flex-col items-center justify-center gap-1 ${getSlotStyle(s)}`}
                      >
                        <span>{s.start_time.slice(0,5)} - {s.end_time.slice(0,5)}</span>
                        <span className="text-[10px] uppercase opacity-75">{getStatusLabel(s)}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-8 pt-6 border-t text-center">
                  <p className="text-gray-600 mb-3">Ingin bermain? Silahkan login untuk booking.</p>
                  <button 
                    onClick={() => navigate('/user/dashboard', { state: { tab: 'booking' } })}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 transition inline-flex items-center gap-2 shadow-lg"
                  >
                    <LogIn size={18} /> Login & Booking
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500 bg-gray-50 rounded border border-dashed">
                <Info className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p>Silahkan pilih lapangan dan tanggal untuk melihat jadwal.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
           <div className="bg-white p-6 rounded-lg shadow-md">
             <h3 className="font-bold text-gray-800 mb-3 border-b pb-2">Peraturan Arena</h3>
             <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
               <li>Wajib menggunakan sepatu khusus badminton (non-marking).</li>
               <li>Dilarang merokok dan makan di area lapangan.</li>
               <li>Wajib menjaga kebersihan arena.</li>
               <li>Datang 10 menit sebelum jadwal.</li>
               <li>Booking yang sudah dibayar tidak dapat dibatalkan (Non-Refundable).</li>
             </ul>
           </div>
           
           <div className="bg-emerald-50 p-6 rounded-lg border border-emerald-100">
             <h3 className="font-bold text-emerald-800 mb-2">Jam Operasional</h3>
             <p className="text-sm text-emerald-700">
               Buka setiap hari<br/>
               Pukul 08:00 - 23:00 WIB
             </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Home;