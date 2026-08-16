/* ================= Guard: must be logged in ================= */

requireAuth();

/* ================= Sidebar drawer ================= */

document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const sidebarClose = document.getElementById("sidebarClose");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if (!menuToggle || !sidebarClose || !sidebar || !overlay) return;

  function openSidebar() {
    sidebar.classList.add("active");
    overlay.classList.add("active");
  }

  function closeSidebar() {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
  }

  menuToggle.addEventListener("click", openSidebar);
  sidebarClose.addEventListener("click", closeSidebar);
  overlay.addEventListener("click", closeSidebar);
});

/* ================= Notifications ================= */

const notificationBtn = document.getElementById("notificationBtn");
const notificationDropdown = document.getElementById("notificationDropdown");
const notificationBadge = document.getElementById("notificationBadge");
const notificationList = document.getElementById("notificationList");
const unreadText = document.getElementById("unreadText");

let currentNotificationKey = null;

function updateNotificationCount(count) {
  if (notificationBadge) {
    notificationBadge.textContent = count;
    notificationBadge.classList.toggle("hidden", count === 0);
  }

  if (unreadText) {
    unreadText.textContent =
      count === 1
        ? "1 unread notification"
        : "No unread notifications";
  }
}

function renderStatusNotification(application) {
  if (!notificationList) return;

  if (
    !application ||
    !["accepted", "rejected"].includes(application.status)
  ) {
    notificationList.innerHTML = `
      <p class="notification-empty">
        No notifications yet.
      </p>
    `;

    updateNotificationCount(0);
    currentNotificationKey = null;
    return;
  }

  const isAccepted = application.status === "accepted";

  const title = isAccepted
    ? "Application Accepted"
    : "Application Rejected";

  const message = isAccepted
    ? "Congratulations! Your application has been accepted."
    : "Unfortunately, your application was not accepted.";

  const icon = isAccepted
    ? "fa-regular fa-circle-check"
    : "fa-regular fa-circle-xmark";

  currentNotificationKey =
    `application-notification-${application.id}-${application.status}`;

  const isRead =
    localStorage.getItem(currentNotificationKey) === "read";

  notificationList.innerHTML = `
    <button
      class="notification-item ${isRead ? "" : "unread"}"
      type="button"
      id="statusNotificationItem"
    >
      <div class="notification-icon">
        <i class="${icon}"></i>
      </div>

      <div class="notification-content">
        <strong>${title}</strong>

        <p>${message}</p>

        <span>Application status updated</span>
      </div>

      ${
        isRead
          ? ""
          : '<span class="unread-dot"></span>'
      }
    </button>
  `;

  updateNotificationCount(isRead ? 0 : 1);
}

function markStatusNotificationAsRead() {
  if (!currentNotificationKey) return;

  localStorage.setItem(currentNotificationKey, "read");

  const notificationItem =
    document.getElementById("statusNotificationItem");

  notificationItem?.classList.remove("unread");

  notificationItem
    ?.querySelector(".unread-dot")
    ?.remove();

  updateNotificationCount(0);
}

if (notificationBtn && notificationDropdown) {
  notificationBtn.addEventListener("click", function (event) {
    event.stopPropagation();

    const isOpening =
      !notificationDropdown.classList.contains("show");

    notificationDropdown.classList.toggle("show");

    if (isOpening) {
      markStatusNotificationAsRead();
    }
  });

  notificationDropdown.addEventListener("click", function (event) {
    event.stopPropagation();
  });

  document.addEventListener("click", function () {
    notificationDropdown.classList.remove("show");
  });
}

async function loadStudentNotification() {
  try {
    const {
      data: { user },
      error: userError
    } = await sb.auth.getUser();

    if (userError || !user) {
      renderStatusNotification(null);
      return;
    }

    const {
      data: application,
      error: applicationError
    } = await sb
      .from("applications")
      .select("id, status")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (applicationError) {
      console.error("Error loading notification:", applicationError);
      renderStatusNotification(null);
      return;
    }

    renderStatusNotification(application);

  } catch (error) {
    console.error("Notification loading error:", error);
    renderStatusNotification(null);
  }
}

const TRAINING_PLANS_BUCKET = "training-plans";

const notAssignedState = document.getElementById("notAssignedState");
const planContent = document.getElementById("planContent");

function showNotAssigned() {
  notAssignedState.style.display = "block";
  planContent.style.display = "none";
}

/* ================= Status badge — same logic as before, just
   applied to rows built dynamically instead of hardcoded ones ================= */

function applyStatusBadge(row) {
  const badge = row.querySelector(".status-badge");
  if (!badge) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(row.dataset.start);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  badge.classList.remove("light-blue", "completed", "in-progress");

  if (today > endDate) {
    badge.textContent = "Completed";
    badge.classList.add("completed");
  } else if (today >= startDate && today <= endDate) {
    badge.textContent = "In Progress";
    badge.classList.add("in-progress");
    row.classList.add("current-week");
  } else {
    badge.textContent = "Upcoming";
    badge.classList.add("light-blue");
  }
}

function formatDisplayDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ================= Load everything ================= */

