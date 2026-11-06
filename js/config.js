
"use strict";

// ==========================================
// FUBAN OS - SUPABASE CONFIG
// ==========================================

const SUPABASE_URL =
    "https://qiyenyqdgeabhaoqasjc.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_J3PUB5Bzw4fDmEOTy7KLfw_d0id9aIY";

// Initialize Supabase
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
