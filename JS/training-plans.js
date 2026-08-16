"use strict";

/* ===============================================================
   Training Plans Management
   - Admin authentication
   - Add a plan and upload its PDF to Supabase Storage
   - Load plans from Supabase
   - Download the real PDF
   - Delete plans that are not assigned to students
   =============================================================== */

const TRAINING_PLANS_BUCKET = "training-plans";
const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10 MB
const rowsPerPage = 8;
let currentPage = 1;

const pageState = {
  isSaving: false
};

let elements = {};
let currentAdminProfile = null;

/* ================= Initial setup ================= */

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();

  if (!window.sb) {
    alert("Supabase client is not loaded.");
    return;
  }

  currentAdminProfile = await requireAdmin();
  if (!currentAdminProfile) return;

  showAdminName(currentAdminProfile);
  setupSidebar();
  setupModal();
  setupScheduleModal();
  setupFormValidation();
  setupLogout();

  await loadTrainingPlans();
});

function cacheElements() {
  elements = {
    menuToggle: document.getElementById("menuToggle"),
    sidebarClose: document.getElementById("sidebarClose"),
    sidebar: document.getElementById("sidebar"),
    sidebarOverlay: document.getElementById("sidebarOverlay"),

    openPlanModal: document.getElementById("openPlanModal"),
    planModal: document.getElementById("planModal"),
    closePlanModal: document.getElementById("closePlanModal"),
    cancelPlanModal: document.getElementById("cancelPlanModal"),

    planForm: document.getElementById("planForm"),
    planTitle: document.getElementById("planTitle"),
    major: document.getElementById("major"),
    otherMajorField: document.getElementById("otherMajorField"),
    otherMajor: document.getElementById("otherMajor"),
    department: document.getElementById("department"),
    trainingTerm: document.getElementById("trainingTerm"),
    totalHours: document.getElementById("totalHours"),
    planPdfInput: document.getElementById("planPdfInput"),
    pdfFileName: document.getElementById("pdfFileName"),
    pdfError: document.getElementById("pdfError"),
    savePlanBtn: document.getElementById("savePlanBtn"),

    plansTableBody: document.getElementById("plansTableBody"),
    pagination: document.getElementById("pagination"),
    adminName: document.getElementById("adminName"),
    logoutLink: document.getElementById("logoutLink"),

    scheduleModal: document.getElementById("scheduleModal"),
    closeScheduleModal: document.getElementById("closeScheduleModal"),
    cancelScheduleModal: document.getElementById("cancelScheduleModal"),
    scheduleModalPlanTitle: document.getElementById("scheduleModalPlanTitle"),
    scheduleForm: document.getElementById("scheduleForm"),
    weeksContainer: document.getElementById("weeksContainer"),
    addWeekBtn: document.getElementById("addWeekBtn"),
    scheduleError: document.getElementById("scheduleError"),
    saveScheduleBtn: document.getElementById("saveScheduleBtn")
  };
}

/* ================= Sidebar ================= */

function setupSidebar() {
  const openSidebar = () => {
    elements.sidebar?.classList.add("active");
    elements.sidebarOverlay?.classList.add("active");
  };

  const closeSidebar = () => {
    elements.sidebar?.classList.remove("active");
    elements.sidebarOverlay?.classList.remove("active");
  };

  elements.menuToggle?.addEventListener("click", openSidebar);
  elements.sidebarClose?.addEventListener("click", closeSidebar);
  elements.sidebarOverlay?.addEventListener("click", closeSidebar);
}

/* ================= Admin header + logout ================= */

function showAdminName(profile) {
  if (!elements.adminName) return;
  elements.adminName.textContent = profile?.full_name?.trim() || "Admin";
}

function setupLogout() {
  elements.logoutLink?.addEventListener("click", async (event) => {
    event.preventDefault();
    await signOut("Login.html");
  });
}

/* ================= Modal ================= */

