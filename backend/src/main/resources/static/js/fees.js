/* ============================================================
   LeoneSIS - fees, charges and receipts
   ============================================================ */
(function () {
  "use strict";

  const {
    esc, icon, avatar, fmtDate, money, todayISO, loading, emptyState,
    toast, fail, openModal, closeModal, modalHeader
  } = UI;

  const state = {
    data: null,
    search: "",
    type: "",
    studentId: "",
    term: "",
    balanceSearch: ""
  };

  function data() {
    return state.data;
  }

  function symbol() {
    return (data() && data().currencySymbol) || "Le";
  }

  function canManage() {
    return !!(data() && data().canManage);
  }

  function studentById(id) {
    return ((data() && data().students) || []).find((student) => student.id === id) || null;
  }

  function transactionById(id) {
    return ((data() && data().transactions) || []).find((tx) => tx.id === id) || null;
  }

  function studentForm(student) {
    if (!student) return "";
    return [student.schoolClass, student.gradeLevel].filter(Boolean).join(" · ");
  }

  function balanceTone(balance) {
    const value = Number(balance || 0);
    if (value > 0) return "rose";
    if (value < 0) return "cyan";
    return "emerald";
  }

  function balanceLabel(balance) {
    const value = Number(balance || 0);
    if (value > 0) return "Owing";
    if (value < 0) return "Credit";
    return "Settled";
  }

  function countLabel(count, singular, plural) {
    return count + " " + (count === 1 ? singular : plural || singular + "s");
  }

  function statCard(options) {
    return (
      '<div class="stat fee-stat">' +
      '<div class="stat-icon tone-' + esc(options.tone || "indigo") + '">' + icon(options.icon || "fees") + "</div>" +
      '<div class="fee-stat-copy">' +
      '<div class="stat-label">' + esc(options.label) + "</div>" +
      '<div class="stat-value fee-stat-value">' + esc(options.value) + "</div>" +
      '<div class="stat-hint">' + esc(options.hint || "") + "</div>" +
      "</div></div>"
    );
  }

  function statCards(info) {
    const summary = info.summary || {};
    const family = !!info.isFamily;
    const outstanding = Number(summary.outstanding || 0);
    return (
      statCard({
        label: family ? "Family charges" : "Total billed",
        value: money(summary.charged, symbol()),
        hint: countLabel(Number(summary.chargeCount || 0), "charge") + " posted",
        icon: "fees",
        tone: "indigo"
      }) +
      statCard({
        label: "Payments received",
        value: money(summary.paid, symbol()),
        hint: countLabel(Number(summary.paymentCount || 0), "payment") + " recorded",
        icon: "receipt",
        tone: "emerald"
      }) +
      statCard({
        label: family ? "Family balance" : "Outstanding balance",
        value: money(summary.outstanding, symbol()),
        hint: outstanding > 0
          ? countLabel(Number(summary.studentsOwing || 0), "student") + " with a balance"
          : "All accounts are settled",
        icon: outstanding > 0 ? "alert" : "success",
        tone: outstanding > 0 ? "amber" : "emerald"
      }) +
      statCard({
        label: "Ledger entries",
        value: String(Number(summary.transactionCount || 0)),
        hint: "Every entry stays on record",
        icon: "clipboard",
        tone: "blue"
      })
    );
  }

  function pageActions() {
    if (!canManage()) return "";
    return (
      '<div class="fee-actions">' +
      '<button class="btn btn-outline" type="button" id="newChargeBtn">' + icon("plus") + " Add charge</button>" +
      '<button class="btn btn-primary" type="button" id="newPaymentBtn">' + icon("receipt") + " Record payment</button>" +
      "</div>"
    );
  }

  function studentRow(student) {
    const balance = Number(student.balance || 0);
    const actions =
      '<div class="fee-row-actions">' +
      '<button class="btn btn-outline btn-sm" type="button" data-view-student="' + esc(student.id) + '">' +
      icon("eye") + " Ledger</button>" +
      (canManage()
        ? '<button class="btn btn-ghost btn-sm" type="button" data-charge-student="' + esc(student.id) + '" title="Add a charge for this student">' +
          icon("plus") + " Charge</button>" +
          '<button class="btn btn-soft btn-sm" type="button" data-payment-student="' + esc(student.id) + '" title="Record a payment for this student">' +
          icon("receipt") + " Receive</button>"
        : "") +
      "</div>";

    return (
      '<tr data-student-row="' + esc(student.id) + '">' +
      '<td><div class="name-cell">' + avatar(student.fullName) +
      '<div><div class="name">' + esc(student.fullName) + "</div>" +
      '<div class="sub">' + esc(student.admissionNo || "") + (studentForm(student) ? " · " + esc(studentForm(student)) : "") + "</div>" +
      "</div></div></td>" +
      '<td class="fee-money">' + esc(money(student.charged, symbol())) + "</td>" +
      '<td class="fee-money">' + esc(money(student.paid, symbol())) + "</td>" +
      '<td><div class="fee-balance"><span class="fee-money ' + (balance > 0 ? "owing" : balance < 0 ? "credit" : "settled") + '">' +
      esc(money(balance, symbol())) + '</span><span class="badge ' + balanceTone(balance) + '">' +
      esc(balanceLabel(balance)) + "</span></div></td>" +
      "<td>" + actions + "</td></tr>"
    );
  }

  function studentRows() {
    const students = (data() && data().students) || [];
    const query = state.balanceSearch.trim().toLowerCase();
    return students.filter((student) => {
      if (!query) return true;
      return (student.fullName + " " + (student.admissionNo || "") + " " + (student.schoolClass || "") + " " + (student.gradeLevel || ""))
        .toLowerCase().includes(query);
    });
  }

  function updateStudentTable() {
    const body = document.getElementById("feeStudentBody");
    if (!body) return;
    const students = studentRows();
    const empty = document.getElementById("feeStudentEmpty");
    body.innerHTML = students.map(studentRow).join("");
    if (empty) {
      empty.style.display = students.length ? "none" : "";
      if (!students.length) {
        empty.innerHTML = emptyState({
          icon: "students",
          title: "No matching students",
          text: "Try a different name, admission number or form."
        });
      }
    }
    bindStudentActions();
  }

  function transactionRow(tx) {
    const isPayment = tx.type === "PAYMENT";
    const voided = tx.status === "VOID";
    const typeBadge = '<span class="badge ' + (isPayment ? "emerald" : "amber") + '">' +
      (isPayment ? "Payment" : "Charge") + "</span>";
    const status = voided
      ? '<span class="badge rose" title="' + esc(tx.voidReason || "Voided transaction") + '">Voided</span>'
      : '<span class="badge outline">Posted</span>';
    const detail = [
      tx.categoryLabel,
      tx.term,
      isPayment && tx.paymentMethodLabel ? tx.paymentMethodLabel : ""
    ].filter(Boolean).join(" · ");

    return (
      '<tr class="' + (voided ? "fee-void-row" : "") + '">' +
      "<td><div class=\"fee-date\">" + esc(fmtDate(tx.transactionDate)) + "</div>" +
      '<div class="fee-date-sub">' + esc(tx.reference) + "</div></td>" +
      "<td><div class=\"name-cell\">" + avatar(tx.studentName) +
      '<div><div class="name">' + esc(tx.studentName) + "</div>" +
      '<div class="sub">' + esc(tx.admissionNo || "") + (tx.schoolClass ? " · " + esc(tx.schoolClass) : "") + "</div>" +
      "</div></div></td>" +
      "<td><div class=\"fee-type\">" + typeBadge + "</div></td>" +
      '<td><div class="fee-desc"><div class="fee-desc-title">' + esc(tx.description) + "</div>" +
      '<div class="fee-desc-sub">' + esc(detail) + "</div></div></td>" +
      '<td class="fee-money ' + (voided ? "muted-strike" : isPayment ? "credit" : "") + '">' +
      esc(money(tx.amount, symbol())) + "</td>" +
      "<td>" + status + (voided && tx.voidReason ? '<div class="fee-void-reason">' + esc(tx.voidReason) + "</div>" : "") + "</td>" +
      '<td><div class="fee-row-actions">' +
      '<button class="btn btn-outline btn-sm" type="button" data-receipt="' + esc(tx.id) + '">' +
      icon("receipt") + (isPayment ? " Receipt" : " Notice") + "</button>" +
      (canManage() && !voided
        ? '<button class="icon-btn danger" type="button" data-void="' + esc(tx.id) + '" title="Void transaction" aria-label="Void transaction">' +
          icon("x") + "</button>"
        : "") +
      "</div></td></tr>"
    );
  }

  function filteredTransactions() {
    const info = data();
    if (!info) return [];
    const query = state.search.trim().toLowerCase();
    return info.transactions.filter((tx) => {
      if (state.type && tx.type !== state.type) return false;
      if (state.studentId && tx.studentId !== state.studentId) return false;
      if (state.term && tx.term !== state.term) return false;
      if (!query) return true;
      const haystack = [
        tx.studentName, tx.admissionNo, tx.schoolClass, tx.description,
        tx.categoryLabel, tx.reference, tx.term, tx.paymentReference, tx.paymentMethodLabel
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }

  function updateLedger() {
    const body = document.getElementById("feeLedgerBody");
    const count = document.getElementById("feeLedgerCount");
    const empty = document.getElementById("feeLedgerEmpty");
    if (!body) return;
    const rows = filteredTransactions();
    body.innerHTML = rows.map(transactionRow).join("");
    if (count) {
      count.textContent = rows.length === (data() ? data().transactions.length : 0)
        ? countLabel(rows.length, "entry", "entries")
        : rows.length + " of " + countLabel(data().transactions.length, "entry", "entries");
    }
    if (empty) {
      empty.style.display = rows.length ? "none" : "";
      if (!rows.length) {
        empty.innerHTML = emptyState({
          icon: "fees",
          title: "No transactions match these filters",
          text: "Clear the filters to see the full ledger for this school."
        });
      }
    }
    bindLedgerActions();
  }

  function render() {
    const info = data();
    const content = document.getElementById("content");
    const students = info.students || [];
    const terms = info.terms || [];
    const family = !!info.isFamily;

    content.innerHTML =
      '<div class="page-head fee-page-head">' +
      '<div><h2>Fee position at a glance</h2>' +
      "<p>" + (family
        ? "Charges, payments and printable receipts for your children."
        : "A complete, auditable record of charges, payments and outstanding balances.") +
      "</p></div>" +
      '<div class="spacer"></div>' + pageActions() +
      "</div>" +

      '<div class="grid stats fee-stats">' + statCards(info) + "</div>" +

      '<div class="card fee-accounts-card mt-4">' +
      '<div class="card-head fee-card-head">' +
      "<div><h3>" + (family ? "Family accounts" : "Student accounts") + "</h3>" +
      '<div class="sub">Balances update automatically as transactions are posted.</div></div>' +
      '<div class="spacer"></div>' +
      '<div class="search-box fee-small-search">' + icon("search") +
      '<input class="input" id="feeBalanceSearch" type="search" placeholder="Find a student…" ' +
      'value="' + esc(state.balanceSearch) + '" aria-label="Find a student"></div>' +
      "</div>" +
      '<div class="table-wrap"><table class="table fee-table">' +
      "<thead><tr><th>Student</th><th>Charged</th><th>Paid</th><th>Balance</th><th></th></tr></thead>" +
      '<tbody id="feeStudentBody"></tbody></table></div>' +
      '<div id="feeStudentEmpty"></div>' +
      '<div class="card-foot fee-foot-note">' + icon("shield") +
      "<span>Balances are calculated from posted ledger entries. Voided entries remain visible for audit purposes.</span></div>" +
      "</div>" +

      '<div class="card mt-4 fee-ledger-card" id="feeLedgerCard">' +
      '<div class="card-head fee-card-head">' +
      "<div><h3>Transaction ledger</h3>" +
      '<div class="sub" id="feeLedgerCount"></div></div>' +
      '<div class="spacer"></div>' +
      '<button class="btn btn-ghost btn-sm" type="button" id="feeClearFilters">' + icon("refresh") + " Clear filters</button>" +
      "</div>" +
      '<div class="toolbar fee-toolbar">' +
      '<div class="search-box">' + icon("search") +
      '<input class="input" id="feeSearch" type="search" placeholder="Search student, description or reference…" ' +
      'value="' + esc(state.search) + '" aria-label="Search transactions"></div>' +
      '<select class="select" id="feeTypeFilter" aria-label="Filter by transaction type">' +
      '<option value="">All types</option>' +
      '<option value="CHARGE"' + (state.type === "CHARGE" ? " selected" : "") + ">Charges</option>" +
      '<option value="PAYMENT"' + (state.type === "PAYMENT" ? " selected" : "") + ">Payments</option>" +
      "</select>" +
      '<select class="select" id="feeStudentFilter" aria-label="Filter by student">' +
      '<option value="">' + (family ? "All children" : "All students") + "</option>" +
      students.map((student) =>
        '<option value="' + esc(student.id) + '"' + (state.studentId === student.id ? " selected" : "") + ">" +
        esc(student.fullName) + "</option>"
      ).join("") +
      "</select>" +
      (terms.length
        ? '<select class="select" id="feeTermFilter" aria-label="Filter by term">' +
          '<option value="">All terms</option>' +
          terms.map((term) => '<option value="' + esc(term) + '"' + (state.term === term ? " selected" : "") + ">" + esc(term) + "</option>").join("") +
          "</select>"
        : "") +
      "</div>" +
      '<div class="table-wrap"><table class="table fee-table fee-ledger-table">' +
      "<thead><tr><th>Date / reference</th><th>Student</th><th>Type</th><th>Details</th><th>Amount</th><th>Status</th><th></th></tr></thead>" +
      '<tbody id="feeLedgerBody"></tbody></table></div>' +
      '<div id="feeLedgerEmpty"></div>' +
      '<div class="card-foot fee-foot-note">' + icon("receipt") +
      "<span>Receipts and charge notices open as print-ready pages. Amounts are shown in " + esc(symbol()) + ".</span></div>" +
      "</div>";

    bindPageActions();
    updateStudentTable();
    updateLedger();
  }

  function bindPageActions() {
    const charge = document.getElementById("newChargeBtn");
    const payment = document.getElementById("newPaymentBtn");
    if (charge) charge.addEventListener("click", () => openTransactionForm("CHARGE"));
    if (payment) payment.addEventListener("click", () => openTransactionForm("PAYMENT"));

    const search = document.getElementById("feeSearch");
    if (search) {
      search.addEventListener("input", () => {
        state.search = search.value;
        updateLedger();
      });
    }
    const type = document.getElementById("feeTypeFilter");
    if (type) {
      type.addEventListener("change", () => {
        state.type = type.value;
        updateLedger();
      });
    }
    const student = document.getElementById("feeStudentFilter");
    if (student) {
      student.addEventListener("change", () => {
        state.studentId = student.value;
        updateLedger();
      });
    }
    const term = document.getElementById("feeTermFilter");
    if (term) {
      term.addEventListener("change", () => {
        state.term = term.value;
        updateLedger();
      });
    }
    const clear = document.getElementById("feeClearFilters");
    if (clear) {
      clear.addEventListener("click", () => {
        state.search = "";
        state.type = "";
        state.studentId = "";
        state.term = "";
        const searchInput = document.getElementById("feeSearch");
        const typeInput = document.getElementById("feeTypeFilter");
        const studentInput = document.getElementById("feeStudentFilter");
        const termInput = document.getElementById("feeTermFilter");
        if (searchInput) searchInput.value = "";
        if (typeInput) typeInput.value = "";
        if (studentInput) studentInput.value = "";
        if (termInput) termInput.value = "";
        updateLedger();
      });
    }
    const balanceSearch = document.getElementById("feeBalanceSearch");
    if (balanceSearch) {
      balanceSearch.addEventListener("input", () => {
        state.balanceSearch = balanceSearch.value;
        updateStudentTable();
      });
    }
  }

  function bindStudentActions() {
    document.querySelectorAll("[data-view-student]").forEach((button) => {
      button.onclick = () => {
        state.studentId = button.getAttribute("data-view-student");
        const filter = document.getElementById("feeStudentFilter");
        if (filter) filter.value = state.studentId;
        updateLedger();
        const card = document.getElementById("feeLedgerCard");
        if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
      };
    });
    document.querySelectorAll("[data-charge-student]").forEach((button) => {
      button.onclick = () => openTransactionForm("CHARGE", button.getAttribute("data-charge-student"));
    });
    document.querySelectorAll("[data-payment-student]").forEach((button) => {
      button.onclick = () => openTransactionForm("PAYMENT", button.getAttribute("data-payment-student"));
    });
  }

  function bindLedgerActions() {
    document.querySelectorAll("[data-receipt]").forEach((button) => {
      button.onclick = () => openReceipt(button.getAttribute("data-receipt"));
    });
    document.querySelectorAll("[data-void]").forEach((button) => {
      button.onclick = () => {
        const tx = transactionById(button.getAttribute("data-void"));
        if (tx) openVoidDialog(tx);
      };
    });
  }

  function openReceipt(id) {
    window.open(API.fileUrl("/api/fees/" + id + "/receipt"), "_blank", "noopener");
  }

  function studentOptions(selectedId) {
    return '<option value="">Select a student</option>' +
      ((data() && data().students) || []).map((student) =>
        '<option value="' + esc(student.id) + '"' + (student.id === selectedId ? " selected" : "") + ">" +
        esc(student.fullName) + " · " + esc(student.admissionNo || "") + "</option>"
      ).join("");
  }

  function categoryOptions(selected) {
    return ((data() && data().categories) || []).map((category) =>
      '<option value="' + esc(category.key) + '"' + (category.key === selected ? " selected" : "") + ">" +
      esc(category.label) + "</option>"
    ).join("");
  }

  function methodOptions(selected) {
    return ((data() && data().paymentMethods) || []).map((method) =>
      '<option value="' + esc(method.key) + '"' + (method.key === selected ? " selected" : "") + ">" +
      esc(method.label) + "</option>"
    ).join("");
  }

  function balanceHint(studentId) {
    const student = studentById(studentId);
    if (!student) return "Choose a student to see their current balance.";
    const balance = Number(student.balance || 0);
    return "Current balance: <b class=\"" + (balance > 0 ? "text-rose" : balance < 0 ? "text-cyan" : "text-emerald") + "\">" +
      esc(money(balance, symbol())) + "</b> · " + esc(student.schoolClass || student.gradeLevel || "");
  }

  function openTransactionForm(type, presetStudentId) {
    if (!canManage()) return;
    const isPayment = type === "PAYMENT";
    const selectedStudent = presetStudentId || ((data().students || []).length === 1 ? data().students[0].id : "");
    const title = isPayment ? "Record a payment" : "Add a charge";
    const subtitle = isPayment
      ? "Capture money received and issue a printable receipt immediately."
      : "Add a fee or other school charge to a student's account.";
    const submitLabel = isPayment ? "Record payment" : "Add charge";
    const termOptions = ((data() && data().terms) || [])
      .map((term) => '<option value="' + esc(term) + '"></option>').join("");

    const overlay = openModal(
      modalHeader(title, subtitle) +
      '<form id="feeForm" novalidate>' +
      '<div class="modal-body">' +
      '<div class="form-grid fee-form-grid">' +
      '<div class="field span-2"><label for="feeStudent">Student</label>' +
      '<select class="select" id="feeStudent" name="studentId" required>' + studentOptions(selectedStudent) + "</select>" +
      '<div class="fee-balance-hint" id="feeBalanceHint">' + balanceHint(selectedStudent) + "</div></div>" +
      '<div class="field"><label for="feeCategory">Category</label>' +
      '<select class="select" id="feeCategory" name="category">' + categoryOptions("TUITION") + "</select></div>" +
      '<div class="field"><label for="feeAmount">Amount (' + esc(symbol()) + ")</label>" +
      '<input class="input" id="feeAmount" name="amount" type="number" inputmode="decimal" min="0.01" step="0.01" ' +
      'placeholder="0.00" required></div>' +
      '<div class="field span-2"><label for="feeDescription">Description</label>' +
      '<input class="input" id="feeDescription" name="description" type="text" maxlength="220" ' +
      'placeholder="' + (isPayment ? "e.g. Term 1 school fees" : "e.g. Tuition for Term 1") + '" required></div>' +
      '<div class="field"><label for="feeDate">Transaction date</label>' +
      '<input class="input" id="feeDate" name="transactionDate" type="date" value="' + todayISO() + '" required></div>' +
      '<div class="field"><label for="feeTerm">Term / period</label>' +
      '<input class="input" id="feeTerm" name="term" list="feeTermOptions" placeholder="e.g. 2026/2027 · Term 1" ' +
      'value="' + esc((data().terms || [])[0] || "") + '">' +
      '<datalist id="feeTermOptions">' + termOptions + "</datalist></div>" +
      (isPayment
        ? '<div class="field"><label for="feeMethod">Payment method</label>' +
          '<select class="select" id="feeMethod" name="paymentMethod">' + methodOptions("CASH") + "</select></div>" +
          '<div class="field"><label for="feePaymentRef">Payment reference <span class="muted">(optional)</span></label>' +
          '<input class="input" id="feePaymentRef" name="paymentReference" type="text" maxlength="120" placeholder="Bank or mobile money reference"></div>'
        : "") +
      '<div class="field span-2"><label for="feeNotes">Notes <span class="muted">(optional)</span></label>' +
      '<textarea class="textarea fee-textarea" id="feeNotes" name="notes" maxlength="1000" ' +
      'placeholder="Anything the family should know about this transaction."></textarea></div>' +
      "</div>" +
      '<div class="fee-form-note">' + icon("info") +
      "<span>" + (isPayment
        ? "A payment receipt is generated automatically. The transaction cannot be deleted once posted; an authorised finance user can void it with an audit reason."
        : "The charge will appear on the family ledger immediately. It cannot be deleted once posted; an authorised finance user can void it with an audit reason.") +
      "</span></div>" +
      "</div>" +
      '<div class="modal-foot">' +
      '<button class="btn btn-outline" type="button" data-close>Cancel</button>' +
      '<button class="btn btn-primary" type="submit" id="feeSubmit">' + icon(iconName(isPayment)) + " " + submitLabel + "</button>" +
      "</div></form>",
      { focus: false }
    );

    const form = overlay.querySelector("#feeForm");
    const studentSelect = overlay.querySelector("#feeStudent");
    const hint = overlay.querySelector("#feeBalanceHint");
    const submit = overlay.querySelector("#feeSubmit");

    studentSelect.addEventListener("change", () => {
      hint.innerHTML = balanceHint(studentSelect.value);
    });
    if (selectedStudent) hint.innerHTML = balanceHint(selectedStudent);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const raw = Object.fromEntries(new FormData(form).entries());
      raw.type = type;
      submit.disabled = true;
      submit.innerHTML = '<span class="spinner"></span><span>Saving…</span>';
      try {
        const response = await API.post("/api/fees", raw);
        closeModal(overlay);
        await load();
        openTransactionSuccess(response.transaction, isPayment);
      } catch (err) {
        submit.disabled = false;
        submit.innerHTML = icon(iconName(isPayment)) + " " + submitLabel;
        fail(err);
      }
    });

    const amount = overlay.querySelector("#feeAmount");
    setTimeout(() => (selectedStudent ? amount : studentSelect).focus(), 50);
  }

  function iconName(isPayment) {
    return isPayment ? "receipt" : "plus";
  }

  function openTransactionSuccess(tx, isPayment) {
    const student = studentById(tx.studentId);
    const receiptUrl = API.fileUrl("/api/fees/" + tx.id + "/receipt");
    openModal(
      modalHeader(isPayment ? "Payment recorded" : "Charge added", tx.reference) +
      '<div class="modal-body">' +
      '<div class="fee-success">' +
      '<div class="fee-success-icon">' + icon(isPayment ? "success" : "check") + "</div>" +
      "<div><h3>" + esc(money(tx.amount, symbol())) + " " + (isPayment ? "received" : "charged") + "</h3>" +
      "<p>" + esc(tx.studentName) + " · " + esc(tx.categoryLabel) + "</p>" +
      '<div class="fee-success-meta">' + esc(tx.description) +
      (tx.term ? " · " + esc(tx.term) : "") + "</div></div></div>" +
      '<div class="fee-success-balance"><span>Student balance after this entry</span><b>' +
      esc(money(tx.studentBalance, symbol())) + "</b></div>" +
      '<p class="fee-success-note">' + (isPayment
        ? "The receipt is ready to print or save. Keep a copy for your records."
        : "A charge notice is available to print for the family's records.") + "</p>" +
      "</div>" +
      '<div class="modal-foot">' +
      '<button class="btn btn-outline" type="button" data-close>Done</button>' +
      '<a class="btn btn-primary" href="' + esc(receiptUrl) + '" target="_blank" rel="noopener">' +
      icon("receipt") + (isPayment ? " View receipt" : " View notice") + "</a>" +
      "</div>",
      { focus: false }
    );
    toast((isPayment ? "Payment" : "Charge") + " " + tx.reference + " saved for " + tx.studentName + ".", "success");
  }

  function openVoidDialog(tx) {
    const overlay = openModal(
      modalHeader("Void " + (tx.type === "PAYMENT" ? "payment" : "charge") + "?", tx.reference) +
      '<form id="feeVoidForm" novalidate>' +
      '<div class="modal-body">' +
      '<p class="fee-void-copy">Voiding <b>' + esc(money(tx.amount, symbol())) + "</b> for <b>" + esc(tx.studentName) +
      "</b> will remove it from the balance calculation. The entry stays in the ledger for audit purposes.</p>" +
      '<div class="field"><label for="feeVoidReason">Reason for voiding</label>' +
      '<textarea class="textarea fee-textarea" id="feeVoidReason" name="reason" required maxlength="500" ' +
      'placeholder="e.g. Payment entered against the wrong student"></textarea></div>' +
      "</div>" +
      '<div class="modal-foot">' +
      '<button class="btn btn-outline" type="button" data-close>Cancel</button>' +
      '<button class="btn btn-danger" type="submit" id="feeVoidSubmit">' + icon("x") + " Void transaction</button>" +
      "</div></form>",
      { focus: false }
    );

    const form = overlay.querySelector("#feeVoidForm");
    const submit = overlay.querySelector("#feeVoidSubmit");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const reason = form.querySelector("#feeVoidReason").value.trim();
      submit.disabled = true;
      submit.innerHTML = '<span class="spinner"></span><span>Voiding…</span>';
      try {
        const response = await API.post("/api/fees/" + tx.id + "/void", { reason });
        closeModal(overlay);
        toast(response.message || "Transaction voided.", "success");
        await load();
      } catch (err) {
        submit.disabled = false;
        submit.innerHTML = icon("x") + " Void transaction";
        fail(err);
      }
    });
    setTimeout(() => overlay.querySelector("#feeVoidReason").focus(), 50);
  }

  async function load() {
    const info = await API.get("/api/fees");
    state.data = info;
    // Keep a selected student filter only if that student is still present.
    if (state.studentId && !(info.students || []).some((student) => student.id === state.studentId)) {
      state.studentId = "";
    }
    render();
    return info;
  }

  window.renderPage = async function () {
    const content = document.getElementById("content");
    if (content) content.innerHTML = loading(5);
    await load();
  };
})();
