/* ============================================================
   LeoneSIS - application shell and shared UI helpers
   ============================================================ */
(function () {
  "use strict";

  const APP = {
    user: null,
    meta: null,
    modules: [],
    allModules: [],
    schools: [],
    classes: [],
    subjects: [],
    schoolId: null,
    page: document.body.dataset.page || "dashboard",
    family: false
  };

  const PAGES = {
    dashboard: {
      title: "Overview",
      subtitle: "A vibrant snapshot of everything happening across your school community.",
      module: "dashboard"
    },
    schools: {
      title: "Schools",
      subtitle: "Create schools, update their profiles and review enrollment.",
      module: "schools"
    },
    users: {
      title: "Accounts & access",
      subtitle: "Manage portal users, roles and module privileges.",
      module: "users",
      requiresSchool: true
    },
    students: {
      title: "Students",
      familyTitle: "My students",
      subtitle: "Enrollment records, guardians and portal access.",
      familySubtitle: "Attendance, grades and school details for your children.",
      module: "students",
      requiresSchool: true
    },
    staff: {
      title: "Staff",
      subtitle: "Teaching and support team members.",
      module: "staff",
      requiresSchool: true
    },
    attendance: {
      title: "Attendance",
      familyTitle: "Attendance record",
      subtitle: "Take the daily register and alert parents automatically.",
      familySubtitle: "Daily attendance history for your children.",
      module: "attendance",
      requiresSchool: true
    },
    grades: {
      title: "Grades & assessments",
      familyTitle: "Grades",
      subtitle: "Post scores, publish results and track form averages.",
      familySubtitle: "Assessment results published by your teachers.",
      module: "grades",
      requiresSchool: true
    },
    fees: {
      title: "Fees & charges",
      familyTitle: "Fees & receipts",
      subtitle: "Track every charge and payment, monitor balances and issue receipts.",
      familySubtitle: "School charges, payments and printable receipts for your children.",
      module: "fees",
      requiresSchool: true
    },
    library: {
      title: "Library",
      subtitle: "Reading material and resources shared by your school.",
      module: "library",
      requiresSchool: true
    },
    messages: {
      title: "Messages",
      subtitle: "Talk to families, students and colleagues.",
      module: "messages",
      requiresSchool: true
    },
    notifications: {
      title: "Notifications",
      familyTitle: "Notifications",
      subtitle: "Absence alerts, grade updates and announcements.",
      module: "notifications"
    }
  };

  /* ---------------------------------------------------------- icons */
  const ICONS = {
    dashboard:
      '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    school:
      '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5"/><path d="M22 10v6"/>',
    users:
      '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 21v-1.6a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4V21"/><path d="M16.5 4.6a3.4 3.4 0 0 1 0 6.8"/><path d="M18 15.4a4 4 0 0 1 3.5 4V21"/>',
    students:
      '<path d="M12 3 2 7.5 12 12l10-4.5L12 3Z"/><path d="M6 10v5.2c0 1.8 2.7 3.3 6 3.3s6-1.5 6-3.3V10"/><path d="M22 7.5V14"/>',
    staff:
      '<rect x="2.5" y="7" width="19" height="13" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2.5 12.5h19"/>',
    attendance:
      '<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/><path d="m8.8 15.8 2.2 2.2 4.4-4.5"/>',
    library:
      '<path d="M2 3.5h6a4 4 0 0 1 4 4V21a3 3 0 0 0-3-3H2Z"/><path d="M22 3.5h-6a4 4 0 0 0-4 4V21a3 3 0 0 1 3-3h7Z"/>',
    messages:
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
    grades:
      '<circle cx="12" cy="8" r="5.5"/><path d="M15.6 12.8 17 22l-5-2.8L7 22l1.4-9.2"/>',
    fees:
      '<path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 18V7A1.5 1.5 0 0 1 4 5.5Z"/><path d="M2.5 9h19"/><path d="M16.5 14.5h2"/><path d="M7 15.5h3"/>',
    receipt:
      '<path d="M5 2.5h14v19l-2.3-1.6L14.4 21 12 19.4 9.6 21l-2.3-1.6L5 21Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    print:
      '<path d="M6 9V2.5h12V9"/><path d="M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7.5" rx="1"/>',
    notifications:
      '<path d="M18 8.5a6 6 0 0 0-12 0c0 7-3 8.5-3 8.5h18s-3-1.5-3-8.5"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    logout:
      '<path d="M9.5 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4.5"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    search: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.4-4.4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit:
      '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>',
    trash:
      '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/>',
    eye:
      '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
    download:
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    upload:
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    calendar:
      '<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    alert:
      '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 11v5M12 7.5h.01"/>',
    success:
      '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="M22 4 12 14.01l-3-3"/>',
    lock:
      '<rect x="3.5" y="10.5" width="17" height="11" rx="2"/><path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5"/>',
    user:
      '<circle cx="12" cy="8" r="4"/><path d="M4.5 21v-1.5a6 6 0 0 1 6-6h3a6 6 0 0 1 6 6V21"/>',
    mail:
      '<rect x="2" y="4.5" width="20" height="15" rx="2"/><path d="m2.5 7 8.9 5.6a2 2 0 0 0 2.2 0L22.5 7"/>',
    phone:
      '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.1 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.7 2Z"/>',
    pin:
      '<path d="M20 10c0 6.5-8 12-8 12S4 16.5 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    refresh:
      '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
    clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2"/>',
    arrow: '<path d="M4.5 12h15"/><path d="m13 5.5 6.5 6.5L13 18.5"/>',
    book:
      '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
    file:
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>',
    clipboard:
      '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6"/>',
    trending:
      '<path d="m22 6-8.5 8.5-4-4L2 18"/><path d="M17 6h5v5"/>',
    shield:
      '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    spark:
      '<path d="m12 2 2.2 6.3L21 10.5l-6.8 2.2L12 19l-2.2-6.3L3 10.5l6.8-2.2Z"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8Z"/>'
  };

  function icon(name, cls) {
    const path = ICONS[name] || ICONS.info;
    return (
      '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      path +
      "</svg>"
    );
  }

  /* ---------------------------------------------------------- helpers */
  function esc(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmtDate(value) {
    if (!value) return "—";
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
    if (!match) return String(value);
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }

  function fmtDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function timeAgo(value) {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";
    const seconds = Math.round((Date.now() - date.getTime()) / 1000);
    if (seconds < 45) return "just now";
    if (seconds < 3600) return Math.round(seconds / 60) + "m ago";
    if (seconds < 86400) return Math.round(seconds / 3600) + "h ago";
    if (seconds < 604800) return Math.round(seconds / 86400) + "d ago";
    return fmtDate(value);
  }

  function initials(name) {
    const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  const ROLE_LABELS = {
    SUPER_ADMIN: "Platform admin",
    PLATFORM_ADMIN: "Platform admin",
    ADMIN: "School admin",
    SCHOOL_ADMIN: "School admin",
    TEACHER: "Teacher",
    STAFF: "Staff",
    PARENT: "Parent",
    STUDENT: "Student"
  };

  const ROLE_TONES = {
    SUPER_ADMIN: "violet",
    PLATFORM_ADMIN: "violet",
    ADMIN: "indigo",
    SCHOOL_ADMIN: "indigo",
    TEACHER: "cyan",
    STAFF: "blue",
    PARENT: "amber",
    STUDENT: "emerald"
  };

  function roleLabel(role) {
    return ROLE_LABELS[role] || role || "User";
  }

  function roleBadge(role) {
    return '<span class="badge ' + (ROLE_TONES[role] || "gray") + '">' + esc(roleLabel(role)) + "</span>";
  }

  function statusMeta(status) {
    switch (status) {
      case "PRESENT":
        return { label: "Present", tone: "emerald" };
      case "ABSENT":
        return { label: "Absent", tone: "rose" };
      case "LATE":
        return { label: "Late", tone: "amber" };
      case "EXCUSED":
        return { label: "Excused", tone: "blue" };
      default:
        return { label: "Not marked", tone: "gray" };
    }
  }

  function statusBadge(status) {
    const meta = statusMeta(status);
    return '<span class="badge ' + meta.tone + '">' + meta.label + "</span>";
  }

  const LEVEL_GROUPS = [
    { label: "JSS — Junior Secondary School", levels: ["JSS 1", "JSS 2", "JSS 3"] },
    { label: "SSS — Senior Secondary School", levels: ["SSS 1", "SSS 2", "SSS 3"] }
  ];

  function levelOptions(selected, placeholder) {
    const current = selected == null ? "" : String(selected);
    const known = LEVEL_GROUPS.some((group) => group.levels.includes(current));
    let html = '<option value="">' + esc(placeholder || "Select level") + "</option>";
    LEVEL_GROUPS.forEach((group) => {
      html += '<optgroup label="' + esc(group.label) + '">';
      group.levels.forEach((level) => {
        html += '<option value="' + esc(level) + '"' + (current === level ? " selected" : "") + ">" + esc(level) + "</option>";
      });
      html += "</optgroup>";
    });
    if (current && !known) {
      html += '<option value="' + esc(current) + '" selected>' + esc(current) + "</option>";
    }
    return html;
  }

  function gradeClass(letter) {
    if (!letter) return "";
    const first = String(letter).charAt(0).toUpperCase();
    return ["A", "B", "C", "D", "F"].includes(first) ? first.toLowerCase() : "";
  }

  function gradePill(letter) {
    if (!letter) return '<span class="muted">—</span>';
    return '<span class="grade-pill ' + gradeClass(letter) + '">' + esc(letter) + "</span>";
  }

  function fmtBytes(bytes) {
    if (!bytes && bytes !== 0) return "—";
    const units = ["B", "KB", "MB", "GB"];
    let value = Number(bytes);
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index++;
    }
    return (index === 0 ? value : value.toFixed(1)) + " " + units[index];
  }

  function todayISO() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return now.getFullYear() + "-" + month + "-" + day;
  }

  function percent(value, digits) {
    const number = Number(value);
    if (!isFinite(number)) return "—";
    return number.toFixed(digits === undefined ? 1 : digits) + "%";
  }

  function money(value, symbol) {
    const number = Number(value == null ? 0 : value);
    if (!isFinite(number)) return "—";
    const sign = number < 0 ? "-" : "";
    const amount = Math.abs(number).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return sign + (symbol || "Le") + " " + amount;
  }

  function debounce(fn, wait) {
    let timer = null;
    return function () {
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(null, args), wait || 280);
    };
  }

  function avatar(name, cls) {
    return '<div class="avatar ' + (cls || "") + '">' + esc(initials(name)) + "</div>";
  }

  function emptyState(options) {
    return (
      '<div class="empty">' +
      '<div class="icon">' + icon(options.icon || "spark") + "</div>" +
      "<h3>" + esc(options.title || "Nothing here yet") + "</h3>" +
      "<p>" + esc(options.text || "") + "</p>" +
      (options.action ? '<div class="mt-3">' + options.action + "</div>" : "") +
      "</div>"
    );
  }

  function loading(rows) {
    let html = '<div class="card"><div class="card-body">';
    for (let i = 0; i < (rows || 4); i++) {
      html +=
        '<div class="skeleton" style="height:18px;margin-bottom:' +
        (i === (rows || 4) - 1 ? 0 : 14) +
        "px;width:" +
        (92 - i * 9) +
        '%"></div>';
    }
    return html + "</div></div>";
  }

  /* ---------------------------------------------------------- toasts */
  function toast(message, type, timeout) {
    let stack = document.getElementById("toastStack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "toastStack";
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    const el = document.createElement("div");
    el.className = "toast " + (type || "");
    el.innerHTML =
      (type === "error" ? icon("alert") : type === "success" ? icon("success") : icon("info")) +
      "<span>" + esc(message) + "</span>" +
      '<button class="close" type="button" aria-label="Dismiss">' + icon("x") + "</button>";
    stack.appendChild(el);
    const remove = () => {
      el.style.opacity = "0";
      el.style.transition = "opacity .2s";
      setTimeout(() => el.remove(), 200);
    };
    el.querySelector(".close").addEventListener("click", remove);
    setTimeout(remove, timeout || 4200);
  }

  function fail(error) {
    toast(error && error.message ? error.message : String(error), "error", 5200);
  }

  /* ---------------------------------------------------------- modals */
  function openModal(inner, options) {
    options = options || {};
    let root = document.getElementById("modalRoot");
    if (!root) {
      root = document.createElement("div");
      root.id = "modalRoot";
      document.body.appendChild(root);
    }
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.innerHTML =
      '<div class="modal ' + (options.size || "") + '">' + inner + "</div>";
    root.appendChild(overlay);
    overlay.addEventListener("mousedown", (event) => {
      if (event.target === overlay && !options.sticky) closeModal(overlay);
    });
    overlay.querySelectorAll("[data-close]").forEach((btn) => {
      btn.addEventListener("click", () => closeModal(overlay));
    });
    const focusable = overlay.querySelector("input,select,textarea,button");
    if (focusable && options.focus !== false) setTimeout(() => focusable.focus(), 30);
    return overlay;
  }

  function closeModal(target) {
    const overlay = target
      ? target.closest
        ? target.closest(".overlay")
        : target
      : document.querySelectorAll("#modalRoot .overlay");
    if (overlay && overlay.remove) {
      overlay.remove();
      return;
    }
    if (overlay && overlay.length) overlay[overlay.length - 1].remove();
  }

  function modalHeader(title, subtitle) {
    return (
      '<div class="modal-head"><div><h3>' + esc(title) + "</h3>" +
      (subtitle ? '<div class="sub">' + esc(subtitle) + "</div>" : "") +
      '</div><div class="spacer"></div>' +
      '<button class="modal-close" type="button" data-close aria-label="Close">' + icon("x") + "</button></div>"
    );
  }

  function confirmDialog(options) {
    return new Promise((resolve) => {
      const overlay = openModal(
        modalHeader(options.title || "Are you sure?", options.subtitle) +
          '<div class="modal-body"><p class="small" style="color:var(--ink-soft)">' +
          esc(options.message || "") +
          "</p></div>" +
          '<div class="modal-foot">' +
          '<button class="btn btn-outline" type="button" data-cancel>Cancel</button>' +
          '<button class="btn ' + (options.danger ? "btn-danger" : "btn-primary") + '" type="button" data-confirm>' +
          esc(options.confirmText || "Confirm") +
          "</button></div>",
        { focus: false }
      );
      overlay.querySelector("[data-cancel]").addEventListener("click", () => {
        closeModal(overlay);
        resolve(false);
      });
      overlay.querySelector("[data-confirm]").addEventListener("click", () => {
        closeModal(overlay);
        resolve(true);
      });
    });
  }

  /* ---------------------------------------------------------- shell */
  function navGroups() {
    const modules = APP.modules;
    const has = (key) => modules.includes(key);
    const groups = [];
    const main = [];
    if (has("dashboard")) main.push("dashboard");
    if (has("schools")) main.push("schools");
    if (has("users")) main.push("users");
    if (has("students")) main.push("students");
    if (has("staff")) main.push("staff");
    if (main.length) groups.push({ label: "Workspace", items: main });

    const academics = [];
    if (has("attendance")) academics.push("attendance");
    if (has("grades")) academics.push("grades");
    if (has("library")) academics.push("library");
    if (academics.length) groups.push({ label: "Academics", items: academics });

    const finance = [];
    if (has("fees")) finance.push("fees");
    if (finance.length) groups.push({ label: "Finance", items: finance });

    const community = [];
    if (has("messages")) community.push("messages");
    if (has("notifications")) community.push("notifications");
    if (community.length) groups.push({ label: "Communication", items: community });
    return groups;
  }

  const NAV_LABELS = {
    dashboard: "Overview",
    schools: "Schools",
    users: "Accounts & access",
    students: "Students",
    staff: "Staff",
    attendance: "Attendance",
    grades: "Grades",
    fees: "Fees & charges",
    library: "Library",
    messages: "Messages",
    notifications: "Notifications"
  };

  function renderSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    const groups = navGroups()
      .map(
        (group) =>
          '<div class="nav-group"><div class="nav-label">' +
          esc(group.label) +
          "</div>" +
          group.items
            .map((key) => {
              const active = key === APP.page ? " active" : "";
              const badge =
                key === "notifications"
                  ? '<span class="nav-badge" data-notif-badge style="display:none">0</span>'
                  : "";
              return (
                '<a class="nav-link' + active + '" href="' + (key === "dashboard" ? "index.html" : key + ".html") + '">' +
                icon(key) +
                "<span>" + esc(NAV_LABELS[key] || key) + "</span>" +
                badge +
                "</a>"
              );
            })
            .join("") +
          "</div>"
      )
      .join("");

    sidebar.innerHTML =
      '<a class="brand brand-lockup" href="index.html" aria-label="LeoneSIS home">' +
      '<span class="brand-logo-plate">' +
      '<img class="brand-mark-img" src="/logo-mark-light.png" alt="">' +
      '<img class="brand-wordmark-img" src="/logo-wordmark-light.png" alt="LeoneSIS">' +
      "</span></a>" +
      '<nav class="nav">' + groups + "</nav>" +
      '<div class="sidebar-footer">' +
      '<div class="side-user">' +
      avatar(APP.user.fullName) +
      '<div class="meta"><div class="name">' + esc(APP.user.fullName) + "</div>" +
      '<div class="role">' + esc(roleLabel(APP.user.role)) + "</div></div></div>" +
      '<button class="logout-btn" type="button" id="logoutBtn">' + icon("logout") + "<span>Sign out</span></button>" +
      "</div>";

    sidebar.querySelector("#logoutBtn").addEventListener("click", logout);
  }

  function schoolSwitcher() {
    if (APP.user.role === "SUPER_ADMIN") {
      const options = ['<option value="">All schools (platform)</option>']
        .concat(
          APP.schools.map(
            (school) =>
              '<option value="' + esc(school.id) + '"' +
              (APP.schoolId === school.id ? " selected" : "") +
              ">" + esc(school.name) + (school.active ? "" : " (inactive)") + "</option>"
          )
        )
        .join("");
      return (
        '<label class="school-switcher" title="Switch school">' +
        icon("school") +
        '<select id="schoolSwitch" aria-label="Active school">' + options + "</select>" +
        "</label>"
      );
    }
    const school = APP.schools[0];
    return (
      '<span class="school-switcher">' + icon("school") +
      "<span>" + esc(school ? school.name : "School workspace") + "</span></span>"
    );
  }

  function renderTopbar() {
    const topbar = document.getElementById("topbar");
    if (!topbar) return;
    const config = PAGES[APP.page] || PAGES.dashboard;
    const title =
      (APP.family && config.familyTitle) || config.title || "LeoneSIS";
    const subtitle =
      (APP.family && config.familySubtitle) || config.subtitle || "";
    topbar.innerHTML =
      '<button class="icon-btn mobile-menu" id="menuBtn" type="button" aria-label="Open navigation">' +
      icon("menu") +
      "</button>" +
      '<div class="topbar-head"><div class="page-title">' + esc(title) + "</div>" +
      '<div class="page-subtitle" id="pageSubtitle">' + esc(subtitle) + "</div></div>" +
      '<div class="topbar-actions">' +
      schoolSwitcher() +
      '<button class="bell" type="button" id="bellBtn" aria-label="Notifications">' + icon("notifications") +
      '<span class="dot" data-notif-badge style="display:none">0</span></button>' +
      '<div class="top-user">' +
      avatar(APP.user.fullName) +
      '<div><div class="name">' + esc(APP.user.fullName) + "</div>" +
      '<div class="role">' + esc(roleLabel(APP.user.role)) + "</div></div>" +
      "</div></div>";

    topbar.querySelector("#bellBtn").addEventListener("click", () => {
      location.href = "notifications.html";
    });
    topbar.querySelector("#menuBtn").addEventListener("click", toggleSidebar);

    const switcher = topbar.querySelector("#schoolSwitch");
    if (switcher) {
      switcher.addEventListener("change", () => {
        Store.schoolId = switcher.value;
        location.reload();
      });
    }
  }

  function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    sidebar.classList.toggle("open");
    let scrim = document.querySelector(".sidebar-scrim");
    if (!scrim) {
      scrim = document.createElement("div");
      scrim.className = "sidebar-scrim";
      document.body.appendChild(scrim);
      scrim.addEventListener("click", () => {
        sidebar.classList.remove("open");
        scrim.classList.remove("show");
      });
    }
    scrim.classList.toggle("show", sidebar.classList.contains("open"));
  }

  async function logout() {
    const ok = await confirmDialog({
      title: "Sign out?",
      message: "You will need to sign in again to access the portal.",
      confirmText: "Sign out"
    });
    if (!ok) return;
    try {
      await API.post("/api/auth/logout", null, { noSchool: true });
    } catch (err) {
      /* the local session is cleared regardless */
    }
    Store.clearAll();
    location.replace("login.html");
  }

  /* ---------------------------------------------------------- misc shell bits */
  function setSubtitle(text) {
    const el = document.getElementById("pageSubtitle");
    if (el) el.textContent = text;
  }

  async function refreshUnread() {
    try {
      const data = await API.get("/api/notifications/count", { noSchool: true });
      const count = Number(data.unread || 0);
      document.querySelectorAll("[data-notif-badge]").forEach((badge) => {
        if (count > 0) {
          badge.textContent = count > 99 ? "99+" : String(count);
          badge.style.display = "";
        } else {
          badge.style.display = "none";
        }
      });
    } catch (err) {
      /* silent - polling should never interrupt the page */
    }
  }

  let pollTimer = null;
  function startPolling() {
    refreshUnread();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (!document.hidden) refreshUnread();
    }, 45000);
  }

  function accessDenied(config) {
    const content = document.getElementById("content");
    content.innerHTML =
      '<div class="card"><div class="card-body">' +
      emptyState({
        icon: "lock",
        title: "No access to this module",
        text:
          "Your account does not have the \"" +
          (config.title || APP.page) +
          "\" privilege. Ask an administrator to grant it from Accounts & access.",
        action: '<a class="btn btn-primary" href="index.html">Back to overview</a>'
      }) +
      "</div></div>";
  }

  function chooseSchool(config) {
    const content = document.getElementById("content");
    const cards = APP.schools
      .filter((school) => school.active)
      .map(
        (school) =>
          '<button class="quick-action" type="button" data-pick-school="' + esc(school.id) + '">' +
          '<div class="q-icon">' + icon("school") + "</div>" +
          '<div><div class="q-title">' + esc(school.name) + "</div>" +
          '<div class="q-sub">' + esc(school.code) + " · select to continue</div></div></button>"
      )
      .join("");
    content.innerHTML =
      '<div class="card"><div class="card-body">' +
      '<div class="page-head"><div><h2>Choose a school</h2>' +
      "<p>" + esc(config.title) + " is a school-level workspace. Pick the school you want to work in.</p></div></div>" +
      (cards
        ? '<div class="quick-grid">' + cards + "</div>"
        : emptyState({
            icon: "school",
            title: "No active schools",
            text: "Create a school first from the Schools page.",
            action: '<a class="btn btn-primary" href="schools.html">Manage schools</a>'
          })) +
      "</div></div>";
    content.querySelectorAll("[data-pick-school]").forEach((btn) => {
      btn.addEventListener("click", () => {
        Store.schoolId = btn.getAttribute("data-pick-school");
        location.reload();
      });
    });
  }

  /* ---------------------------------------------------------- boot */
  async function boot() {
    if (!API.token) {
      location.replace("login.html");
      return;
    }

    const config = PAGES[APP.page] || PAGES.dashboard;

    let meta;
    try {
      meta = await API.get("/api/meta", { noSchool: true });
    } catch (err) {
      if (!API.token) return;
      toast(err.message || "Could not load your session.", "error");
      if (err.status === 401) return;
      document.getElementById("content").innerHTML =
        '<div class="card"><div class="card-body">' +
        emptyState({
          icon: "alert",
          title: "Could not start the workspace",
          text: err.message,
          action: '<button class="btn btn-primary" onclick="location.reload()">Try again</button>'
        }) +
        "</div></div>";
      return;
    }

    APP.meta = meta;
    APP.user = meta.user;
    APP.modules = meta.modules || [];
    APP.allModules = meta.allModules || [];
    APP.schools = meta.schools || [];
    APP.family = APP.user.role === "PARENT" || APP.user.role === "STUDENT";
    Store.user = APP.user;

    if (APP.user.role === "SUPER_ADMIN") {
      const stored = Store.schoolId;
      const valid = meta.schools.some((school) => school.id === stored);
      APP.schoolId = valid ? stored : null;
      if (stored && !valid) Store.schoolId = "";
    } else {
      APP.schoolId = APP.user.schoolId || null;
    }

    // Re-read metadata with the resolved school so class/subject lists are current.
    if (APP.user.role === "SUPER_ADMIN" && APP.schoolId) {
      try {
        meta = await API.get("/api/meta");
        APP.meta = meta;
        APP.classes = meta.classes || [];
        APP.subjects = meta.subjects || [];
      } catch (err) {
        APP.classes = [];
        APP.subjects = [];
      }
    } else {
      APP.classes = meta.classes || [];
      APP.subjects = meta.subjects || [];
    }

    renderSidebar();
    renderTopbar();
    startPolling();

    if (!APP.modules.includes(config.module)) {
      accessDenied(config);
      return;
    }
    if (config.requiresSchool && APP.user.role === "SUPER_ADMIN" && !APP.schoolId) {
      chooseSchool(config);
      return;
    }

    const content = document.getElementById("content");
    if (!content) return;
    try {
      if (typeof window.renderPage === "function") {
        await window.renderPage(APP);
      }
    } catch (err) {
      if (err && err.status === 401) return;
      content.innerHTML =
        '<div class="card"><div class="card-body">' +
        emptyState({
          icon: "alert",
          title: "This page could not load",
          text: err && err.message ? err.message : "Unexpected error.",
          action: '<button class="btn btn-primary" onclick="location.reload()">Reload</button>'
        }) +
        "</div></div>";
    }
  }

  window.APP = APP;
  window.UI = {
    icon,
    esc,
    fmtDate,
    fmtDateTime,
    timeAgo,
    initials,
    avatar,
    roleLabel,
    roleBadge,
    statusMeta,
    statusBadge,
    gradeClass,
    levelOptions,
    gradePill,
    fmtBytes,
    todayISO,
    percent,
    money,
    debounce,
    emptyState,
    loading,
    toast,
    fail,
    openModal,
    closeModal,
    modalHeader,
    confirmDialog,
    setSubtitle,
    refreshUnread,
    logout
  };

  document.addEventListener("DOMContentLoaded", boot);
})();
