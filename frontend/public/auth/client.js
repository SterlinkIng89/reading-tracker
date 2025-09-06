// Helpers cliente para autenticación (reexporta setTokens y añade parse/check)
export { setTokens, clearTokens, getAccess, getRefresh } from "/auth/auth.js";

export function parseJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(payload)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

// intenta refresh silencioso usando /api/auth/refresh y devuelve access token o null
export async function trySilentRefresh(refreshUrl) {
  try {
    const r = await fetch(refreshUrl, {
      method: "POST",
      credentials: "include",
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data?.access_token ?? data?.accessToken ?? null;
  } catch (e) {
    return null;
  }
}

// helper que comprueba y, si es válido, redirige al dashboard. Usa apiRoutes.users.refresh
export async function checkAuthAndRedirect(apiRoutes) {
  try {
    const access = localStorage.getItem("access_token");
    if (access) {
      const payload = parseJwt(access);
      if (payload && payload.exp && payload.exp * 1000 > Date.now() + 5000) {
        // aún válido
        window.location.replace("/dashboard");
        return true;
      }

      // intentar refresh silencioso
      try {
        const newA = await trySilentRefresh(apiRoutes.users.refresh);
        if (newA) {
          // guardar y redirigir
          setTokens(newA, null);
          window.location.replace("/dashboard");
          return true;
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    console.debug("checkAuthAndRedirect error", e);
  }
  return false;
}
