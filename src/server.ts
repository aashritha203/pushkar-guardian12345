import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import {
  handleStartProcessing,
  handleStopProcessing,
  handleGetCounts,
  handleGetStatus,
} from "./stream-processing-routes";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

/**
 * Handle stream processing API routes
 */
function handleStreamProcessingAPI(request: Request): Response | null {
  const { pathname, search } = new URL(request.url);

  // POST /api/streams/process
  if (pathname === "/api/streams/process" && request.method === "POST") {
    return handleStartProcessing(request);
  }

  // POST /api/streams/stop/{ghatId}
  if (pathname.match(/^\/api\/streams\/stop\//) && request.method === "POST") {
    return handleStopProcessing(request);
  }

  // GET /api/streams/counts/{ghatId}
  if (pathname.match(/^\/api\/streams\/counts\//)) {
    return handleGetCounts(request);
  }

  // GET /api/streams/status/{ghatId}
  if (pathname.match(/^\/api\/streams\/status\//)) {
    return handleGetStatus(request);
  }

  return null;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Handle stream processing API routes first
      const apiResponse = handleStreamProcessingAPI(request);
      if (apiResponse) {
        return apiResponse;
      }

      // Fall through to main handler for other routes
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
