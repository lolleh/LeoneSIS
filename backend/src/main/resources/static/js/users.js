/* ============================================================
   LeoneSIS - accounts & access management
   ============================================================ */
(function () {
  "use strict";

  const {
    esc, icon, avatar, roleBadge, roleLabel, fmtDate, fmtDateTime,
    emptyState, openModal, closeModal, modalHeader, toast, fail, confirmDialog
  } = UI;

  const ROLE_DEFAULTS = {
    SUPER_ADMIN: ["dashboard", "schools", "users", "students", "staff", "attendance", "library", "messages", "grades", "notifications"],
    ADMIN: ["dashboard", "users", "students", "staff", "attendance", "library", "messages", "grades", "notifications"],
    TEACHER: ["dashboard", "students", "attendance", "library", "messages", "grades", "notifications"],
    STAFF: ["dashboard", "students", "attendance", "library", "messages", "notifications"],
    PARENT: ["dashboard", "attendance", "library", "messages", "grades", "notifications"],
    STUDENT: ["dashboard", "attendance", "library", "messages", "grades", "notifications"]
  };

  const STAFF_ROLES = ["ADMIN", "TEACHER", "STAFF"];

  const state = {
    users: [],
    roles: [],
    allModules: [],
    students: [],
    staff: [],
    search: "",
    role: ""
  };

  const isSuper = () => APP.user.role === "SUPER_ADMIN";
  const canManage = () => ["ADMIN", "SCHOOL_ADMIN", "SUPER_ADMIN"].includes(APP.user.role);
  const modulesForRole = (role) => ROLE_DEFAULTS[role] || [];

  function moduleLabel(key) {
    const found = state.allModules.find((module) => module.key === key);
    return found ? found.label : key;
  }

  function moduleChips(keys) {
    if (!keys || !keys.length) return '<span class="muted small">Role defaults only</span>';
    return (
      '<div class="pill-row">' +
      keys.map((key) => '<span class="chip">' + esc(moduleLabel(key)) + "</span>").join("") +
      "</div>"
    );
  }

  function filtered() {
    const needle = state.search.trim().toLowerCase();
    return state.users.filter((user) => {
      if (state.role && user.role !== state.role) return false;
      if (!needle) return true;
      return (
        String(user.fullName || "").toLowerCase().includes(needle) ||
        String(user.username || "").toLowerCase().includes(needle) ||
        String(user.email || "").toLowerCase().includes(needle)
      );
    });
  }

  function rowsHtml() {
    const list = filtered();
    if (!list.length) {
      return (
        '<tr><td colspan="6">' +
        emptyState({
          icon: "users",
          title: state.users.length ? "No matching accounts" : "No accounts in this school yet",
          text: state.users.length
            ? "Try a different search or role filter."
            : canManage()
              ? "Create portal logins for staff, parents and students."
              : "Accounts created by the school office will appear here.",
          action: canManage() && !state.users.length
            ? '<button class="btn btn-primary" data-add-account>' + icon("plus") + " Create account</button>"
            : ""
        }) +
        "</td></tr>"
      );
    }

    return list
      .map((user) => {
        const self = user.id === APP.user.id;
        const extras = (user.privileges || []).filter((key) => !modulesForRole(user.role).includes(key));
        return (
          '<tr data-user="' + esc(user.id) + '">' +
          '<td><div class="name-cell">' + avatar(user.fullName) +
          '<div><div class="name">' + esc(user.fullName) + (self ? ' <span class="badge outline">You</span>' : "") + "</div>" +
          '<div class="sub">@' + esc(user.username) + " · " + esc(user.email) + "</div></div></div></td>" +
          "<td>" + roleBadge(user.role) +
          (extras.length ? '<div class="tiny muted mt-1">+' + extras.length + " extra module" + (extras.length === 1 ? "" : "s") + "</div>" : "") +
          "</td>" +
          '<td class="small">' + esc(user.schoolName || "All schools") + "</td>" +
          '<td class="small">' + (user.modules || []).length + " modules" +
          (extras.length ? '<div class="tiny muted">' + esc(extras.map(moduleLabel).join(", ")) + "</div>" : "") +
          "</td>" +
          "<td>" + (user.active
            ? '<span class="badge emerald">Active</span>'
            : '<span class="badge gray">Inactive</span>') + "</td>" +
          '<td class="small muted">' + (user.lastLoginAt ? esc(fmtDateTime(user.lastLoginAt)) : "Never signed in") + "</td>" +
          '<td><div class="actions">' +
          '<button class="icon-btn" type="button" title="View account" data-view="' + esc(user.id) + '">' + icon("eye") + "</button>" +
          (canManage()
            ? '<button class="icon-btn" type="button" title="Edit account" data-edit="' + esc(user.id) + '">' + icon("edit") + "</button>" +
              (self ? "" : '<button class="icon-btn danger" type="button" title="Deactivate account" data-remove="' + esc(user.id) + '">' + icon("trash") + "</button>")
            : "") +
          "</div></td></tr>"
        );
      })
      .join("");
  }

  function render() {
    const content = document.getElementById("content");
    const counts = state.roles.reduce((acc, role) => {
      acc[role] = state.users.filter((user) => user.role === role).length;
      return acc;
    }, {});
    const active = state.users.filter((user) => user.active).length;

    const roleOptions = ['<option value="">All roles</option>']
      .concat(
        state.roles.map(
          (role) => '<option value="' + esc(role) + '"' + (state.role === role ? " selected" : "") + ">" +
            esc(roleLabel(role)) + " (" + (counts[role] || 0) + ")</option>"
        )
      )
      .join("");

    content.innerHTML =
      '<div class="page-head"><div><h2>Accounts &amp; access</h2>' +
      "<p>" + state.users.length + " portal account" + (state.users.length === 1 ? "" : "s") +
      " in this school · " + active + " active</p></div>" +
      '<div class="spacer"></div>' +
      (canManage()
        ? '<button class="btn btn-primary" id="addAccountBtn">' + icon("plus") + " Create account</button>"
        : "") +
      "</div>" +

      '<div class="grid stats">' +
      '<div class="stat"><div class="stat-icon tone-indigo">' + icon("users") + '</div><div class="stat-label">Accounts</div>' +
      '<div class="stat-value">' + state.users.length + '</div><div class="stat-hint">' + active + " active logins</div></div>" +
      '<div class="stat"><div class="stat-icon tone-violet">' + icon("shield") + '</div><div class="stat-label">Administrators</div>' +
      '<div class="stat-value">' + ((counts.ADMIN || 0) + (isSuper() ? counts.SUPER_ADMIN || 0 : 0)) +
      '</div><div class="stat-hint">Manage school &amp; access</div></div>' +
      '<div class="stat"><div class="stat-icon tone-cyan">' + icon("staff") + '</div><div class="stat-label">Teaching &amp; staff</div>' +
      '<div class="stat-value">' + ((counts.TEACHER || 0) + (counts.STAFF || 0)) +
      '</div><div class="stat-hint">Teaching and support</div></div>' +
      '<div class="stat"><div class="stat-icon tone-amber">' + icon("students") + '</div><div class="stat-label">Families</div>' +
      '<div class="stat-value">' + ((counts.PARENT || 0) + (counts.STUDENT || 0)) +
      '</div><div class="stat-hint">Parents and students</div></div>' +
      "</div>" +

      '<div class="card mt-3"><div class="card-head">' +
      '<div class="search-box" style="max-width:340px;flex:1">' + icon("search") +
      '<input class="input" id="accountSearch" placeholder="Search name, username or email…" value="' + esc(state.search) + '"></div>' +
      '<select class="select" id="roleFilter" style="width:auto;min-width:165px">' + roleOptions + "</select>" +
      '<div class="spacer"></div>' +
      '<button class="btn btn-outline btn-sm" id="refreshAccounts">' + icon("refresh") + " Refresh</button></div>" +
      '<div class="table-wrap"><table class="table"><thead><tr>' +
      "<th>Account</th><th>Role</th><th>School</th><th>Access</th><th>Status</th><th>Last sign-in</th><th></th>" +
      '</tr></thead><tbody id="accountRows">' + rowsHtml() + "</tbody></table></div></div>";

    content.querySelector("#accountSearch").addEventListener(
      "input",
      UI.debounce((event) => {
        state.search = event.target.value;
        document.getElementById("accountRows").innerHTML = rowsHtml();
        bindRows();
      }, 180)
    );
    content.querySelector("#roleFilter").addEventListener("change", (event) => {
      state.role = event.target.value;
      document.getElementById("accountRows").innerHTML = rowsHtml();
      bindRows();
    });
    content.querySelector("#refreshAccounts").addEventListener("click", () => load(true));
    const add = content.querySelector("#addAccountBtn");
    if (add) add.addEventListener("click", openCreate);
    bindRows();
  }

  function bindRows() {
    const content = document.getElementById("content");
    content.querySelectorAll("[data-add-account]").forEach((btn) =>
      btn.addEventListener("click", openCreate)
    );
    content.querySelectorAll("[data-user]").forEach((row) => {
      row.addEventListener("click", () => openDetail(row.getAttribute("data-user")));
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
        const user = state.users.find((item) => item.id === btn.getAttribute("data-remove"));
        if (!user) return;
        const ok = await confirmDialog({
          title: "Deactivate " + user.fullName + "?",
          message: "The account will no longer be able to sign in. You can reactivate it later from the edit dialog.",
          confirmText: "Deactivate account",
          danger: true
        });
        if (!ok) return;
        try {
          const result = await API.del("/api/users/" + user.id);
          toast(result.message || "Account deactivated.", "success");
          await load();
        } catch (err) {
          fail(err);
        }
      })
    );
  }

  async function load(showToast) {
    const content = document.getElementById("content");
    if (!state.users.length) content.innerHTML = UI.loading(5);
    try {
      const results = await Promise.allSettled([
        API.get("/api/users"),
        API.get("/api/students"),
        API.get("/api/staff")
      ]);
      if (results[0].status === "rejected") throw results[0].reason;
      const data = results[0].value;
      state.users = data.users || [];
      state.roles = data.roles || [];
      state.allModules = data.allModules || [];
      state.students = results[1].status === "fulfilled" ? results[1].value.students || [] : [];
      state.staff = results[2].status === "fulfilled" ? results[2].value.staff || [] : [];
      if (showToast) toast("Accounts refreshed.", "success", 1800);
      render();
    } catch (err) {
      if (err.status === 401) return;
      content.innerHTML = '<div class="card"><div class="card-body">' +
        emptyState({
          icon: "alert",
          title: "Could not load accounts",
          text: err.message,
          action: '<button class="btn btn-primary" onclick="location.reload()">Reload</button>'
        }) +
        "</div></div>";
    }
  }

  /* ---------------------------------------------------------- form bits */
  function privilegeSection(role, selected) {
    const defaults = modulesForRole(role);
    const chosen = selected || [];
    const rows = state.allModules.map((module) => {
      const included = defaults.includes(module.key);
      const checked = included || chosen.includes(module.key);
      return (
        '<label class="check-row" style="justify-content:space-between">' +
        "<span>" + esc(module.label) +
        (included ? ' <span class="tiny muted">· included with role</span>' : "") + "</span>" +
        '<input type="checkbox" data-privilege="' + esc(module.key) + '"' +
        (checked ? " checked" : "") + (included ? " disabled" : "") + ">" +
        "</label>"
      );
    }).join("");
    return (
      '<div class="form-section"><div class="form-section-title">Module access</div>' +
      '<p class="role-note" style="margin-bottom:8px">Role defaults are always available. Tick additional modules to grant extra privileges.</p>' +
      '<div class="recipient-scroll">' + rows + "</div></div>"
    );
  }

  function studentOptions(excludeLinked) {
    const available = state.students.filter(
      (student) => !student.hasPortalAccount || (excludeLinked && student.id === excludeLinked)
    );
    if (!available.length) {
      return '<option value="">No unlinked student records</option>';
    }
    return '<option value="">Do not link a student record</option>' +
      available.map(
        (student) => '<option value="' + esc(student.id) + '">' +
          esc(student.fullName + " · " + (student.schoolClass || "No form") + " · " + student.admissionNo) +
          "</option>"
      ).join("");
  }

  function staffOptions() {
    const available = state.staff.filter((member) => !member.hasLogin);
    if (!available.length) {
      return '<option value="">No unlinked staff records</option>';
    }
    return '<option value="">Do not link a staff record</option>' +
      available.map(
        (member) => '<option value="' + esc(member.id) + '">' +
          esc(member.fullName + " · " + (member.position || "Staff") + " · " + member.staffNo) +
          "</option>"
      ).join("");
  }

  function childrenSection(user) {
    const checked = new Set((user && user.children ? user.children : []).map((child) => child.id));
    const rows = state.students.map(
      (student) =>
        '<label class="check-row"><input type="checkbox" data-child="' + esc(student.id) + '"' +
        (checked.has(student.id) ? " checked" : "") + "><span>" + esc(student.fullName) +
        ' <span class="tiny muted">· ' + esc(student.schoolClass || "No form") + " · " + esc(student.admissionNo) + "</span></span></label>"
    ).join("");
    return (
      '<div class="form-section"><div class="form-section-title">Children</div>' +
      '<p class="role-note" style="margin-bottom:8px">Select the students this parent can follow. Leave blank to link children later from the student record.</p>' +
      (rows
        ? '<div class="recipient-scroll">' + rows + "</div>"
        : '<p class="muted small">No student records available.</p>') +
      "</div>"
    );
  }

  function linkSection(role, user) {
    if (role === "SUPER_ADMIN") {
      return '<div class="notice mt-3">' + icon("shield") +
        "<div>Platform administrators are not tied to a single school. They can switch between every school from the top bar.</div></div>";
    }
    if (role === "PARENT") return childrenSection(user);
    if (role === "STUDENT") {
      if (user && user.linkedStudent) {
        return '<div class="form-section"><div class="form-section-title">Student record</div>' +
          '<div class="notice">' + icon("user") + "<div>Linked to <b>" + esc(user.linkedStudent.name) + "</b> · " +
          esc(user.linkedStudent.schoolClass || "No form") + ". Unlink from the student's record if needed.</div></div></div>";
      }
      return (
        '<div class="form-section"><div class="form-section-title">Student record (optional)</div>' +
        '<select class="select" name="studentId">' + studentOptions() + "</select></div>"
      );
    }
    if (STAFF_ROLES.includes(role)) {
      if (user && user.linkedStaff) {
        return '<div class="form-section"><div class="form-section-title">Staff record</div>' +
          '<div class="notice">' + icon("staff") + "<div>Linked to <b>" + esc(user.linkedStaff.name) + "</b> · " +
          esc(user.linkedStaff.position || "Staff") + ".</div></div></div>";
      }
      return (
        '<div class="form-section"><div class="form-section-title">Staff record (optional)</div>' +
        '<select class="select" name="staffId">' + staffOptions() + "</select></div>"
      );
    }
    return "";
  }

  function accountForm(user) {
    const editing = !!user;
    const role = user ? user.role : "TEACHER";
    const selected = user ? user.privileges || [] : [];
    const roleChoices = state.roles.filter((r) => r !== "SUPER_ADMIN" || isSuper());
    const self = editing && user.id === APP.user.id;

    return (
      '<form id="accountForm">' +
      '<div class="modal-body">' +
      '<div class="form-section-title" style="margin-top:0">Account details</div>' +
      '<div class="form-grid">' +
      '<div class="field"><label>Full name *</label><input class="input" name="fullName" required value="' + esc(editing ? user.fullName : "") + '"></div>' +
      '<div class="field"><label>Username *</label><input class="input" name="username"' + (editing ? " disabled" : " required") +
      ' value="' + esc(editing ? user.username : "") + '" autocomplete="off"></div>' +
      '<div class="field"><label>Email *</label><input class="input" type="email" name="email" required value="' + esc(editing ? user.email : "") + '"></div>' +
      '<div class="field"><label>' + (editing ? "New password" : "Password *") + "</label>" +
      '<input class="input" type="password" name="password"' + (editing ? "" : " required") +
      ' minlength="6" autocomplete="new-password" placeholder="' + (editing ? "Leave blank to keep current" : "At least 6 characters") + '"></div>' +
      '<div class="field"><label>Role *</label><select class="select" name="role"' + (self ? " disabled" : "") + ">" +
      roleChoices.map(
        (r) => '<option value="' + esc(r) + '"' + (r === role ? " selected" : "") + ">" + esc(roleLabel(r)) + "</option>"
      ).join("") + "</select>" +
      (self ? '<div class="hint">You cannot change your own role.</div>' : "") + "</div>" +
      (editing
        ? '<div class="field"><label>Account status</label><label class="check-row" style="margin-top:10px">' +
          '<input type="checkbox" name="active"' + (user.active ? " checked" : "") + (self ? " disabled" : "") +
          "> Account can sign in</label></div>"
        : "") +
      "</div>" +
      '<div id="privilegeSection">' + privilegeSection(role, selected) + "</div>" +
      '<div id="linkSection">' + linkSection(role, user) + "</div>" +
      "</div>" +
      '<div class="modal-foot"><button class="btn btn-outline" type="button" data-close>Cancel</button>' +
      '<button class="btn btn-primary" type="submit">' + icon("check") + " " +
      (editing ? "Save account" : "Create account") + "</button></div></form>"
    );
  }

  function collectPrivileges(form) {
    return Array.from(form.querySelectorAll("[data-privilege]"))
      .filter((input) => input.checked && !input.disabled)
      .map((input) => input.getAttribute("data-privilege"));
  }

  function collectChildren(form) {
    return Array.from(form.querySelectorAll("[data-child]"))
      .filter((input) => input.checked)
      .map((input) => input.getAttribute("data-child"));
  }

  function wireAccountForm(overlay) {
    const form = overlay.querySelector("#accountForm");
    const roleSelect = form.querySelector('[name="role"]');
    const privilegeBox = form.querySelector("#privilegeSection");
    const linkBox = form.querySelector("#linkSection");

    const syncRole = () => {
      const current = collectPrivileges(form);
      privilegeBox.innerHTML = privilegeSection(roleSelect.value, current);
      linkBox.innerHTML = linkSection(roleSelect.value, null);
    };
    if (roleSelect && !roleSelect.disabled) roleSelect.addEventListener("change", syncRole);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const editing = !!form.getAttribute("data-user-id");
      const userId = form.getAttribute("data-user-id");
      const role = roleSelect ? roleSelect.value : "STAFF";
      const password = form.querySelector('[name="password"]').value;

      if (password && password.length < 6) {
        toast("Password must be at least 6 characters.", "error");
        return;
      }
      if (role === "PARENT" && password && password.length < 6) {
        toast("Password must be at least 6 characters.", "error");
        return;
      }

      const body = {
        fullName: form.querySelector('[name="fullName"]').value.trim(),
        email: form.querySelector('[name="email"]').value.trim(),
        role: role,
        privileges: collectPrivileges(form)
      };
      if (password) body.password = password;
      if (editing) {
        const active = form.querySelector('[name="active"]');
        body.active = active ? active.checked : true;
      }

      const studentSelect = form.querySelector('[name="studentId"]');
      if (studentSelect && studentSelect.value) body.studentId = studentSelect.value;
      const staffSelect = form.querySelector('[name="staffId"]');
      if (staffSelect && staffSelect.value) body.staffId = staffSelect.value;
      if (role === "PARENT") body.childIds = collectChildren(form);

      if (!body.fullName) {
        toast("Enter the account holder's full name.", "error");
        return;
      }
      if (!editing && !form.querySelector('[name="username"]').value.trim()) {
        toast("Choose a username.", "error");
        return;
      }

      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.innerHTML = '<span class="spinner"></span> Saving…';
      try {
        const result = editing
          ? await API.put("/api/users/" + userId, body)
          : await API.post("/api/users", Object.assign({
              username: form.querySelector('[name="username"]').value.trim()
            }, body));
        toast(result.message || (editing ? "Account updated." : "Account created."), "success");
        closeModal(overlay);
        await load();
      } catch (err) {
        submit.disabled = false;
        submit.innerHTML = icon("check") + " " + (editing ? "Save account" : "Create account");
        fail(err);
      }
    });
  }

  function openCreate() {
    const overlay = openModal(
      modalHeader("Create an account", "A portal login with a role, module access and an optional linked record.") +
      accountForm(null),
      { size: "wide" }
    );
    wireAccountForm(overlay);
  }

  function openEdit(userId) {
    const user = state.users.find((item) => item.id === userId);
    if (!user) return;
    const overlay = openModal(
      modalHeader("Edit " + user.fullName, "@" + user.username + " · " + user.schoolName) + accountForm(user),
      { size: "wide" }
    );
    const form = overlay.querySelector("#accountForm");
    form.setAttribute("data-user-id", user.id);
    wireAccountForm(overlay);
  }

  function openDetail(userId) {
    const user = state.users.find((item) => item.id === userId);
    if (!user) return;
    const defaults = modulesForRole(user.role);
    const extras = (user.privileges || []).filter((key) => !defaults.includes(key));
    const children = (user.children || []).map((child) =>
      '<span class="chip">' + icon("user") + esc(child.name) + (child.schoolClass ? " · " + esc(child.schoolClass) : "") + "</span>"
    ).join("");

    const overlay = openModal(
      modalHeader(user.fullName, "@" + user.username + " · " + roleLabel(user.role)) +
      '<div class="modal-body">' +
      '<div class="row wrap" style="gap:14px;margin-bottom:18px">' + avatar(user.fullName, "lg") +
      '<div style="flex:1;min-width:200px"><div class="bold" style="font-size:16px">' + esc(user.fullName) + "</div>" +
      '<div class="muted small">' + esc(user.email) + "</div>" +
      '<div class="pill-row mt-1">' + roleBadge(user.role) +
      (user.active ? '<span class="badge emerald">Active</span>' : '<span class="badge gray">Inactive</span>') +
      (user.linkedStudent ? '<span class="badge blue">Student record linked</span>' : "") +
      (user.linkedStaff ? '<span class="badge blue">Staff record linked</span>' : "") +
      "</div></div></div>" +
      '<div class="detail-grid">' +
      '<div class="detail"><div class="k">School</div><div class="v">' + esc(user.schoolName || "All schools") + "</div></div>" +
      '<div class="detail"><div class="k">Username</div><div class="v mono">@' + esc(user.username) + "</div></div>" +
      '<div class="detail"><div class="k">Email</div><div class="v">' + esc(user.email) + "</div></div>" +
      '<div class="detail"><div class="k">Created</div><div class="v">' + esc(fmtDate(user.createdAt)) + "</div></div>" +
      '<div class="detail"><div class="k">Last sign-in</div><div class="v">' + (user.lastLoginAt ? esc(fmtDateTime(user.lastLoginAt)) : "Never") + "</div></div>" +
      '<div class="detail"><div class="k">Modules</div><div class="v">' + (user.modules || []).length + " available</div></div>" +
      "</div>" +
      '<div class="divider"></div>' +
      '<div class="section-title">Role defaults</div>' +
      moduleChips(defaults) +
      '<div class="section-title">Extra privileges</div>' +
      moduleChips(extras) +
      (user.linkedStudent
        ? '<div class="section-title">Linked student</div><div class="pill-row"><span class="chip">' +
          icon("students") + esc(user.linkedStudent.name) + (user.linkedStudent.schoolClass ? " · " + esc(user.linkedStudent.schoolClass) : "") + "</span></div>"
        : "") +
      (user.linkedStaff
        ? '<div class="section-title">Linked staff member</div><div class="pill-row"><span class="chip">' +
          icon("staff") + esc(user.linkedStaff.name) + (user.linkedStaff.position ? " · " + esc(user.linkedStaff.position) : "") + "</span></div>"
        : "") +
      (children ? '<div class="section-title">Children</div><div class="pill-row">' + children + "</div>" : "") +
      "</div>" +
      '<div class="modal-foot"><button class="btn btn-outline" type="button" data-close>Close</button>' +
      (canManage()
        ? '<button class="btn btn-soft" type="button" id="detailReset">' + icon("lock") + " Reset password</button>" +
          '<button class="btn btn-primary" type="button" id="detailEditUser">' + icon("edit") + " Edit account</button>"
        : "") +
      "</div>",
      { size: "wide" }
    );

    const edit = overlay.querySelector("#detailEditUser");
    if (edit) {
      edit.addEventListener("click", () => {
        closeModal(overlay);
        openEdit(user.id);
      });
    }
    const reset = overlay.querySelector("#detailReset");
    if (reset) {
      reset.addEventListener("click", () => {
        closeModal(overlay);
        openReset(user);
      });
    }
  }

  function openReset(user) {
    const overlay = openModal(
      modalHeader("Reset password", "Set a new password for " + user.fullName + ".") +
      '<form id="resetForm"><div class="modal-body">' +
      '<div class="notice">' + icon("lock") +
      "<div>The user will be signed out of every device and must use the new password next time.</div></div>" +
      '<div class="form-grid mt-2">' +
      '<div class="field span-2"><label>New password *</label><input class="input" type="password" name="password" required minlength="6" autocomplete="new-password" placeholder="At least 6 characters"></div>' +
      '<div class="field span-2"><label>Confirm password *</label><input class="input" type="password" name="confirm" required minlength="6" autocomplete="new-password"></div>' +
      "</div></div>" +
      '<div class="modal-foot"><button class="btn btn-outline" type="button" data-close>Cancel</button>' +
      '<button class="btn btn-primary" type="submit">' + icon("check") + " Reset password</button></div></form>"
    );
    const form = overlay.querySelector("#resetForm");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const password = form.querySelector('[name="password"]').value;
      const confirm = form.querySelector('[name="confirm"]').value;
      if (password !== confirm) {
        toast("The passwords do not match.", "error");
        return;
      }
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.innerHTML = '<span class="spinner"></span> Resetting…';
      try {
        const result = await API.post("/api/users/" + user.id + "/reset-password", { password });
        toast(result.message || "Password reset.", "success");
        closeModal(overlay);
      } catch (err) {
        submit.disabled = false;
        submit.innerHTML = icon("check") + " Reset password";
        fail(err);
      }
    });
  }

  window.renderPage = async function () {
    await load(false);
  };
})();