function setupModal() {
  elements.openPlanModal?.addEventListener("click", openPlanModal);
  elements.closePlanModal?.addEventListener("click", closePlanModal);
  elements.cancelPlanModal?.addEventListener("click", closePlanModal);

  elements.major?.addEventListener("change", updateOtherMajorVisibility);

  elements.planModal?.addEventListener("click", (event) => {
    if (event.target === elements.planModal) closePlanModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePlanModal();
  });
}

function updateOtherMajorVisibility() {
  if (elements.major.value === "Other") {
    elements.otherMajorField.style.display = "flex";
    elements.otherMajor.required = true;
  } else {
    elements.otherMajorField.style.display = "none";
    elements.otherMajor.required = false;
    elements.otherMajor.value = "";
    elements.otherMajor.setCustomValidity("");
  }
}

function openPlanModal() {
  resetPlanForm();
  elements.planModal?.classList.add("show-modal");
  elements.planTitle?.focus();
}

function closePlanModal() {
  if (pageState.isSaving) return;
  elements.planModal?.classList.remove("show-modal");
  resetPlanForm();
}

function resetPlanForm() {
  elements.planForm?.reset();

  updateOtherMajorVisibility();

  if (elements.pdfFileName) {
    elements.pdfFileName.textContent = "Upload PDF file";
  }

  setPdfError("");

  [
    elements.planTitle,
    elements.department,
    elements.trainingTerm,
    elements.totalHours,
    elements.otherMajor
  ].forEach((field) => field?.setCustomValidity(""));
}

/* ================= Validation ================= */

function setupFormValidation() {
  blockArabic(elements.planTitle, "Plan Title");
  blockArabic(elements.otherMajor, "Major");
  blockArabic(elements.department, "Department");
  blockArabic(elements.trainingTerm, "Training Term");

  elements.totalHours?.addEventListener("input", validateTotalHours);
  elements.planPdfInput?.addEventListener("change", handlePdfSelection);
  elements.planForm?.addEventListener("submit", saveTrainingPlan);
}

function blockArabic(input, fieldLabel) {
  if (!input) return;

  input.addEventListener("input", () => {
    if (/[\u0600-\u06FF]/.test(input.value)) {
      input.setCustomValidity(
        `${fieldLabel} cannot contain Arabic characters. Please use English only.`
      );
      input.reportValidity();
    } else {
      input.setCustomValidity("");
    }
  });
}

function validateTotalHours() {
  if (!elements.totalHours) return true;

  const value = elements.totalHours.value.trim();

  if (!value) {
    elements.totalHours.setCustomValidity("");
    return false;
  }

  const numberValue = Number(value);
  const isValid =
    Number.isInteger(numberValue) &&
    numberValue >= 1 &&
    numberValue <= 10000;

  elements.totalHours.setCustomValidity(
    isValid ? "" : "Total Hours must be a whole number between 1 and 10,000."
  );

  return isValid;
}

function handlePdfSelection() {
  const file = elements.planPdfInput?.files?.[0] || null;

  if (!file) {
    if (elements.pdfFileName) {
      elements.pdfFileName.textContent = "Upload PDF file";
    }
    setPdfError("");
    return;
  }

  if (elements.pdfFileName) {
    elements.pdfFileName.textContent = file.name;
  }

  setPdfError(getPdfValidationMessage(file));
}

function getPdfValidationMessage(file) {
  if (!file) return "Please upload a training plan PDF.";

  const hasPdfExtension = file.name.toLowerCase().endsWith(".pdf");
  const hasPdfMimeType = file.type === "application/pdf" || file.type === "";

  if (!hasPdfExtension || !hasPdfMimeType) {
    return "Only PDF files are allowed.";
  }

  if (file.size > MAX_PDF_SIZE) {
    return "The PDF must be 10 MB or smaller.";
  }

  return "";
}

function setPdfError(message) {
  if (elements.pdfError) {
    elements.pdfError.textContent = message;
  }

  document
    .querySelector(".file-upload")
    ?.classList.toggle("invalid", Boolean(message));
}

/* ================= Save training plan ================= */

