/* ============================================================
   LeoneSIS - schools directory (platform administration)
   ============================================================ */
(function () {
  "use strict";

  const {
    esc, icon, emptyState, openModal, closeModal, modalHeader,
    toast, fail, confirmDialog, fmtDate
  } = UI;

  const state = { schools: [], search: "", status: "" };

  const isSuper = () => {
    if (!APP.user) return false;
    const r = APP.user.role;
    return r === "SUPER_ADMIN" || r === "PLATFORM_ADMIN" || r === "SUPER" || r === "PLATFORM";
  };
  const canManage = () => {
    if (!APP.user) return false;
    const r = APP.user.role;
    if (isSuper()) return true;
    if (r === "ADMIN" || r === "SCHOOL_ADMIN") return true;
    // Also check if user has schoolId and is admin type
    return false;
  };

  function formValues(form) {
    const data = {};
    new FormData(form).forEach((value, key) => {
      data[key] = typeof value === "string" ? value : value;
    });
    data.active = !!form.querySelector('[name="active"]') && form.querySelector('[name="active"]').checked;
    return data;
  }

  function filteredSchools() {
    const needle = state.search.trim().toLowerCase();
    return state.schools.filter((school) => {
      if (state.status === "active" && !school.active) return false;
      if (state.status === "inactive" && school.active) return false;
      if (!needle) return true;
      return (
        String(school.name || "").toLowerCase().includes(needle) ||
        String(school.code || "").toLowerCase().includes(needle) ||
        String(school.city || "").toLowerCase().includes(needle) ||
        String(school.principal || "").toLowerCase().includes(needle) ||
        String(school.email || "").toLowerCase().includes(needle) ||
        String(school.phone || "").toLowerCase().includes(needle)
      );
    });
  }

  function schoolTableRow(school) {
    const logoImg = school.logoUrl ? '<img src="' + esc(school.logoUrl) + '" alt="' + esc(school.name) + '" style="width:100%;height:100%;object-fit:contain">' : icon("school");
    const canEditNow = canManage() && (isSuper() || school.id === (APP.user ? APP.user.schoolId : null));
    const adminCount = Array.isArray(school.admins) ? school.admins.length : 0;
    return (
      '<tr data-school-row="' + esc(school.id) + '">' +
      '<td><div class="name-cell"><div class="brand-mark" style="width:38px;height:38px;flex:none">' + logoImg + '</div>' +
      '<div><div class="name">' + esc(school.name) + '</div><div class="sub">' + esc(school.code) + (school.city ? ' · ' + esc(school.city) : '') + '</div></div></div></td>' +
      '<td class="small">' + esc(school.principal || '—') + '</td>' +
      '<td class="small">' + esc(school.phone || school.email || '—') + '</td>' +
      '<td class="small">' + esc((Array.isArray(school.enabledModules) && school.enabledModules.length) ? school.enabledModules.join(', ') : 'fees, library') + '</td>' +
      '<td class="small"><div class="row" style="gap:10px"><span title="Students">' + icon('students') + ' ' + esc(school.students || 0) + '</span><span title="Staff">' + icon('staff') + ' ' + esc(school.staff || 0) + '</span><span title="Accounts">' + icon('users') + ' ' + esc(school.users || 0) + '</span></div>' +
      (adminCount ? '<div class="tiny muted">' + adminCount + ' admin' + (adminCount === 1 ? '' : 's') + '</div>' : '<div class="tiny muted">No admins</div>') + '</td>' +
      '<td>' + (school.active ? '<span class="badge emerald">Active</span>' : '<span class="badge gray">Inactive</span>') + '</td>' +
      '<td><div class="actions">' +
      '<button class="icon-btn" type="button" title="View school" data-view="' + esc(school.id) + '">' + icon('eye') + '</button>' +
      (canEditNow ? '<button class="icon-btn" type="button" title="Edit school" data-edit="' + esc(school.id) + '">' + icon('edit') + '</button>' : '') +
      (isSuper() && school.active ? '<button class="icon-btn danger" type="button" title="Deactivate school" data-deactivate="' + esc(school.id) + '">' + icon('x') + '</button>' : '') +
      (isSuper() && !school.active ? '<button class="icon-btn" type="button" title="Reactivate school" data-reactivate="' + esc(school.id) + '">' + icon('check') + '</button>' : '') +
      '</div></td></tr>'
    );
  }

  function render() {
    const content = document.getElementById("content");
    const totalStudents = state.schools.reduce((sum, school) => sum + Number(school.students || 0), 0);
    const totalStaff = state.schools.reduce((sum, school) => sum + Number(school.staff || 0), 0);
    const active = state.schools.filter((school) => school.active).length;
    const filtered = filteredSchools();

    const statusOptions = '<option value=""' + (state.status === "" ? " selected" : "") + '>All statuses</option>' +
      '<option value="active"' + (state.status === "active" ? " selected" : "") + '>Active</option>' +
      '<option value="inactive"' + (state.status === "inactive" ? " selected" : "") + '>Inactive</option>';

    content.innerHTML =
      '<div class="page-head"><div><h2>Schools</h2>' +
      "<p>" + state.schools.length + " school" + (state.schools.length === 1 ? "" : "s") + " on the platform · " +
      active + " active" + (filtered.length !== state.schools.length ? " · " + filtered.length + " shown" : "") + "</p></div>" +
      '<div class="spacer"></div>' +
      ((isSuper() || canManage())
        ? '<button class="btn btn-primary" id="addSchoolBtn">' + icon("plus") + " Add school</button>"
        : "") +
      "</div>" +

      '<div class="grid stats">' +
      '<div class="stat"><div class="stat-icon tone-indigo">' + icon("school") + '</div><div class="stat-label">Schools</div>' +
      '<div class="stat-value">' + state.schools.length + '</div><div class="stat-hint">' + active + " currently active</div></div>' +
      '<div class="stat"><div class="stat-icon tone-emerald">' + icon("students") + '</div><div class="stat-label">Students</div>' +
      '<div class="stat-value">' + totalStudents + '</div><div class="stat-hint">Across all schools</div></div>' +
      '<div class="stat"><div class="stat-icon tone-cyan">' + icon("staff") + '</div><div class="stat-label">Staff</div>' +
      '<div class="stat-value">' + totalStaff + '</div><div class="stat-hint">Teachers and support</div></div>' +
      '<div class="stat"><div class="stat-icon tone-violet">' + icon("users") + '</div><div class="stat-label">Accounts</div>' +
      '<div class="stat-value">' + state.schools.reduce((sum, school) => sum + Number(school.users || 0), 0) +
      '</div><div class="stat-hint">Portal logins</div></div>' +
      "</div>" +

      '<div class="card mt-3"><div class="card-head">' +
      '<div class="search-box" style="max-width:340px;flex:1">' + icon("search") +
      '<input class="input" id="schoolSearch" placeholder="Search schools, codes, cities, contacts…" value="' + esc(state.search) + '"></div>' +
      '<select class="select" id="schoolStatusFilter" style="width:auto;min-width:150px">' + statusOptions + "</select>" +
      '<div class="spacer"></div>' +
      '<button class="btn btn-outline btn-sm" id="refreshSchools">' + icon("refresh") + " Refresh</button>' +
      "</div>" +
      (filtered.length
        ? '<div class="table-wrap"><table class="table"><thead><tr><th>School</th><th>Principal</th><th>Contact</th><th>Modules</th><th>Enrollment</th><th>Status</th><th></th></tr></thead><tbody id="schoolRows">' + filtered.map(schoolTableRow).join("") + "</tbody></table></div>"
        : '<div class="card-body">' +
          emptyState({
            icon: "school",
            title: state.schools.length ? "No matching schools" : "No schools yet",
            text: state.schools.length
              ? "Try adjusting your search or filters."
              : isSuper()
                ? "Create the first school to start enrolling students and staff."
                : "Your account is not linked to a school yet.",
            action: (state.schools.length && ((isSuper() || canManage())))
              ? '<button class="btn btn-outline" id="clearSchoolFilters">' + icon("x") + " Clear filters</button>"
              : (!state.schools.length && (isSuper() || canManage()))
                ? '<button class="btn btn-primary" id="emptyAddSchool">' + icon("plus") + " Add school</button>"
                : ""
          }) +
          "</div>") +
      "</div>";

    const add = document.getElementById("addSchoolBtn");
    if (add) add.addEventListener("click", openCreate);
    const emptyAdd = document.getElementById("emptyAddSchool");
    if (emptyAdd) emptyAdd.addEventListener("click", openCreate);
    const clear = document.getElementById("clearSchoolFilters");
    if (clear) clear.addEventListener("click", () => {
      state.search = "";
      state.status = "";
      render();
    });
    const search = document.getElementById("schoolSearch");
    if (search) {
      search.addEventListener("input", UI.debounce((event) => {
        state.search = event.target.value;
        const rows = document.getElementById("schoolRows");
        if (rows) {
          const f = filteredSchools();
          rows.innerHTML = f.map(schoolTableRow).join("");
          bindActions();
        }
      }, 160));
    }
    const status = document.getElementById("schoolStatusFilter");
    if (status) {
      status.addEventListener("change", (event) => {
        state.status = event.target.value;
        const rows = document.getElementById("schoolRows");
        if (rows) {
          const f = filteredSchools();
          rows.innerHTML = f.map(schoolTableRow).join("");
          bindActions();
        } else {
          render();
        }
      });
    }
    const refresh = document.getElementById("refreshSchools");
    if (refresh) refresh.addEventListener("click", () => load(true));
    bindActions();
  }

  function bindActions() {
    const content = document.getElementById("content");
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
    content.querySelectorAll("[data-deactivate]").forEach((btn) =>
      btn.addEventListener("click", async (event) => {
        event.stopPropagation();
        const school = state.schools.find((item) => item.id === btn.getAttribute("data-deactivate"));
        if (!school) return;
        const ok = await confirmDialog({
          title: "Deactivate " + school.name + "?",
          message: "The school keeps all of its records but users will not be able to sign in under it. You can reactivate it later by editing the school.",
          confirmText: "Deactivate school",
          danger: true
        });
        if (!ok) return;
        try {
          const result = await API.del("/api/schools/" + school.id, { noSchool: true });
          toast(result.message || "School deactivated.", "success");
          await load();
        } catch (err) {
          fail(err);
        }
      })
    );
    content.querySelectorAll("[data-reactivate]").forEach((btn) =>
      btn.addEventListener("click", async (event) => {
        event.stopPropagation();
        const schoolId = btn.getAttribute("data-reactivate");
        const school = state.schools.find((item) => item.id === schoolId);
        if (!school) return;
        try {
          const result = await API.put("/api/schools/" + schoolId, { active: true }, { noSchool: true });
          toast(result.message || school.name + " reactivated.", "success");
          await load();
        } catch (err) {
          fail(err);
        }
      })
    );
    content.querySelectorAll("[data-school-row]").forEach((row) =>
      row.addEventListener("click", () => openDetail(row.getAttribute("data-school-row")))
    );
  }

  async function load(showToast) {
    const content = document.getElementById("content");
    if (!state.schools.length) content.innerHTML = UI.loading(4);
    try {
      const data = await API.get("/api/schools", { noSchool: true });
      state.schools = data.schools || [];
      if (showToast) toast("School directory refreshed.", "success", 1800);
      render();
    } catch (err) {
      if (err.status === 401) return;
      content.innerHTML = '<div class="card"><div class="card-body">' +
        emptyState({
          icon: "alert",
          title: "Could not load schools",
          text: err.message,
          action: '<button class="btn btn-primary" onclick="location.reload()">Reload</button>'
        }) +
        "</div></div>";
    }
  }

  const CODE_SAFE = /[^A-Z0-9-]/g;

  function schoolForm(school) {
    const editing = !!school;
    const enabled = editing && Array.isArray(school.enabledModules) ? school.enabledModules : ["fees", "library"];
    return (
      '<form id="schoolForm">' +
      '<div class="modal-body">' +
      '<div class="form-section-title" style="margin-top:0">School profile</div>' +
      '<div class="form-grid">' +
      '<div class="field span-2"><label>School name *</label><input class="input" name="name" required value="' + esc(editing ? school.name : "") + '" placeholder="e.g. Greenwood Academy"></div>' +
      '<div class="field"><label>School code *</label><input class="input" name="code" required maxlength="12" value="' + esc(editing ? school.code : "") + '" placeholder="GRN"></div>' +
      '<div class="field"><label>Principal</label><input class="input" name="principal" value="' + esc(editing ? school.principal || "" : "") + '" placeholder="Full name"></div>' +
      '<div class="field"><label>City</label><input class="input" name="city" value="' + esc(editing ? school.city || "" : "") + '"></div>' +
      '<div class="field"><label>Phone</label><input class="input" name="phone" value="' + esc(editing ? school.phone || "" : "") + '"></div>' +
      '<div class="field"><label>Email</label><input class="input" type="email" name="email" value="' + esc(editing ? school.email || "" : "") + '"></div>' +
      '<div class="field"><label>Motto</label><input class="input" name="motto" value="' + esc(editing ? school.motto || "" : "") + '" placeholder="Short school motto"></div>' +
      '<div class="field span-2"><label>Address</label><input class="input" name="address" value="' + esc(editing ? school.address || "" : "") + '"></div>' +
      (isSuper()
        ? '<div class="field span-2"><label>Enabled modules</label><div class="row" style="gap:14px;flex-wrap:wrap"><label class="check-row"><input type="checkbox" name="mod_fees"' + (enabled.indexOf("fees") >= 0 ? " checked" : "") + "> Fees &amp; charges</label><label class="check-row"><input type="checkbox" name="mod_library"' + (enabled.indexOf("library") >= 0 ? " checked" : "") + "> Library</label></div><p class="tiny muted">Schools without these modules will not see them in their menu.</p></div>"
        : "") +
      (isSuper() && editing
        ? '<div class="field span-2"><label class="check-row" style="margin-top:4px"><input type="checkbox" name="active"' +
          (school.active ? " checked" : "") + "> School is active and selectable</label></div>"
        : "") +
      "</div>" +
      (!editing
        ? '<div class="form-section"><div class="form-section-title">School administrator account (optional)</div>' +
          '<div class="notice">' + icon("info") + "<div>Give the school its first administrator login. They can then enroll students, add staff and manage accounts for this school.</div></div>" +
          '<div class="form-grid mt-2">' +
          '<div class="field"><label>Administrator name</label><input class="input" name="adminName" placeholder="Defaults to school administrator"></div>' +
          '<div class="field"><label>Username</label><input class="input" name="adminUsername" placeholder="e.g. greenwoodadmin"></div>' +
          '<div class="field"><label>Email</label><input class="input" type="email" name="adminEmail" placeholder="admin@school.edu"></div>' +
          '<div class="field"><label>Password</label><input class="input" type="password" name="adminPassword" minlength="6" placeholder="At least 6 characters"></div>' +
          "</div></div>"
        : "") +
      "</div>" +
      '<div class="modal-foot"><button class="btn btn-outline" type="button" data-close>Cancel</button>' +
      '<button class="btn btn-primary" type="submit">' + icon("check") + " " + (editing ? "Save changes" : "Create school") + "</button></div></form>"
    );
  }

  function wireSchoolForm(overlay, school) {
    const form = overlay.querySelector("#schoolForm");
    const nameInput = form.querySelector('[name="name"]');
    const codeInput = form.querySelector('[name="code"]');
    let codeTouched = !!school;

    if (school && canManage() && (isSuper() || school.id === APP.user.schoolId)) {
      const modalBody = form.querySelector('.modal-body');
      const uploadSection = document.createElement('div');
      uploadSection.className = 'form-section';
      uploadSection.innerHTML =
        '<div class="form-section-title">School badge &amp; logo</div>' +
        '<div class="notice">' + icon("info") + "<div>Upload a school badge/logo to display on reports and in the interface.</div></div>" +
        '<div class="row mt-2" style="gap:16px;flex-wrap:wrap;align-items:flex-start">' +
        '<div style="min-width:200px;flex:1"><div class="bold small">Logo</div>' +
        '<div class="row mt-1" style="gap:10px;align-items:center">' +
        (school.logoUrl ? '<div class="brand-mark"><img src="' + esc(school.logoUrl) + '" alt="logo" style="width:100%;height:100%;object-fit:contain"></div>' : '<div class="brand-mark">' + icon("image") + '</div>') +
        '<input type="file" id="schoolLogoInput" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif" style="display:none">' +
        '<button class="btn btn-outline btn-sm" type="button" id="uploadSchoolLogo">' + icon("upload") + " Upload logo</button>' +
        '</div></div>' +
        '<div style="min-width:200px;flex:1"><div class="bold small">Badge</div>' +
        '<div class="row mt-1" style="gap:10px;align-items:center">' +
        (school.badgeUrl ? '<div class="brand-mark"><img src="' + esc(school.badgeUrl) + '" alt="badge" style="width:100%;height:100%;object-fit:contain"></div>' : '<div class="brand-mark">' + icon("award") + '</div>') +
        '<input type="file" id="schoolBadgeInput" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif" style="display:none">' +
        '<button class="btn btn-outline btn-sm" type="button" id="uploadSchoolBadge">' + icon("upload") + " Upload badge</button>' +
        '</div></div>' +
        '</div>';
      modalBody.appendChild(uploadSection);

      const logoBtn = uploadSection.querySelector('#uploadSchoolLogo');
      const logoInput = uploadSection.querySelector('#schoolLogoInput');
      logoBtn.addEventListener('click', () => logoInput.click());
      logoInput.addEventListener('change', async () => {
        const file = logoInput.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        logoBtn.disabled = true;
        logoBtn.innerHTML = '<span class="spinner"></span> Uploading…';
        try {
          const result = await API.upload('/api/schools/' + school.id + '/logo', fd, { noSchool: true });
          toast(result.message || 'Logo uploaded.', 'success');
          closeModal(overlay);
          await load();
        } catch (err) {
          logoBtn.disabled = false;
          logoBtn.innerHTML = icon("upload") + " Upload logo";
          fail(err);
        }
      });

      const badgeBtn = uploadSection.querySelector('#uploadSchoolBadge');
      const badgeInput = uploadSection.querySelector('#schoolBadgeInput');
      badgeBtn.addEventListener('click', () => badgeInput.click());
      badgeInput.addEventListener('change', async () => {
        const file = badgeInput.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        badgeBtn.disabled = true;
        badgeBtn.innerHTML = '<span class="spinner"></span> Uploading…';
        try {
          const result = await API.upload('/api/schools/' + school.id + '/badge', fd, { noSchool: true });
          toast(result.message || 'Badge uploaded.', 'success');
          closeModal(overlay);
          await load();
        } catch (err) {
          badgeBtn.disabled = false;
          badgeBtn.innerHTML = icon("upload") + " Upload badge";
          fail(err);
        }
      });
    }

    codeInput.addEventListener("input", () => {
      codeTouched = !!codeInput.value.trim();
    });
    nameInput.addEventListener("input", () => {
      if (codeTouched) return;
      const suggestion = nameInput.value
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, "")
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word[0])
        .join("")
        .slice(0, 5);
      codeInput.value = suggestion;
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = formValues(form);
      const mods = [];
      if (form.querySelector('[name="mod_fees"]') && form.querySelector('[name="mod_fees"]').checked) mods.push("fees");
      if (form.querySelector('[name="mod_library"]') && form.querySelector('[name="mod_library"]').checked) mods.push("library");
      body.enabledModules = mods;
      body.code = (body.code || "").toUpperCase().replace(CODE_SAFE, "").replace(/\s+/g, "");
      if (!body.name.trim()) {
        toast("Enter the school name.", "error");
        return;
      }
      if (body.code.length < 2) {
        toast("The school code needs at least 2 letters or numbers.", "error");
        return;
      }
      if (!school && body.adminUsername && (!body.adminPassword || body.adminPassword.length < 6)) {
        toast("Set a password of at least 6 characters for the school administrator.", "error");
        return;
      }
      if (!school && !body.adminUsername && body.adminPassword) {
        toast("Enter a username for the administrator account.", "error");
        return;
      }
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.innerHTML = '<span class="spinner"></span> Saving…';
      try {
        const result = school
          ? await API.put("/api/schools/" + school.id, body, { noSchool: true })
          : await API.post("/api/schools", body, { noSchool: true });
        toast(result.message || (school ? "School updated." : "School created."), "success");
        closeModal(overlay);
        await load();
        if (isSuper()) {
          try {
            APP.meta = await API.get("/api/meta", { noSchool: true });
            APP.schools = APP.meta.schools || [];
          } catch (err) {
            /* the switcher refreshes on the next page load */
          }
        }
      } catch (err) {
        submit.disabled = false;
        submit.innerHTML = icon("check") + " " + (school ? "Save changes" : "Create school");
        fail(err);
      }
    });
  }

  function openCreate() {
    const overlay = openModal(
      modalHeader("Add a school", "Create the school profile and its first administrator.") + schoolForm(null),
      { size: "wide" }
    );
    wireSchoolForm(overlay, null);
  }

  function openEdit(schoolId) {
    const school = state.schools.find((item) => item.id === schoolId);
    if (!school) return;
    const overlay = openModal(
      modalHeader("Edit " + school.name, "Update the school profile and status.") + schoolForm(school),
      { size: "wide" }
    );
    wireSchoolForm(overlay, school);
  }

  function openDetail(schoolId) {
    const school = state.schools.find((item) => item.id === schoolId);
    if (!school) return;
    const admins = (school.admins || []).length
      ? school.admins.map((admin) =>
          '<div class="row between" style="padding:9px 0;border-bottom:1px solid #eef1f7">' +
          '<div class="row" style="gap:10px">' + UI.avatar(admin.name, "sm") +
          '<div><div class="bold small">' + esc(admin.name) + "</div>" +
          '<div class="tiny muted">@' + esc(admin.username) + " · " + esc(admin.email) + "</div></div></div>" +
          '<span class="badge indigo">Administrator</span></div>'
        ).join("")
      : '<p class="muted small">No administrator account linked to this school yet.</p>';

    const canEditNow = canManage() && (isSuper() || school.id === APP.user.schoolId);
    const overlay = openModal(
      modalHeader(school.name, school.code + (school.city ? " · " + school.city : "")) +
      '<div class="modal-body">' +
      '<div class="row" style="gap:14px;align-items:center">' +
      (school.logoUrl ? '<div class="brand-mark" style="width:64px;height:64px"><img src="' + esc(school.logoUrl) + '" alt="logo" style="width:100%;height:100%;object-fit:contain"></div>' : '<div class="brand-mark" style="width:64px;height:64px">' + icon("school") + '</div>') +
      (school.badgeUrl ? '<div class="brand-mark" style="width:64px;height:64px"><img src="' + esc(school.badgeUrl) + '" alt="badge" style="width:100%;height:100%;object-fit:contain"></div>' : "") +
      '<div><div class="bold" style="font-size:16px">' + esc(school.name) + '</div><div class="muted small">' + esc(school.code) + (school.city ? " · " + esc(school.city) : "") + '</div></div>' +
      '</div>' +
      '<div class="summary-strip mt-2">' +
      '<div class="summary-tile"><div class="n">' + esc(school.students) + '</div><div class="l">Students</div></div>' +
      '<div class="summary-tile"><div class="n">' + esc(school.staff) + '</div><div class="l">Staff</div></div>' +
      '<div class="summary-tile"><div class="n">' + esc(school.users) + '</div><div class="l">Accounts</div></div>' +
      '<div class="summary-tile"><div class="n">' + esc(school.admins ? school.admins.length : 0) + '</div><div class="l">Admins</div></div>' +
      "</div>" +
      '<div class="form-section-title mt-3">School details</div>' +
      '<div class="detail-grid">' +
      '<div class="detail"><div class="k">Status</div><div class="v">' + (school.active ? "Active" : "Inactive") + "</div></div>" +
      '<div class="detail"><div class="k">School name</div><div class="v">' + esc(school.name || "—") + "</div></div>" +
      '<div class="detail"><div class="k">School code</div><div class="v mono">' + esc(school.code || "—") + "</div></div>" +
      '<div class="detail"><div class="k">Principal</div><div class="v">' + esc(school.principal || "—") + "</div></div>" +
      '<div class="detail"><div class="k">Motto</div><div class="v">' + esc(school.motto || "—") + "</div></div>" +
      '<div class="detail"><div class="k">City</div><div class="v">' + esc(school.city || "—") + "</div></div>" +
      '<div class="detail"><div class="k">Phone</div><div class="v">' + esc(school.phone || "—") + "</div></div>" +
      '<div class="detail"><div class="k">Email</div><div class="v">' + esc(school.email || "—") + "</div></div>" +
      '<div class="detail span-2"><div class="k">Address</div><div class="v">' + esc(school.address || "—") + "</div></div>" +
      '<div class="detail"><div class="k">Enabled modules</div><div class="v">' + esc((Array.isArray(school.enabledModules) && school.enabledModules.length) ? school.enabledModules.join(", ") : "fees, library") + "</div></div>" +
      '<div class="detail"><div class="k">Created</div><div class="v">' + esc(fmtDate(school.createdAt)) + "</div></div>" +
      "</div>" +
      '<div class="divider"></div>' +
      '<div class="section-title">Administrators</div>' + admins +
      "</div>" +
      '<div class="modal-foot"><button class="btn btn-outline" type="button" data-close>Close</button>' +
      (canEditNow ? '<button class="btn btn-primary" type="button" id="detailEditSchool">' + icon("edit") + " Edit school</button>" : "") +
      "</div>",
      { size: "wide" }
    );

    const edit = overlay.querySelector("#detailEditSchool");
    if (edit) {
      edit.addEventListener("click", () => {
        closeModal(overlay);
        openEdit(school.id);
      });
    }
  }

  window.renderPage = async function () {
    await load(false);
  };
})();
