import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-4fc01492/health", (c) => {
  return c.json({ status: "ok" });
});

// Auth endpoints
app.post("/make-server-4fc01492/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }

    // Check if user already exists first
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email === email);
    
    if (userExists) {
      return c.json({ 
        error: 'An account with this email already exists. Please sign in instead.',
        code: 'user_exists'
      }, 409);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.error('Signup error:', error);
      
      // Handle specific error codes
      if (error.message.includes('already been registered')) {
        return c.json({ 
          error: 'An account with this email already exists. Please sign in instead.',
          code: 'user_exists'
        }, 409);
      }
      
      return c.json({ error: error.message }, 400);
    }

    return c.json({ user: data.user });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Failed to sign up' }, 500);
  }
});

// API Keys endpoints
app.get("/make-server-4fc01492/api-keys", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      console.error('Auth error while fetching API keys:', authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get user's API keys from KV store
    const keys = await kv.get(`apikeys:${user.id}`);
    
    // Return empty keys object if none exist
    const defaultKeys = {
      platform: '',
      apiKey: '',
      apiSecret: '',
      authToken: '',
    };
    
    return c.json({ keys: keys || defaultKeys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return c.json({ error: 'Failed to fetch API keys' }, 500);
  }
});

app.put("/make-server-4fc01492/api-keys", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      console.error('Auth error while updating API keys:', authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const keys = await c.req.json();
    
    const apiKeys = {
      platform: keys.platform || '',
      apiKey: keys.apiKey || '',
      apiSecret: keys.apiSecret || '',
      authToken: keys.authToken || '',
      updatedAt: new Date().toISOString(),
      userId: user.id,
    };

    await kv.set(`apikeys:${user.id}`, apiKeys);
    
    return c.json({ keys: apiKeys, success: true });
  } catch (error) {
    console.error('Error updating API keys:', error);
    return c.json({ error: 'Failed to update API keys' }, 500);
  }
});

// Logs endpoints
app.get("/make-server-4fc01492/logs/files", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      console.error('Auth error while fetching log files:', authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get query parameters
    const userId = c.req.query('user_id') || user.id;
    // Normalize broker name to lowercase for consistent matching
    const broker = c.req.query('broker')?.toLowerCase().trim() || null;
    const sessionId = c.req.query('session_id');
    const logDate = c.req.query('log_date');
    const limit = parseInt(c.req.query('limit') || '100', 10);

    // Verify user_id matches authenticated user (security check)
    if (userId !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Build query
    let query = supabase
      .from('broker_log_files')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 1000));

    if (broker) {
      // Fetch all logs first, then filter case-insensitively in memory
      // This ensures we catch logs regardless of case differences
      console.log(`Will filter by broker (case-insensitive): ${broker}`);
    } else {
      console.log('No broker filter applied - fetching all logs for user');
    }
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }
    if (logDate) {
      query = query.eq('log_date', logDate);
    }

    const { data: files, error: queryError } = await query;

    if (queryError) {
      console.error('Error querying log files:', queryError);
      return c.json({ error: 'Failed to fetch log files', details: queryError.message }, 500);
    }

    // Filter by broker case-insensitively if broker parameter provided
    let filteredFiles = files || [];
    if (broker && filteredFiles.length > 0) {
      const brokerLower = broker.toLowerCase();
      const uniqueBrokers = [...new Set((files || []).map(f => f.broker).filter(Boolean))];
      console.log(`Available brokers in logs: ${uniqueBrokers.join(', ')}`);
      console.log(`Searching for broker: ${broker} (normalized: ${brokerLower})`);
      
      filteredFiles = filteredFiles.filter(file => 
        file.broker && file.broker.toLowerCase() === brokerLower
      );
      console.log(`After case-insensitive broker filter: ${filteredFiles.length} files (from ${files?.length || 0} total)`);
    } else if (filteredFiles.length > 0) {
      const uniqueBrokers = [...new Set(filteredFiles.map(f => f.broker).filter(Boolean))];
      console.log(`Available brokers in logs (no filter): ${uniqueBrokers.join(', ')}`);
    }

    console.log(`Found ${filteredFiles.length} log files for user ${userId}${broker ? ` and broker ${broker}` : ''}`);

    // Generate signed URLs for each file
    const filesWithUrls = await Promise.all(
      filteredFiles.map(async (file) => {
        if (file.storage_path) {
          try {
            // Generate signed URL (expires in 1 hour)
            const { data: signedUrlData, error: urlError } = await supabase
              .storage
              .from('broker_logs')
              .createSignedUrl(file.storage_path, 3600);

            if (urlError) {
              console.error('Error generating signed URL:', urlError);
              return { ...file, signed_url: null };
            }

            return { ...file, signed_url: signedUrlData?.signedUrl || null };
          } catch (error) {
            console.error('Error generating signed URL:', error);
            return { ...file, signed_url: null };
          }
        }
        return { ...file, signed_url: null };
      })
    );

    return c.json({ files: filesWithUrls });
  } catch (error) {
    console.error('Error fetching log files:', error);
    return c.json({ error: 'Failed to fetch log files' }, 500);
  }
});

app.get("/make-server-4fc01492/logs/content", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      console.error('Auth error while fetching log content:', authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const storagePath = c.req.query('storage_path');
    
    if (!storagePath) {
      return c.json({ error: 'storage_path parameter is required' }, 400);
    }

    // Verify the file belongs to the user (security check)
    const { data: fileData, error: fileError } = await supabase
      .from('broker_log_files')
      .select('user_id')
      .eq('storage_path', storagePath)
      .single();

    if (fileError || !fileData) {
      return c.json({ error: 'Log file not found' }, 404);
    }

    if (fileData.user_id !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Generate signed URL (expires in 1 hour)
    const { data: signedUrlData, error: urlError } = await supabase
      .storage
      .from('broker_logs')
      .createSignedUrl(storagePath, 3600);

    if (urlError) {
      console.error('Error generating signed URL:', urlError);
      return c.json({ error: 'Failed to generate signed URL' }, 500);
    }

    return c.json({
      signed_url: signedUrlData?.signedUrl || null,
      expires_in: 3600
    });
  } catch (error) {
    console.error('Error fetching log content:', error);
    return c.json({ error: 'Failed to fetch log content' }, 500);
  }
});

Deno.serve(app.fetch);