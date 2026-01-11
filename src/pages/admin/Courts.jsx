import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { ArrowLeft, List, Plus, Save, X, Edit, Trash2 } from 'lucide-react';

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

export default ManageCourts;