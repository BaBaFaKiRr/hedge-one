// Supabase configuration from environment variables
// These should be set in your .env file or Vercel environment variables
// For Vite, environment variables must be prefixed with VITE_ to be exposed to client-side code

export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "fbcequeftvgcysbrjuma"
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiY2VxdWVmdHZnY3lzYnJqdW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQwNzcsImV4cCI6MjA2ODY3MDA3N30.oGrYI1pG5Pygtb-jnMq_vgULJtS72aeZ1r7YvIDoTLI"

// Validate that required environment variables are set
if (!import.meta.env.VITE_SUPABASE_PROJECT_ID || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Warning: Supabase credentials are using fallback values. Please set VITE_SUPABASE_PROJECT_ID and VITE_SUPABASE_ANON_KEY in your environment variables.');
}