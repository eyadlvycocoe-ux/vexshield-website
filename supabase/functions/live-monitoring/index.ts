import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface LiveFrameUpload {
  server_id?: string;
  server_ip?: string;
  license_key?: string;
  player_id?: string;
  player_name?: string;
  frame_data?: string;
  frame?: string;
  image?: string;
}

const FRAME_EXPIRY_MS = 10_000;
const FRAMES_TABLE = "live_monitor_frames";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const url = new URL(req.url);
    let action = url.searchParams.get("action");
    let body: any = {};

    // Support POST with JSON body for all actions
    if (req.method === "POST") {
      try {
        body = await req.json();
        if (body?.action) action = body.action;
      } catch {
        // No body or invalid JSON
      }
    }

    // Light request logging (helps debug FiveM/NUI integrations)
    console.log("[live-monitoring]", req.method, "action=", action || "(none)");

    const license_key =
      body?.license_key ||
      url.searchParams.get("license_key") ||
      req.headers.get("x-license-key") ||
      req.headers.get("X-License-Key");

    const resolveServerId = async (input: {
      server_id?: string | null;
      server_ip?: string | null;
      license_key?: string | null;
    }): Promise<string | null> => {
      const sid = input.server_id ?? null;
      const sip = input.server_ip ?? null;
      const lkey = input.license_key ?? null;
      if (!lkey) return null;

      // 1) Try canonical server_id
      if (sid) {
        const { data } = await supabaseClient
          .from("servers")
          .select("server_id")
          .eq("server_id", sid)
          .eq("license_key", lkey)
          .maybeSingle();
        if (data?.server_id) return data.server_id;
      }

      // 2) Try by server_ip
      const ip = sip || sid; // allow passing IP in server_id for legacy clients
      if (ip) {
        const { data } = await supabaseClient
          .from("servers")
          .select("server_id")
          .eq("server_ip", ip)
          .eq("license_key", lkey)
          .maybeSingle();
        if (data?.server_id) return data.server_id;
      }

      return null;
    };

    // POST - Upload frame from FiveM client (NUI posts directly to this API)
    if (action === "upload_frame") {
      const payload = body as LiveFrameUpload;
      const resolvedServerId = await resolveServerId({
        server_id: payload.server_id,
        server_ip: payload.server_ip,
        license_key,
      });

      const finalFrameData = payload.frame_data || payload.frame || payload.image;

      if (!resolvedServerId || !payload.player_id || !finalFrameData) {
        return jsonResponse(400, {
          error:
            "Missing/invalid fields: server_id (or server_ip), license_key, player_id, frame_data",
        });
      }

      // Proactively delete stale frames for this server to keep storage clean even if nobody is reading
      try {
        const cutoff = new Date(Date.now() - FRAME_EXPIRY_MS).toISOString();
        await supabaseClient
          .from(FRAMES_TABLE)
          .delete()
          .eq("server_id", resolvedServerId)
          .lt("updated_at", cutoff);
      } catch (e) {
        console.error("Stale frame cleanup error:", e);
      }

      const { error: upsertError } = await supabaseClient
        .from(FRAMES_TABLE)
        .upsert(
          {
            server_id: resolvedServerId,
            player_id: payload.player_id,
            player_name: payload.player_name || "Unknown",
            frame_data: finalFrameData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "server_id,player_id" },
        );

      if (upsertError) {
        console.error("Frame upsert error:", upsertError);
        return jsonResponse(500, {
          error: "Failed to store frame",
          details: upsertError.message,
        });
      }

      return jsonResponse(200, { ok: true, message: "Frame uploaded" });
    }

    // GET or POST - Fetch latest frame for a player (deletes after read to keep storage empty)
    if (action === "get_frame") {
      const server_id = url.searchParams.get("server_id") || body.server_id;
      const player_id = url.searchParams.get("player_id") || body.player_id;

      if (!server_id || !player_id) {
        return jsonResponse(400, { error: "Missing server_id or player_id" });
      }

      const { data, error } = await supabaseClient
        .from(FRAMES_TABLE)
        .select("frame_data, updated_at, player_name")
        .eq("server_id", server_id)
        .eq("player_id", player_id)
        .maybeSingle();

      if (error) {
        console.error("get_frame db error:", error);
        return jsonResponse(500, { ok: false, error: error.message, frame: null });
      }

      if (!data?.frame_data || !data.updated_at) {
        return jsonResponse(200, { ok: false, error: "No active stream", frame: null });
      }

      const ts = new Date(data.updated_at).getTime();
      if (!Number.isFinite(ts) || Date.now() - ts > FRAME_EXPIRY_MS) {
        // Delete stale frame to keep storage clean
        await supabaseClient
          .from(FRAMES_TABLE)
          .delete()
          .eq("server_id", server_id)
          .eq("player_id", player_id);
        return jsonResponse(200, { ok: false, error: "No active stream", frame: null });
      }

      // Delete frame after reading to keep storage empty (stream-style)
      supabaseClient
        .from(FRAMES_TABLE)
        .delete()
        .eq("server_id", server_id)
        .eq("player_id", player_id)
        .then(() => {})
        .catch((e) => console.error("Frame cleanup error:", e));

      return jsonResponse(200, {
        ok: true,
        frame: data.frame_data,
        timestamp: ts,
        player_name: data.player_name,
      });
    }

    // GET or POST - List active streams for a server
    if (action === "list_streams") {
      const server_id = url.searchParams.get("server_id") || body.server_id;

      if (!server_id) {
        return jsonResponse(400, { error: "Missing server_id" });
      }

      const cutoff = new Date(Date.now() - FRAME_EXPIRY_MS).toISOString();
      const { data, error } = await supabaseClient
        .from(FRAMES_TABLE)
        .select("player_id, player_name, updated_at")
        .eq("server_id", server_id)
        .gte("updated_at", cutoff)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("list_streams db error:", error);
        return jsonResponse(500, { ok: false, error: error.message, streams: [] });
      }

      const streams = (data || []).map((row) => {
        const last = new Date(row.updated_at).getTime();
        return {
          player_id: row.player_id,
          player_name: row.player_name,
          last_update: last,
          active: Date.now() - last < FRAME_EXPIRY_MS,
        };
      });

      return jsonResponse(200, { ok: true, streams });
    }

    // POST - Request monitoring start (queues command to FiveM server)
    if (action === "start_monitoring") {
      const { server_id, player_id, license_key } = body;

      if (!server_id || !player_id) {
        return jsonResponse(400, { error: "Missing server_id or player_id" });
      }

      const resolvedServerId = await resolveServerId({ server_id, license_key });
      if (!resolvedServerId) {
        return jsonResponse(401, { error: "Invalid server or license" });
      }

      // Queue a start_monitoring command to the FiveM server
      const { error: cmdError } = await supabaseClient
        .from("dashboard_commands")
        .insert({
          server_id: resolvedServerId,
          command_type: "start_monitoring",
          command_data: { player_id },
          status: "pending",
        });

      if (cmdError) {
        console.error("Error queueing start_monitoring command:", cmdError);
      }

      return jsonResponse(200, { ok: true, message: "Monitoring request queued" });
    }

    // POST - Stop monitoring
    if (action === "stop_monitoring") {
      const { server_id, player_id } = body;

      if (!server_id || !player_id) {
        return jsonResponse(400, { error: "Missing server_id or player_id" });
      }

      // Delete stored frame (optional cleanup)
      const { error: delError } = await supabaseClient
        .from(FRAMES_TABLE)
        .delete()
        .eq("server_id", server_id)
        .eq("player_id", player_id);

      if (delError) {
        console.error("stop_monitoring delete error:", delError);
      }

      // Queue stop command
      await supabaseClient
        .from("dashboard_commands")
        .insert({
          server_id,
          command_type: "stop_monitoring",
          command_data: { player_id },
          status: "pending",
        });

      return jsonResponse(200, { ok: true, message: "Monitoring stopped" });
    }

    // POST - Save screenshot to storage
    if (action === "save_screenshot") {
      const { server_id, server_ip, player_id, player_name, frame_data } = body;

      const resolvedServerId = await resolveServerId({
        server_id,
        server_ip,
        license_key,
      });

      if (!resolvedServerId || !player_id || !frame_data) {
        return jsonResponse(400, { error: "Missing required fields" });
      }

      // Decode base64 and upload to storage
      const base64Data = (frame_data as string).replace(
        /^data:image\/\w+;base64,/, 
        "",
      );
      const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

      const filename = `screenshots/${resolvedServerId}/${player_id}_${Date.now()}.jpg`;

      const { error: uploadError } = await supabaseClient.storage
        .from("anticheat-files")
        .upload(filename, imageBytes, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return jsonResponse(500, {
          error: "Failed to save screenshot",
          details: uploadError.message,
        });
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabaseClient.storage.from("anticheat-files").getPublicUrl(filename);

      return jsonResponse(200, {
        ok: true,
        url: publicUrl,
        filename,
        player_name: player_name || "Unknown",
      });
    }

    // Default response
    return jsonResponse(400, {
      error: "Invalid action",
      available_actions: [
        "upload_frame (POST)",
        "get_frame (GET)",
        "list_streams (GET)",
        "start_monitoring (POST)",
        "stop_monitoring (POST)",
        "save_screenshot (POST)",
      ],
    });
  } catch (error) {
    console.error("Error in live-monitoring function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(500, { error: errorMessage });
  }
});
