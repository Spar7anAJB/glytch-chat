const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TenorMediaFormat = {
  url?: string;
  dims?: [number, number];
};

type TenorResult = {
  id?: string;
  content_description?: string;
  media_formats?: {
    gif?: TenorMediaFormat;
    tinygif?: TenorMediaFormat;
    nanogif?: TenorMediaFormat;
  };
};

type TenorApiResponse = {
  results?: TenorResult[];
  next?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tenorApiKey = Deno.env.get("TENOR_API_KEY");
  if (!tenorApiKey) {
    return new Response(JSON.stringify({ error: "TENOR_API_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const clientKey = Deno.env.get("TENOR_CLIENT_KEY") || "glytch-chat";
  const payload = await req.json().catch(() => ({}));

  const q = typeof payload.q === "string" ? payload.q.trim() : "";
  const requestedLimit = Number(payload.limit);
  const limit = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 20;

  const params = new URLSearchParams({
    key: tenorApiKey,
    client_key: clientKey,
    media_filter: "gif,tinygif,nanogif",
    contentfilter: "medium",
    locale: "en_US",
    limit: String(limit),
  });

  let endpoint = "featured";
  if (q.length > 0) {
    endpoint = "search";
    params.set("q", q);
  }

  const tenorUrl = `https://tenor.googleapis.com/v2/${endpoint}?${params.toString()}`;
  const tenorRes = await fetch(tenorUrl);
  const tenorData = (await tenorRes.json().catch(() => ({}))) as TenorApiResponse;

  if (!tenorRes.ok) {
    const errorMessage = (tenorData as { error?: string }).error || "Failed to fetch GIFs from Tenor";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: tenorRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results = (tenorData.results || [])
    .map((item) => {
      const preferred = item.media_formats?.gif || item.media_formats?.tinygif || item.media_formats?.nanogif;
      const preview = item.media_formats?.tinygif || item.media_formats?.nanogif || item.media_formats?.gif;
      if (!preferred?.url) return null;

      const dims = preferred.dims || preview?.dims || [0, 0];
      return {
        id: item.id || preferred.url,
        url: preferred.url,
        previewUrl: preview?.url || preferred.url,
        width: dims[0] || 0,
        height: dims[1] || 0,
        description: item.content_description || "GIF",
      };
    })
    .filter(Boolean);

  return new Response(
    JSON.stringify({
      results,
      next: tenorData.next || null,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
