// import.meta.env is available during bundling, but when this file is served
// directly from /public the browser's import.meta may not include an `env` object.
// Guard access and fall back to a runtime global `window.PUBLIC_API_BASE` or localhost.
export const API_BASE = "http://localhost:8000";

// http://localhost:8000
// http://backend:8000

const apiRoutes = {
  users: {
    login: `${API_BASE}/auth/login`,
    refresh: `${API_BASE}/auth/refresh`,
    logout: `${API_BASE}/auth/logout`,
    register: `${API_BASE}/users/register`,
    me: `${API_BASE}/users/me`,
  },
  books: {
    list: `${API_BASE}/books`,
    create: `${API_BASE}/books`,
    byId: (id) => `${API_BASE}/books/${id}`,
  },
};

export default apiRoutes;
