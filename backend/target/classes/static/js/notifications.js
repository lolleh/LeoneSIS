/* ============================================================
   LeoneSIS - notification centre
   ============================================================ */
(function () {
  "use strict";

  const { esc, icon, timeAgo, fmtDateTime, emptyState, toast, fail, confirmDialog } = UI;

  const state = { filter: "all", notifications: [], unread: 0 };

  const TYPE_META = {
    ATTENDANCE: { icon: "attendance", tone: "background:#fff1f2;color:#be123c", label: "Attendance" },
    GRADE: { icon: "grades", tone: "background:#eef2ff;color:#4338ca", label: "Grade" },
    MESSAGE: { icon: "messages", tone: "background:#eff6ff;color:#1d4ed8", label: "Message" },
    SYSTEM: { icon: "info", tone: "background:#f1f5f9;color:#475569", label: "System" }
  };

  function linkFor(type) {
    if (type === "ATTENDANCE") return { href: "attendance.html", label: "Attendance" };
    if (type === "GRADE") return { href: "grades.html", label: "Grades" };
    if (type === "MESSAGE") return { href: "messages.html", label: "Messages" };
    return null;
  }

  function itemsHtml() {
    if (!state.notifications.length) {
      return emptyState({
        icon: "notifications",
        title: state.filter === "unread" ? "You are all caught up" : "No notifications yet",
        text: state.filter === "unread"
          ? "There are no unread alerts right now."
          : "Absence alerts, grade publications and school messages will appear here.",
        action: state.filter === "unread" ? '<button class="btn btn-outline" data-filter="all">View all notifications</button>' : ""
      });
    }

    return state.notifications.map((notification) => {
      const meta = TYPE_META[notification.type] || TYPE_META.SYSTEM;
      const link = linkFor(notification.type);
      return (
        '<div class="notif-item' + (notification.read ? "" : " unread") + '" data-notif="' + esc(notification.id) + '">' +
        '<div class="notif-icon" style="' + meta.tone + '">' + icon(meta.icon) + "</div>" +
        '<div class="notif-body"><div class="n-title">' + esc(notification.title) + "</div>" +
        '<div class="n-text">' + esc(notification.body) + "</div>" +
        '<div class="n-time">' + esc(fmtDateTime(notification.createdAt)) + " · " + timeAgo(notification.createdAt) +
        ' · <span class="badge outline">' + esc(meta.label) + "</span></div>" +
        '<div class="mt-1" style="display:flex;gap:6px;flex-wrap:wrap">' +
        (link ? '<a class="btn btn-sm btn-ghost" href="' + link.href + '">' + icon("arrow") + " " + link.label + "</a>" : "") +
        (!notification.read
          ? '<button class="btn btn-sm btn-ghost" type="button" data-read="' + esc(notification.id) + '">' + icon("check") + " Mark read</button>"
          : "") +
        "</div></div>" +
        '<div class="notif-actions">' +
        (!notification.read ? '<span class="unread-dot"></span>' : "") +
        '<button class="icon-btn danger" type="button" title="Dismiss" data-dismiss="' + esc(notification.id) + '">' + icon("x") + "</button>" +
        "</div></div>"
      );
    }).join("");
  }

  function render() {
    const content = document.getElementById("content");
    content.innerHTML =
      '<div class="page-head"><div><h2>Notification centre</h2>' +
      "<p>" + (state.unread ? state.unread + " unread alert" + (state.unread === 1 ? "" : "s") : "You have no unread alerts") +
      ". Attendance and grade alerts are sent automatically.</p></div>" +
      '<div class="spacer"></div>' +
      (state.unread
        ? '<button class="btn btn-outline" id="markAllRead">' + icon("check") + " Mark all read</button>"
        : "") +
      '<button class="btn btn-primary" id="refreshNotifications">' + icon("refresh") + " Refresh</button></div>" +
      '<div class="tabs mb-3">' +
      '<button class="tab' + (state.filter === "all" ? " active" : "") + '" type="button" data-filter="all">All</button>' +
      '<button class="tab' + (state.filter === "unread" ? " active" : "") + '" type="button" data-filter="unread">Unread' +
      (state.unread ? " (" + state.unread + ")" : "") + "</button></div>" +
      '<div class="card">' + itemsHtml() + "</div>";

    content.querySelectorAll("[data-filter]").forEach((btn) =>
      btn.addEventListener("click", () => {
        state.filter = btn.getAttribute("data-filter");
        load();
      })
    );
    content.querySelector("#refreshNotifications").addEventListener("click", () => load(true));
    const markAll = content.querySelector("#markAllRead");
    if (markAll) markAll.addEventListener("click", markAllRead);
    bindActions();
  }

  function bindActions() {
    const content = document.getElementById("content");
    content.querySelectorAll("[data-read]").forEach((btn) =>
      btn.addEventListener("click", () => markRead(btn.getAttribute("data-read")))
    );
    content.querySelectorAll("[data-dismiss]").forEach((btn) =>
      btn.addEventListener("click", () => dismiss(btn.getAttribute("data-dismiss")))
    );
    content.querySelectorAll("[data-filter]").forEach((btn) => {
      if (btn.closest(".empty")) {
        btn.addEventListener("click", () => {
          state.filter = "all";
          load();
        });
      }
    });
  }

  async function load(showToast) {
    const content = document.getElementById("content");
    if (!state.notifications.length) content.innerHTML = UI.loading(4);
    try {
      const data = await API.get("/api/notifications", {
        noSchool: true,
        query: { unreadOnly: state.filter === "unread" }
      });
      state.notifications = data.notifications || [];
      state.unread = Number(data.unread || 0);
      render();
      UI.refreshUnread();
      if (showToast) toast("Notifications refreshed.", "success", 1800);
    } catch (err) {
      if (err.status === 401) return;
      content.innerHTML = '<div class="card"><div class="card-body">' +
        emptyState({ icon: "alert", title: "Could not load notifications", text: err.message }) + "</div></div>";
    }
  }

  async function markRead(id) {
    try {
      const result = await API.post("/api/notifications/" + id + "/read", null, { noSchool: true });
      state.unread = Number(result.unread || 0);
      const item = state.notifications.find((notification) => notification.id === id);
      if (item) item.read = true;
      if (state.filter === "unread") state.notifications = state.notifications.filter((notification) => notification.id !== id);
      render();
      UI.refreshUnread();
    } catch (err) {
      fail(err);
    }
  }

  async function markAllRead() {
    try {
      const result = await API.post("/api/notifications/read-all", null, { noSchool: true });
      state.unread = 0;
      state.notifications.forEach((notification) => {
        notification.read = true;
      });
      if (state.filter === "unread") state.notifications = [];
      render();
      UI.refreshUnread();
      toast(result.message || "All notifications marked as read.", "success");
    } catch (err) {
      fail(err);
    }
  }

  async function dismiss(id) {
    const ok = await confirmDialog({
      title: "Dismiss notification?",
      message: "This removes it from your notification centre.",
      confirmText: "Dismiss"
    });
    if (!ok) return;
    try {
      const result = await API.del("/api/notifications/" + id, { noSchool: true });
      state.notifications = state.notifications.filter((notification) => notification.id !== id);
      state.unread = Number(result.unread || 0);
      render();
      UI.refreshUnread();
      toast(result.message || "Notification dismissed.", "success");
    } catch (err) {
      fail(err);
    }
  }

  window.renderPage = async function () {
    await load(false);
  };
})();
