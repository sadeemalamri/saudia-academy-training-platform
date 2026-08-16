const tableBody =
  document.querySelector(
    ".applications-table tbody"
  );

const statNumbers =
  document.querySelectorAll(
    ".stat-card h2"
  );

const dateText =
  document.querySelector(
    ".date-box span"
  );

/* ================= Guard: admin only ================= */

requireAdmin();

async function loadAdminName() {
  const { profile } =
    await getCurrentUserProfile();

  if (!profile) return;

  const displayName =
    profile.full_name ||
    profile.email ||
    "Admin";

  const topbarName =
    document.getElementById(
      "topbarAdminName"
    );

  if (topbarName) {
    topbarName.textContent =
      displayName;
  }

  const welcomeHeading =
    document.getElementById(
      "welcomeHeading"
    );

  if (welcomeHeading) {
    welcomeHeading.textContent =
      `Welcome Back, ${displayName} 👋`;
  }
}

loadAdminName();

/* ================= Sidebar drawer ================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    const menuToggle =
      document.getElementById(
        "menuToggle"
      );

    const sidebarClose =
      document.getElementById(
        "sidebarClose"
      );

    const sidebar =
      document.getElementById(
        "sidebar"
      );

    const overlay =
      document.getElementById(
        "sidebarOverlay"
      );

    if (
      !menuToggle ||
      !sidebarClose ||
      !sidebar ||
      !overlay
    ) {
      return;
    }

    function openSidebar() {
      sidebar.classList.add(
        "active"
      );

      overlay.classList.add(
        "active"
      );
    }

    function closeSidebar() {
      sidebar.classList.remove(
        "active"
      );

      overlay.classList.remove(
        "active"
      );
    }

    menuToggle.addEventListener(
      "click",
      openSidebar
    );

    sidebarClose.addEventListener(
      "click",
      closeSidebar
    );

    overlay.addEventListener(
      "click",
      closeSidebar
    );
  }
);

/* ================= Date ================= */

function updateDate() {
  if (!dateText) return;

  const today = new Date();

  dateText.textContent =
    today.toLocaleDateString(
      "en-US",
      {
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );
}

/* ================= Stats ================= */

async function loadStats() {
  const { count: totalCount } =
    await sb
      .from("applications")
      .select("*", {
        count: "exact",
        head: true
      });

  const { count: pendingCount } =
    await sb
      .from("applications")
      .select("*", {
        count: "exact",
        head: true
      })
      .eq(
        "status",
        "pending"
      );

  const { count: acceptedCount } =
    await sb
      .from("applications")
      .select("*", {
        count: "exact",
        head: true
      })
      .eq(
        "status",
        "accepted"
      );

  if (statNumbers.length >= 3) {
    statNumbers[0].textContent =
      totalCount ?? 0;

    statNumbers[1].textContent =
      pendingCount ?? 0;

    statNumbers[2].textContent =
      acceptedCount ?? 0;
  }
}

/* ================= Helpers ================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(
  dateString
) {
  if (!dateString) return "-";

  return new Date(
    dateString
  ).toLocaleDateString(
    "en-US",
    {
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  );
}

function getDisplayName(app) {
  const profileName =
    app.profiles
      ?.full_name
      ?.trim();

  if (profileName) {
    return profileName;
  }

  return (
    `${app.first_name || ""} ${
      app.last_name || ""
    }`.trim() || "-"
  );
}

function getAnalysis(app) {
  const relation =
    app.ai_skill_analysis;

  if (
    Array.isArray(relation)
  ) {
    return relation[0] || null;
  }

  return relation || null;
}

function getMatchScore(app) {
  const analysis =
    getAnalysis(app);

  if (
    !analysis ||
    analysis.status !==
      "completed"
  ) {
    return null;
  }

  const score =
    Number(
      analysis.match_score
    );

  if (
    !Number.isFinite(score)
  ) {
    return null;
  }

  return Math.min(
    100,
    Math.max(0, score)
  );
}

function getMatchClass(score) {
  if (score === null) {
    return "match-pending";
  }

  if (score < 40) {
    return "match-low";
  }

  if (score < 70) {
    return "match-medium";
  }

  return "match-high";
}

function getMatchText(app) {
  const analysis =
    getAnalysis(app);

  const score =
    getMatchScore(app);

  if (score !== null) {
    return `${Math.round(score)}%`;
  }

  if (
    analysis?.status ===
      "failed"
  ) {
    return "Failed";
  }

  if (
    analysis?.status ===
      "processing" ||
    analysis?.status ===
      "pending"
  ) {
    return "Analyzing";
  }

  return "Pending";
}

/* ================= Recent Applications ================= */

function buildRow(app) {
  const tr =
    document.createElement("tr");

  const score =
    getMatchScore(app);

  const matchClass =
    getMatchClass(score);

  const matchText =
    getMatchText(app);

  tr.innerHTML = `
    <td>
      ${escapeHtml(
        getDisplayName(app)
      )}
    </td>

    <td>
      ${escapeHtml(
        app.major || "-"
      )}
    </td>

    <td>
      ${escapeHtml(
        formatDate(
          app.submitted_at ||
          app.created_at
        )
      )}
    </td>

    <td>
      <span class="status ${escapeHtml(
        app.status || "pending"
      )}">
        ${escapeHtml(
          app.status || "pending"
        )}
      </span>
    </td>

    <td class="match-cell">
      <span class="match-badge ${matchClass}">
        ${escapeHtml(
          matchText
        )}
      </span>
    </td>

    <td>
      <a
        href="application-overview.html?id=${encodeURIComponent(
          app.id
        )}"
        class="view-link"
      >
        View
        <i class="fa-solid fa-arrow-right"></i>
      </a>
    </td>
  `;

  return tr;
}

async function loadRecentApplications() {
  if (!tableBody) return;

  const {
    data: applications,
    error
  } = await sb
    .from("applications")
    .select(`
      id,
      first_name,
      last_name,
      major,
      status,
      submitted_at,
      created_at,
      profiles(full_name),
      ai_skill_analysis(
        match_score,
        status
      )
    `)
    .order(
      "created_at",
      {
        ascending: false
      }
    )
    .limit(8);

  if (error) {
    console.error(
      "Error loading recent applications:",
      error
    );

    tableBody.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="empty-message"
        >
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>
            Recent applications could not be loaded
          </span>
        </td>
      </tr>
    `;

    return;
  }

  if (
    !applications ||
    applications.length === 0
  ) {
    return;
  }

  tableBody.innerHTML = "";

  applications.forEach(
    (app) => {
      tableBody.appendChild(
        buildRow(app)
      );
    }
  );
}

/* ================= Init ================= */

async function initDashboard() {
  updateDate();

  await loadStats();

  await loadRecentApplications();
}

initDashboard();