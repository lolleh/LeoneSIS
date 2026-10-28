/* ============================================================
   LeoneSIS - library and reading resources
   ============================================================ */
(function () {
  "use strict";

  const {
    esc, icon, fmtDate, fmtBytes, emptyState, openModal, closeModal,
    modalHeader, toast, fail, confirmDialog, debounce
  } = UI;

  const state = {
    books: [],
    canUpload: false,
    search: "",
    category: ""
  };

  const ALLOWED = ["pdf", "txt", "md", "epub"];
  const canAdmin = () => ["ADMIN", "SUPER_ADMIN"].includes(APP.user.role);

  function categories() {
    return Array.from(new Set(state.books.map((book) => book.category).filter(Boolean))).sort();
  }

  function filtered() {
    const needle = state.search.trim().toLowerCase();
    return state.books.filter((book) => {
      if (state.category && book.category !== state.category) return false;
      if (!needle) return true;
      return [book.title, book.author, book.description, book.category, book.fileName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }

  function bookCard(book, index) {
    const cover = "c" + ((index % 5) + 1);
    const deletable = book.uploadedByMe || canAdmin();
    return (
      '<div class="book-card">' +
      '<div class="book-cover ' + cover + '">' +
      '<span class="cover-tag">' + esc((book.extension || "file").toUpperCase()) + "</span>" +
      '<div style="position:absolute;top:12px;right:14px;opacity:.45">' + icon("book") + "</div>" +
      '<div style="position:relative;z-index:1">' +
      '<div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;opacity:.75">' +
      esc(book.category || "Resource") + "</div></div></div>" +
      '<div class="book-body">' +
      '<div class="book-title">' + esc(book.title) + "</div>" +
      '<div class="book-author">' + (book.author ? esc(book.author) : "Unknown author") + "</div>" +
      '<div class="book-desc">' + esc(book.description || "No description provided.") + "</div>" +
      '<div class="book-foot">' +
      (book.isText
        ? '<button class="btn btn-sm btn-primary" type="button" data-read="' + esc(book.id) + '">' + icon("book") + " Read</button>"
        : '<a class="btn btn-sm btn-primary" href="' + esc(API.fileUrl("/api/library/books/" + book.id + "/file")) + '" target="_blank" rel="noopener">' + icon("eye") + " Open</a>") +
      '<a class="icon-btn" title="Download" href="' + esc(API.fileUrl("/api/library/books/" + book.id + "/file")) + '" target="_blank" rel="noopener">' + icon("download") + "</a>" +
      '<div class="spacer"></div>' +
      (deletable
        ? '<button class="icon-btn danger" type="button" title="Remove resource" data-delete="' + esc(book.id) + '">' + icon("trash") + "</button>"
        : "") +
      "</div>" +
      '<div class="tiny muted mt-1">' + esc(book.uploaderName || "School office") + " · " + esc(fmtBytes(book.fileSize)) + " · " + esc(fmtDate(book.createdAt)) + "</div>" +
      "</div></div>"
    );
  }

  function gridHtml() {
    const list = filtered();
    if (!list.length) {
      return (
        '<div class="card" style="grid-column:1/-1"><div class="card-body">' +
        emptyState({
          icon: "library",
          title: state.books.length ? "No matching resources" : "The library is empty",
          text: state.books.length
            ? "Try a different search or category."
            : state.canUpload
              ? "Upload a PDF, EPUB, Markdown or text file to share it with students."
              : "Reading material uploaded by your school will appear here.",
          action: state.canUpload && !state.books.length
            ? '<button class="btn btn-primary" data-upload>' + icon("upload") + " Upload a resource</button>"
            : ""
        }) + "</div></div>"
      );
    }
    return list.map(bookCard).join("");
  }

  function bindGrid() {
    const content = document.getElementById("content");
    content.querySelectorAll("[data-read]").forEach((btn) =>
      btn.addEventListener("click", () => openReader(btn.getAttribute("data-read")))
    );
    content.querySelectorAll("[data-delete]").forEach((btn) =>
      btn.addEventListener("click", () => removeBook(btn.getAttribute("data-delete")))
    );
    content.querySelectorAll("[data-upload]").forEach((btn) =>
      btn.addEventListener("click", openUpload)
    );
  }

  function renderPage() {
    const content = document.getElementById("content");
    const categoryOptions = ['<option value="">All categories</option>']
      .concat(
        categories().map(
          (category) => '<option value="' + esc(category) + '"' + (state.category === category ? " selected" : "") + ">" + esc(category) + "</option>"
        )
      )
      .join("");

    content.innerHTML =
      '<div class="page-head"><div><h2>School library</h2>' +
      "<p>" + state.books.length + " resource" + (state.books.length === 1 ? "" : "s") + " available to read online or download.</p></div>" +
      '<div class="spacer"></div>' +
      (state.canUpload ? '<button class="btn btn-primary" id="uploadBook">' + icon("upload") + " Upload resource</button>" : "") +
      "</div>" +
      '<div class="toolbar">' +
      '<div class="search-box">' + icon("search") +
      '<input class="input" id="bookSearch" placeholder="Search title, author or category…" value="' + esc(state.search) + '"></div>' +
      '<select class="select" id="bookCategory">' + categoryOptions + "</select>" +
      '<div class="spacer"></div><button class="btn btn-outline btn-sm" id="refreshBooks">' + icon("refresh") + " Refresh</button></div>" +
      '<div class="books-grid" id="booksGrid">' + gridHtml() + "</div>";

    content.querySelector("#bookSearch").addEventListener(
      "input",
      debounce((event) => {
        state.search = event.target.value;
        document.getElementById("booksGrid").innerHTML = gridHtml();
        bindGrid();
      }, 170)
    );
    content.querySelector("#bookCategory").addEventListener("change", (event) => {
      state.category = event.target.value;
      document.getElementById("booksGrid").innerHTML = gridHtml();
      bindGrid();
    });
    content.querySelector("#refreshBooks").addEventListener("click", () => load(true));
    const upload = content.querySelector("#uploadBook");
    if (upload) upload.addEventListener("click", openUpload);
    bindGrid();
  }

  async function load(showToast) {
    const content = document.getElementById("content");
    content.innerHTML = UI.loading(4);
    try {
      const data = await API.get("/api/library/books");
      state.books = data.books || [];
      state.canUpload = !!data.canUpload;
      renderPage();
      if (showToast) toast("Library refreshed.", "success", 1800);
    } catch (err) {
      if (err.status === 401) return;
      content.innerHTML = '<div class="card"><div class="card-body">' +
        emptyState({ icon: "alert", title: "Could not load the library", text: err.message }) + "</div></div>";
    }
  }

  async function openReader(bookId) {
    const book = state.books.find((item) => item.id === bookId);
    if (!book) return;
    try {
      const data = await API.get("/api/library/books/" + bookId + "/content");
      openModal(
        modalHeader(data.title || book.title, (book.author ? book.author + " · " : "") + (book.category || "Reading resource")) +
          '<div class="modal-body"><div class="reader">' + esc(data.content || "") + "</div></div>" +
          '<div class="modal-foot"><a class="btn btn-outline" href="' + esc(API.fileUrl("/api/library/books/" + book.id + "/file")) + '" target="_blank" rel="noopener">' +
          icon("download") + " Download original</a>" +
          '<button class="btn btn-primary" type="button" data-close>Done reading</button></div>',
        { size: "xl" }
      );
    } catch (err) {
      fail(err);
    }
  }

  function openUpload() {
    const overlay = openModal(
      modalHeader("Upload a resource", "PDF, EPUB, Markdown or plain text up to 25 MB.") +
        '<form id="uploadForm">' +
        '<div class="modal-body">' +
        '<div class="upload-zone" id="uploadZone">' + icon("upload") +
        '<div class="u-title">Click to choose a file, or drag it here</div>' +
        '<div class="u-sub">Accepted: .pdf, .epub, .txt, .md · maximum 25 MB</div>' +
        '<div class="u-file" id="uploadFileName"></div>' +
        '<input type="file" id="bookFile" accept=".pdf,.epub,.txt,.md" hidden></div>' +
        '<div class="form-grid mt-3">' +
        '<div class="field"><label>Title</label><input class="input" name="title" id="bookTitle" placeholder="Defaults to the file name"></div>' +
        '<div class="field"><label>Author</label><input class="input" name="author" placeholder="Author or publisher"></div>' +
        '<div class="field"><label>Category</label><input class="input" name="category" list="categoryList" placeholder="e.g. Science, Fiction, Revision"><datalist id="categoryList">' +
        categories().map((category) => "<option>" + esc(category) + "</option>").join("") + "</datalist></div>" +
        '<div class="field"><label>School</label><input class="input" value="' + esc(APP.schools.find((school) => school.id === APP.schoolId)?.name || "Your school") + '" disabled></div>' +
        '<div class="field span-2"><label>Description</label><textarea class="textarea" name="description" rows="3" placeholder="What is this resource about?"></textarea></div>' +
        "</div></div>" +
        '<div class="modal-foot"><button class="btn btn-outline" type="button" data-close>Cancel</button>' +
        '<button class="btn btn-primary" type="submit">' + icon("upload") + " Upload resource</button></div></form>",
      { size: "wide" }
    );

    const form = overlay.querySelector("#uploadForm");
    const zone = overlay.querySelector("#uploadZone");
    const input = overlay.querySelector("#bookFile");
    const nameLabel = overlay.querySelector("#uploadFileName");
    const titleInput = overlay.querySelector("#bookTitle");

    function pick(file) {
      if (!file) return;
      const extension = (file.name.split(".").pop() || "").toLowerCase();
      if (!ALLOWED.includes(extension)) {
        toast("Choose a PDF, EPUB, Markdown or text file.", "error");
        input.value = "";
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        toast("That file is larger than 25 MB.", "error");
        input.value = "";
        return;
      }
      nameLabel.textContent = file.name + " · " + fmtBytes(file.size);
      if (!titleInput.value) {
        titleInput.value = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
      }
    }

    zone.addEventListener("click", () => input.click());
    input.addEventListener("change", () => pick(input.files[0]));
    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      zone.classList.add("drag");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag"));
    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      zone.classList.remove("drag");
      if (event.dataTransfer.files.length) {
        const transfer = new DataTransfer();
        transfer.items.add(event.dataTransfer.files[0]);
        input.files = transfer.files;
        pick(event.dataTransfer.files[0]);
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const file = input.files[0];
      if (!file) {
        toast("Choose a file to upload.", "error");
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      ["title", "author", "category", "description"].forEach((key) => {
        formData.append(key, form.querySelector('[name="' + key + '"]').value || "");
      });
      if (APP.schoolId) formData.append("schoolId", APP.schoolId);

      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.innerHTML = '<span class="spinner"></span> Uploading…';
      try {
        const result = await API.upload("/api/library/books", formData);
        toast(result.message || "Resource uploaded.", "success");
        closeModal(overlay);
        await load();
      } catch (err) {
        submit.disabled = false;
        submit.innerHTML = icon("upload") + " Upload resource";
        fail(err);
      }
    });
  }

  async function removeBook(bookId) {
    const book = state.books.find((item) => item.id === bookId);
    if (!book) return;
    const ok = await confirmDialog({
      title: "Remove " + book.title + "?",
      message: "The file will be deleted from the library for everyone.",
      confirmText: "Remove resource",
      danger: true
    });
    if (!ok) return;
    try {
      const result = await API.del("/api/library/books/" + bookId);
      toast(result.message || "Resource removed.", "success");
      await load();
    } catch (err) {
      fail(err);
    }
  }

  window.renderPage = async function () {
    await load(false);
  };
})();
