/* ============================================================
   LeoneSIS - assessments, score entry and report cards
   ============================================================ */
(function () {
  "use strict";

  const {
    esc, icon, avatar, fmtDate, gradePill, gradeClass, percent, emptyState,
    openModal, closeModal, modalHeader, toast, fail, confirmDialog, todayISO, levelOptions
  } = UI;

  const state = {
    assessments: [],
    classes: [],
    subjects: [],
    schoolClass: "",
    subject: ""
  };

  const family = () => APP.family;
  const canCreate = () => ["ADMIN", "SCHOOL_ADMIN", "SUPER_ADMIN", "TEACHER"].includes(APP.user.role);
  const canDelete = () => ["ADMIN", "SCHOOL_ADMIN", "SUPER_ADMIN"].includes(APP.user.role);

  const TYPES = ["QUIZ", "ASSIGNMENT", "TEST", "EXAM", "PROJECT"];

  function formValues(form) {
    const data = {};
    new FormData(form).forEach((value, key) => {
      data[key] = value;
    });
    return data;
  }

  function letterFor(score, max) {
    if (score === null || score === undefined || score === "" || !max) return null;
    const pct = (Number(score) / Number(max)) * 100;
    if (!isFinite(pct)) return null;
    if (pct >= 90) return "A+";
    if (pct >= 80) return "A";
    if (pct >= 70) return "B";
    if (pct >= 60) return "C";
    if (pct >= 50) return "D";
    if (pct >= 40) return "E";
    return "F";
  }

  /* ---------------------------------------------------------- staff list */
  function assessmentCard(assessment) {
    return (
      '<div class="card assessment-card">' +
      '<div class="a-top"><div class="a-icon">' + icon("grades") + "</div>" +
      '<div style="flex:1;min-width:0"><h4>' + esc(assessment.title) + "</h4>" +
      '<div class="a-meta">' + esc(assessment.subject) + " · " + esc(assessment.type) + "</div></div>" +
      (assessment.published
        ? '<span class="badge emerald">Published</span>'
        : '<span class="badge amber">Draft</span>') +
      "</div>" +
      '<div class="a-stats">' +
      '<div class="a-stat"><div class="n">' + esc(assessment.gradedCount || 0) + '</div><div class="l">Scores</div></div>' +
      '<div class="a-stat"><div class="n">' + (assessment.average === null ? "—" : esc(assessment.average)) + '</div><div class="l">Average</div></div>' +
      '<div class="a-stat"><div class="n">' + esc(assessment.maxScore) + '</div><div class="l">Max score</div></div>' +
      "</div>" +
      '<div class="a-meta">' + esc(assessment.schoolClass || assessment.gradeLevel || "All forms") +
      " · " + esc(fmtDate(assessment.assessmentDate)) + "</div>" +
      '<div class="a-meta">Posted by ' + esc(assessment.postedBy || "—") + "</div>" +
      '<div class="a-actions">' +
      '<button class="btn btn-sm btn-soft" type="button" data-scores="' + esc(assessment.id) + '">' + icon("clipboard") + " Scores</button>" +
      '<button class="btn btn-sm btn-outline" type="button" data-publish="' + esc(assessment.id) + '">' +
      icon(assessment.published ? "x" : "check") + (assessment.published ? " Unpublish" : " Publish") + "</button>" +
      '<div class="spacer" style="flex:1"></div>' +
      '<button class="icon-btn danger" type="button" title="Delete assessment" data-delete="' + esc(assessment.id) + '">' + icon("trash") + "</button>" +
      "</div></div>"
    );
  }

  function renderStaff() {
    const content = document.getElementById("content");
    const classOptions = ['<option value="">All forms</option>']
      .concat(state.classes.map((cls) => '<option value="' + esc(cls) + '"' + (state.schoolClass === cls ? " selected" : "") + ">" + esc(cls) + "</option>"))
      .join("");
    const subjectOptions = ['<option value="">All subjects</option>']
      .concat(state.subjects.map((subject) => '<option value="' + esc(subject) + '"' + (state.subject === subject ? " selected" : "") + ">" + esc(subject) + "</option>"))
      .join("");

    content.innerHTML =
      '<div class="page-head"><div><h2>Assessment book</h2>' +
      "<p>" + state.assessments.length + " assessment" + (state.assessments.length === 1 ? "" : "s") +
      ". Enter scores, then publish to notify students and parents.</p></div>" +
      '<div class="spacer"></div>' +
      (canCreate() ? '<button class="btn btn-primary" id="newAssessment">' + icon("plus") + " New assessment</button>" : "") +
      "</div>" +
      '<div class="toolbar">' +
      '<select class="select" id="gradeClassFilter">' + classOptions + "</select>" +
      '<select class="select" id="gradeSubjectFilter">' + subjectOptions + "</select>" +
      '<div class="spacer"></div><button class="btn btn-outline btn-sm" id="refreshGrades">' + icon("refresh") + " Refresh</button></div>" +
      (state.assessments.length
        ? '<div class="assessment-grid">' + state.assessments.map(assessmentCard).join("") + "</div>"
        : '<div class="card"><div class="card-body">' +
          emptyState({
            icon: "grades",
            title: "No assessments yet",
            text: "Create a quiz, assignment or exam, add scores and publish results to families.",
            action: canCreate() ? '<button class="btn btn-primary" data-new-assessment>' + icon("plus") + " New assessment</button>" : ""
          }) + "</div></div>");

    content.querySelector("#gradeClassFilter").addEventListener("change", (event) => {
      state.schoolClass = event.target.value;
      loadList();
    });
    content.querySelector("#gradeSubjectFilter").addEventListener("change", (event) => {
      state.subject = event.target.value;
      loadList();
    });
    content.querySelector("#refreshGrades").addEventListener("click", () => loadList(true));
    const add = content.querySelector("#newAssessment");
    if (add) add.addEventListener("click", openCreate);
    content.querySelectorAll("[data-new-assessment]").forEach((btn) => btn.addEventListener("click", openCreate));
    bindActions();
  }

  function bindActions() {
    const content = document.getElementById("content");
    content.querySelectorAll("[data-scores]").forEach((btn) =>
      btn.addEventListener("click", () => openScores(btn.getAttribute("data-scores")))
    );
    content.querySelectorAll("[data-publish]").forEach((btn) =>
      btn.addEventListener("click", () => togglePublish(btn.getAttribute("data-publish")))
    );
    content.querySelectorAll("[data-delete]").forEach((btn) =>
      btn.addEventListener("click", () => deleteAssessment(btn.getAttribute("data-delete")))
    );
  }

  async function loadList(showToast) {
    const content = document.getElementById("content");
    content.innerHTML = UI.loading(5);
    try {
      const data = await API.get("/api/grades/assessments", {
        query: { schoolClass: state.schoolClass, subject: state.subject }
      });
      state.assessments = data.assessments || [];
      state.classes = data.classes || state.classes;
      state.subjects = data.subjects || state.subjects;
      renderStaff();
      if (showToast) toast("Assessments refreshed.", "success", 1800);
    } catch (err) {
      if (err.status === 401) return;
      content.innerHTML = '<div class="card"><div class="card-body">' +
        emptyState({ icon: "alert", title: "Could not load assessments", text: err.message }) + "</div></div>";
    }
  }

  /* ---------------------------------------------------------- create */
  function openCreate() {
    const classOptions = state.classes.map((cls) => "<option>" + esc(cls) + "</option>").join("");
    const subjectOptions = state.subjects.map((subject) => "<option>" + esc(subject) + "</option>").join("");
    const overlay = openModal(
      modalHeader("New assessment", "Create the grade item now; add scores when you are ready.") +
        '<form id="assessmentForm">' +
        '<div class="modal-body"><div class="form-grid">' +
        '<div class="field span-2"><label>Title *</label><input class="input" name="title" required placeholder="e.g. Mid-term Algebra Test"></div>' +
        '<div class="field"><label>Subject *</label><input class="input" name="subject" list="subjectList" required placeholder="e.g. Mathematics"><datalist id="subjectList">' + subjectOptions + "</datalist></div>" +
        '<div class="field"><label>Type *</label><select class="select" name="type">' +
        TYPES.map((type) => '<option value="' + type + '">' + type.charAt(0) + type.slice(1).toLowerCase() + "</option>").join("") +
        "</select></div>" +
        '<div class="field"><label>Form</label><input class="input" name="schoolClass" list="gradeClassList" placeholder="All forms if blank"><datalist id="gradeClassList">' + classOptions + "</datalist></div>" +
        '<div class="field"><label>Level</label><select class="select" name="gradeLevel">' + levelOptions("", "Select level") + "</select></div>" +
        '<div class="field"><label>Maximum score</label><input class="input" type="number" name="maxScore" min="1" step="0.5" value="100"></div>' +
        '<div class="field"><label>Date</label><input class="input" type="date" name="assessmentDate" value="' + todayISO() + '"></div>' +
        '<div class="field span-2"><label class="check-row" style="padding:0"><input type="checkbox" name="published"><span><b>Publish immediately</b><div class="role-note">Students and parents are notified as soon as scores are saved. You can also publish later.</div></span></label></div>' +
        "</div></div>" +
        '<div class="modal-foot"><button class="btn btn-outline" type="button" data-close>Cancel</button>' +
        '<button class="btn btn-primary" type="submit">' + icon("check") + " Create assessment</button></div></form>"
    );

    const form = overlay.querySelector("#assessmentForm");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = formValues(form);
      body.published = !!form.querySelector('input[name="published"]').checked;
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.innerHTML = '<span class="spinner"></span> Creating…';
      try {
        const result = await API.post("/api/grades/assessments", body);
        toast(result.message || "Assessment created.", "success");
        closeModal(overlay);
        await loadList();
      } catch (err) {
        submit.disabled = false;
        submit.innerHTML = icon("check") + " Create assessment";
        fail(err);
      }
    });
  }

  /* ---------------------------------------------------------- scores */
  async function openScores(assessmentId) {
    let data;
    try {
      data = await API.get("/api/grades/assessments/" + assessmentId);
    } catch (err) {
      fail(err);
      return;
    }
    const assessment = data.assessment;
    const rows = data.students || [];

    const body = rows.length
      ? rows.map((row) =>
          '<tr data-entry="' + esc(row.studentId) + '">' +
          '<td><div class="name-cell">' + avatar(row.fullName, "sm") +
          '<div><div class="name" style="font-size:12px">' + esc(row.fullName) + "</div>" +
          '<div class="sub">' + esc(row.admissionNo) + "</div></div></div></td>" +
          '<td class="muted small">' + esc(row.schoolClass || "—") + "</td>" +
          '<td><input class="score-input" type="number" min="0" max="' + esc(assessment.maxScore) + '" step="0.5" data-score="' + esc(row.studentId) + '" value="' + (row.score === null || row.score === undefined ? "" : esc(row.score)) + '" placeholder="—"></td>' +
          '<td data-letter="' + esc(row.studentId) + '">' + gradePill(row.letter) + "</td>" +
          '<td><input class="comment-input" data-entry-comment="' + esc(row.studentId) + '" value="' + esc(row.comment || "") + '" placeholder="Optional comment"></td>' +
          "</tr>"
        ).join("")
      : '<tr><td colspan="5">' + emptyState({ icon: "students", title: "No students to grade", text: "Enroll students in this form first." }) + "</td></tr>";

    const overlay = openModal(
      modalHeader(assessment.title, assessment.subject + " · " + assessment.type + " · max " + assessment.maxScore) +
        '<form id="scoresForm">' +
        '<div class="modal-body">' +
        '<div class="notice mb-2">' + icon(assessment.published ? "success" : "info") +
        "<div>" + (assessment.published
          ? "This assessment is <b>published</b>. Saving a score notifies the student's parents."
          : "This assessment is a <b>draft</b>. Scores are saved privately until you publish it.") +
        "</div></div>" +
        '<div class="table-wrap" style="max-height:52vh;overflow-y:auto"><table class="table"><thead><tr>' +
        "<th>Student</th><th>Form</th><th>Score</th><th>Grade</th><th>Comment</th>" +
        "</tr></thead><tbody>" + body + "</tbody></table></div>" +
        "</div>" +
        '<div class="modal-foot"><button class="btn btn-outline" type="button" data-close>Cancel</button>' +
        '<button class="btn btn-primary" type="submit">' + icon("check") + " Save scores</button></div></form>",
      { size: "wide" }
    );

    overlay.querySelectorAll("[data-score]").forEach((input) => {
      input.addEventListener("input", () => {
        const id = input.getAttribute("data-score");
        const letterCell = overlay.querySelector('[data-letter="' + id + '"]');
        if (letterCell) letterCell.innerHTML = gradePill(letterFor(input.value, assessment.maxScore));
      });
    });

    const form = overlay.querySelector("#scoresForm");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const entries = [];
      let invalid = false;
      overlay.querySelectorAll("[data-entry]").forEach((row) => {
        const studentId = row.getAttribute("data-entry");
        const scoreInput = row.querySelector("[data-score]");
        const commentInput = row.querySelector("[data-entry-comment]");
        const raw = scoreInput.value.trim();
        if (!raw) return;
        const score = Number(raw);
        if (!isFinite(score) || score < 0 || score > Number(assessment.maxScore)) {
          invalid = true;
          scoreInput.style.borderColor = "#dc2626";
          return;
        }
        entries.push({ studentId, score, comment: commentInput.value });
      });
      if (invalid) {
        toast("Scores must be between 0 and " + assessment.maxScore + ".", "error");
        return;
      }
      if (!entries.length) {
        toast("Enter at least one score before saving.", "error");
        return;
      }
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.innerHTML = '<span class="spinner"></span> Saving…';
      try {
        const result = await API.post("/api/grades/assessments/" + assessment.id + "/entries", { entries });
        toast(result.message || "Scores saved.", "success");
        closeModal(overlay);
        await loadList();
      } catch (err) {
        submit.disabled = false;
        submit.innerHTML = icon("check") + " Save scores";
        fail(err);
      }
    });
  }

  async function togglePublish(assessmentId) {
    const assessment = state.assessments.find((item) => item.id === assessmentId);
    if (!assessment) return;
    if (!assessment.published) {
      const ok = await confirmDialog({
        title: "Publish " + assessment.title + "?",
        message: "Published scores become visible to students and linked parents, and each family receives a notification.",
        confirmText: "Publish grades"
      });
      if (!ok) return;
    }
    try {
      const result = await API.patch("/api/grades/assessments/" + assessmentId + "/publish", {
        published: !assessment.published
      });
      toast(result.message || "Assessment updated.", "success");
      await loadList();
    } catch (err) {
      fail(err);
    }
  }

  async function deleteAssessment(assessmentId) {
    const assessment = state.assessments.find((item) => item.id === assessmentId);
    if (!assessment) return;
    const ok = await confirmDialog({
      title: "Delete " + assessment.title + "?",
      message: "All scores recorded for this assessment will also be deleted. This cannot be undone.",
      confirmText: "Delete assessment",
      danger: true
    });
    if (!ok) return;
    try {
      const result = await API.del("/api/grades/assessments/" + assessmentId);
      toast(result.message || "Assessment deleted.", "success");
      await loadList();
    } catch (err) {
      fail(err);
    }
  }

  /* ---------------------------------------------------------- family */
  function familyView(data) {
    const children = data.children || [];
    if (!children.length) {
      return '<div class="card"><div class="card-body">' +
        emptyState({
          icon: "grades",
          title: "No report cards yet",
          text: "Your account is not linked to a student record, or no grades have been published."
        }) + "</div></div>";
    }

    return children.map((child) => {
      const grades = child.grades || [];
      const subjectRows = (child.subjectSummary || []).map((subject) => {
        const avg = Number(subject.average || 0);
        const tone = avg >= 80 ? "green" : avg >= 60 ? "amber" : "rose";
        return (
          '<div class="subject-row"><span class="name">' + esc(subject.subject) + "</span>" +
          '<div class="progress ' + tone + '"><span style="width:' + Math.min(100, avg) + '%"></span></div>' +
          '<span class="avg">' + percent(avg) + "</span></div>"
        );
      }).join("");

      const rows = grades.map((grade) =>
        '<tr><td><div class="bold small">' + esc(grade.subject) + "</div>" +
        '<div class="tiny muted">' + esc(grade.title) + "</div></td>" +
        '<td><span class="badge gray">' + esc(grade.type) + "</span></td>" +
        "<td>" + esc(grade.score) + " / " + esc(grade.maxScore) + "</td>" +
        "<td>" + gradePill(grade.letter) + "</td>" +
        '<td class="muted small">' + esc(grade.comment || "—") + "</td>" +
        '<td class="muted small">' + esc(fmtDate(grade.date)) + "</td></tr>"
      ).join("");

      return (
        '<div class="card mb-3"><div class="card-head">' + avatar(child.student.fullName) +
        '<div><h3>' + esc(child.student.fullName) + "</h3>" +
        '<div class="sub">' + esc(child.student.schoolClass || "No form") + " · " + esc(child.student.gradeLevel || "") + "</div></div>" +
        '<div class="spacer"></div>' +
        '<div style="text-align:right"><div class="stat-value sm" style="line-height:1.1">' +
        (child.average === null ? "—" : percent(child.average)) + '</div><div class="tiny muted">Overall average</div></div></div>' +
        '<div class="card-body">' +
        (subjectRows ? '<div class="mb-3">' + subjectRows + "</div>" : "") +
        (rows
          ? '<div class="table-wrap"><table class="table"><thead><tr><th>Assessment</th><th>Type</th><th>Score</th><th>Grade</th><th>Comment</th><th>Date</th></tr></thead><tbody>' + rows + "</tbody></table></div>"
          : emptyState({ icon: "grades", title: "No published grades", text: "Teachers have not published results for this student yet." })) +
        "</div></div>"
      );
    }).join("");
  }

  async function loadFamily() {
    const content = document.getElementById("content");
    content.innerHTML = UI.loading(4);
    try {
      const data = await API.get("/api/grades/my");
      content.innerHTML =
        '<div class="page-head"><div><h2>Report card</h2>' +
        "<p>Only published assessments are shown. New results appear as soon as a teacher publishes them.</p></div>" +
        '<div class="spacer"></div><a class="btn btn-outline" href="notifications.html">' + icon("notifications") + " Grade alerts</a></div>" +
        familyView(data);
    } catch (err) {
      content.innerHTML = '<div class="card"><div class="card-body">' +
        emptyState({ icon: "alert", title: "Could not load grades", text: err.message }) + "</div></div>";
    }
  }

  window.renderPage = async function () {
    if (family()) {
      await loadFamily();
    } else {
      await loadList(false);
    }
  };
})();
