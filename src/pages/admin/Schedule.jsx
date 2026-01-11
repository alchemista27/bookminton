import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { ArrowLeft, Clock, Plus, Trash2 } from 'lucide-react';

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
      .eq('court_id', parseInt(formData.court_id))
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

    if (error) alert('Gagal tambah jadwal: ' + error.message);
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

export default SetSchedule;