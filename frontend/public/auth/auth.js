// helpers para tokens (ajusta almacenamiento si usas cookies)
function setTokens(access, refresh) {
  localStorage.setItem("access_token", access);
}
function getAccess() {
  return localStorage.getItem("access_token");
}
function getRefresh() {
  return localStorage.getItem("refresh_token");
}
function getUserInfo() {
  return {
    username: localStorage.getItem("username"),
    id: localStorage.getItem("user_id"),
  };
}

function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

// evita refresh concurrente
let refreshPromise = null;
async function refreshTokens() {
  if (refreshPromise) return refreshPromise;
  // refresh token is stored in HttpOnly cookie; call refresh endpoint with credentials
  refreshPromise = (async () => {
    const res = await fetch("http://localhost:8000/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      clearTokens();
      throw new Error("refresh-failed");
    }
    const data = await res.json();
    setTokens(data.access_token, null);
    return data.access_token;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

// wrapper que añade Authorization y reintenta si 401
export async function authFetch(input, init = {}) {
  init.headers = init.headers ? { ...init.headers } : {};
  if (!init.credentials) init.credentials = "include";
  const addAuth = (token) => {
    if (token) init.headers["Authorization"] = `Bearer ${token}`;
  };
  addAuth(getAccess());
  let res;
  try {
    res = await fetch(input, init);
  } catch (err) {
    throw err;
  }
  if (res.status !== 401) return res;
  try {
    const url = typeof input === "string" ? input : input.url;
    if (url && url.includes("/auth/refresh")) {
      // avoid infinite loop
      clearTokens();
      window.location.href = "/signin";
      throw new Error("refresh-endpoint-401");
    }

    // 401 -> intentar refresh
    const newToken = await refreshTokens();
    addAuth(newToken);
    return await fetch(input, init); // reintento
  } catch (err) {
    // fallo en refresh -> limpiar y redirigir a login
    clearTokens();
    window.location.href = "/signin";
    throw err;
  }
}

// Export helpers for pages (login/register) to call
export { setTokens, clearTokens, getAccess, getRefresh, getUserInfo };
