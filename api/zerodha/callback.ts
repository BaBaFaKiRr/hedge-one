import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

function getCookie(req: VercelRequest, name: string) {
  const cookie = req.headers.cookie;
  if (!cookie) return null;

  const match = cookie
    .split(";")
    .map(c => c.trim())
    .find(c => c.startsWith(name + "="));

  return match ? match.split("=")[1] : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { request_token } = req.query;

    if (!request_token || typeof request_token !== "string") {
      return res.status(400).send("Missing request_token");
    }

    const brokerId = getCookie(req, "zerodha_broker_id");

    if (!brokerId) {
      return res.status(400).send("Missing broker context");
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from("user_brokers")
      .update({
        auth_token: request_token,
        updated_at: new Date().toISOString(),
      })
      .eq("id", brokerId);

    if (error) throw error;

    // Clear cookie
    res.setHeader(
      "Set-Cookie",
      "zerodha_broker_id=; Path=/; Max-Age=0; SameSite=Lax"
    );

    return res.redirect(
      "https://hedgeone.co.in/?zerodha=success"
    );
  } catch (err) {
    console.error("Zerodha callback error:", err);
    return res.redirect(
      "https://hedgeone.co.in/?zerodha=failed"
    );
  }
}
