import { defineMiddleware } from "astro:middleware";
import apiRoutes from "../public/apis/apiRoutes";
import { decodeJwt } from "jose/jwt/decode";

// Debug variable - change to false in production
const DEBUG = false;

// Constants
const BACKEND_URL = "http://backend:8000";
const PUBLIC_ROUTES = new Set(["/login", "/register"]);
const COOKIE_OPTIONS = "HttpOnly; Path=/; SameSite=Lax; Secure";

// Helper function for conditional logging
function debugLog(...args: any[]) {
  if (DEBUG) {
    console.log("[middleware]", ...args);
  }
}

// Utility to parse cookies into a map
function parseCookies(request: Request): Map<string, string> {
  const cookieHeader = request.headers.get("cookie");
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;
  cookieHeader.split(/;\s*/).forEach((c) => {
    const [key, ...valueParts] = c.split("=");
    cookies.set(key, valueParts.join("="));
  });
  return cookies;
}

// Check if refresh token cookie exists
function hasRefreshCookie(cookies: Map<string, string>): boolean {
  return cookies.has("refresh_token");
}

// Get access token from cookies
function getAccessToken(cookies: Map<string, string>): string | null {
  return cookies.get("access_token") || null;
}

// Check if token is expired
function isTokenExpired(token: string): boolean {
  try {
    const payload = decodeJwt(token);
    const exp = payload.exp;
    if (!exp) return true;
    return Date.now() >= exp * 1000;
  } catch (e) {
    debugLog("error decoding token", e);
    return true;
  }
}

// Create a new request with authorization header
function createAuthorizedRequest(
  request: Request,
  accessToken: string
): Request {
  const newHeaders = new Headers(request.headers);
  newHeaders.set("authorization", `Bearer ${accessToken}`);
  return new Request(request, { headers: newHeaders });
}

// Handle refresh logic
async function handleRefresh(
  request: Request,
  path: string,
  isPublic: boolean,
  redirect: any,
  next: any
) {
  try {
    debugLog("attempting server-side refresh for path=", path);
    const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { cookie: request.headers.get("cookie") || "" },
    });

    debugLog("refresh response status=", refreshRes.status);

    if (refreshRes.ok) {
      const data = await refreshRes.json().catch(() => ({}));
      const access = data?.access_token ?? null;
      debugLog(
        "✅ Refresh successful - New access_token:",
        access ? "YES" : "NO"
      );

      const cookieValue = `access_token=${access}; ${COOKIE_OPTIONS}`;
      const newRequest = access
        ? createAuthorizedRequest(request, access)
        : request;

      if (isPublic) {
        debugLog("user validated via refresh -> redirect to /dashboard");
        const redirectResponse = redirect("/dashboard");
        redirectResponse.headers.append("Set-Cookie", cookieValue);
        return redirectResponse;
      }

      debugLog("user validated via refresh -> continuing to next handler");
      const response = await next(newRequest);
      response.headers.append("Set-Cookie", cookieValue);
      return response;
    }

    // Refresh failed
    debugLog("❌ Refresh failed - Status:", refreshRes.status);
    if (!isPublic) {
      debugLog("redirecting to /login because refresh failed");
      return redirect("/login");
    }
    return await next();
  } catch (e) {
    debugLog(
      "❌ Error during refresh:",
      e instanceof Error ? e.message : String(e)
    );
    if (!isPublic) {
      debugLog("redirecting to /login because refresh error");
      return redirect("/login");
    }
    return await next();
  }
}

// Check if path is allowed without auth
function isAllowedPath(path: string): boolean {
  return (
    path.startsWith("/auth") ||
    path.startsWith("/api/auth") ||
    path.startsWith("/favicon") ||
    path.startsWith("/assets") ||
    path.startsWith("/_astro") ||
    path.startsWith("/apis") ||
    path === "/"
  );
}

// Main middleware
export const onRequest = defineMiddleware(async (context, next) => {
  const { request, redirect } = context;
  debugLog("invoked for", request.method, request.url);
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  const cookies = parseCookies(request);
  const isPublic = PUBLIC_ROUTES.has(path);
  const hasRefresh = hasRefreshCookie(cookies);

  debugLog("path=", path, "isPublic=", isPublic, "hasRefresh=", hasRefresh);

  // Avoid recursion for refresh endpoint
  if (hasRefresh && (path === "/auth/refresh" || path === "/auth/refresh/")) {
    return await next();
  }

  if (hasRefresh) {
    const accessToken = getAccessToken(cookies);
    const tokenExpired = accessToken ? isTokenExpired(accessToken) : true;

    if (accessToken && !tokenExpired) {
      debugLog("✅ Access token valid - NO refresh");
      const newRequest = createAuthorizedRequest(request, accessToken);

      if (isPublic) {
        debugLog("token valid on public page -> redirect to /dashboard");
        return redirect("/dashboard");
      }

      debugLog("access token valid -> continuing");
      return await next(newRequest);
    }

    // Token expired or missing, attempt refresh
    debugLog("⚠️ Token expired or missing - REFRESH");
    return await handleRefresh(request, path, isPublic, redirect, next);
  }

  // No refresh cookie
  if (!hasRefresh && !isPublic) {
    if (isAllowedPath(path)) {
      if (path === "/") return redirect("/login");
      return await next();
    }
    return redirect("/login");
  }

  // Default: continue
  return await next();
});

export default onRequest;
