export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return null;
}

export function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...init.headers,
    },
  });
}

export function errorResponse(message: string, status = 400, details?: unknown) {
  return jsonResponse(
    {
      error: {
        message,
        details: details ?? null,
      },
    },
    { status },
  );
}

export function getErrorInfo(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: null,
    };
  }

  if (typeof error === "object" && error !== null) {
    const maybeMessage = "message" in error ? error.message : undefined;
    return {
      message: typeof maybeMessage === "string" ? maybeMessage : "Unknown error",
      details: error,
    };
  }

  return {
    message: "Unknown error",
    details: error ?? null,
  };
}
