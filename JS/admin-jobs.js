const ROWS_PER_PAGE = 8;

let currentPage = 1;
let programs = [];

/* ================= Guard: admin only ================= */

requireAdmin();

async function loadAdminName() {
  const { profile } = await getCurrentUserProfile();
  if (!profile) return;

  const topbarName = document.getElementById("topbarAdminName");
  if (topbarName) topbarName.textContent = profile.full_name || profile.email;
}

loadAdminName();

const tableBody =
  document.getElementById("programTableBody");

const pagination =
  document.getElementById("pagination");

const tableFooter =
  document.getElementById("tableFooter");

const programModal =
  document.getElementById("programModal");

const closeProgramModal =
  document.getElementById("closeProgramModal");

const closeModalButton =
  document.getElementById("closeModalButton");

const modalProgramTitle =
  document.getElementById("modalProgramTitle");

const modalTrainingTerm =
  document.getElementById("modalTrainingTerm");

const modalOpenings =
  document.getElementById("modalOpenings");

const modalSkills =
  document.getElementById("modalSkills");

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

/* ================= Escape HTML ================= */

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ================= Empty State ================= */

function renderEmptyState() {
  tableBody.innerHTML = `
    <tr class="empty-row">

      <td colspan="5">

        <div class="empty-state">

          <i class="fa-regular fa-folder-open"></i>

          <h3>No Program Requirements Yet</h3>

          <p>
            Program requirements added by the admin will appear here.
          </p>

        </div>

      </td>

    </tr>
  `;

  pagination.innerHTML = "";
  tableFooter.style.display = "none";
}

/* ================= Skills Preview ================= */

function createSkillsPreview(skills) {
  if (
    !Array.isArray(skills) ||
    skills.length === 0
  ) {
    return `
      <span class="more-skills">
        No skills added
      </span>
    `;
  }

  const visibleSkills =
    skills.slice(0, 2);

  const skillsHTML =
    visibleSkills
      .map(
        (skill) => `
          <span class="skill-chip">
            ${escapeHTML(skill)}
          </span>
        `
      )
      .join("");

  const remainingSkills =
    skills.length -
    visibleSkills.length;

  const remainingHTML =
    remainingSkills > 0
      ? `
        <span class="more-skills">
          +${remainingSkills} more
        </span>
      `
      : "";

  return skillsHTML + remainingHTML;
}

/* ================= Render ================= */

function renderPrograms() {
  if (programs.length === 0) {
    renderEmptyState();
    return;
  }

  const totalPages =
    Math.ceil(
      programs.length / ROWS_PER_PAGE
    );

  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const startIndex =
    (currentPage - 1) *
    ROWS_PER_PAGE;

  const currentPrograms =
    programs.slice(
      startIndex,
      startIndex + ROWS_PER_PAGE
    );

  tableBody.innerHTML =
    currentPrograms
      .map(
        (program) => `
          <tr>

            <td>
              <div class="program-name">
                <h3>
                  ${escapeHTML(program.title)}
                </h3>
              </div>
            </td>

            <td>
              ${escapeHTML(program.trainingTerm)}
            </td>

            <td>
              ${escapeHTML(program.openings)}
            </td>

            <td>
              <div class="skills-preview">
                ${createSkillsPreview(program.skills)}
              </div>
            </td>

            <td class="action-column">

              <div class="action-menu-wrapper">

                <button
                  type="button"
                  class="more-action-btn"
                  aria-label="Open actions"
                >
                  <i class="fa-solid fa-ellipsis"></i>
                </button>

                <div class="action-dropdown">

                  <button
                    type="button"
                    class="dropdown-action view-program-btn"
                    data-id="${escapeHTML(program.id)}"
                  >
                    <i class="fa-regular fa-eye"></i>
                    View
                  </button>

                  <button
                    type="button"
                    class="dropdown-action edit-program-btn"
                    data-id="${escapeHTML(program.id)}"
                  >
                    <i class="fa-regular fa-pen-to-square"></i>
                    Edit
                  </button>

                  <button
                    type="button"
                    class="dropdown-action delete-option delete-program-btn"
                    data-id="${escapeHTML(program.id)}"
                  >
                    <i class="fa-regular fa-trash-can"></i>
                    Delete
                  </button>

                </div>

              </div>

            </td>

          </tr>
        `
      )
      .join("");

  renderPagination(totalPages);
}

/* ================= Pagination ================= */

