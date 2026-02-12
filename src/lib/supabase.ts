import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ADD THESE 2 LINES TO DEBUG:
console.log('MY URL:', supabaseUrl)
console.log('MY KEY:', supabaseKey)

export const supabase = createClient(supabaseUrl, supabaseKey)