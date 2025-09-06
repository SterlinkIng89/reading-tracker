import { defineMiddleware } from "astro:middleware";
import apiRoutes from "../public/apis/apiRoutes";
import { decodeJwt } from "jose/jwt/decode";

// Debug variable - change to false in production
const DEBUG = true;

// Helper function for conditional logging
function debugLog(...args: any[]) {
  if (DEBUG) {
    console.log("[middleware]", ...args);
  }
}

// Public routes (do not require login)
const PUBLIC_ROUTES = new Set(["/login", "/register"]);

// Attempts to infer if the user is authenticated:
// - Depends on the presence of the refresh_token cookie (HttpOnly)
// - Optionally could validate an access token sent in Authorization, but here we only use refresh cookie.
function hasRefreshCookie(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return false;
  return cookieHeader.split(/;\s*/).some((c) => c.startsWith("refresh_token="));
}

function getAccessTokenFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(/;\s*/);
  const accessCookie = cookies.find((c) => c.startsWith("access_token="));
  return accessCookie ? accessCookie.split("=")[1] : null;
}

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

// Main middleware
export const onRequest = defineMiddleware(async (context, next) => {
  const { request, redirect } = context;
  debugLog("invoked for", request.method, request.url);
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  const isPublic = PUBLIC_ROUTES.has(path);
  const hasRefresh = hasRefreshCookie(request); // Heuristic: presence of refresh cookie
  // Debug logging to help trace auth decisions on server
  try {
    const cookieHeader = request.headers.get("cookie");
    debugLog(
      "path=",
      path,
      "isPublic=",
      isPublic,
      "cookie=",
      cookieHeader ? "present" : "none",
      "hasRefresh=",
      hasRefresh
    );
  } catch (e) {
    debugLog("debug log failed", e);
  }

  // If there's a refresh cookie, attempt server-side refresh to validate session
  if (hasRefresh) {
    // avoid recursion: if the request itself is to /auth/refresh, let it through
    if (path === "/auth/refresh" || path === "/auth/refresh/") {
      return await next();
    }

    // Check if access token is present and not expired
    const accessToken = getAccessTokenFromCookie(request);
    const tokenExpired = accessToken ? isTokenExpired(accessToken) : true;

    if (!tokenExpired) {
      // Token is valid
      debugLog(
        "✅ Access token found and NOT expired - NO refresh will be performed"
      );
      const newHeaders = new Headers(request.headers);
      newHeaders.set("authorization", `Bearer ${accessToken}`);
      const newRequest = new Request(request, { headers: newHeaders });

      if (isPublic) {
        debugLog("token valid on public page -> redirect to /dashboard");
        return redirect("/dashboard");
      }

      debugLog("access token valid -> continuing without refresh");
      return await next(newRequest);
    }

    // Token expired or not present
    debugLog(
      "⚠️ Access token expired or not found - REFRESH will be performed"
    );
    if (!accessToken) {
      debugLog("❌ No access_token found in cookies");
    } else {
      debugLog("❌ Access token expired");
    }

    // Token expired or not present, attempt refresh
    try {
      debugLog("attempting server-side refresh for path=", path);

      debugLog("cookie header present:", !!request.headers.get("cookie"));
      debugLog(apiRoutes.users.refresh);
      // call backend refresh endpoint and forward cookies
      const refreshRes = await fetch("http://backend:8000/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: { cookie: request.headers.get("cookie") || "" },
      });

      debugLog("refresh response status=", refreshRes.status);

      if (refreshRes.ok) {
        // backend returns JSON with access_token and sets new refresh cookie
        const data = await refreshRes.json().catch(() => ({}));
        const access = data?.access_token ?? null;

        debugLog("✅ Refresh successful - Status:", refreshRes.status);
        debugLog("✅ New access_token received:", access ? "YES" : "NO");

        // Set access_token cookie
        const cookieValue = `access_token=${access}; HttpOnly; Path=/; SameSite=Lax; Secure`;
        debugLog("✅ Access token cookie configured correctly");

        // Inject Authorization header for downstream handlers
        const newHeaders = new Headers(request.headers);
        if (access) newHeaders.set("authorization", `Bearer ${access}`);
        const newRequest = new Request(request, { headers: newHeaders });

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
      // refresh failed
      debugLog("❌ Refresh failed - Status:", refreshRes.status);
      if (!isPublic) {
        debugLog(
          "redirecting to /login because refresh failed and route is protected"
        );
        return redirect("/login");
      }
      return await next();
    } catch (e) {
      debugLog(
        "❌ Error during refresh:",
        e instanceof Error ? e.message : String(e)
      );
      if (!isPublic) {
        debugLog(
          "redirecting to /login because refresh attempt error and route is protected"
        );
        return redirect("/login");
      }
      return await next();
    }
  }

  // No refresh cookie present
  if (!hasRefresh && !isPublic) {
    // allow static and auth endpoints to go through
    if (
      path.startsWith("/auth") ||
      path.startsWith("/api/auth") ||
      path.startsWith("/favicon") ||
      path.startsWith("/assets") ||
      path.startsWith("/_astro") ||
      path.startsWith("/apis") ||
      path === "/"
    ) {
      if (path === "/") return redirect("/login");
      return await next();
    }
    return redirect("/login");
  }

  // Default: continue
  return await next();
});

export default onRequest;
