import type { VercelRequest, VercelResponse } from "@vercel/node";

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

    const nodeBackendUrl = (process.env.NODE_BACKEND_URL || process.env.VITE_NODE_BACKEND_URL || "").replace(/\/$/, "");
    if (!nodeBackendUrl) {
      console.error("Missing NODE_BACKEND_URL");
      return res.status(500).send("Server configuration error");
    }

    const updateRes = await fetch(`${nodeBackendUrl}/brokers/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        broker_id: brokerId,
        credentials: { auth_token: request_token },
      }),
    });

    if (!updateRes.ok) {
      const errBody = await updateRes.text();
      console.error("Node backend update failed:", updateRes.status, errBody);
      throw new Error(errBody || "Broker update failed");
    }

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
