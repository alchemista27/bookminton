import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase Environment Variables missing! Please check .env file.')
}

// Gunakan fallback string kosong agar aplikasi tidak crash saat start, meski request akan gagal
export const supabase = createClient(supabaseUrl || 'https://no-url.supabase.co', supabaseAnonKey || 'no-key')