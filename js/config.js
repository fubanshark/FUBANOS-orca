
/* =====================================
   FUBAN OS - SUPABASE CONFIGURATION
===================================== */

"use strict";

const SUPABASE_URL =
    "https://qiyenyqdgeabhaoqasjc.supabase.co";

const SUPABASE_ANON_KEY =
    "วาง_PUBLISHABLE_KEY_ที่ได้รับจาก_SUPABASE_ตรงนี้";

// Create Supabase Client
window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);

console.log("FUBAN OS: Supabase initialized successfully.");
