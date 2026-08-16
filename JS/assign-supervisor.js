/* ================= Load Admin Name ================= */

async function loadAdminName() {
  try {
    const { profile } = await getCurrentUserProfile();

    if (!profile) return;

    const displayName =
      profile.full_name ||
      profile.email ||
      "Admin";

    const topbarAdminName =
      document.getElementById("topbarAdminName");

    if (topbarAdminName) {
      topbarAdminName.textContent = displayName;
    }
  } catch (error) {
    console.error("Error loading admin name:", error);
  }
}

/* ================= Sidebar ================= */

const menuToggle =
  document.getElementById("menuToggle");

const sidebarClose =
  document.getElementById("sidebarClose");

const sidebar =
  document.getElementById("sidebar");

const sidebarOverlay =
  document.getElementById("sidebarOverlay");

if (
  menuToggle &&
  sidebarClose &&
  sidebar &&
  sidebarOverlay
) {
  menuToggle.addEventListener("click", () => {
    sidebar.classList.add("active");
    sidebarOverlay.classList.add("active");
  });

  sidebarClose.addEventListener("click", () => {
    sidebar.classList.remove("active");
    sidebarOverlay.classList.remove("active");
  });

  sidebarOverlay.addEventListener("click", () => {
    sidebar.classList.remove("active");
    sidebarOverlay.classList.remove("active");
  });
}

/* ================= Modal Elements ================= */

const openSupervisorModal =
  document.getElementById("openSupervisorModal");

const supervisorModal =
  document.getElementById("supervisorModal");

const closeSupervisorModal =
  document.getElementById("closeSupervisorModal");

const cancelSupervisorModal =
  document.getElementById("cancelSupervisorModal");

const supervisorForm =
  document.getElementById("supervisorForm");

const supervisorName =
  document.getElementById("supervisorName");

const department =
  document.getElementById("department");

const supervisorEmail =
  document.getElementById("supervisorEmail");

const supervisorPhone =
  document.getElementById("supervisorPhone");

const availability =
  document.getElementById("availability");

const officeLocation =
  document.getElementById("officeLocation");

const supervisorsTableBody =
  document.querySelector("tbody");

const pagination =
  document.getElementById("pagination");

const rowsPerPage = 8;
let currentPage = 1;

const modalTitle =
  document.querySelector(".modal-header h2");

const saveBtn =
  document.querySelector(".save-btn");

const supervisorFields = [
  supervisorName,
  department,
  supervisorEmail,
  supervisorPhone,
  availability,
  officeLocation
];

let editingSupervisorId = null;
let isViewMode = false;

/* ================= Helpers ================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fillSupervisorForm(supervisor) {
  supervisorName.value =
    supervisor.full_name || "";

  department.value =
    supervisor.department || "";

  supervisorEmail.value =
    supervisor.email || "";

  supervisorPhone.value =
    supervisor.phone || "";

  availability.value =
    supervisor.availability || "";

  officeLocation.value =
    supervisor.office_location || "";
}

function setFormMode(mode) {
  isViewMode = mode === "view";

  supervisorFields.forEach((field) => {
    if (field) {
      field.readOnly = isViewMode;
    }
  });

  if (isViewMode) {
    saveBtn.style.display = "none";
    cancelSupervisorModal.textContent = "Close";
  } else {
    saveBtn.style.display = "flex";
    cancelSupervisorModal.textContent = "Cancel";
  }
}

/* ================= Modal Functions ================= */

function openAddModal() {
  editingSupervisorId = null;

  setFormMode("edit");

  supervisorForm.reset();

  modalTitle.textContent = "Add Supervisor";

  saveBtn.innerHTML = `
    <i class="fa-solid fa-check"></i>
    <span>Save Supervisor</span>
  `;

  supervisorModal.classList.add("show-modal");
}

function openViewModal(supervisor) {
  editingSupervisorId = null;

  fillSupervisorForm(supervisor);

  setFormMode("view");

  modalTitle.textContent = "Supervisor Details";

  supervisorModal.classList.add("show-modal");
}

function openEditModal(supervisor) {
  editingSupervisorId = supervisor.id;

  fillSupervisorForm(supervisor);

  setFormMode("edit");

  modalTitle.textContent = "Edit Supervisor";

  saveBtn.innerHTML = `
    <i class="fa-solid fa-check"></i>
    <span>Update Supervisor</span>
  `;

  supervisorModal.classList.add("show-modal");
}

function closeModal() {
  supervisorModal.classList.remove("show-modal");

  supervisorForm.reset();

  editingSupervisorId = null;

  setFormMode("edit");

  modalTitle.textContent = "Add Supervisor";

  saveBtn.innerHTML = `
    <i class="fa-solid fa-check"></i>
    <span>Save Supervisor</span>
  `;
}

