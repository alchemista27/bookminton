import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MapPin, Calendar, CreditCard, ArrowLeft, CheckCircle, Download } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Home = () => {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [paymentFile, setPaymentFile] = useState(null);
  const [step, setStep] = useState(1);
  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [arenaInfo, setArenaInfo] = useState({ name: '', address: '' });
  const [carouselImages, setCarouselImages] = useState([]);
  const [selectedSchedules, setSelectedSchedules] = useState([]);
  
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

    const fileExt = paymentFile.name.split('.').pop();
    const fileName = `proof_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(fileName, paymentFile);

    if (uploadError) {
      console.error('Upload Error:', uploadError);
      alert(`Gagal upload bukti: ${uploadError.message}`);
      setLoading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(fileName);
    const paymentProofUrl = urlData.publicUrl;

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
            qr_code_string: '',
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
      for (const booking of data) {
         await supabase.from('bookings').update({ qr_code_string: booking.id }).eq('id', booking.id);
         await supabase.from('court_schedules').update({ is_booked: true }).eq('id', booking.schedule_id);
      }
      setBookingSuccess(data);
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

export default Home;