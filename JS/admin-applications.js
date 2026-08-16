const rowsPerPage = 8;
let currentPage = 1;
let allApplications = [];

const tableBody =
  document.querySelector(".applications-table tbody");

const pagination =
  document.getElementById("pagination");

const programFilter =
  document.getElementById("programFilter");

const statusFilter =
  document.getElementById("statusFilter");

const sortFilter =
  document.getElementById("sortFilter");

/* ================= Guard: admin only ================= */

requireAdmin();

async function loadAdminName() {
  const { profile } =
    await getCurrentUserProfile();

  if (!profile) return;

  const topbarName =
    document.getElementById(
      "topbarAdminName"
    );

  if (topbarName) {
    topbarName.textContent =
      profile.full_name ||
      profile.email ||
      "Admin";
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

/* ================= Pagination ================= */

function getRows() {
  if (!tableBody) return [];

  return Array.from(
    tableBody.querySelectorAll("tr")
  ).filter((row) => {
    return (
      !row.querySelector(
        ".empty-state"
      ) &&
      !row.querySelector(
        ".empty-message"
      )
    );
  });
}

function showPage(page) {
  const rows = getRows();

  if (!pagination) return;

  if (rows.length === 0) {
    pagination.style.display =
      "none";

    pagination.innerHTML = "";

    return;
  }

  const totalPages =
    Math.ceil(
      rows.length / rowsPerPage
    );

  currentPage = Math.min(
    Math.max(page, 1),
    totalPages
  );

  const start =
    (currentPage - 1) *
    rowsPerPage;

  const end =
    start + rowsPerPage;

  rows.forEach(
    (row, index) => {
      const visible =
        index >= start &&
        index < end;

      row.style.display =
        visible ? "" : "none";

      row.querySelectorAll("td").forEach((td) => {
        td.style.borderBottom = "";
      });
    }
  );

  const visibleRows = rows.filter(
    (_, index) =>
      index >= start && index < end
  );

  if (visibleRows.length) {
    const lastVisibleRow =
      visibleRows[visibleRows.length - 1];

    lastVisibleRow
      .querySelectorAll("td")
      .forEach((td) => {
        td.style.borderBottom = "none";
      });
  }

  if (totalPages <= 1) {
    pagination.style.display =
      "none";

    pagination.innerHTML = "";

    return;
  }

  pagination.style.display =
    "flex";

  renderPagination(totalPages);
}

function getPaginationItems(
  totalPages
) {
  const items = [];

  if (totalPages <= 7) {
    for (
      let page = 1;
      page <= totalPages;
      page++
    ) {
      items.push(page);
    }

    return items;
  }

  if (currentPage <= 4) {
    return [
      1,
      2,
      3,
      4,
      5,
      "...",
      totalPages
    ];
  }

  if (
    currentPage >=
    totalPages - 3
  ) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages
  ];
}
function renderPagination(
  totalPages
) {
  if (!pagination) return;

  pagination.innerHTML = "";

  const prevBtn =
    document.createElement(
      "button"
    );

  prevBtn.type = "button";
  prevBtn.textContent = "<";
  prevBtn.disabled =
    currentPage === 1;

  prevBtn.setAttribute(
    "aria-label",
    "Previous page"
  );

  prevBtn.addEventListener(
    "click",
    () => {
      if (currentPage > 1) {
        showPage(
          currentPage - 1
        );
      }
    }
  );

  pagination.appendChild(
    prevBtn
  );

  const paginationItems =
    getPaginationItems(
      totalPages
    );

  paginationItems.forEach(
    (item) => {
      if (item === "...") {
        const dots =
          document.createElement(
            "span"
          );

        dots.className =
          "pagination-dots";

        dots.textContent = "...";

        pagination.appendChild(
          dots
        );

        return;
      }

      const pageBtn =
        document.createElement(
          "button"
        );

      pageBtn.type = "button";
      pageBtn.textContent = item;

      pageBtn.setAttribute(
        "aria-label",
        `Go to page ${item}`
      );

      if (
        item === currentPage
      ) {
        pageBtn.classList.add(
          "page-active"
        );

        pageBtn.setAttribute(
          "aria-current",
          "page"
        );
      }

      pageBtn.addEventListener(
        "click",
        () => {
          showPage(item);
        }
      );

      pagination.appendChild(
        pageBtn
      );
    }
  );

  const nextBtn =
    document.createElement(
      "button"
    );

  nextBtn.type = "button";
  nextBtn.textContent = ">";

  nextBtn.disabled =
    currentPage === totalPages;

  nextBtn.setAttribute(
    "aria-label",
    "Next page"
  );

  nextBtn.addEventListener(
    "click",
    () => {
      if (
        currentPage <
        totalPages
      ) {
        showPage(
          currentPage + 1
        );
      }
    }
  );

  pagination.appendChild(
    nextBtn
  );
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
    `${app.first_name || ""} ${app.last_name || ""
      }`.trim() || "-"
  );
}

