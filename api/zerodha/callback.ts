import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { request_token, state } = req.query;

    if (!request_token || !state) {
      return res.status(400).send("Missing request_token or state");
    }

    const brokerId = state as string;

    // Store request_token as auth_token
    const { error } = await supabase
      .from("user_brokers")
      .update({
        auth_token: request_token,
        updated_at: new Date().toISOString(),
      })
      .eq("id", brokerId);

    if (error) {
      throw error;
    }

    // Redirect back to frontend
    return res.redirect(
      "https://hedgeone.co.in/dashboard?zerodha=success"
    );
  } catch (err: any) {
    console.error("Zerodha callback error:", err.message);
    return res.redirect(
      "https://hedgeone.co.in/dashboard?zerodha=failed"
    );
  }
}
