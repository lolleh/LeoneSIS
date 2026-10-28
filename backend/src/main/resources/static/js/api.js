/* ============================================================
   LeoneSIS - API client
   Token storage, selected-school scoping, fetch wrapper.
   ============================================================ */
(function () {
  "use strict";

  const TOKEN_KEY = "schoolms.token";
  const USER_KEY = "schoolms.user";
  const SCHOOL_KEY = "schoolms.school";

  const Store = {
    get token() {
      return localStorage.getItem(TOKEN_KEY) || "";
    },
    set token(value) {
      if (value) localStorage.setItem(TOKEN_KEY, value);
      else localStorage.removeItem(TOKEN_KEY);
    },
    get user() {
      try {
        return JSON.parse(localStorage.getItem(USER_KEY) || "null");
      } catch (err) {
        return null;
      }
    },
    set user(value) {
      if (value) localStorage.setItem(USER_KEY, JSON.stringify(value));
      else localStorage.removeItem(USER_KEY);
    },
    get schoolId() {
      const value = localStorage.getItem(SCHOOL_KEY);
      return value && value !== "all" ? value : "";
    },
    set schoolId(value) {
      if (value) localStorage.setItem(SCHOOL_KEY, value);
      else localStorage.setItem(SCHOOL_KEY, "all");
    },
    clearSession() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
    clearAll() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(SCHOOL_KEY);
    }
  };

  function isSuperAdmin() {
    const user = Store.user;
    return !!user && user.role === "SUPER_ADMIN";
  }

  function withQuery(path, params) {
    const entries = Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    );
    if (!entries.length) return path;
    const query = entries
      .map(([key, value]) => encodeURIComponent(key) + "=" + encodeURIComponent(value))
      .join("&");
    return path + (path.includes("?") ? "&" : "?") + query;
  }

  function requestUrl(path, options) {
    let url = path;
    if (options.query) url = withQuery(url, options.query);
    // Platform administrators scope every call to the school chosen in the top bar.
    if (!options.noSchool && isSuperAdmin() && Store.schoolId) {
      url = withQuery(url, { schoolId: Store.schoolId });
    }
    return url;
  }

  function requestBody(body) {
    if (!body || body instanceof FormData) return body;
    if (!isSuperAdmin() || !Store.schoolId) return body;
    if (body.schoolId !== undefined) return body;
    return Object.assign({ schoolId: Store.schoolId }, body);
  }

  async function request(path, options) {
    options = options || {};
    const method = (options.method || "GET").toUpperCase();
    const headers = Object.assign({ Accept: "application/json" }, options.headers || {});

    let payload;
    if (options.body !== undefined && options.body !== null) {
      if (options.body instanceof FormData) {
        payload = options.body;
      } else {
        headers["Content-Type"] = "application/json";
        payload = JSON.stringify(requestBody(options.body));
      }
    }

    if (Store.token) headers.Authorization = "Bearer " + Store.token;

    let response;
    try {
      response = await fetch(requestUrl(path, options), {
        method,
        headers,
        body: payload,
        credentials: "same-origin"
      });
    } catch (err) {
      throw new Error("Cannot reach the server. Check your connection and try again.");
    }

    let data = null;
    const type = response.headers.get("content-type") || "";
    if (type.includes("application/json")) {
      try {
        data = await response.json();
      } catch (err) {
        data = null;
      }
    } else {
      const text = await response.text();
      data = text ? { message: text } : null;
    }

    if (response.status === 401) {
      if (Store.token && !path.includes("/auth/login")) {
        Store.clearSession();
        const target = location.pathname.endsWith("login.html") ? "login.html" : "login.html";
        if (!location.pathname.endsWith(target)) {
          location.replace(target + "?expired=1");
          throw new Error("Your session has expired. Please sign in again.");
        }
      }
      throw new Error((data && (data.error || data.message)) || "Invalid username or password.");
    }

    if (!response.ok) {
      const message =
        (data && (data.error || data.message)) ||
        "The request failed (" + response.status + ").";
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  const API = {
    Store,
    get token() {
      return Store.token;
    },
    get user() {
      return Store.user;
    },
    get schoolId() {
      return Store.schoolId;
    },
    get: (path, options) => request(path, Object.assign({}, options, { method: "GET" })),
    post: (path, body, options) =>
      request(path, Object.assign({}, options, { method: "POST", body })),
    put: (path, body, options) =>
      request(path, Object.assign({}, options, { method: "PUT", body })),
    patch: (path, body, options) =>
      request(path, Object.assign({}, options, { method: "PATCH", body })),
    del: (path, options) => request(path, Object.assign({}, options, { method: "DELETE" })),
    upload: (path, formData) =>
      request(path, { method: "POST", body: formData, noSchool: true }),
    fileUrl: (path) => {
      const token = Store.token ? "token=" + encodeURIComponent(Store.token) : "";
      return path + (path.includes("?") ? "&" : "?") + token;
    },
    isSuperAdmin
  };

  window.Store = Store;
  window.API = API;
})();