async function saveTrainingPlan(event) {
  event.preventDefault();

  if (pageState.isSaving || !elements.planForm) return;

  validateTotalHours();

  if (!elements.planForm.checkValidity()) {
    elements.planForm.reportValidity();
    return;
  }

  const pdfFile = elements.planPdfInput?.files?.[0] || null;
  const pdfMessage = getPdfValidationMessage(pdfFile);
  setPdfError(pdfMessage);

  if (pdfMessage) return;

  pageState.isSaving = true;
  setSaveButtonLoading(true);

  let uploadedPath = null;

  try {
    const storagePath = createPdfStoragePath(pdfFile.name);

    const { error: uploadError } = await sb.storage
      .from(TRAINING_PLANS_BUCKET)
      .upload(storagePath, pdfFile, {
        cacheControl: "3600",
        contentType: "application/pdf",
        upsert: false
      });

    if (uploadError) throw uploadError;
    uploadedPath = storagePath;

    const resolvedMajor =
      elements.major.value === "Other"
        ? elements.otherMajor.value.trim()
        : elements.major.value;

    const planData = {
      title: elements.planTitle.value.trim(),
      major: resolvedMajor,
      department: elements.department.value.trim(),
      training_term: elements.trainingTerm.value.trim(),
      total_hours: Number(elements.totalHours.value),
      pdf_path: uploadedPath,
      created_by: currentAdminProfile?.id || null
    };

    const { error: insertError } = await sb
      .from("training_plans")
      .insert([planData]);

    if (insertError) throw insertError;

    elements.planModal?.classList.remove("show-modal");
    resetPlanForm();
    await loadTrainingPlans();
  } catch (error) {
    console.error("Failed to save training plan:", error);

    if (uploadedPath) {
      const { error: cleanupError } = await sb.storage
        .from(TRAINING_PLANS_BUCKET)
        .remove([uploadedPath]);

      if (cleanupError) {
        console.warn(
          "Could not clean up the uploaded PDF:",
          cleanupError.message
        );
      }
    }

    alert(error?.message || "The training plan could not be saved.");
  } finally {
    pageState.isSaving = false;
    setSaveButtonLoading(false);
  }
}

