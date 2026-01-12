import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { ArrowLeft, Image, Upload, Plus, Trash2 } from 'lucide-react';

const ManageArena = () => {
  const [settings, setSettings] = useState({ name: '', address: '', logo_url: '', bank_info: '', qris_url: '' });
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
    const { error } = await supabase.from('arena_settings').update({ 
      name: settings.name, 
      address: settings.address,
      bank_info: settings.bank_info,
      logo_url: settings.logo_url,
      qris_url: settings.qris_url
    }).eq('id', 1);
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
      const { error } = await supabase.from('arena_settings').update({ logo_url: publicUrl }).eq('id', 1);
      if (error) alert('Gagal simpan logo: ' + error.message);
      else setSettings(prev => ({ ...prev, logo_url: publicUrl }));
    } else if (type === 'qris') {
      const { error } = await supabase.from('arena_settings').update({ qris_url: publicUrl }).eq('id', 1);
      if (error) {
        alert('Gagal simpan QRIS: ' + error.message);
        console.error(error);
      } else {
        setSettings(prev => ({ ...prev, qris_url: publicUrl }));
      }
    } else {
      await supabase.from('carousel_images').insert([{ image_url: publicUrl }]);
      fetchData();
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
            <div>
              <label className="block text-sm font-medium text-gray-700">Info Rekening / Cara Bayar</label>
              <textarea rows="3" value={settings.bank_info || ''} onChange={e => setSettings({...settings, bank_info: e.target.value})} className="w-full border p-2 rounded" placeholder="Contoh: BCA 123456 a.n Admin" />
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
          <div className="mt-6 pt-6 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-2">QRIS Pembayaran</label>
            <div className="flex items-center gap-4">
              {settings.qris_url && <img src={settings.qris_url} alt="QRIS" className="w-24 h-24 object-contain border rounded" />}
              <label className="cursor-pointer bg-gray-100 px-4 py-2 rounded border hover:bg-gray-200 flex items-center gap-2">
                <Upload size={16} /> Upload QRIS
                <input type="file" hidden accept="image/*" onChange={(e) => handleUpload(e.target.files[0], 'qris')} disabled={uploading} />
              </label>
            </div>
          </div>
        </div>

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

export default ManageArena;