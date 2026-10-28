/* ============================================================
   LeoneSIS - login screen
   ============================================================ */
(function () {
  "use strict";

  const form = document.getElementById("loginForm");
  const username = document.getElementById("username");
  const password = document.getElementById("password");
  const remember = document.getElementById("rememberUsername");
  const errorBox = document.getElementById("loginError");
  const button = document.getElementById("loginBtn");
  const toggle = document.getElementById("togglePassword");
  const REMEMBER_KEY = "leonesis.remembered.username";
  const EYE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 3 18 18"/><path d="M10.6 5.8A10.8 10.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17.5 17.5 0 0 1-3.3 4"/><path d="M6.1 7.1A17.4 17.4 0 0 0 2.5 12S6 18.5 12 18.5c1.8 0 3.4-.5 4.7-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.add("show");
  }

  function clearError() {
    errorBox.textContent = "";
    errorBox.classList.remove("show");
  }

  function setBusy(busy) {
    button.disabled = busy;
    button.setAttribute("aria-busy", busy ? "true" : "false");
    button.innerHTML = busy
      ? '<span class="spinner"></span><span>Signing in…</span>'
      : "<span>Sign in</span>";
  }

  function rememberedUsername() {
    try {
      return localStorage.getItem(REMEMBER_KEY) || "";
    } catch (err) {
      return "";
    }
  }

  if (new URLSearchParams(location.search).get("expired")) {
    showError("Your session expired. Please sign in again.");
  }

  const previousUser = rememberedUsername();
  if (previousUser) {
    username.value = previousUser;
    remember.checked = true;
  }

  toggle.addEventListener("click", () => {
    const visible = password.type === "text";
    password.type = visible ? "password" : "text";
    toggle.innerHTML = visible ? EYE : EYE_OFF;
    toggle.setAttribute("aria-label", visible ? "Show password" : "Hide password");
  });

  document.querySelectorAll(".demo-cred").forEach((buttonEl) => {
    buttonEl.addEventListener("click", () => {
      username.value = buttonEl.dataset.user;
      password.value = buttonEl.dataset.pass;
      clearError();
      password.focus();
      password.select();
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();
    if (button.disabled) return;

    const user = username.value.trim();
    const pass = password.value;
    if (!user || !pass) {
      showError("Enter your username and password.");
      (!user ? username : password).focus();
      return;
    }

    setBusy(true);
    try {
      const data = await API.post(
        "/api/auth/login",
        { username: user, password: pass },
        { noSchool: true }
      );
      Store.token = data.token;
      Store.user = data.user;
      try {
        if (remember.checked) localStorage.setItem(REMEMBER_KEY, user);
        else localStorage.removeItem(REMEMBER_KEY);
      } catch (err) {
        /* private browsing can block local storage; sign-in still works */
      }
      if (data.user.role === "SUPER_ADMIN") {
        if (!Store.schoolId) Store.schoolId = "";
      }
      location.replace("index.html");
    } catch (err) {
      setBusy(false);
      showError(err.message || "Sign in failed. Please try again.");
      password.select();
    }
  });

  // A token may already be valid - skip the sign-in screen in that case.
  (async function checkSession() {
    if (!API.token) return;
    try {
      await API.get("/api/auth/me", { noSchool: true });
      location.replace("index.html");
    } catch (err) {
      Store.clearSession();
    }
  })();

  (previousUser ? password : username).focus();
})();
