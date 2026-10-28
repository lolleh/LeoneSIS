/* ============================================================
   LeoneSIS - dashboard overview
   ============================================================ */
(function () {
  "use strict";

  const {
    esc, icon, avatar, fmtDate, timeAgo, statusBadge, gradePill, percent, emptyState, loading
  } = UI;

  const STAT_ICONS = {
    school: "school",
    students: "students",
    staff: "staff",
    users: "users",
    attendance: "attendance",
    library: "library",
    messages: "messages",
    bell: "notifications"
  };

  function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  function notifIcon(type) {
    if (type === "ATTENDANCE") return "attendance";
    if (type === "GRADE") return "grades";
    if (type === "MESSAGE") return "messages";
    return "info";
  }

  function statCards(stats) {
    return stats
      .map(
        (stat) =>
          '<div class="stat">' +
          '<div class="stat-icon tone-' + esc(stat.tone || "indigo") + '">' +
          icon(STAT_ICONS[stat.icon] || "trending") +
          "</div>" +
          '<div style="min-width:0"><div class="stat-label">' + esc(stat.label) + "</div>" +
          '<div class="stat-value">' + esc(stat.value) + "</div>" +
          '<div class="stat-hint">' + esc(stat.hint || "") + "</div></div></div>"
      )
      .join("");
  }

  function notificationsCard(items) {
    const body = items && items.length
      ? '<div class="feed">' + items.map((item) =>
          '<div class="feed-item">' +
          '<div class="feed-icon" style="' + (item.type === "ATTENDANCE" ? "background:#fff1f2;color:#be123c" : item.type === "GRADE" ? "background:#eef2ff;color:#4338ca" : "") + '">' +
          icon(notifIcon(item.type)) + "</div>" +
          '<div class="feed-body"><div class="feed-title">' + esc(item.title) + "</div>" +
          '<div class="feed-text">' + esc(item.body) + "</div>" +
          '<div class="feed-time">' + timeAgo(item.createdAt) + "</div></div>" +
          (item.read ? "" : '<span class="unread-dot"></span>') +
          "</div>"
        ).join("") + "</div>"
      : emptyState({ icon: "notifications", title: "No notifications yet", text: "Absence alerts and grade updates will appear here." });

    return (
      '<div class="card"><div class="card-head"><h3>Recent notifications</h3>' +
      '<div class="spacer"></div><a class="small" href="notifications.html">View all</a></div>' +
      '<div class="card-body" style="padding-top:4px;padding-bottom:6px">' + body + "</div></div>"
    );
  }

  function messagesCard(items) {
    const body = items && items.length
      ? '<div class="feed">' + items.map((item) =>
          '<div class="feed-item">' +
          '<div class="feed-icon">' + icon("messages") + "</div>" +
          '<div class="feed-body"><div class="feed-title">' + esc(item.subject) + "</div>" +
          '<div class="feed-text">' + esc(item.senderName) + " · " + esc(item.body) + "</div>" +
          '<div class="feed-time">' + timeAgo(item.sentAt) + "</div></div>" +
          (item.readAt ? "" : '<span class="unread-dot"></span>') +
          "</div>"
        ).join("") + "</div>"
      : emptyState({ icon: "messages", title: "Inbox is clear", text: "Messages from teachers and the school office will appear here." });

    return (
      '<div class="card"><div class="card-head"><h3>Inbox</h3>' +
      '<div class="spacer"></div><a class="small" href="messages.html">Open messages</a></div>' +
      '<div class="card-body" style="padding-top:4px;padding-bottom:6px">' + body + "</div></div>"
    );
  }

  function platformView(data) {
    const rows = data.schools.map((school) =>
      '<tr>' +
      '<td><div class="name-cell"><div class="avatar sm">' + esc(school.code.slice(0, 2)) + "</div>" +
      '<div><div class="name">' + esc(school.name) + "</div>" +
      '<div class="sub">' + esc(school.code) + (school.city ? " · " + esc(school.city) : "") + "</div></div></div></td>" +
      '<td class="muted">' + esc(school.principal || "—") + "</td>" +
      '<td><span class="bold">' + esc(school.students) + "</span> <span class=\"muted tiny\">students</span></td>" +
      '<td><span class="bold">' + esc(school.staff) + "</span> <span class=\"muted tiny\">staff</span></td>" +
      '<td><span class="bold">' + esc(school.users) + "</span> <span class=\"muted tiny\">accounts</span></td>" +
      '<td>' + (school.active
        ? '<span class="badge emerald">Active</span>'
        : '<span class="badge gray">Inactive</span>') + "</td>" +
      '<td><div class="actions"><button class="btn btn-sm btn-outline" data-open-school="' + esc(school.id) + '">Open</button></div></td>' +
      "</tr>"
    ).join("");

    return (
      '<div class="card" style="grid-column:1/-1"><div class="card-head"><h3>Schools on the platform</h3>' +
      '<div class="sub">' + data.schools.length + " school" + (data.schools.length === 1 ? "" : "s") + "</div>" +
      '<div class="spacer"></div><a class="btn btn-sm btn-outline" href="schools.html">Manage schools</a></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr>' +
      "<th>School</th><th>Principal</th><th>Students</th><th>Staff</th><th>Accounts</th><th>Status</th><th></th>" +
      "</tr></thead><tbody>" +
      (rows || '<tr><td colspan="7">' + emptyState({ icon: "school", title: "No schools yet", text: "Create your first school to begin enrolling students." }) + "</td></tr>") +
      "</tbody></table></div></div>"
    );
  }

  function schoolView(data, APP) {
    const quick = [];
    if (APP.modules.includes("attendance")) quick.push({ href: "attendance.html", icon: "attendance", title: "Take attendance", sub: "Today's register" });
    if (APP.modules.includes("students")) quick.push({ href: "students.html", icon: "students", title: "Manage students", sub: "Enrollment records" });
    if (APP.modules.includes("grades")) quick.push({ href: "grades.html", icon: "grades", title: "Post grades", sub: "Assessments & scores" });
    if (APP.modules.includes("library")) quick.push({ href: "library.html", icon: "library", title: "Library", sub: "Books & resources" });
    if (APP.modules.includes("messages")) quick.push({ href: "messages.html", icon: "messages", title: "Send a message", sub: "Families & staff" });

    const classes = (data.classes || [])
      .map((cls) => '<span class="chip">' + esc(cls) + "</span>")
      .join("");

    return (
      '<div class="card mb-3"><div class="card-head"><h3>Quick actions</h3>' +
      '<div class="sub">' + esc(data.schoolName) + "</div></div>" +
      '<div class="card-body"><div class="quick-grid">' +
      quick.map((item) =>
        '<a class="quick-action" href="' + item.href + '">' +
        '<div class="q-icon">' + icon(item.icon) + "</div>" +
        '<div><div class="q-title">' + esc(item.title) + "</div>" +
        '<div class="q-sub">' + esc(item.sub) + "</div></div></a>"
      ).join("") +
      "</div></div></div>" +
      '<div class="grid two">' +
      notificationsCard(data.recentNotifications) +
      messagesCard(data.recentMessages) +
      '<div class="card"><div class="card-head"><h3>School at a glance</h3></div>' +
      '<div class="card-body"><div class="detail-grid">' +
      '<div class="detail"><div class="k">Forms</div><div class="v">' + (classes || '<span class="muted">No forms yet</span>') + "</div></div>" +
      '<div class="detail"><div class="k">Subjects</div><div class="v">' + esc(data.subjectCount || 0) + " recorded</div></div>" +
      '<div class="detail"><div class="k">Assessments</div><div class="v">' + esc(data.assessmentCount || 0) + " created</div></div>" +
      '<div class="detail"><div class="k">Register date</div><div class="v">' + esc(fmtDate(data.today)) + "</div></div>" +
      "</div></div></div>" +
      "</div>"
    );
  }

  function childCard(child) {
    const rate = Number(child.attendance.rate || 0);
    const tone = rate >= 90 ? "green" : rate >= 75 ? "amber" : "rose";
    const grades = (child.recentGrades || []).map((grade) =>
      '<div class="mini-grade">' +
      '<span class="subject">' + esc(grade.subject) + "</span>" +
      '<span class="muted tiny">' + esc(grade.score) + "/" + esc(grade.maxScore) + "</span>" +
      gradePill(grade.letter) +
      "</div>"
    ).join("");

    return (
      '<div class="card child-card">' +
      '<div class="child-head">' + avatar(child.fullName, "lg") +
      '<div class="info"><div class="name">' + esc(child.fullName) + "</div>" +
      '<div class="sub">' + esc(child.schoolClass || child.gradeLevel || "No form") + " · " + esc(child.admissionNo) + "</div></div></div>" +
      '<div class="attendance-line"><span>Attendance</span>' +
      "<span><b>" + percent(rate) + "</b> · " + esc(child.attendance.absent) + " absent</span></div>" +
      '<div class="progress ' + tone + '"><span style="width:' + Math.min(100, rate) + '%"></span></div>' +
      (grades ? '<div class="mini-grades">' + grades + "</div>" : '<p class="muted small mt-2">No published grades yet.</p>') +
      '<div class="mt-2" style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<a class="btn btn-sm btn-outline" href="grades.html">Grades</a>' +
      '<a class="btn btn-sm btn-outline" href="attendance.html">Attendance</a>' +
      "</div></div>"
    );
  }

  function familyView(data) {
    return (
      '<div class="grid three mb-3">' +
      (data.children && data.children.length
        ? data.children.map(childCard).join("")
        : '<div class="card" style="grid-column:1/-1"><div class="card-body">' +
          emptyState({
            icon: "user",
            title: "No students linked yet",
            text: "Ask your school office to link your account to your child's student record."
          }) + "</div></div>") +
      "</div>" +
      '<div class="grid two">' +
      notificationsCard(data.recentNotifications) +
      messagesCard(data.recentMessages) +
      "</div>"
    );
  }

  window.renderPage = async function (APP) {
    const content = document.getElementById("content");
    content.innerHTML = loading(4);

    const data = await API.get("/api/dashboard");
    UI.setSubtitle(data.schoolName || "School workspace");

    let eyebrow;
    let lede;
    let actions = "";

    if (data.scope === "platform") {
      eyebrow = "Platform overview";
      lede =
        data.schools.length +
        " school" + (data.schools.length === 1 ? "" : "s") +
        " connected. Review enrollment, open a school workspace or create a new school.";
      actions =
        '<a class="btn btn-outline" href="users.html">Accounts</a>' +
        (APP.modules.includes("schools")
          ? '<a class="btn btn-primary" href="schools.html">' + icon("plus") + " New school</a>"
          : "");
    } else if (data.scope === "school") {
      eyebrow = esc(data.schoolName) + (data.schoolCode ? " · " + esc(data.schoolCode) : "");
      lede =
        "Here is how " + data.schoolName + " is doing today. Mark attendance, publish grades, " +
        "share resources or message families from one place.";
      const quick = [];
      if (APP.modules.includes("attendance")) quick.push({ href: "attendance.html", label: "Take attendance", style: "btn-primary" });
      if (APP.modules.includes("messages")) quick.push({ href: "messages.html", label: "Message families", style: "btn-outline" });
      actions = quick
        .map((item) => '<a class="btn ' + item.style + '" href="' + item.href + '">' + icon(item.href === "messages.html" ? "send" : "attendance") + esc(item.label) + "</a>")
        .join("");
    } else {
      eyebrow = "Family portal";
      lede =
        "Attendance alerts, teacher messages and published grades for your " +
        (data.children.length === 1 ? "child" : "children") +
        " appear here. Everything is updated in real time by the school.";
      actions =
        '<a class="btn btn-outline" href="grades.html">' + icon("grades") + " View grades</a>" +
        '<a class="btn btn-primary" href="messages.html">' + icon("messages") + " Inbox</a>";
    }

    const firstName = APP.user.role === "SUPER_ADMIN" ? APP.user.fullName : APP.user.fullName;
    const hero =
      '<section class="hero">' +
      "<div><div class=\"hero-eyebrow\">" + eyebrow + "</div>" +
      "<h2>" + esc(greeting()) + ", " + esc(firstName) + "</h2>" +
      "<p>" + esc(lede) + "</p></div>" +
      '<div class="hero-actions">' + actions + "</div></section>";

    const stats = '<div class="grid stats mb-3">' + statCards(data.stats || []) + "</div>";

    let body;
    if (data.scope === "platform") body = platformView(data);
    else if (data.scope === "school") body = schoolView(data, APP);
    else body = familyView(data);

    content.innerHTML = hero + stats + body;

    content.querySelectorAll("[data-open-school]").forEach((button) => {
      button.addEventListener("click", () => {
        Store.schoolId = button.getAttribute("data-open-school");
        location.href = "index.html";
      });
    });
  };
})();