if (openSupervisorModal) {
  openSupervisorModal.addEventListener(
    "click",
    openAddModal
  );
}

if (closeSupervisorModal) {
  closeSupervisorModal.addEventListener(
    "click",
    closeModal
  );
}

if (cancelSupervisorModal) {
  cancelSupervisorModal.addEventListener(
    "click",
    closeModal
  );
}

if (supervisorModal) {
  supervisorModal.addEventListener(
    "click",
    (event) => {
      if (event.target === supervisorModal) {
        closeModal();
      }
    }
  );
}

/* ================= Action Menu ================= */

function closeAllActionMenus() {
  document
    .querySelectorAll(".action-dropdown.show")
    .forEach((menu) => {
      menu.classList.remove("show");

      const wrapper =
        menu.closest(".action-menu-wrapper");

      if (wrapper) {
        wrapper.classList.remove("menu-open");
      }
    });
}

function toggleActionMenu(button) {
  const wrapper =
    button.closest(".action-menu-wrapper");

  if (!wrapper) return;

  const dropdown =
    wrapper.querySelector(".action-dropdown");

  if (!dropdown) return;

  const isOpen =
    dropdown.classList.contains("show");

  closeAllActionMenus();

  if (!isOpen) {
    dropdown.classList.add("show");
    wrapper.classList.add("menu-open");
  }
}

document.addEventListener(
  "click",
  closeAllActionMenus
);

/* ================= Load Supervisors ================= */

async function loadSupervisors() {
  if (!window.sb) {
    alert("Supabase client is not loaded.");
    return;
  }

  const {
    data: supervisors,
    error
  } = await sb
    .from("supervisors")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    console.error(
      "Error loading supervisors:",
      error
    );

    alert(
      "Failed to load supervisors: " +
      error.message
    );

    return;
  }

  const assignedCounts =
    await getAssignedStudentsCount();

  renderSupervisors(
    supervisors || [],
    assignedCounts
  );
}

/* ================= Count Assigned Students ================= */

async function getAssignedStudentsCount() {
  const counts = {};

  const { data, error } = await sb
    .from("application_assignments")
    .select("supervisor_id");

  if (error) {
    console.warn(
      "Could not load assigned students count:",
      error.message
    );

    return counts;
  }

  (data || []).forEach((item) => {
    if (!item.supervisor_id) return;

    counts[item.supervisor_id] =
      (counts[item.supervisor_id] || 0) + 1;
  });

  return counts;
}

/* ================= Render Supervisors Table ================= */