function renderPagination(totalPages) {
  pagination.innerHTML = "";

  if (totalPages <= 1) {
    tableFooter.style.display = "none";
    return;
  }

  tableFooter.style.display = "flex";

  const prevButton =
    document.createElement("button");

  prevButton.type = "button";
  prevButton.textContent = "<";
  prevButton.disabled = currentPage === 1;

  prevButton.addEventListener(
    "click",
    () => {
      if (currentPage > 1) {
        currentPage--;
        renderPrograms();
      }
    }
  );

  pagination.appendChild(prevButton);

  for (
    let pageNumber = 1;
    pageNumber <= totalPages;
    pageNumber++
  ) {
    const button =
      document.createElement("button");

    button.type = "button";
    button.textContent =
      pageNumber;

    if (pageNumber === currentPage) {
      button.classList.add(
        "page-active"
      );
    }

    button.addEventListener(
      "click",
      () => {
        currentPage = pageNumber;
        renderPrograms();
      }
    );

    pagination.appendChild(button);
  }

  const nextButton =
    document.createElement("button");

  nextButton.type = "button";
  nextButton.textContent = ">";
  nextButton.disabled = currentPage === totalPages;

  nextButton.addEventListener(
    "click",
    () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderPrograms();
      }
    }
  );

  pagination.appendChild(nextButton);
}

/* ================= Find ================= */

function findProgramById(programId) {
  return programs.find(
    (program) =>
      String(program.id) ===
      String(programId)
  );
}

/* ================= Modal ================= */

function openProgramDetails(programId) {
  const selectedProgram =
    findProgramById(programId);

  if (!selectedProgram) {
    return;
  }

  modalProgramTitle.textContent =
    selectedProgram.title || "—";

  modalTrainingTerm.textContent =
    selectedProgram.trainingTerm || "—";

  modalOpenings.textContent =
    selectedProgram.openings ?? "—";

  modalSkills.innerHTML = "";

  const selectedSkills =
    Array.isArray(
      selectedProgram.skills
    )
      ? selectedProgram.skills
      : [];

  if (selectedSkills.length === 0) {
    modalSkills.innerHTML = `
      <span class="more-skills">
        No skills added
      </span>
    `;
  } else {
    selectedSkills.forEach(
      (skill) => {
        const element =
          document.createElement(
            "span"
          );

        element.className =
          "skill-chip";

        element.textContent =
          skill;

        modalSkills.appendChild(
          element
        );
      }
    );
  }

  programModal.classList.add(
    "show"
  );
}

function closeModal() {
  programModal.classList.remove(
    "show"
  );
}

/* ================= Actions ================= */

function closeAllActionMenus() {
  document
    .querySelectorAll(
      ".action-dropdown.show"
    )
    .forEach((menu) => {
      menu.classList.remove("show");
    });
}

function toggleActionMenu(button) {
  const wrapper =
    button.closest(
      ".action-menu-wrapper"
    );

  const dropdown =
    wrapper.querySelector(
      ".action-dropdown"
    );

  const isOpen =
    dropdown.classList.contains(
      "show"
    );

  closeAllActionMenus();

  if (!isOpen) {
    dropdown.classList.add("show");
  }
}

async function deleteProgram(programId) {
  const selectedProgram =
    findProgramById(programId);

  if (!selectedProgram) {
    return;
  }

  const confirmed =
    window.confirm(
      `Are you sure you want to delete "${selectedProgram.title}"?`
    );

  if (!confirmed) {
    return;
  }

  const { error } = await sb
    .from("program_requirements")
    .delete()
    .eq("id", programId);

  if (error) {
    alert("Failed to delete: " + error.message);
    return;
  }

  programs = programs.filter(
    (program) =>
      String(program.id) !==
      String(programId)
  );

  renderPrograms();
}

/* ================= Table Events ================= */

tableBody.addEventListener(
  "click",
  (event) => {
    const moreButton =
      event.target.closest(
        ".more-action-btn"
      );

    const viewButton =
      event.target.closest(
        ".view-program-btn"
      );

    const editButton =
      event.target.closest(
        ".edit-program-btn"
      );

    const deleteButton =
      event.target.closest(
        ".delete-program-btn"
      );

    if (moreButton) {
      event.stopPropagation();
      toggleActionMenu(moreButton);
      return;
    }

    if (viewButton) {
      event.stopPropagation();
      closeAllActionMenus();

      openProgramDetails(
        viewButton.dataset.id
      );

      return;
    }

    if (editButton) {
      event.stopPropagation();
      closeAllActionMenus();

      window.location.href =
        `add-program-requirement.html?id=${editButton.dataset.id}`;

      return;
    }

    if (deleteButton) {
      event.stopPropagation();
      closeAllActionMenus();

      deleteProgram(
        deleteButton.dataset.id
      );
    }
  }
);

document.addEventListener(
  "click",
  closeAllActionMenus
);

/* ================= Modal Events ================= */

closeProgramModal.addEventListener(
  "click",
  closeModal
);

closeModalButton.addEventListener(
  "click",
  closeModal
);

programModal.addEventListener(
  "click",
  (event) => {
    if (event.target === programModal) {
      closeModal();
    }
  }
);

document.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Escape") {
      closeAllActionMenus();
      closeModal();
    }
  }
);

/* ================= Initialize ================= */

async function loadPrograms() {
  const { data, error } = await sb
    .from("program_requirements")
    .select("id, title, openings, training_term, skills")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading program requirements:", error);
    programs = [];
  } else {
    programs = (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      openings: row.openings,
      trainingTerm: row.training_term,
      skills: row.skills || [],
    }));
  }

  renderPrograms();
}

loadPrograms();