/* ================= Application Overview + Documents ================= */


const urlParams = new URLSearchParams(window.location.search);
const applicationId = urlParams.get("id");

let currentApplication = null;

const DOCUMENT_TYPES = [
  {
    key: "cv",
    label: "CV / Resume",
    optional: false,
  },
  {
    key: "academic_transcript",
    label: "Academic Transcript",
    optional: false,
  },
  {
    key: "certificates",
    label: "Certificates",
    optional: false,
  },
  {
    key: "recommendation_letter",
    label: "Recommendation Letter",
    optional: true,
  },
];

function getElement(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = getElement(id);
  if (element) element.textContent = value ?? "-";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(dateString, options) {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString(
    "en-US",
    options || { day: "numeric", month: "short", year: "numeric" }
  );
}

function formatStatus(status) {
  if (!status) return "-";

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function setupSidebar() {
  const menuToggle = getElement("menuToggle");
  const sidebarClose = getElement("sidebarClose");
  const sidebar = getElement("sidebar");
  const overlay = getElement("sidebarOverlay");

  if (!menuToggle || !sidebarClose || !sidebar || !overlay) return;

  const openSidebar = () => {
    sidebar.classList.add("active");
    overlay.classList.add("active");
  };

  const closeSidebar = () => {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
  };

  menuToggle.addEventListener("click", openSidebar);
  sidebarClose.addEventListener("click", closeSidebar);
  overlay.addEventListener("click", closeSidebar);
}

async function loadAdminName() {
  const { profile } = await getCurrentUserProfile();
  if (!profile) return;

  setText("topbarAdminName", profile.full_name || profile.email || "Admin");
}

function keepApplicationIdInTabs() {
  if (!applicationId) return;

  document.querySelectorAll(".tabs a").forEach((link) => {
    const originalHref = link.getAttribute("href");
    if (!originalHref) return;

    const pageName = originalHref.split("?")[0];
    link.setAttribute("href", `${pageName}?id=${encodeURIComponent(applicationId)}`);
  });
}

function showMissingApplication(message) {
  setText("breadcrumbName", message);
  setText("profileName", message);

  const tableBody = getElement("documentsTableBody");
  if (tableBody) {
    tableBody.innerHTML = `
      <tr class="documents-message-row">
        <td colspan="4">
          <div class="documents-message error">
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>${escapeHtml(message)}</span>
          </div>
        </td>
      </tr>
    `;
  }
}

function getDisplayName(app) {
  const profileName = app.profiles?.full_name?.trim();
  if (profileName) return profileName;

  return `${app.first_name || ""} ${app.last_name || ""}`.trim() || "-";
}

function populateApplication(app) {
  const fullName = getDisplayName(app);
  const city = app.city === "Other" ? app.other_city : app.city;

  setText("breadcrumbName", fullName);
  setText("profileName", fullName);
  setText("profileEmail", app.email);
  setText("profilePhone", app.mobile);
  setText("profileCity", city);
  setText("profileAppliedOn", formatDate(app.submitted_at || app.created_at));
  setText("profileNationalId", app.national_id);

  const statusBadge = getElement("profileStatus");
  if (statusBadge) {
    statusBadge.className = `status ${app.status || "pending"}`;
    statusBadge.textContent = formatStatus(app.status);
  }

  setText("infoFullName", fullName);
  setText("infoDob", formatDate(app.dob));
  setText("infoGender", app.gender);
  setText("infoNationalId", app.national_id);
  setText("infoPhone", app.mobile);
  setText("infoEmail", app.email);
  setText(
    "eduUniversity",
    app.university === "Other" ? app.other_university : app.university
  );
  setText("eduMajor", app.major);
  setText("eduLevel", app.student_level);
  setText("eduGpa", `${app.gpa} (${app.gpa_scale})`);
  setText(
    "eduGraduation",
    formatDate(app.expected_graduation, { month: "long", year: "numeric" })
  );

  const studentMajorInput = getElement("studentMajor");
  if (studentMajorInput) studentMajorInput.value = app.major || "";

  if (app.status !== "pending") {
    const actionsCard = document.querySelector(".actions-card");
    if (actionsCard) actionsCard.style.display = "none";
  }
}

async function loadApplication() {
  if (!applicationId) {
    showMissingApplication("No application selected");
    return;
  }

  const { data: app, error } = await sb
    .from("applications")
    .select("*, profiles(full_name)")
    .eq("id", applicationId)
    .single();

  if (error || !app) {
    console.error("Error loading application:", error);
    showMissingApplication("Application not found");
    return;
  }

  currentApplication = app;
  populateApplication(app);

  await Promise.all([
    loadAnalysis(app.id),
    loadDocuments(app.id),
    loadTrainingPlanOptions(app.major),
  ]);
}

/* ================= AI Skill Analysis ================= */

const CV_ANALYSIS_API =
  "https://project-coop-d7j3.onrender.com/analyze-cv";

let analysisRunning = false;

function renderAnalysisEmpty(
  message,
  iconClass = "fa-wand-magic-sparkles",
  showButton = false,
  buttonText = "Run AI Analysis"
) {
  const container = getElement("analysisContent");
  if (!container) return;

  container.innerHTML = `
    <div class="analysis-empty-state">
      <i class="fa-solid ${iconClass}"></i>

      <p>${escapeHtml(message)}</p>

      ${
        showButton
          ? `
            <button
              type="button"
              class="analysis-run-btn"
              id="runAnalysisBtn"
            >
              <i class="fa-solid fa-wand-magic-sparkles"></i>
              ${escapeHtml(buttonText)}
            </button>
          `
          : ""
      }
    </div>
  `;

  const runButton = getElement("runAnalysisBtn");

  if (runButton) {
    runButton.addEventListener("click", runCurrentApplicationAnalysis);
  }
}

async function runCurrentApplicationAnalysis() {
  if (analysisRunning) return;

  if (!currentApplication?.id) {
    renderAnalysisEmpty(
      "Application ID is missing.",
      "fa-circle-exclamation"
    );
    return;
  }

  const programRequirementId =
    currentApplication.program_requirement_id;

  if (!programRequirementId) {
    renderAnalysisEmpty(
      "This application is not linked to program requirements.",
      "fa-circle-exclamation"
    );

    console.error(
      "Missing program_requirement_id:",
      currentApplication
    );

    return;
  }

  analysisRunning = true;

  renderAnalysisEmpty(
    "The CV is being analyzed. This may take a moment...",
    "fa-spinner fa-spin"
  );

  const requestBody = {
  application_id: currentApplication.id,
  program_requirements_id:
    currentApplication.program_requirement_id
};

  console.log("Sending CV analysis request:", requestBody);

  try {
    const response = await fetch(CV_ANALYSIS_API, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    let responseData = null;

    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }
    }
console.log("CV analysis status:", response.status);
console.log("CV analysis response:", responseData);

if (!response.ok) {
  let errorMessage =
    `Analysis failed with status ${response.status}.`;

  if (responseData?.detail) {
    errorMessage =
      typeof responseData.detail === "string"
        ? responseData.detail
        : JSON.stringify(responseData.detail);
  } else if (responseData?.message) {
    errorMessage = responseData.message;
  } else if (responseText) {
    errorMessage = responseText;
  }

  throw new Error(errorMessage);
}

await waitForAnalysisResult(currentApplication.id);
  } catch (error) {
    console.error("CV analysis request failed:", error);

    renderAnalysisEmpty(
      error.message || "The CV analysis could not be completed.",
      "fa-circle-exclamation",
      true,
      "Try Again"
    );
  } finally {
    analysisRunning = false;
  }
}

async function waitForAnalysisResult(appId) {
  const maximumAttempts = 20;
  const delayBetweenAttempts = 3000;

  for (let attempt = 1; attempt <= maximumAttempts; attempt++) {
    const { data: analysis, error } = await sb
      .from("ai_skill_analysis")
      .select("*")
      .eq("application_id", appId)
      .maybeSingle();

    if (error) {
      console.error("Error checking AI analysis:", error);

      renderAnalysisEmpty(
        "The AI analysis result could not be loaded.",
        "fa-circle-exclamation",
        true,
        "Try Again"
      );

      return;
    }

    if (analysis?.status === "completed") {
      renderAnalysisResult(analysis);
      return;
    }

    if (analysis?.status === "failed") {
      renderAnalysisEmpty(
        analysis.error_message || "The AI analysis failed.",
        "fa-circle-exclamation",
        true,
        "Run Analysis Again"
      );

      return;
    }

    renderAnalysisEmpty(
      `Analyzing CV... ${attempt}/${maximumAttempts}`,
      "fa-spinner fa-spin"
    );

    await new Promise((resolve) =>
      setTimeout(resolve, delayBetweenAttempts)
    );
  }

  renderAnalysisEmpty(
    "The analysis is taking longer than expected.",
    "fa-clock",
    true,
    "Check Again"
  );
}

async function loadAnalysis(appId) {
  const container = getElement("analysisContent");
  if (!container) return;

  renderAnalysisEmpty(
    "Loading AI analysis...",
    "fa-spinner fa-spin"
  );

  const { data: analysis, error } = await sb
    .from("ai_skill_analysis")
    .select("*")
    .eq("application_id", appId)
    .maybeSingle();

  if (error) {
    console.error("Error loading AI analysis:", error);

    renderAnalysisEmpty(
      "AI analysis could not be loaded.",
      "fa-circle-exclamation",
      true,
      "Try Again"
    );

    return;
  }

  if (!analysis) {
    renderAnalysisEmpty(
      "AI analysis is starting automatically...",
      "fa-spinner fa-spin"
    );

    await runCurrentApplicationAnalysis();
    return;
  }

  if (
    analysis.status === "processing" ||
    analysis.status === "pending"
  ) {
    renderAnalysisEmpty(
      "AI analysis is currently processing...",
      "fa-spinner fa-spin"
    );

    await waitForAnalysisResult(appId);
    return;
  }

  if (analysis.status === "failed") {
    renderAnalysisEmpty(
      analysis.error_message || "AI analysis failed.",
      "fa-circle-exclamation",
      true,
      "Run Analysis Again"
    );

    return;
  }

  if (analysis.status !== "completed") {
    renderAnalysisEmpty(
      "AI analysis has not been completed yet.",
      "fa-wand-magic-sparkles",
      true,
      "Run AI Analysis"
    );

    return;
  }

  renderAnalysisResult(analysis);
}

function getMatchLevel(score) {
  const numericScore = Number(score) || 0;

  if (numericScore < 40) {
    return "match-low";
  }

  if (numericScore < 70) {
    return "match-medium";
  }

  return "match-high";
}

function renderAnalysisResult(analysis) {
  const container = getElement("analysisContent");
  if (!container) return;

  const matchLevel = getMatchLevel(analysis.match_score);

  const matchScore = Math.min(
    100,
    Math.max(0, Number(analysis.match_score) || 0)
  );

  const circleCircumference = 339.292;

  const circleOffset =
    circleCircumference -
    (matchScore / 100) * circleCircumference;


  const matchedSkills = Array.isArray(analysis.matched_skills)
    ? analysis.matched_skills
    : [];

  const missingSkills = Array.isArray(analysis.missing_skills)
    ? analysis.missing_skills
    : [];

  const extractedSkills = Array.isArray(analysis.extracted_skills)
    ? analysis.extracted_skills
    : [];

  const rawResponse =
    analysis.raw_ai_response &&
    typeof analysis.raw_ai_response === "object"
      ? analysis.raw_ai_response
      : {};

  const summary =
    rawResponse.summary ||
    rawResponse.ai_summary ||
    rawResponse.overview ||
    rawResponse.analysis ||
    "";

  const matchedHtml = matchedSkills.length
    ? matchedSkills
        .map(
          (skill) =>
            `<li>${escapeHtml(skill)}</li>`
        )
        .join("")
    : "<li>No matched skills were found.</li>";

  const missingHtml = missingSkills.length
    ? missingSkills
        .map(
          (skill) =>
            `<li>${escapeHtml(skill)}</li>`
        )
        .join("")
    : "<li>No missing skills were found.</li>";

  const extractedHtml = extractedSkills.length
    ? `
      <h4 class="extracted-title">Extracted CV Skills</h4>

      <ul class="extracted-skills">
        ${extractedSkills
          .map(
            (skill) =>
              `<li>${escapeHtml(skill)}</li>`
          )
          .join("")}
      </ul>
    `
    : "";

  container.innerHTML = `
    <div class="match ${matchLevel}">

      <svg
        class="match-ring"
        viewBox="0 0 125 125"
        aria-hidden="true"
      >
        <circle
          class="match-ring-background"
          cx="62.5"
          cy="62.5"
          r="54"
        ></circle>

        <circle
          class="match-ring-progress"
          cx="62.5"
          cy="62.5"
          r="54"
          style="--match-offset: ${circleOffset};"
        ></circle>
      </svg>

      <div class="match-content">
        <p>Overall Match</p>

        <h2>
          ${matchScore}%
        </h2>
      </div>

    </div>

    ${extractedHtml}

    <h4>Matched Skills</h4>

    <ul class="strengths">
      ${matchedHtml}
    </ul>

    <h4 class="missing-title">
      Missing / Suggested Skills
    </h4>

    <ul class="missing">
      ${missingHtml}
    </ul>

    ${
      summary
        ? `
          <div class="ai-summary">
            <h5>AI Summary</h5>

            <p>
              ${escapeHtml(summary)}
            </p>
          </div>
        `
        : ""
    }

    <button
      type="button"
      class="analysis-run-btn analysis-rerun-btn"
      id="runAnalysisBtn"
    >
      <i class="fa-solid fa-rotate"></i>
      Run Analysis Again
    </button>
  `;

  const rerunButton = getElement("runAnalysisBtn");

  if (rerunButton) {
    rerunButton.addEventListener(
      "click",
      runCurrentApplicationAnalysis
    );
  }
}
/* ================= Application Documents ================= */

function getFileExtension(fileName, filePath) {
  const source = fileName || filePath || "";
  const lastPart = source.split("/").pop() || "";
  const dotIndex = lastPart.lastIndexOf(".");

  if (dotIndex === -1) return "FILE";
  return lastPart.slice(dotIndex + 1).toUpperCase();
}

function getFileTypeClass(extension) {
  const normalized = extension.toLowerCase();

  if (normalized === "pdf") return "pdf-type";
  if (normalized === "doc" || normalized === "docx") return "word-type";
  return "file-type";
}

function createDocumentRow(config, documentRecord) {
  if (!documentRecord) {
    return `
      <tr>
        <td>
          <div class="document-info">
            <div class="document-icon">
              <i class="fa-regular fa-file-lines"></i>
            </div>
            <div>
              <strong>${escapeHtml(config.label)}${config.optional ? " (Optional)" : ""}</strong>
              <small>No file was uploaded</small>
            </div>
          </div>
        </td>
        <td><span class="document-type empty-type">Empty</span></td>
        <td><span class="not-uploaded">—</span></td>
        <td>
          <button type="button" class="download-btn disabled" disabled aria-label="No file available">
            <i class="fa-solid fa-download"></i>
          </button>
        </td>
      </tr>
    `;
  }

  const extension = getFileExtension(
    documentRecord.file_name,
    documentRecord.file_path
  );

  return `
    <tr>
      <td>
        <div class="document-info">
          <div class="document-icon">
            <i class="fa-regular fa-file-lines"></i>
          </div>
          <div>
            <strong>${escapeHtml(config.label)}</strong>
            <small title="${escapeHtml(documentRecord.file_name)}">${escapeHtml(documentRecord.file_name)}</small>
          </div>
        </div>
      </td>
      <td>
        <span class="document-type ${getFileTypeClass(extension)}">
          ${escapeHtml(extension)}
        </span>
      </td>
      <td>
        <strong class="upload-date">${escapeHtml(formatDate(documentRecord.uploaded_at))}</strong>
      </td>
      <td>
        <button
          type="button"
          class="download-btn"
          data-file-path="${escapeHtml(documentRecord.file_path)}"
          data-file-name="${escapeHtml(documentRecord.file_name)}"
          aria-label="Download ${escapeHtml(config.label)}"
          title="Download ${escapeHtml(documentRecord.file_name)}"
        >
          <i class="fa-solid fa-download"></i>
        </button>
      </td>
    </tr>
  `;
}

async function loadDocuments(appId) {
  const tableBody = getElement("documentsTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr class="documents-message-row">
      <td colspan="4">
        <div class="documents-message">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span>Loading documents...</span>
        </div>
      </td>
    </tr>
  `;

  const { data: documents, error } = await sb
    .from("application_documents")
    .select("id, doc_type, file_path, file_name, uploaded_at")
    .eq("application_id", appId)
    .order("uploaded_at", { ascending: true });

  if (error) {
    console.error("Error loading application documents:", error);
    tableBody.innerHTML = `
      <tr class="documents-message-row">
        <td colspan="4">
          <div class="documents-message error">
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>Documents could not be loaded.</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const documentsByType = new Map(
    (documents || []).map((documentRecord) => [
      documentRecord.doc_type,
      documentRecord,
    ])
  );

  tableBody.innerHTML = DOCUMENT_TYPES
    .map((config) => createDocumentRow(config, documentsByType.get(config.key)))
    .join("");

  tableBody.querySelectorAll(".download-btn[data-file-path]").forEach((button) => {
    button.addEventListener("click", () => downloadDocument(button));
  });
}

async function downloadDocument(button) {
  const filePath = button.dataset.filePath;
  const fileName = button.dataset.fileName || "document";

  if (!filePath) return;

  const icon = button.querySelector("i");
  const originalIconClass = icon ? icon.className : "";

  button.disabled = true;
  button.classList.add("loading");
  if (icon) icon.className = "fa-solid fa-spinner fa-spin";

  try {
    const { data: fileBlob, error } = await sb.storage
      .from("application-documents")
      .download(filePath);

    if (error) throw error;

    const objectUrl = URL.createObjectURL(fileBlob);
    const downloadLink = document.createElement("a");

    downloadLink.href = objectUrl;
    downloadLink.download = fileName;
    downloadLink.style.display = "none";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (error) {
    console.error("Document download failed:", error);
    alert(error?.message || "The document could not be downloaded.");
  } finally {
    button.disabled = false;
    button.classList.remove("loading");
    if (icon) icon.className = originalIconClass;
  }
}

/* ================= Training Plan + Supervisors ================= */

let allTrainingPlans = [];

async function loadTrainingPlanOptions(major) {
  const standardPlanSelect = getElement("standardPlan");
  const trainingTermInput = getElement("trainingTerm");

  if (!standardPlanSelect) return;

  const { data: plans, error } = await sb
    .from("training_plans")
    .select("id, title, major, training_term")
    .order("title", { ascending: true });

  if (error) {
    console.error("Error loading training plans:", error);
    standardPlanSelect.innerHTML =
      '<option value="" selected disabled>Training plans could not be loaded</option>';
    return;
  }

  allTrainingPlans = plans || [];

  if (allTrainingPlans.length === 0) {
    standardPlanSelect.innerHTML =
      '<option value="" selected disabled>No training plans available yet</option>';
    if (trainingTermInput) trainingTermInput.value = "";
    return;
  }

  
  const matchedPlan = allTrainingPlans.find((plan) => plan.major === major);

  standardPlanSelect.innerHTML = '<option value="" disabled>Select a training plan</option>';

  allTrainingPlans.forEach((plan) => {
    const option = document.createElement("option");
    option.value = plan.id;
    option.textContent = `${plan.title} (${plan.major})`;

    if (matchedPlan && plan.id === matchedPlan.id) {
      option.selected = true;
    }

    standardPlanSelect.appendChild(option);
  });

  if (trainingTermInput) {
    trainingTermInput.value = matchedPlan ? matchedPlan.training_term || "" : "";
  }

  standardPlanSelect.addEventListener("change", () => {
    const selectedPlan = allTrainingPlans.find(
      (plan) => plan.id === standardPlanSelect.value
    );

    if (trainingTermInput) {
      trainingTermInput.value = selectedPlan ? selectedPlan.training_term || "" : "";
    }
  });
}

async function loadSupervisors() {
  const select = getElement("trainingSupervisor");
  if (!select) return;

  const { data: supervisors, error } = await sb
    .from("supervisors")
    .select("id, full_name, department")
    .order("full_name");

  if (error) {
    console.error("Error loading supervisors:", error);
    select.innerHTML = '<option value="" selected disabled>Supervisors could not be loaded</option>';
    return;
  }

  if (!supervisors || supervisors.length === 0) {
    select.innerHTML = '<option value="" selected disabled>No supervisors available yet</option>';
    return;
  }

  select.innerHTML = '<option value="" selected disabled>Select a supervisor</option>';

  supervisors.forEach((supervisor) => {
    const option = document.createElement("option");
    option.value = supervisor.id;
    option.textContent = supervisor.department
      ? `${supervisor.full_name} — ${supervisor.department}`
      : supervisor.full_name;
    select.appendChild(option);
  });
}
async function sendApplicationEmail(status) {
  if (!currentApplication) return false;

  
  const { data, error } = await sb.functions.invoke(
    "send-application-email",
    {
      body: {
        email: currentApplication.email?.trim().toLowerCase(),
        studentName: getDisplayName(currentApplication),
        status,
      },
    }
  );

  if (error) {
    let errorDetails = error.message;

    try {
      if (error.context) {
        errorDetails = await error.context.text();
      }
    } catch (readError) {
      console.error("Could not read function error:", readError);
    }

    console.error("Edge Function error:", error);
    console.error("Edge Function details:", errorDetails);

    alert("Email error details:\n\n" + errorDetails);
    return false;
  }

  console.log("Email sent successfully:", data);
  return true;
}
/* ================= Modals + Actions ================= */

function setupActionsAndModals() {
  const openAssignModalButton = getElement("openAssignModal");
  const assignModal = getElement("assignModal");
  const closeAssignModalButton = getElement("closeAssignModal");
  const cancelAssignModalButton = getElement("cancelAssignModal");
  const assignForm = getElement("assignForm");

  const rejectButton = getElement("rejectBtn");
  const rejectModal = getElement("rejectModal");
  const cancelRejectModalButton = getElement("cancelRejectModal");
  const confirmRejectModalButton = getElement("confirmRejectModal");

  const openAssignModal = () => assignModal?.classList.add("show");
  const closeAssignModal = () => assignModal?.classList.remove("show");
  const openRejectModal = () => rejectModal?.classList.add("show");
  const closeRejectModal = () => rejectModal?.classList.remove("show");

  openAssignModalButton?.addEventListener("click", openAssignModal);
  closeAssignModalButton?.addEventListener("click", closeAssignModal);
  cancelAssignModalButton?.addEventListener("click", closeAssignModal);
  rejectButton?.addEventListener("click", openRejectModal);
  cancelRejectModalButton?.addEventListener("click", closeRejectModal);

  assignModal?.addEventListener("click", (event) => {
    if (event.target === assignModal) closeAssignModal();
  });

  rejectModal?.addEventListener("click", (event) => {
    if (event.target === rejectModal) closeRejectModal();
  });

  assignForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentApplication) return;

    const supervisorSelect = getElement("trainingSupervisor");
    const supervisorId = supervisorSelect?.value || null;

    if (!supervisorId) {
      supervisorSelect?.reportValidity();
      return;
    }

    const standardPlanSelect = getElement("standardPlan");
    const trainingPlanId = standardPlanSelect?.value || null;

    if (!trainingPlanId) {
      standardPlanSelect?.reportValidity();
      return;
    }

    const saveButton = assignForm.querySelector(".assign-save-btn");
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Saving...";
    }

    const {
      data: { user },
    } = await sb.auth.getUser();

    /* ================= Save Assignment First ================= */

const { error: assignmentError } = await sb
  .from("application_assignments")
  .upsert(
    {
      application_id: currentApplication.id,
      supervisor_id: supervisorId,
      training_plan_id: trainingPlanId,
      assigned_by: user?.id || null,
      training_term: getElement("trainingTerm")?.value || null,
    },
    { onConflict: "application_id" }
  );

if (assignmentError) {
  console.error("Failed to save assignment:", assignmentError);

  alert(
    "The supervisor and training plan could not be assigned. The application was not accepted."
  );

  if (saveButton) {
    saveButton.disabled = false;
    saveButton.textContent = "Save Assignment";
  }

  return;
}

/* ================= Accept Application ================= */

const { error: statusError } = await sb
  .from("applications")
  .update({ status: "accepted" })
  .eq("id", currentApplication.id);

if (statusError) {
  console.error("Failed to accept application:", statusError);

  alert(
    "The assignment was saved, but the application status could not be updated."
  );

  if (saveButton) {
    saveButton.disabled = false;
    saveButton.textContent = "Save Assignment";
  }

  return;
}

/* ================= Send Acceptance Email ================= */

const emailSent = await sendApplicationEmail("accepted");

    if (!emailSent) {
      alert(
        "The application was accepted successfully, but the email could not be sent."
      );
    }

    closeAssignModal();
    window.location.href = "admin-applications.html";
  });

  confirmRejectModalButton?.addEventListener("click", async () => {
    if (!currentApplication) return;

    confirmRejectModalButton.disabled = true;
    confirmRejectModalButton.textContent = "Rejecting...";

    const { error } = await sb
      .from("applications")
      .update({ status: "rejected" })
      .eq("id", currentApplication.id);

    confirmRejectModalButton.disabled = false;
    confirmRejectModalButton.textContent = "Yes, Reject";

    if (error) {
      alert("Failed to reject application: " + error.message);
      return;
    }

    const emailSent = await sendApplicationEmail("rejected");

    if (!emailSent) {
      alert(
        "The application was rejected successfully, but the email could not be sent."
      );
    }

    closeRejectModal();
    window.location.href = "admin-applications.html";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAssignModal();
      closeRejectModal();
    }
  });
}

/* ================= Initialize ================= */

document.addEventListener("DOMContentLoaded", async () => {
  const adminProfile = await requireAdmin();
  if (!adminProfile) return;

  setupSidebar();
  setupActionsAndModals();
  keepApplicationIdInTabs();

  await Promise.all([
    loadAdminName(),
    loadSupervisors(),
    loadApplication(),
  ]);
});