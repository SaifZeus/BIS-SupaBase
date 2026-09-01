import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// حط المفاتيح هنا مباشرة عشان تحل المشكلة محلياً فورا
const supabaseUrl = 'https://sqagqtisowgjwitrpqdz.supabase.co'
const supabaseAnonKey = 'sb_publishable_5htU-cLDkD1AhbBsHnGXxQ_FpBsVYR5'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)