/*
  Supabase may return the related analysis
  as one object or as an array.
*/
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
/* ================= Applications Filters ================= */

function populateProgramFilter(applications) {
  if (!programFilter) return;

  const programs = [
    ...new Set(
      applications
        .map((app) => app.major?.trim())
        .filter(Boolean)
    )
  ].sort((programA, programB) =>
    programA.localeCompare(programB)
  );

  programFilter.innerHTML =
    '<option value="all">All Programs</option>';

  programs.forEach((program) => {
    const option =
      document.createElement("option");

    option.value = program;
    option.textContent = program;

    programFilter.appendChild(option);
  });
}

function applyFilters() {
  let filteredApplications =
    [...allApplications];

  const selectedProgram =
    programFilter?.value || "all";

  const selectedStatus =
    statusFilter?.value || "all";

  const selectedSort =
    sortFilter?.value || "newest";

  if (selectedProgram !== "all") {
    filteredApplications =
      filteredApplications.filter(
        (app) =>
          app.major === selectedProgram
      );
  }

  if (selectedStatus !== "all") {
    filteredApplications =
      filteredApplications.filter(
        (app) =>
          app.status === selectedStatus
      );
  }

  filteredApplications.sort(
    (appA, appB) => {
      const dateA =
        new Date(
          appA.submitted_at ||
          appA.created_at ||
          0
        ).getTime();

      const dateB =
        new Date(
          appB.submitted_at ||
          appB.created_at ||
          0
        ).getTime();

      return selectedSort === "oldest"
        ? dateA - dateB
        : dateB - dateA;
    }
  );

  renderApplications(
    filteredApplications
  );
}

function renderApplications(applications) {
  if (!tableBody) return;

  if (
    !applications ||
    applications.length === 0
  ) {
    tableBody.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="empty-state"
        >
          <i class="fa-regular fa-folder-open"></i>

          <h3>No Applications Found</h3>

          <p>
            No applications match the selected filters.
          </p>
        </td>
      </tr>
    `;

    if (pagination) {
      pagination.style.display =
        "none";

      pagination.innerHTML = "";
    }

    return;
  }

  tableBody.innerHTML = "";

  applications.forEach((app) => {
    tableBody.appendChild(
      buildRow(app)
    );
  });

  currentPage = 1;

  showPage(currentPage);
}

/* ================= Build table row ================= */

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
        ${escapeHtml(matchText)}
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
/* ================= Load applications ================= */

async function loadApplications() {
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
    `);

  if (error) {
    console.error(
      "Error loading applications:",
      error
    );

    tableBody.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="empty-message"
        >
          <i class="fa-solid fa-circle-exclamation"></i>
          Applications could not be loaded.
        </td>
      </tr>
    `;

    if (pagination) {
      pagination.style.display =
        "none";
    }

    return;
  }

  if (
    !applications ||
    applications.length === 0
  ) {
    tableBody.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="empty-state"
        >
          <i class="fa-regular fa-folder-open"></i>

          <h3>No Applications Yet</h3>

          <p>
            Submitted applications will appear here once students apply.
          </p>
        </td>
      </tr>
    `;

    showPage(1);
    return;
  }

  allApplications = applications;

  populateProgramFilter(
    allApplications
  );

  applyFilters();
}

programFilter?.addEventListener(
  "change",
  applyFilters
);

statusFilter?.addEventListener(
  "change",
  applyFilters
);

sortFilter?.addEventListener(
  "change",
  applyFilters
);

loadApplications();