function renderSupervisors(
  supervisors,
  assignedCounts
) {
  if (!supervisorsTableBody) return;

  if (supervisors.length === 0) {
    supervisorsTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">

          <div class="empty-state">

            <i class="fa-regular fa-folder-open"></i>

            <h3>No Supervisors Added Yet</h3>

            <p>
              Once you add supervisors,
              they will appear in this table.
            </p>

          </div>

        </td>
      </tr>
    `;

    if (pagination) pagination.style.display = "none";

    return;
  }

  supervisorsTableBody.innerHTML = "";

  supervisors.forEach((supervisor) => {
    const assignedStudents =
      assignedCounts[supervisor.id] || 0;

    const row =
      document.createElement("tr");

    row.innerHTML = `
      <td>
        ${escapeHTML(
          supervisor.full_name || "-"
        )}
      </td>

      <td>
        ${escapeHTML(
          supervisor.department || "-"
        )}
      </td>

      <td>
        ${escapeHTML(
          supervisor.email || "-"
        )}
      </td>

      <td>
        ${escapeHTML(
          supervisor.phone || "-"
        )}
      </td>

      <td>
        ${assignedStudents}
      </td>

      <td class="action-column">

        <div class="action-menu-wrapper">

          <button
            type="button"
            class="more-action-btn"
            aria-label="Open actions"
            title="Actions"
          >
            <i class="fa-solid fa-ellipsis"></i>
          </button>

          <div class="action-dropdown">

            <button
              type="button"
              class="dropdown-action view-supervisor-btn"
            >
              <i class="fa-regular fa-eye"></i>
              <span>View</span>
            </button>

            <button
              type="button"
              class="dropdown-action edit-supervisor-btn"
            >
              <i class="fa-regular fa-pen-to-square"></i>
              <span>Edit</span>
            </button>

            <button
              type="button"
              class="dropdown-action delete-option delete-supervisor-btn"
              ${
                assignedStudents > 0
                  ? "disabled"
                  : ""
              }
              title="${
                assignedStudents > 0
                  ? "Reassign students before deleting this supervisor"
                  : "Delete Supervisor"
              }"
            >
              <i class="fa-regular fa-trash-can"></i>
              <span>Delete</span>
            </button>

          </div>

        </div>

      </td>
    `;

    const moreActionBtn =
      row.querySelector(".more-action-btn");

    const viewSupervisorBtn =
      row.querySelector(
        ".view-supervisor-btn"
      );

    const editSupervisorBtn =
      row.querySelector(
        ".edit-supervisor-btn"
      );

    const deleteSupervisorBtn =
      row.querySelector(
        ".delete-supervisor-btn"
      );

    moreActionBtn.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();

        toggleActionMenu(moreActionBtn);
      }
    );

    viewSupervisorBtn.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();

        closeAllActionMenus();

        openViewModal(supervisor);
      }
    );

    editSupervisorBtn.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();

        closeAllActionMenus();

        openEditModal(supervisor);
      }
    );

    deleteSupervisorBtn.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();

        closeAllActionMenus();

        deleteSupervisor(
          supervisor.id,
          assignedStudents
        );
      }
    );

    supervisorsTableBody.appendChild(row);
  });

  currentPage = 1;
  showPage(currentPage);
}

/* ================= Pagination ================= */

function getSupervisorRows() {
  if (!supervisorsTableBody) return [];

  return Array.from(
    supervisorsTableBody.querySelectorAll("tr")
  ).filter((row) => !row.classList.contains("empty-row"));
}

function showPage(page) {
  const rows = getSupervisorRows();

  if (!pagination) return;

  if (rows.length === 0) {
    pagination.style.display = "none";
    return;
  }

  const totalPages = Math.ceil(rows.length / rowsPerPage);

  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  pagination.style.display = rows.length > rowsPerPage ? "flex" : "none";

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

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  pagination.innerHTML = "";

  if (totalPages <= 1) return;

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.textContent = "<";
  prevBtn.disabled = currentPage === 1;

  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      showPage(currentPage);
    }
  });

  pagination.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement("button");
    pageBtn.type = "button";
    pageBtn.textContent = i;

    if (i === currentPage) {
      pageBtn.classList.add("page-active");
    }

    pageBtn.addEventListener("click", () => {
      currentPage = i;
      showPage(currentPage);
    });

    pagination.appendChild(pageBtn);
  }

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.textContent = ">";
  nextBtn.disabled = currentPage === totalPages;

  nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      showPage(currentPage);
    }
  });

  pagination.appendChild(nextBtn);
}

/* ================= Add / Update Supervisor ================= */

supervisorForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (isViewMode) return;

    if (!supervisorForm.checkValidity()) {
      supervisorForm.reportValidity();
      return;
    }

    const supervisorData = {
      full_name:
        supervisorName.value.trim(),

      department:
        department.value.trim(),

      email:
        supervisorEmail.value.trim(),

      phone:
        supervisorPhone.value.trim() ||
        null,

      availability:
        availability.value.trim() ||
        null,

      office_location:
        officeLocation.value.trim() ||
        null
    };

    saveBtn.disabled = true;

    saveBtn.innerHTML = `
      <span>Saving...</span>
    `;

    let result;

    if (editingSupervisorId) {
      result = await sb
        .from("supervisors")
        .update(supervisorData)
        .eq(
          "id",
          editingSupervisorId
        );
    } else {
      result = await sb
        .from("supervisors")
        .insert([supervisorData]);
    }

    saveBtn.disabled = false;

    saveBtn.innerHTML =
      editingSupervisorId
        ? `
          <i class="fa-solid fa-check"></i>
          <span>Update Supervisor</span>
        `
        : `
          <i class="fa-solid fa-check"></i>
          <span>Save Supervisor</span>
        `;

    if (result.error) {
      console.error(
        "Error saving supervisor:",
        result.error
      );

      if (result.error.code === "23505") {
        alert(
          "This supervisor email already exists."
        );
      } else {
        alert(
          "Failed to save supervisor: " +
          result.error.message
        );
      }

      return;
    }

    closeModal();

    await loadSupervisors();
  }
);

/* ================= Delete Supervisor ================= */

async function deleteSupervisor(
  supervisorId,
  assignedStudents
) {
  if (assignedStudents > 0) {
    alert(
      "This supervisor is assigned to students. " +
      "Reassign students before deleting."
    );

    return;
  }

  const confirmed = confirm(
    "Are you sure you want to delete this supervisor?"
  );

  if (!confirmed) return;

  const { error } = await sb
    .from("supervisors")
    .delete()
    .eq("id", supervisorId);

  if (error) {
    console.error(
      "Error deleting supervisor:",
      error
    );

    alert(
      "Failed to delete supervisor: " +
      error.message
    );

    return;
  }

  await loadSupervisors();
}

/* ================= Keyboard ================= */

document.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Escape") {
      closeAllActionMenus();

      if (
        supervisorModal.classList.contains(
          "show-modal"
        )
      ) {
        closeModal();
      }
    }
  }
);

/* ================= Start ================= */

loadAdminName();
loadSupervisors();