async function loadYourPlan() {
  const { profile } = await getCurrentUserProfile();

  const topbarUserName = document.getElementById("topbarUserName");
  if (topbarUserName && profile) {
    topbarUserName.textContent = profile.full_name || profile.email;
  }

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  // 1) Find this student's accepted application
  const { data: application, error: appError } = await sb
    .from("applications")
    .select("id")
    .eq("student_id", user.id)
    .eq("status", "accepted")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (appError) {
    console.error("Error loading application:", appError);
  }

  if (!application) {
    showNotAssigned();
    return;
  }

  // 2) Find the supervisor/plan assignment for that application
  const { data: assignment, error: assignError } = await sb
    .from("application_assignments")
    .select("supervisor_id, training_plan_id, training_term")
    .eq("application_id", application.id)
    .maybeSingle();

  if (assignError) {
    console.error("Error loading assignment:", assignError);
  }

  if (!assignment) {
    showNotAssigned();
    return;
  }

  // Everything found — show the real content
  notAssignedState.style.display = "none";
  planContent.style.display = "block";

  // 3) Supervisor info
  if (assignment.supervisor_id) {
    const { data: supervisor, error: supervisorError } = await sb
      .from("supervisors")
      .select("*")
      .eq("id", assignment.supervisor_id)
      .single();

    if (supervisorError) {
      console.error("Error loading supervisor:", supervisorError);
    } else if (supervisor) {
      document.getElementById("supervisorName").textContent = supervisor.full_name || "-";
      document.getElementById("supervisorDepartment").textContent = supervisor.department || "-";
      document.getElementById("supervisorEmail").textContent = supervisor.email || "-";
      document.getElementById("supervisorPhone").textContent = supervisor.phone || "-";
      document.getElementById("supervisorAvailability").textContent = supervisor.availability || "-";

      const emailBtn = document.getElementById("supervisorEmailBtn");
      const callBtn = document.getElementById("supervisorCallBtn");

      if (supervisor.email) emailBtn.href = `mailto:${supervisor.email}`;
      if (supervisor.phone) callBtn.href = `tel:${supervisor.phone}`;
    }
  }

  // 4) Training plan info + weekly schedule
  let plan = null;

  if (assignment.training_plan_id) {
    const { data: planData, error: planError } = await sb
      .from("training_plans")
      .select("*")
      .eq("id", assignment.training_plan_id)
      .single();

    if (planError) {
      console.error("Error loading training plan:", planError);
    } else {
      plan = planData;
    }
  }

  const downloadBtn = document.getElementById("downloadPlanBtn");

  if (plan) {
    document.getElementById("planTitleValue").textContent = plan.title || "-";
    document.getElementById("planTermValue").textContent =
      assignment.training_term || plan.training_term || "-";
    document.getElementById("planHoursValue").textContent =
      plan.total_hours ? `${plan.total_hours} Hours` : "-";

    if (plan.pdf_path) {
      downloadBtn.disabled = false;
      downloadBtn.addEventListener("click", () => downloadPlanPdf(plan));
    } else {
      downloadBtn.disabled = true;
      downloadBtn.title = "No PDF uploaded for this plan yet";
    }
  } else {
    document.getElementById("planTitleValue").textContent = "Not assigned yet";
    document.getElementById("planTermValue").textContent = assignment.training_term || "-";
    document.getElementById("planHoursValue").textContent = "-";
    downloadBtn.disabled = true;
  }

}

/* ================= Weekly schedule ================= */

async function loadSchedule(trainingPlanId) {
  const scheduleBody = document.getElementById("scheduleBody");

  if (!trainingPlanId) {
    scheduleBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;color:#888;padding:20px;">
          No weekly schedule available yet.
        </td>
      </tr>
    `;
    return;
  }

  const { data: weeks, error } = await sb
    .from("training_plan_weeks")
    .select("*")
    .eq("training_plan_id", trainingPlanId)
    .order("week_number", { ascending: true });

  if (error) {
    console.error("Error loading training plan weeks:", error);
  }

  if (!weeks || weeks.length === 0) {
    scheduleBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;color:#888;padding:20px;">
          No weekly schedule has been added for this plan yet.
        </td>
      </tr>
    `;
    return;
  }

  scheduleBody.innerHTML = "";

  weeks.forEach((week) => {
    const row = document.createElement("tr");
    row.dataset.start = week.start_date;

    row.innerHTML = `
      <td>${week.week_number}</td>
      <td>${week.description}</td>
      <td>${formatDisplayDate(week.start_date)}</td>
      <td>${week.hours} Hours</td>
      <td><span class="status-badge"></span></td>
    `;

    scheduleBody.appendChild(row);
    applyStatusBadge(row);
  });
}

/* ================= Download PDF ================= */

async function downloadPlanPdf(plan) {
  const downloadBtn = document.getElementById("downloadPlanBtn");
  const originalHtml = downloadBtn.innerHTML;

  downloadBtn.disabled = true;
  downloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Downloading...';

  try {
    const { data: fileBlob, error } = await sb.storage
      .from(TRAINING_PLANS_BUCKET)
      .download(plan.pdf_path);

    if (error) throw error;

    const objectUrl = URL.createObjectURL(fileBlob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = `${(plan.title || "training-plan").replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (error) {
    console.error("Training plan download failed:", error);
    alert(error?.message || "The training plan PDF could not be downloaded.");
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = originalHtml;
  }
}

loadYourPlan();
loadStudentNotification();