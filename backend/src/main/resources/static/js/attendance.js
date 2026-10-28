/* ============================================================
   LeoneSIS - attendance register
   ============================================================ */
(function () {
  "use strict";

  const {
    esc, icon, avatar, fmtDate, statusBadge, percent, emptyState, toast, fail, debounce
  } = UI;

  const state = {
    date: UI.todayISO(),
    schoolClass: "",
    data: null,
    marks: {},
    loading: false
  };

  const STATUSES = [
    { value: "PRESENT", label: "Present" },
    { value: "ABSENT", label: "Absent" },
    { value: "LATE", label: "Late" },
    { value: "EXCUSED", label: "Excused" }
  ];

  function localSummary() {
    const values = Object.values(state.marks).map((mark) => mark.status);
    const total = values.length;
    const present = values.filter((status) => status === "PRESENT").length;
    const absent = values.filter((status) => status === "ABSENT").length;
    const late = values.filter((status) => status === "LATE").length;
    const excused = values.filter((status) => status === "EXCUSED").length;
    return {
      total,
      present,
      absent,
      late,
      excused,
      rate: total ? Math.round((present * 1000) / total) / 10 : 0
    };
  }

  function summaryStrip() {
    const summary = localSummary();
    return (
      '<div class="summary-strip">' +
      '<div class="summary-tile"><div class="n">' + summary.total + '</div><div class="l">Students</div></div>' +
      '<div class="summary-tile"><div class="n" style="color:#047857">' + summary.present + '</div><div class="l">Present</div></div>' +
      '<div class="summary-tile"><div class="n" style="color:#be123c">' + summary.absent + '</div><div class="l">Absent</div></div>' +
      '<div class="summary-tile"><div class="n" style="color:#b45309">' + summary.late + '</div><div class="l">Late</div></div>' +
      '<div class="summary-tile"><div class="n" style="color:#1d4ed8">' + summary.excused + '</div><div class="l">Excused</div></div>' +
      '<div class="summary-tile"><div class="n">' + percent(summary.rate) + '</div><div class="l">Attendance</div></div>' +
      "</div>"
    );
  }

  function rowHtml(row) {
    const mark = state.marks[row.studentId] || { status: "PRESENT", comment: "" };
    return (
      '<tr data-row="' + esc(row.studentId) + '">' +
      '<td><div class="name-cell">' + avatar(row.fullName) +
      '<div><div class="name">' + esc(row.fullName) + "</div>" +
      '<div class="sub">' + esc(row.admissionNo) + "</div></div></div></td>" +
      '<td class="muted small">' + esc(row.schoolClass || "—") + "</td>" +
      '<td>' + (row.guardianName
        ? '<div class="small">' + esc(row.guardianName) + "</div>" +
          '<div class="tiny ' + (row.hasParentAccount ? "" : "muted") + '">' +
          (row.hasParentAccount ? "Parent portal linked" : "No parent portal") + "</div>"
        : '<span class="muted small">No guardian</span>') + "</td>" +
      '<td><div class="seg" data-seg="' + esc(row.studentId) + '">' +
      STATUSES.map((status) =>
        '<button type="button" data-status="' + status.value + '"' +
        (mark.status === status.value ? ' class="active"' : "") + ">" + status.label + "</button>"
      ).join("") +
      "</div></td>" +
      '<td><input class="comment-input" data-comment="' + esc(row.studentId) + '" placeholder="Optional note" value="' + esc(mark.comment || "") + '"></td>' +
      "</tr>"
    );
  }

  function rowsHtml() {
    const rows = (state.data.students || []);
    if (!rows.length) {
      return '<tr><td colspan="5">' +
        emptyState({
          icon: "attendance",
          title: "No students in this register",
          text: state.schoolClass
            ? "No active students are enrolled in " + state.schoolClass + "."
            : "Enroll students first, then come back to take attendance."
        }) + "</td></tr>";
    }
    return rows.map(rowHtml).join("");
  }

  function renderRegister() {
    const content = document.getElementById("content");
    const classes = (state.data.classes || []);
    const classOptions = ['<option value="">All forms</option>']
      .concat(classes.map((cls) => '<option value="' + esc(cls) + '"' + (state.schoolClass === cls ? " selected" : "") + ">" + esc(cls) + "</option>"))
      .join("");

    content.innerHTML =
      '<div class="page-head"><div><h2>Daily register</h2>' +
      "<p>Mark attendance for " + esc(fmtDate(state.date)) + ". Absent students trigger an automatic alert to linked parents.</p></div>" +
      '<div class="spacer"></div>' +
      '<button class="btn btn-outline" id="markAllPresent">' + icon("check") + " Mark all present</button>" +
      '<button class="btn btn-primary" id="saveAttendance">' + icon("check") + " Save register</button></div>" +
      '<div class="card mb-3"><div class="card-head">' +
      '<div class="row wrap" style="gap:8px">' +
      '<input type="date" class="input" id="attendanceDate" style="width:auto" value="' + esc(state.date) + '" max="' + UI.todayISO() + '">' +
      '<select class="select" id="attendanceClass" style="width:auto;min-width:150px">' + classOptions + "</select>" +
      "</div><div class=\"spacer\"></div>" +
      '<button class="btn btn-outline btn-sm" id="refreshAttendance">' + icon("refresh") + " Reload</button></div>" +
      '<div class="card-body" style="padding-bottom:8px">' +
      summaryStrip() +
      '<div class="notice mb-2">' + icon("info") +
      "<div>Students without a mark default to <b>present</b> when you save. Marking a student absent sends a notification to every linked parent account.</div></div>" +
      "</div>" +
      '<div class="table-wrap"><table class="table"><thead><tr>' +
      "<th>Student</th><th>Form</th><th>Guardian alerts</th><th>Status</th><th>Note</th>" +
      '</tr></thead><tbody id="registerRows">' + rowsHtml() + "</tbody></table></div></div>";

    content.querySelector("#attendanceDate").addEventListener("change", (event) => {
      state.date = event.target.value || UI.todayISO();
      load();
    });
    content.querySelector("#attendanceClass").addEventListener("change", (event) => {
      state.schoolClass = event.target.value;
      load();
    });
    content.querySelector("#refreshAttendance").addEventListener("click", () => load(true));
    content.querySelector("#markAllPresent").addEventListener("click", () => {
      Object.keys(state.marks).forEach((id) => {
        state.marks[id].status = "PRESENT";
      });
      document.getElementById("registerRows").innerHTML = rowsHtml();
      document.querySelector(".summary-strip").outerHTML = summaryStrip();
      bindRows();
      toast("Every student marked present. Remember to save.", "success", 2400);
    });
    content.querySelector("#saveAttendance").addEventListener("click", () => save());
    bindRows();
  }

  function bindRows() {
    const content = document.getElementById("content");
    content.querySelectorAll("[data-seg]").forEach((seg) => {
      const id = seg.getAttribute("data-seg");
      seg.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => {
          if (!state.marks[id]) state.marks[id] = { status: "PRESENT", comment: "" };
          state.marks[id].status = button.getAttribute("data-status");
          seg.querySelectorAll("button").forEach((other) => other.classList.remove("active"));
          button.classList.add("active");
          const strip = content.querySelector(".summary-strip");
          if (strip) strip.outerHTML = summaryStrip();
        });
      });
    });
    content.querySelectorAll("[data-comment]").forEach((input) => {
      input.addEventListener(
        "input",
        debounce(() => {
          const id = input.getAttribute("data-comment");
          if (!state.marks[id]) state.marks[id] = { status: "PRESENT", comment: "" };
          state.marks[id].comment = input.value;
        }, 160)
      );
    });
  }

  async function save() {
    const button = document.getElementById("saveAttendance");
    const records = Object.entries(state.marks).map(([studentId, mark]) => ({
      studentId,
      status: mark.status,
      comment: mark.comment || ""
    }));
    if (!records.length) {
      toast("There is nothing to save.", "error");
      return;
    }
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Saving…';
    try {
      const result = await API.post("/api/attendance", { date: state.date, records });
      toast(result.message || "Attendance saved.", "success");
      await load();
    } catch (err) {
      button.disabled = false;
      button.innerHTML = icon("check") + " Save register";
      fail(err);
    }
  }

  async function load(showToast) {
    const content = document.getElementById("content");
    content.innerHTML = UI.loading(5);
    try {
      const data = await API.get("/api/attendance", {
        query: { date: state.date, schoolClass: state.schoolClass }
      });
      if (data.mode !== "roster") {
        renderFamily(data);
        return;
      }
      state.data = data;
      state.marks = {};
      (data.students || []).forEach((row) => {
        state.marks[row.studentId] = {
          status: row.status || "PRESENT",
          comment: row.comment || ""
        };
      });
      renderRegister();
      if (showToast) toast("Register reloaded.", "success", 1800);
    } catch (err) {
      if (err.status === 401) return;
      content.innerHTML = '<div class="card"><div class="card-body">' +
        emptyState({ icon: "alert", title: "Could not load attendance", text: err.message }) + "</div></div>";
    }
  }

  function renderFamily(data) {
    const content = document.getElementById("content");
    if (!data.children || !data.children.length) {
      content.innerHTML = '<div class="card"><div class="card-body">' +
        emptyState({
          icon: "attendance",
          title: "No attendance records",
          text: data.message || "Your account is not linked to a student record yet."
        }) + "</div></div>";
      return;
    }

    const cards = data.children.map((child) => {
      const records = child.records || [];
      const tone = child.rate >= 90 ? "green" : child.rate >= 75 ? "amber" : "rose";
      const rows = records.map((record) =>
        '<tr><td>' + esc(fmtDate(record.date)) + "</td><td>" + statusBadge(record.status) + "</td>" +
        '<td class="muted small">' + esc(record.comment || "—") + "</td></tr>"
      ).join("");

      return (
        '<div class="card"><div class="card-head">' + avatar(child.student.fullName) +
        '<div><h3>' + esc(child.student.fullName) + "</h3>" +
        '<div class="sub">' + esc(child.student.schoolClass || "No form") + " · " + esc(child.student.admissionNo) + "</div></div>" +
        '<div class="spacer"></div><span class="badge ' + tone + '">' + percent(child.rate) + " attendance</span></div>" +
        '<div class="card-body"><div class="summary-strip">' +
        '<div class="summary-tile"><div class="n">' + esc(child.total) + '</div><div class="l">Days marked</div></div>' +
        '<div class="summary-tile"><div class="n" style="color:#047857">' + esc(child.present) + '</div><div class="l">Present</div></div>' +
        '<div class="summary-tile"><div class="n" style="color:#be123c">' + esc(child.absent) + '</div><div class="l">Absent</div></div>' +
        '<div class="summary-tile"><div class="n">' + percent(child.rate) + '</div><div class="l">Rate</div></div>' +
        "</div>" +
        '<div class="progress ' + tone + '" style="margin-bottom:16px"><span style="width:' + Math.min(100, child.rate) + '%"></span></div>' +
        (rows
          ? '<div class="table-wrap" style="max-height:330px;overflow-y:auto"><table class="table"><thead><tr><th>Date</th><th>Status</th><th>Note</th></tr></thead><tbody>' + rows + "</tbody></table></div>"
          : '<p class="muted small">No daily records yet.</p>') +
        "</div></div>"
      );
    }).join("");

    content.innerHTML =
      '<div class="page-head"><div><h2>Attendance history</h2>' +
      "<p>Daily records for your " + (data.children.length === 1 ? "child" : "children") + ". Absence alerts also appear in notifications.</p></div>" +
      '<div class="spacer"></div><a class="btn btn-outline" href="notifications.html">' + icon("notifications") + " Alerts</a></div>" +
      '<div class="grid">' + cards + "</div>";
  }

  window.renderPage = async function () {
    await load(false);
  };
})();
