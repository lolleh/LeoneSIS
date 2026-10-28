/* ============================================================
   LeoneSIS - students & enrollment
   ============================================================ */
(function () {
  "use strict";

  const {
    esc, icon, avatar, fmtDate, statusBadge, gradePill, percent,
    emptyState, openModal, closeModal, modalHeader, toast, fail, confirmDialog,
    debounce, todayISO, levelOptions
  } = UI;

  const state = {
    students: [],
    classes: [],
    gradeLevels: [],
    search: "",
    schoolClass: ""
  };

  const canManage = () => ["ADMIN", "SUPER_ADMIN"].includes(APP.user.role);

  function formValues(form) {
    const data = {};
    new FormData(form).forEach((value, key) => {
      data[key] = typeof value === "string" ? value : value;
    });
    return data;
  }

  function filtered() {
    const needle = state.search.trim().toLowerCase();
    return state.students.filter((student) => {
      if (state.schoolClass && student.schoolClass !== state.schoolClass) return false;
      if (!needle) return true;
      return (
        String(student.fullName || "").toLowerCase().includes(needle) ||
        String(student.admissionNo || "").toLowerCase().includes(needle) ||
        String(student.guardianName || "").toLowerCase().includes(needle) ||
        String(student.schoolClass || "").toLowerCase().includes(needle)
      );
    });
  }

  function rowsHtml() {
    const list = filtered();
    if (!list.length) {
      return (
        '<tr><td colspan="5">' +
        emptyState({
          icon: "students",
          title: state.students.length ? "No matching students" : "No students enrolled yet",
          text: state.students.length
            ? "Try a different search or form filter."
            : canManage()
              ? "Enroll the first student to start building the register."
              : "Students will appear here once the school office enrolls them.",
          action: canManage() && !state.students.length
            ? '<button class="btn btn-primary" data-add-student>' + icon("plus") + " Enroll student</button>"
            : ""
        }) +
        "</td></tr>"
      );
    }

    return list
      .map(
        (student) =>
          '<tr data-student="' + esc(student.id) + '">' +
          '<td><div class="name-cell">' + avatar(student.fullName) +
          '<div><div class="name">' + esc(student.fullName) + "</div>" +
          '<div class="sub">' + esc(student.admissionNo) + (student.gender ? " · " + esc(student.gender) : "") + "</div></div></div></td>" +
          '<td><div class="bold">' + esc(student.schoolClass || "—") + "</div>" +
          '<div class="tiny muted">' + esc(student.gradeLevel || "No level") + "</div></td>" +
          '<td>' + (student.guardianName
            ? '<div class="bold small">' + esc(student.guardianName) + "</div>" +
              '<div class="tiny muted">' + esc(student.guardianPhone || student.guardianEmail || "") + "</div>"
            : '<span class="muted">Not recorded</span>') + "</td>" +
          '<td>' + (student.hasPortalAccount
            ? '<span class="badge emerald">Portal active</span>'
            : '<span class="badge gray">No login</span>') + "</td>" +
          '<td><div class="actions">' +
          '<button class="icon-btn" type="button" title="View record" data-view="' + esc(student.id) + '">' + icon("eye") + "</button>" +
          (canManage()
            ? '<button class="icon-btn" type="button" title="Edit" data-edit="' + esc(student.id) + '">' + icon("edit") + "</button>" +
              '<button class="icon-btn danger" type="button" title="Remove" data-remove="' + esc(student.id) + '">' + icon("trash") + "</button>"
            : "") +
          "</div></td></tr>"
      )
      .join("");
  }

  function renderList() {
    const content = document.getElementById("content");
    const classOptions = ['<option value="">All forms</option>']
      .concat(
        state.classes.map(
          (cls) => '<option value="' + esc(cls) + '"' + (state.schoolClass === cls ? " selected" : "") + ">" + esc(cls) + "</option>"
        )
      )
      .join("");

    content.innerHTML =
      '<div class="page-head"><div><h2>' + (canManage() ? "Student enrollment" : "Student directory") + "</h2>" +
      "<p>" + state.students.length + " active student" + (state.students.length === 1 ? "" : "s") +
      (state.schoolClass ? " in " + esc(state.schoolClass) : "") + ".</p></div>" +
      '<div class="spacer"></div>' +
      (canManage() ? '<button class="btn btn-primary" id="addStudentBtn">' + icon("plus") + " Enroll student</button>" : "") +
      "</div>" +
      '<div class="card"><div class="card-head">' +
      '<div class="search-box" style="max-width:320px;flex:1">' + icon("search") +
      '<input class="input" id="studentSearch" placeholder="Search name, admission no or guardian…" value="' + esc(state.search) + '"></div>' +
      '<select class="select" id="classFilter" style="width:auto;min-width:150px">' + classOptions + "</select>" +
      '<div class="spacer"></div>' +
      '<button class="btn btn-outline btn-sm" id="refreshStudents">' + icon("refresh") + " Refresh</button></div>" +
      '<div class="table-wrap"><table class="table"><thead><tr>' +
      "<th>Student</th><th>Form</th><th>Guardian</th><th>Portal</th><th></th>" +
      '</tr></thead><tbody id="studentRows">' + rowsHtml() + "</tbody></table></div></div>";

    content.querySelector("#studentSearch").addEventListener(
      "input",
      debounce((event) => {
        state.search = event.target.value;
        document.getElementById("studentRows").innerHTML = rowsHtml();
        bindRowActions();
      }, 180)
    );
    content.querySelector("#classFilter").addEventListener("change", (event) => {
      state.schoolClass = event.target.value;
      document.getElementById("studentRows").innerHTML = rowsHtml();
      bindRowActions();
    });
    content.querySelector("#refreshStudents").addEventListener("click", () => load(true));
    const add = content.querySelector("#addStudentBtn");
    if (add) add.addEventListener("click", () => openEnroll());
    bindRowActions();
  }

  function bindRowActions() {
    const content = document.getElementById("content");
    content.querySelectorAll("[data-add-student]").forEach((btn) =>
      btn.addEventListener("click", () => openEnroll())
    );
    content.querySelectorAll("[data-student]").forEach((row) => {
      row.addEventListener("click", () => openDetail(row.getAttribute("data-student")));
    });
    content.querySelectorAll("[data-view]").forEach((btn) =>
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        openDetail(btn.getAttribute("data-view"));
      })
    );
    content.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        openEdit(btn.getAttribute("data-edit"));
      })
    );
    content.querySelectorAll("[data-remove]").forEach((btn) =>
      btn.addEventListener("click", async (event) => {
        event.stopPropagation();
        const student = state.students.find((item) => item.id === btn.getAttribute("data-remove"));
        if (!student) return;
        const ok = await confirmDialog({
          title: "Remove " + student.fullName + "?",
          message: "The student will be removed from active enrollment. Attendance history and grades are kept.",
          confirmText: "Remove student",
          danger: true
        });
        if (!ok) return;
        try {
          const result = await API.del("/api/students/" + student.id);
          toast(result.message || "Student removed.", "success");
          await load();
        } catch (err) {
          fail(err);
        }
      })
    );
  }

  async function load(showToast) {
    const content = document.getElementById("content");
    if (!state.students.length) content.innerHTML = UI.loading(4);
    try {
      const data = await API.get("/api/students");
      state.students = data.students || [];
      state.classes = data.classes || [];
      state.gradeLevels = data.gradeLevels || [];
      if (showToast) toast("Student directory refreshed.", "success", 1800);
      renderList();
    } catch (err) {
      if (err.status === 401) return;
      content.innerHTML = '<div class="card"><div class="card-body">' +
        emptyState({ icon: "alert", title: "Could not load students", text: err.message, action: '<button class="btn btn-primary" onclick="location.reload()">Reload</button>' }) +
        "</div></div>";
    }
  }

  /* ---------------------------------------------------------- enroll */
  function openEnroll() {
    const classOptions = state.classes.map((c) => "<option>" + esc(c) + "</option>").join("");

    const overlay = openModal(
      modalHeader("Enroll a student", "Create the student record and, optionally, portal accounts.") +
        '<form id="enrollForm">' +
        '<div class="modal-body">' +
        '<div class="form-section-title" style="margin-top:0">Student details</div>' +
        '<div class="form-grid">' +
        '<div class="field"><label>First name *</label><input class="input" name="firstName" required></div>' +
        '<div class="field"><label>Last name *</label><input class="input" name="lastName" required></div>' +
        '<div class="field"><label>Date of birth</label><input class="input" type="date" name="dateOfBirth" max="' + todayISO() + '"></div>' +
        '<div class="field"><label>Gender</label><select class="select" name="gender"><option value="">Not specified</option><option>Female</option><option>Male</option><option>Other</option></select></div>' +
        '<div class="field"><label>Level</label><select class="select" name="gradeLevel">' + levelOptions("", "Select level") + "</select></div>" +
        '<div class="field"><label>Form</label><input class="input" name="schoolClass" list="classList" placeholder="e.g. JSS 1A"><datalist id="classList">' + classOptions + "</datalist></div>" +
        '<div class="field"><label>Blood group</label><input class="input" name="bloodGroup" placeholder="e.g. O+"></div>' +
        '<div class="field"><label>Guardian name</label><input class="input" name="guardianName" placeholder="Parent or caregiver"></div>' +
        '<div class="field"><label>Guardian email</label><input class="input" type="email" name="guardianEmail" placeholder="parent@example.com"></div>' +
        '<div class="field"><label>Guardian phone</label><input class="input" name="guardianPhone" placeholder="+1 555 0100"></div>' +
        '<div class="field span-2"><label>Home address</label><input class="input" name="address"></div>' +
        '<div class="field span-2"><label>Notes</label><textarea class="textarea" name="notes" rows="2" placeholder="Allergies, transport, other notes"></textarea></div>' +
        "</div>" +
        '<div class="form-section"><div class="form-section-title">Parent portal account</div>' +
        '<div class="notice">' + icon("info") + "<div>Use the guardian email above. Set a password to create a parent login the first time; if that email already has a parent account at this school it will simply be linked. Leave the password blank only when the parent already exists.</div></div>" +
        '<div class="form-grid mt-2">' +
        '<div class="field"><label>Parent username</label><input class="input" name="parentUsername" placeholder="Auto-generated from email if blank"></div>' +
        '<div class="field"><label>Parent password</label><input class="input" type="password" name="parentPassword" minlength="6" placeholder="At least 6 characters"></div>' +
        "</div></div>" +
        '<div class="form-section"><div class="form-section-title">Student portal account (optional)</div>' +
        '<div class="form-grid">' +
        '<div class="field"><label>Student username</label><input class="input" name="studentUsername" placeholder="Leave blank for no student login"></div>' +
        '<div class="field"><label>Student email</label><input class="input" type="email" name="studentEmail" placeholder="Auto-generated if blank"></div>' +
        '<div class="field"><label>Student password</label><input class="input" type="password" name="studentPassword" minlength="6" placeholder="Required with a username"></div>' +
        "</div></div>" +
        "</div>" +
        '<div class="modal-foot"><button class="btn btn-outline" type="button" data-close>Cancel</button>' +
        '<button class="btn btn-primary" type="submit">' + icon("check") + " Enroll student</button></div></form>",
      { size: "wide" }
    );

    const form = overlay.querySelector("#enrollForm");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = formValues(form);
      if (!body.firstName.trim() || !body.lastName.trim()) {
        toast("Enter the student's first and last name.", "error");
        return;
      }
      if (body.studentUsername && !body.studentPassword) {
        toast("Set a password for the student portal account.", "error");
        return;
      }
      if (body.parentPassword && body.parentPassword.length < 6) {
        toast("The parent password must be at least 6 characters.", "error");
        return;
      }
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.innerHTML = '<span class="spinner"></span> Enrolling…';
      try {
        const result = await API.post("/api/students", body);
        toast(result.message || "Student enrolled.", "success");
        closeModal(overlay);
        await load();
      } catch (err) {
        submit.disabled = false;
        submit.innerHTML = icon("check") + " Enroll student";
        fail(err);
      }
    });
  }

  /* ---------------------------------------------------------- edit */
  function openEdit(studentId) {
    const student = state.students.find((item) => item.id === studentId);
    if (!student) return;
    const overlay = openModal(
      modalHeader("Edit " + student.fullName, "Update the enrollment record.") +
        '<form id="editStudentForm">' +
        '<div class="modal-body">' +
        '<div class="form-grid">' +
        '<div class="field"><label>First name *</label><input class="input" name="firstName" required value="' + esc(student.firstName) + '"></div>' +
        '<div class="field"><label>Last name *</label><input class="input" name="lastName" required value="' + esc(student.lastName) + '"></div>' +
        '<div class="field"><label>Admission number</label><input class="input" name="admissionNo" value="' + esc(student.admissionNo) + '"></div>' +
        '<div class="field"><label>Date of birth</label><input class="input" type="date" name="dateOfBirth" value="' + esc(student.dateOfBirth || "") + '"></div>' +
        '<div class="field"><label>Gender</label><select class="select" name="gender">' +
        ["", "Female", "Male", "Other"].map((g) => '<option value="' + g + '"' + (student.gender === g ? " selected" : "") + ">" + (g || "Not specified") + "</option>").join("") +
        "</select></div>" +
        '<div class="field"><label>Level</label><select class="select" name="gradeLevel">' + levelOptions(student.gradeLevel, "Select level") + "</select></div>" +
        '<div class="field"><label>Form</label><input class="input" name="schoolClass" value="' + esc(student.schoolClass || "") + '"></div>' +
        '<div class="field"><label>Blood group</label><input class="input" name="bloodGroup" value="' + esc(student.bloodGroup || "") + '"></div>' +
        '<div class="field"><label>Guardian name</label><input class="input" name="guardianName" value="' + esc(student.guardianName || "") + '"></div>' +
        '<div class="field"><label>Guardian email</label><input class="input" type="email" name="guardianEmail" value="' + esc(student.guardianEmail || "") + '"></div>' +
        '<div class="field"><label>Guardian phone</label><input class="input" name="guardianPhone" value="' + esc(student.guardianPhone || "") + '"></div>' +
        '<div class="field"><label>Notes</label><input class="input" name="notes" value="' + esc(student.notes || "") + '"></div>' +
        '<div class="field span-2"><label>Home address</label><input class="input" name="address" value="' + esc(student.address || "") + '"></div>' +
        "</div></div>" +
        '<div class="modal-foot"><button class="btn btn-outline" type="button" data-close>Cancel</button>' +
        '<button class="btn btn-primary" type="submit">' + icon("check") + " Save changes</button></div></form>"
    );
    const form = overlay.querySelector("#editStudentForm");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.innerHTML = '<span class="spinner"></span> Saving…';
      try {
        const result = await API.put("/api/students/" + student.id, formValues(form));
        toast(result.message || "Student updated.", "success");
        closeModal(overlay);
        await load();
      } catch (err) {
        submit.disabled = false;
        submit.innerHTML = icon("check") + " Save changes";
        fail(err);
      }
    });
  }

  /* ---------------------------------------------------------- detail */
  function guardianSection(data) {
    if (!canManage()) {
      return data.student.parents && data.student.parents.length
        ? '<div class="section-title">Guardians</div><div class="pill-row">' +
          data.student.parents.map((p) => '<span class="chip">' + icon("user") + esc(p.name) + "</span>").join("") + "</div>"
        : "";
    }

    const list = data.student.parents && data.student.parents.length
      ? data.student.parents.map((parent) =>
          '<div class="row between" style="padding:8px 0;border-bottom:1px solid #eef1f7">' +
          '<div class="row">' + avatar(parent.name, "sm") +
          '<div><div class="bold small">' + esc(parent.name) + "</div>" +
          '<div class="tiny muted">' + esc(parent.email) + " · @" + esc(parent.username) + "</div></div></div>" +
          '<button class="icon-btn danger" type="button" title="Unlink guardian" data-unlink="' + esc(parent.userId) + '">' + icon("x") + "</button></div>"
        ).join("")
      : '<p class="muted small">No guardian accounts linked yet.</p>';

    return (
      '<div class="section-title">Guardians & parent portal</div>' +
      "<div>" + list + "</div>" +
      '<form id="linkParentForm" class="form-grid mt-2" style="align-items:end">' +
      '<div class="field"><label>Guardian email *</label><input class="input" type="email" name="email" required placeholder="parent@example.com"></div>' +
      '<div class="field"><label>Full name</label><input class="input" name="fullName" placeholder="Defaults to guardian name"></div>' +
      '<div class="field"><label>Username</label><input class="input" name="username" placeholder="Auto-generated if blank"></div>' +
      '<div class="field"><label>Password</label><input class="input" type="password" name="password" minlength="6" placeholder="Required for a new account"></div>' +
      '<div class="field span-2"><button class="btn btn-soft" type="submit">' + icon("plus") + " Link guardian account</button></div>" +
      "</form>"
    );
  }

  async function openDetail(studentId) {
    let data;
    try {
      data = await API.get("/api/students/" + studentId);
    } catch (err) {
      fail(err);
      return;
    }
    const student = data.student;
    const attendance = data.attendance || { total: 0, present: 0, absent: 0, rate: 100, recent: [] };
    const grades = data.grades || [];

    const recentRows = (attendance.recent || []).map((record) =>
      '<tr><td>' + esc(fmtDate(record.date)) + "</td><td>" + statusBadge(record.status) + "</td>" +
      '<td class="muted small">' + esc(record.comment || "—") + "</td></tr>"
    ).join("");

    const gradeRows = grades.map((grade) =>
      '<tr><td><div class="bold small">' + esc(grade.subject) + "</div>" +
      '<div class="tiny muted">' + esc(grade.title || grade.type) + "</div></td>" +
      '<td>' + gradePill(grade.letter) + '</td><td class="small">' + esc(grade.score) + " / " + esc(grade.maxScore) + "</td>" +
      '<td class="muted small">' + esc(fmtDate(grade.date)) + "</td></tr>"
    ).join("");

    const overlay = openModal(
      modalHeader(student.fullName, student.schoolClass ? student.schoolClass + " · " + student.admissionNo : student.admissionNo) +
        '<div class="modal-body">' +
        '<div class="row wrap" style="gap:14px;margin-bottom:18px">' + avatar(student.fullName, "lg") +
        '<div style="flex:1;min-width:200px"><div class="bold" style="font-size:16px">' + esc(student.fullName) + "</div>" +
        '<div class="muted small">' + esc(student.schoolName || "") + " · " + esc(student.gradeLevel || "No level") + "</div>" +
        '<div class="pill-row mt-1">' + (student.hasPortalAccount ? '<span class="badge emerald">Student portal</span>' : '<span class="badge gray">No student login</span>') +
        (student.guardianName ? '<span class="badge blue">Guardian on file</span>' : "") + "</div></div></div>" +
        '<div class="detail-grid">' +
        '<div class="detail"><div class="k">Admission no</div><div class="v">' + esc(student.admissionNo) + "</div></div>" +
        '<div class="detail"><div class="k">Form / level</div><div class="v">' + esc(student.schoolClass || "—") + " · " + esc(student.gradeLevel || "—") + "</div></div>" +
        '<div class="detail"><div class="k">Date of birth</div><div class="v">' + esc(fmtDate(student.dateOfBirth)) + "</div></div>" +
        '<div class="detail"><div class="k">Gender</div><div class="v">' + esc(student.gender || "—") + "</div></div>" +
        '<div class="detail"><div class="k">Guardian</div><div class="v">' + esc(student.guardianName || "—") + "</div></div>" +
        '<div class="detail"><div class="k">Guardian contact</div><div class="v">' + esc(student.guardianPhone || student.guardianEmail || "—") + "</div></div>" +
        '<div class="detail"><div class="k">Blood group</div><div class="v">' + esc(student.bloodGroup || "—") + "</div></div>" +
        '<div class="detail"><div class="k">Enrolled</div><div class="v">' + esc(fmtDate(student.enrolledAt)) + "</div></div>" +
        '<div class="detail"><div class="k">Address</div><div class="v">' + esc(student.address || "—") + "</div></div>" +
        '<div class="detail"><div class="k">Notes</div><div class="v">' + esc(student.notes || "—") + "</div></div>" +
        "</div>" +
        '<div class="divider"></div>' +
        '<div class="summary-strip">' +
        '<div class="summary-tile"><div class="n">' + esc(attendance.rate) + '%</div><div class="l">Attendance</div></div>' +
        '<div class="summary-tile"><div class="n">' + esc(attendance.present) + '</div><div class="l">Present</div></div>' +
        '<div class="summary-tile"><div class="n">' + esc(attendance.absent) + '</div><div class="l">Absent</div></div>' +
        '<div class="summary-tile"><div class="n">' + esc(attendance.total) + '</div><div class="l">Days marked</div></div>' +
        "</div>" +
        '<div class="grid two">' +
        '<div><div class="section-title">Recent attendance</div>' +
        (recentRows
          ? '<div class="table-wrap"><table class="table"><tbody>' + recentRows + "</tbody></table></div>"
          : '<p class="muted small">No attendance recorded yet.</p>') + "</div>" +
        '<div><div class="section-title">Published grades</div>' +
        (gradeRows
          ? '<div class="table-wrap"><table class="table"><tbody>' + gradeRows + "</tbody></table></div>"
          : '<p class="muted small">No grades published yet.</p>') + "</div>" +
        "</div>" +
        guardianSection(data) +
        "</div>" +
        '<div class="modal-foot"><button class="btn btn-outline" type="button" data-close>Close</button>' +
        (canManage() ? '<button class="btn btn-primary" type="button" id="detailEdit">' + icon("edit") + " Edit record</button>" : "") +
        "</div>",
      { size: "wide" }
    );

    const edit = overlay.querySelector("#detailEdit");
    if (edit) {
      edit.addEventListener("click", () => {
        closeModal(overlay);
        openEdit(student.id);
      });
    }

    overlay.querySelectorAll("[data-unlink]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ok = await confirmDialog({
          title: "Unlink this guardian?",
          message: "The parent account stays active but will no longer receive alerts for this student.",
          confirmText: "Unlink guardian",
          danger: true
        });
        if (!ok) return;
        try {
          const result = await API.del("/api/students/" + student.id + "/parents/" + btn.getAttribute("data-unlink"));
          toast(result.message || "Guardian unlinked.", "success");
          closeModal(overlay);
          await load();
          openDetail(student.id);
        } catch (err) {
          fail(err);
        }
      });
    });

    const linkForm = overlay.querySelector("#linkParentForm");
    if (linkForm) {
      linkForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          const result = await API.post("/api/students/" + student.id + "/parents", formValues(linkForm));
          toast(result.message || "Guardian linked.", "success");
          closeModal(overlay);
          await load();
          openDetail(student.id);
        } catch (err) {
          fail(err);
        }
      });
    }
  }

  window.renderPage = async function () {
    await load(false);
  };
})();
