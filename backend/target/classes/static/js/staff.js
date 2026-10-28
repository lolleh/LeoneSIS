/* ============================================================
   LeoneSIS - staff directory
   ============================================================ */
(function () {
  "use strict";

  const {
    esc, icon, avatar, fmtDate, roleBadge, emptyState, openModal, closeModal,
    modalHeader, toast, fail, confirmDialog, debounce, todayISO
  } = UI;

  const state = { staff: [], search: "" };
  const canManage = () => ["ADMIN", "SUPER_ADMIN"].includes(APP.user.role);

  function formValues(form) {
    const data = {};
    new FormData(form).forEach((value, key) => {
      if (key !== "privileges") data[key] = value;
    });
    return data;
  }

  function selectedPrivileges(form) {
    return Array.from(form.querySelectorAll('input[name="privileges"]:checked')).map((input) => input.value);
  }

  function privilegeGrid(selected) {
    return (
      '<div class="check-grid">' +
      (APP.allModules || [])
        .map(
          (module) =>
            '<label class="check-row"><input type="checkbox" name="privileges" value="' + esc(module.key) + '"' +
            ((selected || []).includes(module.key) ? " checked" : "") +
            "><span>" + esc(module.label) + "</span></label>"
        )
        .join("") +
      "</div>"
    );
  }

  function filtered() {
    const needle = state.search.trim().toLowerCase();
    if (!needle) return state.staff;
    return state.staff.filter((member) =>
      [member.fullName, member.position, member.department, member.staffNo, member.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }

  function rowsHtml() {
    const list = filtered();
    if (!list.length) {
      return (
        '<tr><td colspan="5">' +
        emptyState({
          icon: "staff",
          title: state.staff.length ? "No matching staff" : "No staff added yet",
          text: state.staff.length ? "Try another search." : "Add teachers and support staff to build your team.",
          action: canManage() && !state.staff.length
            ? '<button class="btn btn-primary" data-add-staff>' + icon("plus") + " Add staff member</button>"
            : ""
        }) +
        "</td></tr>"
      );
    }
    return list.map((member) =>
      '<tr>' +
      '<td><div class="name-cell">' + avatar(member.fullName) +
      '<div><div class="name">' + esc(member.fullName) + "</div>" +
      '<div class="sub">' + esc(member.staffNo) + " · " + esc(member.department || "No department") + "</div></div></div></td>" +
      '<td><div class="bold small">' + esc(member.position || "—") + "</div>" +
      '<div class="tiny muted">' + esc(member.qualification || "") + "</div></td>" +
      '<td><div class="small">' + esc(member.email || "—") + "</div>" +
      '<div class="tiny muted">' + esc(member.phone || "") + "</div></td>" +
      '<td>' + (member.hasLogin
        ? '<span class="badge emerald">' + esc(member.account.role) + "</span>"
        : '<span class="badge gray">No login</span>') + "</td>" +
      '<td><div class="actions">' +
      '<button class="icon-btn" type="button" title="View" data-view="' + esc(member.id) + '">' + icon("eye") + "</button>" +
      (canManage()
        ? '<button class="icon-btn" type="button" title="Edit" data-edit="' + esc(member.id) + '">' + icon("edit") + "</button>" +
          (member.active
            ? '<button class="icon-btn danger" type="button" title="Mark inactive" data-remove="' + esc(member.id) + '">' + icon("trash") + "</button>"
            : '<span class="badge gray">Inactive</span>')
        : "") +
      "</div></td></tr>"
    ).join("");
  }

  function renderList() {
    const content = document.getElementById("content");
    content.innerHTML =
      '<div class="page-head"><div><h2>Staff directory</h2>' +
      "<p>" + state.staff.length + " team member" + (state.staff.length === 1 ? "" : "s") + " on record.</p></div>" +
      '<div class="spacer"></div>' +
      (canManage() ? '<button class="btn btn-primary" id="addStaffBtn">' + icon("plus") + " Add staff member</button>" : "") +
      "</div>" +
      '<div class="card"><div class="card-head">' +
      '<div class="search-box" style="max-width:340px;flex:1">' + icon("search") +
      '<input class="input" id="staffSearch" placeholder="Search name, role, department or staff no…" value="' + esc(state.search) + '"></div>' +
      '<div class="spacer"></div><button class="btn btn-outline btn-sm" id="refreshStaff">' + icon("refresh") + " Refresh</button></div>" +
      '<div class="table-wrap"><table class="table"><thead><tr>' +
      "<th>Staff member</th><th>Role</th><th>Contact</th><th>Portal</th><th></th>" +
      '</tr></thead><tbody id="staffRows">' + rowsHtml() + "</tbody></table></div></div>";

    content.querySelector("#staffSearch").addEventListener(
      "input",
      debounce((event) => {
        state.search = event.target.value;
        document.getElementById("staffRows").innerHTML = rowsHtml();
        bindRows();
      }, 160)
    );
    content.querySelector("#refreshStaff").addEventListener("click", () => load(true));
    const add = content.querySelector("#addStaffBtn");
    if (add) add.addEventListener("click", () => openCreate());
    bindRows();
  }

  function bindRows() {
    const content = document.getElementById("content");
    content.querySelectorAll("[data-add-staff]").forEach((btn) =>
      btn.addEventListener("click", () => openCreate())
    );
    content.querySelectorAll("[data-view]").forEach((btn) =>
      btn.addEventListener("click", () => openView(btn.getAttribute("data-view")))
    );
    content.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => openEdit(btn.getAttribute("data-edit")))
    );
    content.querySelectorAll("[data-remove]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const member = state.staff.find((item) => item.id === btn.getAttribute("data-remove"));
        if (!member) return;
        const ok = await confirmDialog({
          title: "Mark " + member.fullName + " as inactive?",
          message: "The staff record stays for history but the member is removed from active lists.",
          confirmText: "Mark inactive",
          danger: true
        });
        if (!ok) return;
        try {
          const result = await API.del("/api/staff/" + member.id);
          toast(result.message || "Staff member updated.", "success");
          await load();
        } catch (err) {
          fail(err);
        }
      })
    );
  }

  async function load(showToast) {
    const content = document.getElementById("content");
    if (!state.staff.length) content.innerHTML = UI.loading(4);
    try {
      const data = await API.get("/api/staff");
      state.staff = data.staff || [];
      renderList();
      if (showToast) toast("Staff directory refreshed.", "success", 1800);
    } catch (err) {
      if (err.status === 401) return;
      content.innerHTML = '<div class="card"><div class="card-body">' +
        emptyState({ icon: "alert", title: "Could not load staff", text: err.message }) + "</div></div>";
    }
  }

  function loginSection() {
    return (
      '<div class="form-section" id="loginSection" style="display:none">' +
      '<div class="form-section-title">Portal login</div>' +
      '<div class="form-grid">' +
      '<div class="field"><label>Username *</label><input class="input" name="username" placeholder="e.g. jdoe"></div>' +
      '<div class="field"><label>Password *</label><input class="input" type="password" name="password" minlength="6" placeholder="At least 6 characters"></div>' +
      '<div class="field"><label>Role</label><select class="select" name="role"><option value="TEACHER">Teacher</option><option value="STAFF">Staff</option><option value="ADMIN">Administrator</option></select></div>' +
      '<div class="field"><label>Login email</label><input class="input" type="email" name="loginEmail" placeholder="Defaults to staff email"></div>' +
      '<div class="field span-2"><label>Extra module privileges</label>' +
      '<div class="role-note mb-1">Role defaults are always included. Tick extra modules to widen access.</div>' +
      privilegeGrid([]) + "</div>" +
      "</div></div>"
    );
  }

  function openCreate() {
    const overlay = openModal(
      modalHeader("Add a staff member", "Create the staff record and optionally a portal login.") +
        '<form id="staffForm">' +
        '<div class="modal-body">' +
        '<div class="form-grid">' +
        '<div class="field"><label>First name *</label><input class="input" name="firstName" required></div>' +
        '<div class="field"><label>Last name *</label><input class="input" name="lastName" required></div>' +
        '<div class="field"><label>Position</label><input class="input" name="position" placeholder="e.g. Mathematics Teacher"></div>' +
        '<div class="field"><label>Department</label><input class="input" name="department" placeholder="e.g. Sciences"></div>' +
        '<div class="field"><label>Email</label><input class="input" type="email" name="email" placeholder="name@school.edu"></div>' +
        '<div class="field"><label>Phone</label><input class="input" name="phone"></div>' +
        '<div class="field"><label>Qualification</label><input class="input" name="qualification" placeholder="e.g. B.Ed"></div>' +
        '<div class="field"><label>Hire date</label><input class="input" type="date" name="hireDate" max="' + todayISO() + '"></div>' +
        '<div class="field span-2"><label class="check-row" style="padding:0"><input type="checkbox" id="createLogin"><span><b>Create a portal login</b><div class="role-note">Teachers can take attendance, post grades, message families and upload library resources.</div></span></label></div>' +
        "</div>" +
        loginSection() +
        "</div>" +
        '<div class="modal-foot"><button class="btn btn-outline" type="button" data-close>Cancel</button>' +
        '<button class="btn btn-primary" type="submit">' + icon("check") + " Add staff member</button></div></form>",
      { size: "wide" }
    );

    const form = overlay.querySelector("#staffForm");
    const checkbox = overlay.querySelector("#createLogin");
    const section = overlay.querySelector("#loginSection");
    checkbox.addEventListener("change", () => {
      section.style.display = checkbox.checked ? "" : "none";
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = formValues(form);
      body.createLogin = checkbox.checked;
      body.privileges = selectedPrivileges(form);
      if (checkbox.checked) {
        if (!body.username || !body.password) {
          toast("Choose a username and password for the staff login.", "error");
          return;
        }
        if (body.password.length < 6) {
          toast("The password must be at least 6 characters.", "error");
          return;
        }
      }
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.innerHTML = '<span class="spinner"></span> Saving…';
      try {
        const result = await API.post("/api/staff", body);
        toast(result.message || "Staff member added.", "success");
        closeModal(overlay);
        await load();
      } catch (err) {
        submit.disabled = false;
        submit.innerHTML = icon("check") + " Add staff member";
        fail(err);
      }
    });
  }

  function openEdit(staffId) {
    const member = state.staff.find((item) => item.id === staffId);
    if (!member) return;
    const overlay = openModal(
      modalHeader("Edit " + member.fullName, "Update the staff record.") +
        '<form id="editStaffForm">' +
        '<div class="modal-body"><div class="form-grid">' +
        '<div class="field"><label>First name *</label><input class="input" name="firstName" required value="' + esc(member.firstName) + '"></div>' +
        '<div class="field"><label>Last name *</label><input class="input" name="lastName" required value="' + esc(member.lastName) + '"></div>' +
        '<div class="field"><label>Staff number</label><input class="input" name="staffNo" value="' + esc(member.staffNo) + '"></div>' +
        '<div class="field"><label>Position</label><input class="input" name="position" value="' + esc(member.position || "") + '"></div>' +
        '<div class="field"><label>Department</label><input class="input" name="department" value="' + esc(member.department || "") + '"></div>' +
        '<div class="field"><label>Email</label><input class="input" type="email" name="email" value="' + esc(member.email || "") + '"></div>' +
        '<div class="field"><label>Phone</label><input class="input" name="phone" value="' + esc(member.phone || "") + '"></div>' +
        '<div class="field"><label>Qualification</label><input class="input" name="qualification" value="' + esc(member.qualification || "") + '"></div>' +
        '<div class="field"><label>Hire date</label><input class="input" type="date" name="hireDate" value="' + esc(member.hireDate || "") + '"></div>' +
        "</div>" +
        (member.hasLogin
          ? '<div class="notice mt-2">' + icon("info") + "<div>Portal login: <b>@" + esc(member.account.username) + "</b> (" + esc(member.account.role) + "). Manage credentials from Accounts & access.</div></div>"
          : "") +
        "</div>" +
        '<div class="modal-foot"><button class="btn btn-outline" type="button" data-close>Cancel</button>' +
        '<button class="btn btn-primary" type="submit">' + icon("check") + " Save changes</button></div></form>"
    );

    const form = overlay.querySelector("#editStaffForm");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.innerHTML = '<span class="spinner"></span> Saving…';
      try {
        const result = await API.put("/api/staff/" + member.id, formValues(form));
        toast(result.message || "Staff member updated.", "success");
        closeModal(overlay);
        await load();
      } catch (err) {
        submit.disabled = false;
        submit.innerHTML = icon("check") + " Save changes";
        fail(err);
      }
    });
  }

  function openView(staffId) {
    const member = state.staff.find((item) => item.id === staffId);
    if (!member) return;
    openModal(
      modalHeader(member.fullName, member.position || "Staff member") +
        '<div class="modal-body">' +
        '<div class="row wrap mb-3">' + avatar(member.fullName, "lg") +
        '<div><div class="bold" style="font-size:15px">' + esc(member.fullName) + "</div>" +
        '<div class="muted small">' + esc(member.position || "Staff") + " · " + esc(member.department || "No department") + "</div>" +
        '<div class="pill-row mt-1">' + (member.active ? '<span class="badge emerald">Active</span>' : '<span class="badge gray">Inactive</span>') +
        (member.hasLogin ? roleBadge(member.account.role) : '<span class="badge gray">No portal login</span>') + "</div></div></div>" +
        '<div class="detail-grid">' +
        '<div class="detail"><div class="k">Staff number</div><div class="v">' + esc(member.staffNo) + "</div></div>" +
        '<div class="detail"><div class="k">Email</div><div class="v">' + esc(member.email || "—") + "</div></div>" +
        '<div class="detail"><div class="k">Phone</div><div class="v">' + esc(member.phone || "—") + "</div></div>" +
        '<div class="detail"><div class="k">Qualification</div><div class="v">' + esc(member.qualification || "—") + "</div></div>" +
        '<div class="detail"><div class="k">Hire date</div><div class="v">' + esc(fmtDate(member.hireDate)) + "</div></div>" +
        '<div class="detail"><div class="k">School</div><div class="v">' + esc(member.schoolName || "—") + "</div></div>" +
        '<div class="detail"><div class="k">Account</div><div class="v">' + (member.hasLogin ? "@" + esc(member.account.username) : "Not linked") + "</div></div>" +
        "</div></div>" +
        '<div class="modal-foot"><button class="btn btn-outline" type="button" data-close>Close</button></div>'
    );
  }

  window.renderPage = async function () {
    await load(false);
  };
})();
