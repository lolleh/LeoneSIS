/* ============================================================
   LeoneSIS - messaging
   ============================================================ */
(function () {
  "use strict";

  const {
    esc, icon, avatar, fmtDateTime, timeAgo, emptyState, openModal, closeModal,
    modalHeader, toast, fail, debounce
  } = UI;

  const state = {
    folder: "inbox",
    messages: [],
    search: "",
    selected: null,
    selectedFolder: null,
    directory: null
  };

  const isStaff = () => ["SUPER_ADMIN", "SCHOOL_ADMIN", "ADMIN", "TEACHER", "STAFF"].includes(APP.user.role);

  const AUDIENCE_LABELS = {
    USER: "Direct message",
    ALL_PARENTS: "All parents",
    ALL_STUDENTS: "All students",
    ALL_STAFF: "All staff",
    CLASS: "Form group"
  };

  function formValues(form) {
    const data = {};
    new FormData(form).forEach((value, key) => {
      data[key] = value;
    });
    return data;
  }

  function filtered() {
    const needle = state.search.trim().toLowerCase();
    if (!needle) return state.messages;
    return state.messages.filter((message) =>
      [message.subject, message.senderName, message.body]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }

  function listHtml() {
    const list = filtered();
    if (!list.length) {
      return (
        '<div style="padding:26px 18px">' +
        emptyState({
          icon: "messages",
          title: state.messages.length ? "No matching messages" : state.folder === "inbox" ? "Your inbox is empty" : "Nothing sent yet",
          text: state.messages.length
            ? "Try a different search."
            : state.folder === "inbox"
              ? "Messages from teachers and the school office will arrive here."
              : "Messages you send to families or colleagues will be listed here."
        }) + "</div>"
      );
    }

    return list.map((message) => {
      const unread = state.folder === "inbox" && !message.readAt;
      return (
        '<div class="message-item' + (unread ? " unread" : "") + (state.selected === message.id ? " active" : "") + '" data-message="' + esc(message.id) + '">' +
        '<div class="mi-top"><span class="mi-from">' + esc(message.senderName) + "</span>" +
        '<span class="mi-time">' + timeAgo(message.sentAt) + "</span></div>" +
        '<div class="mi-subject">' + esc(message.subject) + "</div>" +
        '<div class="mi-preview">' + esc(message.body) + "</div>" +
        '<div class="mi-top" style="margin-top:5px">' +
        (state.folder === "sent"
          ? '<span class="badge outline">' + esc(message.recipientCount) + " recipient" + (message.recipientCount === 1 ? "" : "s") + "</span>" +
            '<span class="tiny muted">' + esc(message.readCount) + " read</span>"
          : unread
            ? '<span class="badge indigo">New</span>'
            : "") +
        "</div></div>"
      );
    }).join("");
  }

  function placeholder() {
    return (
      '<div class="card message-view"><div class="card-body" style="display:grid;place-items:center;min-height:420px">' +
      emptyState({
        icon: "messages",
        title: "Select a message",
        text: "Choose a message from the list to read the full conversation.",
        action: '<button class="btn btn-primary" data-compose>' + icon("send") + " New message</button>"
      }) + "</div></div>"
    );
  }

  function detailHtml(detail) {
    const recipients = detail.recipients || [];
    const showRecipients = state.selectedFolder === "sent";
    return (
      '<div class="card message-view"><div class="message-view-head">' +
      "<h3>" + esc(detail.subject) + "</h3>" +
      '<div class="message-view-meta">' + avatar(detail.senderName, "sm") +
      "<span>From <b>" + esc(detail.senderName) + "</b>" +
      (detail.senderRole ? " (" + esc(detail.senderRole) + ")" : "") + "</span>" +
      '<span class="dot-status" style="background:#cbd5e1"></span>' +
      "<span>" + esc(fmtDateTime(detail.sentAt)) + "</span>" +
      '<span class="badge gray">' + esc(AUDIENCE_LABELS[detail.audience] || detail.audience || "Message") +
      (detail.audienceClass ? " · " + esc(detail.audienceClass) : "") + "</span>" +
      "</div></div>" +
      '<div class="message-body">' + esc(detail.body) + "</div>" +
      (showRecipients && recipients.length
        ? '<div class="card-foot"><div class="tiny muted bold" style="text-transform:uppercase;letter-spacing:.7px">Delivered to ' +
          recipients.length + "</div><div class=\"recipient-list\">" +
          recipients.map((recipient) =>
            '<span class="recipient-chip">' + esc(recipient.name) +
            (recipient.readAt ? ' · <span style="color:#047857">read</span>' : " · unread") + "</span>"
          ).join("") + "</div></div>"
        : "") +
      "</div>"
    );
  }

  function render() {
    const content = document.getElementById("content");
    content.innerHTML =
      '<div class="page-head"><div><h2>Mailbox</h2>' +
      "<p>Messages are delivered instantly to the recipient's LeoneSIS inbox.</p></div>" +
      '<div class="spacer"></div><button class="btn btn-primary" id="composeBtn">' + icon("send") + " New message</button></div>" +
      '<div class="messages-layout">' +
      '<div class="card message-list">' +
      '<div class="message-list-head">' +
      '<div class="tabs"><button class="tab' + (state.folder === "inbox" ? " active" : "") + '" type="button" data-folder="inbox">Inbox</button>' +
      '<button class="tab' + (state.folder === "sent" ? " active" : "") + '" type="button" data-folder="sent">Sent</button></div>' +
      '<div class="spacer" style="flex:1"></div>' +
      '<button class="icon-btn" type="button" id="refreshMessages" title="Refresh">' + icon("refresh") + "</button></div>" +
      '<div style="padding:10px 14px;border-bottom:1px solid var(--line)">' +
      '<div class="search-box">' + icon("search") +
      '<input class="input" id="messageSearch" placeholder="Search messages…" value="' + esc(state.search) + '"></div></div>' +
      '<div class="message-items" id="messageItems">' + listHtml() + "</div></div>" +
      '<div id="messageView">' + (state.selected ? "" : placeholder()) + "</div>" +
      "</div>";

    content.querySelectorAll("[data-folder]").forEach((tab) =>
      tab.addEventListener("click", () => {
        state.folder = tab.getAttribute("data-folder");
        state.selected = null;
        state.selectedFolder = null;
        load();
      })
    );
    content.querySelector("#messageSearch").addEventListener(
      "input",
      debounce((event) => {
        state.search = event.target.value;
        const list = document.getElementById("messageItems");
        if (list) list.innerHTML = listHtml();
        bindItems();
      }, 160)
    );
    content.querySelector("#refreshMessages").addEventListener("click", () => load(true));
    content.querySelector("#composeBtn").addEventListener("click", openCompose);
    content.querySelectorAll("[data-compose]").forEach((btn) => btn.addEventListener("click", openCompose));
    bindItems();
  }

  function bindItems() {
    document.querySelectorAll("[data-message]").forEach((item) => {
      item.addEventListener("click", () => selectMessage(item.getAttribute("data-message")));
    });
    document.querySelectorAll("[data-compose]").forEach((btn) =>
      btn.addEventListener("click", openCompose)
    );
  }

  async function load(showToast) {
    const content = document.getElementById("content");
    content.innerHTML = UI.loading(5);
    try {
      const data = await API.get("/api/messages", { query: { folder: state.folder } });
      state.messages = data.messages || [];
      if (state.selected && !state.messages.some((message) => message.id === state.selected)) {
        state.selected = null;
        state.selectedFolder = null;
      }
      render();
      if (state.selected) {
        await selectMessage(state.selected, true);
      }
      if (showToast) toast("Mailbox refreshed.", "success", 1800);
    } catch (err) {
      if (err.status === 401) return;
      content.innerHTML = '<div class="card"><div class="card-body">' +
        emptyState({ icon: "alert", title: "Could not load messages", text: err.message }) + "</div></div>";
    }
  }

  async function selectMessage(id, silent) {
    try {
      const data = await API.get("/api/messages/" + id);
      const detail = data.message;
      state.selected = id;
      state.selectedFolder = state.folder;
      document.querySelectorAll("[data-message]").forEach((item) => {
        item.classList.toggle("active", item.getAttribute("data-message") === id);
        if (item.getAttribute("data-message") === id) item.classList.remove("unread");
      });
      const view = document.getElementById("messageView");
      if (view) view.innerHTML = detailHtml(detail);
      const message = state.messages.find((item) => item.id === id);
      if (message && state.folder === "inbox") message.readAt = detail.readAt || new Date().toISOString();
      UI.refreshUnread();
      if (!silent) {
        const panel = document.getElementById("messageView");
        if (panel && window.innerWidth < 620) panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (err) {
      fail(err);
    }
  }

  /* ---------------------------------------------------------- compose */
  function audienceOptions() {
    const options = [{ value: "USER", label: "Direct recipients" }];
    if (isStaff()) {
      options.push({ value: "ALL_PARENTS", label: "All parents" });
      options.push({ value: "ALL_STUDENTS", label: "All students" });
      options.push({ value: "ALL_STAFF", label: "All staff" });
      if (state.directory && (state.directory.classes || []).length) {
        options.push({ value: "CLASS", label: "A whole class" });
      }
    }
    return options;
  }

  function recipientGroups() {
    const directory = state.directory || { parents: [], students: [], staff: [] };
    const groups = [
      { key: "parents", label: "Parents", items: directory.parents || [] },
      { key: "students", label: "Students", items: directory.students || [] },
      { key: "staff", label: "Staff", items: directory.staff || [] }
    ].filter((group) => group.items.length);

    if (!groups.length) {
      return '<p class="muted small" style="padding:10px 2px">No recipients are available in this school yet.</p>';
    }

    return groups.map((group) =>
      '<div data-group="' + group.key + '"><div class="section-title" style="margin:10px 0 2px;font-size:9.5px">' + esc(group.label) + "</div>" +
      group.items.map((person) =>
        '<label class="check-row" data-search="' + esc((person.name + " " + person.email).toLowerCase()) + '">' +
        '<input type="checkbox" name="recipients" value="' + esc(person.id) + '">' +
        '<span><b>' + esc(person.name) + "</b>" +
        (person.role ? ' <span class="badge outline">' + esc(person.role) + "</span>" : "") +
        '<div class="tiny muted">' + esc(person.email) + "</div></span></label>"
      ).join("") + "</div>"
    ).join("");
  }

  async function openCompose() {
    try {
      const data = await API.get("/api/messages/directory");
      state.directory = data;
    } catch (err) {
      fail(err);
      return;
    }

    const classes = (state.directory.classes || [])
      .map((cls) => '<option value="' + esc(cls) + '">' + esc(cls) + "</option>")
      .join("");

    const overlay = openModal(
      modalHeader("New message", "Send to one person, a form or a whole group.") +
        '<form id="composeForm">' +
        '<div class="modal-body">' +
        '<div class="field"><label>Audience</label><div class="audience-grid">' +
        audienceOptions().map((option, index) =>
          '<label class="audience-option"><input type="radio" name="audience" value="' + option.value + '"' + (index === 0 ? " checked" : "") + ">" +
          "<span>" + esc(option.label) + "</span></label>"
        ).join("") + "</div></div>" +
        '<div class="field" id="classField" style="display:none"><label>Form</label>' +
        '<select class="select" name="audienceClass"><option value="">Choose a form</option>' + classes + "</select></div>" +
        '<div id="recipientBox"><div class="row between mb-1"><label class="small bold">Recipients</label>' +
        '<input class="input" id="recipientSearch" placeholder="Filter people…" style="max-width:190px;padding:5px 9px;font-size:12px"></div>' +
        '<div class="recipient-scroll" id="recipientList">' + recipientGroups() + "</div></div>" +
        '<div class="notice mt-2" id="groupNote" style="display:none">' + icon("info") +
        "<div>This message is delivered to every matching portal account in the school.</div></div>" +
        '<div class="field mt-2"><label>Subject *</label><input class="input" name="subject" required maxlength="180" placeholder="What is this about?"></div>' +
        '<div class="field"><label>Message *</label><textarea class="textarea" name="body" required rows="6" placeholder="Write your message…"></textarea></div>' +
        "</div>" +
        '<div class="modal-foot"><button class="btn btn-outline" type="button" data-close>Cancel</button>' +
        '<button class="btn btn-primary" type="submit">' + icon("send") + " Send message</button></div></form>",
      { size: "wide" }
    );

    const form = overlay.querySelector("#composeForm");
    const classField = overlay.querySelector("#classField");
    const recipientBox = overlay.querySelector("#recipientBox");
    const groupNote = overlay.querySelector("#groupNote");

    function toggleAudience() {
      const audience = form.querySelector('input[name="audience"]:checked').value;
      classField.style.display = audience === "CLASS" ? "" : "none";
      recipientBox.style.display = audience === "USER" ? "" : "none";
      groupNote.style.display = audience === "USER" ? "none" : "";
      if (audience === "CLASS") {
        groupNote.innerHTML = icon("info") + "<div>The message goes to every student and linked parent in the chosen form.</div>";
      } else if (audience === "ALL_PARENTS") {
        groupNote.innerHTML = icon("info") + "<div>The message goes to every parent portal account in the school.</div>";
      } else if (audience === "ALL_STUDENTS") {
        groupNote.innerHTML = icon("info") + "<div>The message goes to every student portal account in the school.</div>";
      } else if (audience === "ALL_STAFF") {
        groupNote.innerHTML = icon("info") + "<div>The message goes to all teachers, staff and administrators in the school.</div>";
      }
    }

    form.querySelectorAll('input[name="audience"]').forEach((radio) =>
      radio.addEventListener("change", toggleAudience)
    );
    toggleAudience();

    overlay.querySelector("#recipientSearch").addEventListener("input", (event) => {
      const needle = event.target.value.trim().toLowerCase();
      overlay.querySelectorAll("[data-search]").forEach((row) => {
        row.style.display = !needle || row.getAttribute("data-search").includes(needle) ? "" : "none";
      });
      overlay.querySelectorAll("[data-group]").forEach((group) => {
        const visible = Array.from(group.querySelectorAll("[data-search]")).some((row) => row.style.display !== "none");
        group.style.display = visible ? "" : "none";
      });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = formValues(form);
      const audience = body.audience;
      body.recipientIds = Array.from(form.querySelectorAll('input[name="recipients"]:checked')).map((input) => input.value);
      if (!body.subject.trim() || !body.body.trim()) {
        toast("Add a subject and a message.", "error");
        return;
      }
      if (audience === "USER" && !body.recipientIds.length) {
        toast("Select at least one recipient.", "error");
        return;
      }
      if (audience === "CLASS" && !body.audienceClass) {
        toast("Choose a form for this message.", "error");
        return;
      }
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.innerHTML = '<span class="spinner"></span> Sending…';
      try {
        const result = await API.post("/api/messages", body);
        toast(result.message || "Message sent.", "success");
        closeModal(overlay);
        state.folder = "sent";
        state.selected = null;
        await load();
      } catch (err) {
        submit.disabled = false;
        submit.innerHTML = icon("send") + " Send message";
        fail(err);
      }
    });
  }

  window.renderPage = async function () {
    await load(false);
  };
})();