function createPdfStoragePath(originalFileName) {
  const extensionSafeName =
    originalFileName
      .replace(/\.pdf$/i, "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "training-plan";

  const uniqueId = window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `plans/${uniqueId}-${extensionSafeName}.pdf`;
}

function setSaveButtonLoading(isLoading) {
  if (!elements.savePlanBtn) return;

  elements.savePlanBtn.disabled = isLoading;
  elements.savePlanBtn.innerHTML = isLoading
    ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Saving...</span>'
    : '<i class="fa-solid fa-check"></i><span>Save Training Plan</span>';
}

/* ================= Load and render plans ================= */

async function loadTrainingPlans() {
  renderLoadingRow();

  const [plansResult, assignedCounts] = await Promise.all([
    sb
      .from("training_plans")
      .select(
"id, title, major, department, training_term, total_hours, pdf_path, created_at"      )
      .order("created_at", { ascending: false }),
    getAssignedStudentsCount()
  ]);

  if (plansResult.error) {
    console.error("Error loading training plans:", plansResult.error);
    renderErrorRow("Training plans could not be loaded.");
    return;
  }

  renderTrainingPlans(plansResult.data || [], assignedCounts);
}

async function getAssignedStudentsCount() {
  const counts = {};

  const { data, error } = await sb
    .from("application_assignments")
    .select("training_plan_id");

  if (error) {
    console.warn(
      "Assigned student counts could not be loaded:",
      error.message
    );
    return counts;
  }

  (data || []).forEach((assignment) => {
    if (!assignment.training_plan_id) return;

    counts[assignment.training_plan_id] =
      (counts[assignment.training_plan_id] || 0) + 1;
  });

  return counts;
}

function renderTrainingPlans(plans, assignedCounts) {
  if (!elements.plansTableBody) return;

  if (plans.length === 0) {
    elements.plansTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">
          <div class="empty-state">
            <i class="fa-regular fa-folder-open"></i>
            <h3>No Training Plans Added Yet</h3>
            <p>Once you add training plans, they will appear in this table.</p>
          </div>
        </td>
      </tr>
    `;

    if (elements.pagination) elements.pagination.style.display = "none";
    return;
  }

  elements.plansTableBody.innerHTML = "";

  plans.forEach((plan) => {
    const assignedStudents = assignedCounts[plan.id] || 0;
    elements.plansTableBody.appendChild(
      createPlanRow(plan, assignedStudents)
    );
  });

  currentPage = 1;
  showPlansPage(currentPage);
}

function getPlanRows() {
  if (!elements.plansTableBody) return [];
  return Array.from(
    elements.plansTableBody.querySelectorAll("tr:not(.empty-row)")
  );
}

function showPlansPage(page) {
  const rows = getPlanRows();

  if (!elements.pagination) return;

  if (rows.length === 0) {
    elements.pagination.style.display = "none";
    return;
  }

  const totalPages = Math.ceil(rows.length / rowsPerPage);

  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  elements.pagination.style.display =
    rows.length > rowsPerPage ? "flex" : "none";

  const start = (page - 1) * rowsPerPage;
  const end = page * rowsPerPage;

  rows.forEach((row, index) => {
    const visible = index >= start && index < end;

    row.style.display = visible ? "" : "none";

    row.querySelectorAll("td").forEach((td) => {
      td.style.borderBottom = "";
    });
  });

  const visibleRows = rows.filter(
    (_, index) => index >= start && index < end
  );

  if (visibleRows.length) {
    const lastVisibleRow = visibleRows[visibleRows.length - 1];

    lastVisibleRow.querySelectorAll("td").forEach((td) => {
      td.style.borderBottom = "none";
    });
  }

  renderPlansPagination(totalPages);
}

function renderPlansPagination(totalPages) {
  elements.pagination.innerHTML = "";

  if (totalPages <= 1) return;

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.textContent = "<";
  prevBtn.disabled = currentPage === 1;

  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      showPlansPage(currentPage);
    }
  });

  elements.pagination.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement("button");
    pageBtn.type = "button";
    pageBtn.textContent = i;

    if (i === currentPage) {
      pageBtn.classList.add("page-active");
    }

    pageBtn.addEventListener("click", () => {
      currentPage = i;
      showPlansPage(currentPage);
    });

    elements.pagination.appendChild(pageBtn);
  }

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.textContent = ">";
  nextBtn.disabled = currentPage === totalPages;

  nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      showPlansPage(currentPage);
    }
  });

  elements.pagination.appendChild(nextBtn);
}

function createPlanRow(plan, assignedStudents) {
  const row = document.createElement("tr");
  row.className = "data-row";

  row.appendChild(createTextCell(plan.title));
  row.appendChild(createTextCell(plan.major));
  row.appendChild(createTextCell(plan.department));
  row.appendChild(createTextCell(plan.training_term));
  row.appendChild(createTextCell(formatHours(plan.total_hours)));

  const pdfCell = document.createElement("td");

  if (plan.pdf_path) {
    const downloadButton = document.createElement("button");
    downloadButton.type = "button";
    downloadButton.className = "download-btn";
    downloadButton.title = "Download Training Plan PDF";
    downloadButton.innerHTML =
      '<i class="fa-regular fa-file-pdf"></i><span>Download</span>';
    downloadButton.addEventListener("click", () =>
      downloadTrainingPlan(plan, downloadButton)
    );
    pdfCell.appendChild(downloadButton);
  } else {
    const missingPdf = document.createElement("span");
    missingPdf.className = "missing-pdf";
    missingPdf.textContent = "Not uploaded";
    pdfCell.appendChild(missingPdf);
  }

  row.appendChild(pdfCell);
  row.appendChild(createTextCell(String(assignedStudents)));

  return row;
}

function createTextCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value ?? "-";
  return cell;
}

function formatHours(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return "-";

  return Number.isInteger(numericValue)
    ? `${numericValue} hours`
    : `${numericValue.toFixed(1)} hours`;
}

function renderLoadingRow() {
  if (!elements.plansTableBody) return;

  elements.plansTableBody.innerHTML = `
    <tr class="status-row">
      <td colspan="7">
        <div class="table-status">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span>Loading training plans...</span>
        </div>
      </td>
    </tr>
  `;
}

function renderErrorRow(message) {
  if (!elements.plansTableBody) return;

  elements.plansTableBody.innerHTML = `
    <tr class="status-row error-status-row">
      <td colspan="7">
        <div class="table-status">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>${message}</span>
        </div>
      </td>
    </tr>
  `;
}

/* ================= Download PDF ================= */

async function downloadTrainingPlan(plan, button) {
  if (!plan?.pdf_path || !button) return;

  const originalHtml = button.innerHTML;
  button.disabled = true;
  button.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i><span>Downloading...</span>';

  try {
    const { data: fileBlob, error } = await sb.storage
      .from(TRAINING_PLANS_BUCKET)
      .download(plan.pdf_path);

    if (error) throw error;

    const objectUrl = URL.createObjectURL(fileBlob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = `${safeDownloadName(plan.title)}.pdf`;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (error) {
    console.error("Training plan download failed:", error);
    alert(
      error?.message ||
        "The training plan PDF could not be downloaded."
    );
  } finally {
    button.disabled = false;
    button.innerHTML = originalHtml;
  }
}

function safeDownloadName(value) {
  return (
    (value || "training-plan")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-") || "training-plan"
  );
}

/* ================= Delete plan ================= */

async function deleteTrainingPlan(plan, assignedStudents, button) {
  if (!plan?.id) return;

  if (assignedStudents > 0) {
    alert(
      "This training plan is assigned to students. Assign them to another plan before deleting it."
    );
    return;
  }

  const confirmed = confirm(`Delete "${plan.title}"?`);
  if (!confirmed) return;

  const originalHtml = button.innerHTML;
  button.disabled = true;
  button.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i>';

  try {
    const { error: deleteError } = await sb
      .from("training_plans")
      .delete()
      .eq("id", plan.id);

    if (deleteError) throw deleteError;

    if (plan.pdf_path) {
      const { error: storageError } = await sb.storage
        .from(TRAINING_PLANS_BUCKET)
        .remove([plan.pdf_path]);

      if (storageError) {
        console.warn(
          "The plan was deleted, but its PDF could not be removed:",
          storageError.message
        );
      }
    }

    await loadTrainingPlans();
  } catch (error) {
    console.error("Failed to delete training plan:", error);

    const message =
      error?.code === "23503"
        ? "This plan is already assigned to a student and cannot be deleted."
        : error?.message ||
          "The training plan could not be deleted.";

    alert(message);
    button.disabled = false;
    button.innerHTML = originalHtml;
  }
}

/* ================= Weekly Schedule Management ================= */

let currentSchedulePlan = null;

function setupScheduleModal() {
  elements.closeScheduleModal?.addEventListener("click", closeScheduleModal);
  elements.cancelScheduleModal?.addEventListener("click", closeScheduleModal);

  elements.scheduleModal?.addEventListener("click", (event) => {
    if (event.target === elements.scheduleModal) closeScheduleModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeScheduleModal();
  });

  elements.addWeekBtn?.addEventListener("click", () => {
    addWeekRow();
  });

  elements.scheduleForm?.addEventListener("submit", saveSchedule);
}

async function openScheduleModal(plan) {
  currentSchedulePlan = plan;
  elements.scheduleModalPlanTitle.textContent = plan.title || "";
  elements.scheduleError.textContent = "";
  elements.weeksContainer.innerHTML = `
    <p style="color:#888;padding:8px 0;">Loading weeks...</p>
  `;

  elements.scheduleModal?.classList.add("show-modal");

  const { data: weeks, error } = await sb
    .from("training_plan_weeks")
    .select("*")
    .eq("training_plan_id", plan.id)
    .order("week_number", { ascending: true });

  if (error) {
    console.error("Error loading training plan weeks:", error);
    elements.weeksContainer.innerHTML = "";
    elements.scheduleError.textContent = "Could not load the existing schedule.";
    return;
  }

  elements.weeksContainer.innerHTML = "";

  if (!weeks || weeks.length === 0) {
    addWeekRow();
  } else {
    weeks.forEach((week) => addWeekRow(week));
  }
}

function closeScheduleModal() {
  elements.scheduleModal?.classList.remove("show-modal");
  elements.weeksContainer.innerHTML = "";
  currentSchedulePlan = null;
}

function addWeekRow(week = null) {
  const row = document.createElement("div");
  row.className = "form-row week-row";
  row.style.alignItems = "flex-start";
  row.style.marginBottom = "12px";

  const weekNumber = elements.weeksContainer.children.length + 1;

  row.innerHTML = `
    <div class="form-group" style="flex:0 0 60px;">
      <label>Week</label>
      <input type="text" value="${weekNumber}" disabled>
    </div>

    <div class="form-group" style="flex:2;">
      <label>Work Description</label>
      <input type="text" class="week-description" placeholder="What happens this week?" required value="${week?.description ? escapeAttr(week.description) : ""}">
    </div>

    <div class="form-group" style="flex:0 0 160px;">
      <label>Start Date</label>
      <input type="date" class="week-start-date" required value="${week?.start_date || ""}">
    </div>

    <div class="form-group" style="flex:0 0 100px;">
      <label>Hours</label>
      <input type="number" class="week-hours" min="1" max="200" step="1" required value="${week?.hours || 25}">
    </div>

    <div class="form-group" style="flex:0 0 40px;">
      <label>&nbsp;</label>
      <button type="button" class="cancel-btn remove-week-btn" title="Remove week">
        <i class="fa-regular fa-trash-can"></i>
      </button>
    </div>
  `;

  row.querySelector(".remove-week-btn").addEventListener("click", () => {
    row.remove();
    renumberWeekRows();
  });

  elements.weeksContainer.appendChild(row);
}

function renumberWeekRows() {
  const rows = elements.weeksContainer.querySelectorAll(".week-row");
  rows.forEach((row, index) => {
    row.querySelector("input[disabled]").value = index + 1;
  });
}

function escapeAttr(value) {
  return String(value).replaceAll('"', "&quot;");
}

async function saveSchedule(event) {
  event.preventDefault();

  if (!currentSchedulePlan) return;

  const rows = Array.from(elements.weeksContainer.querySelectorAll(".week-row"));

  if (rows.length === 0) {
    elements.scheduleError.textContent = "Add at least one week.";
    return;
  }

  const weeksData = [];

  for (let i = 0; i < rows.length; i++) {
    const descriptionInput = rows[i].querySelector(".week-description");
    const startDateInput = rows[i].querySelector(".week-start-date");
    const hoursInput = rows[i].querySelector(".week-hours");

    if (
      !descriptionInput.value.trim() ||
      !startDateInput.value ||
      !hoursInput.value
    ) {
      elements.scheduleError.textContent = "Please fill in every field for every week.";
      return;
    }

    weeksData.push({
      training_plan_id: currentSchedulePlan.id,
      week_number: i + 1,
      description: descriptionInput.value.trim(),
      start_date: startDateInput.value,
      hours: Number(hoursInput.value)
    });
  }

  elements.scheduleError.textContent = "";
  elements.saveScheduleBtn.disabled = true;
  elements.saveScheduleBtn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i><span>Saving...</span>';

  try {
    // Replace the whole schedule: delete existing weeks for this plan,
    // then insert the current set. Simpler and safer than trying to
    // diff which rows changed.
    const { error: deleteError } = await sb
      .from("training_plan_weeks")
      .delete()
      .eq("training_plan_id", currentSchedulePlan.id);

    if (deleteError) throw deleteError;

    const { error: insertError } = await sb
      .from("training_plan_weeks")
      .insert(weeksData);

    if (insertError) throw insertError;

    closeScheduleModal();
  } catch (error) {
    console.error("Failed to save schedule:", error);
    elements.scheduleError.textContent =
      error?.message || "The schedule could not be saved.";
  } finally {
    elements.saveScheduleBtn.disabled = false;
    elements.saveScheduleBtn.innerHTML =
      '<i class="fa-solid fa-check"></i><span>Save Schedule</span>';
  }
}