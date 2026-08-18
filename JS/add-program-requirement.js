const programForm =
  document.getElementById("programForm");

/* ================= Guard: admin only ================= */

requireAdmin();

async function loadAdminName() {
  const { profile } = await getCurrentUserProfile();
  if (!profile) return;

  const topbarName = document.getElementById("topbarAdminName");
  if (topbarName) topbarName.textContent = profile.full_name || profile.email;
}

loadAdminName();

/* ================= Edit mode ================= */

const urlParams = new URLSearchParams(window.location.search);
const editingProgramId = urlParams.get("id");

const programFormError = document.getElementById("programFormError");

function showProgramFormError(message) {
  programFormError.textContent = message;
  programFormError.style.display = "block";
}

const programTitle =
  document.getElementById("programTitle");

const otherProgramTitleField =
  document.getElementById("otherProgramTitleField");

const otherProgramTitle =
  document.getElementById("otherProgramTitle");

const numberOfOpenings =
  document.getElementById("numberOfOpenings");

const trainingSeason =
  document.getElementById("trainingSeason");

const trainingYear =
  document.getElementById("trainingYear");

const addSkillButton =
  document.getElementById("addSkillBtn");

const skillsContainer =
  document.getElementById("skillsContainer");

const skillsCount =
  document.getElementById("skillsCount");

const currentYear =
  new Date().getFullYear();



const englishTextPattern =
  /^[A-Za-z][A-Za-z0-9\s+#.&/()'-]*$/;

/* ================= Skills ================= */

function createSkillRow(skillValue = "") {
  const skillRow =
    document.createElement("div");

  skillRow.className = "skill-row";

  const skillInput =
    document.createElement("input");

  skillInput.type = "text";
  skillInput.className = "skill-input";
  skillInput.placeholder = "Enter required skill";
  skillInput.autocomplete = "off";
  skillInput.maxLength = 50;
  skillInput.required = true;
  skillInput.value = skillValue;

  const deleteButton =
    document.createElement("button");

  deleteButton.type = "button";
  deleteButton.className =
    "delete-skill-btn";

  deleteButton.setAttribute(
    "aria-label",
    "Delete skill"
  );

  deleteButton.innerHTML = `
    <i class="fa-regular fa-trash-can"></i>
  `;

  skillRow.appendChild(skillInput);
  skillRow.appendChild(deleteButton);

  skillsContainer.appendChild(skillRow);

  skillInput.addEventListener(
    "input",
    () => {
      const value =
        skillInput.value.trim();

      if (value === "" || englishTextPattern.test(value)) {
        skillInput.setCustomValidity("");
      } else {
        skillInput.setCustomValidity(
          "Skill must start with a letter and contain English letters only."
        );
        skillInput.reportValidity();
      }

      updateSkillsCount();
    }
  );

  updateSkillsCount();

  if (skillValue === "") {
    skillInput.focus();
  }
}

function getSkillInputs() {
  return Array.from(
    skillsContainer.querySelectorAll(
      ".skill-input"
    )
  );
}

function getSkills() {
  return getSkillInputs()
    .map((input) => input.value.trim())
    .filter((skill) => skill !== "");
}

function updateSkillsCount() {
  const totalSkills =
    getSkills().length;

  skillsCount.textContent =
    totalSkills === 1
      ? "1 Skill"
      : `${totalSkills} Skills`;
}

function deleteSkill(event) {
  const deleteButton =
    event.target.closest(
      ".delete-skill-btn"
    );

  if (!deleteButton) {
    return;
  }

  const skillRow =
    deleteButton.closest(".skill-row");

  if (skillRow) {
    skillRow.remove();
  }

  updateSkillsCount();
}

/* ================= Show / Hide Other Program Title ================= */

function updateOtherProgramTitleVisibility() {
  if (programTitle.value === "Other") {
    otherProgramTitleField.style.display = "flex";
    otherProgramTitle.required = true;
  } else {
    otherProgramTitleField.style.display = "none";
    otherProgramTitle.required = false;
    otherProgramTitle.value = "";
    otherProgramTitle.setCustomValidity("");
  }
}

programTitle.addEventListener(
  "change",
  updateOtherProgramTitleVisibility
);

/* ================= Other Program Title Validation ================= */

function validateOtherProgramTitle() {
  const value =
    otherProgramTitle.value.trim();

  if (value === "" || englishTextPattern.test(value)) {
    otherProgramTitle.setCustomValidity("");
  } else {
    otherProgramTitle.setCustomValidity(
      "Program title must start with a letter and contain English letters only."
    );
    otherProgramTitle.reportValidity();
  }

  return otherProgramTitle.checkValidity();
}

otherProgramTitle.addEventListener(
  "input",
  validateOtherProgramTitle
);

/* ================= Program Title Validation ================= */

function validateProgramTitle() {
  if (!programTitle.checkValidity()) {
    return false;
  }

  if (programTitle.value === "Other") {
    return validateOtherProgramTitle();
  }

  return programTitle.checkValidity();
}

/* ================= Openings Validation ================= */

function validateOpenings() {
  const rawValue =
    numberOfOpenings.value.trim();

  const value =
    Number(rawValue);

  if (rawValue === "") {
    numberOfOpenings.setCustomValidity("");
  } else if (!Number.isInteger(value) || value < 1) {
    numberOfOpenings.setCustomValidity(
      "Number of openings must be a whole number of 1 or more."
    );
  } else if (value > 999) {
    numberOfOpenings.setCustomValidity(
      "Number of openings must not exceed 999."
    );
  } else {
    numberOfOpenings.setCustomValidity("");
  }

  return numberOfOpenings.checkValidity();
}

/* ================= Training Term Validation ================= */

function validateTrainingSeason() {
  trainingSeason.setCustomValidity("");
  return trainingSeason.checkValidity();
}

/* ================= Training Year Validation ================= */

function validateTrainingYear() {
  const rawValue =
    trainingYear.value.trim();

  const value =
    Number(rawValue);

  if (rawValue === "") {
    trainingYear.setCustomValidity("");
  } else if (!Number.isInteger(value) || rawValue.length !== 4) {
    trainingYear.setCustomValidity(
      "Training year must be a 4-digit whole number."
    );
  } else if (value < currentYear) {
    trainingYear.setCustomValidity(
      `Training year cannot be earlier than ${currentYear}.`
    );
  } else if (value > 2100) {
    trainingYear.setCustomValidity(
      "Training year cannot exceed 2100."
    );
  } else {
    trainingYear.setCustomValidity("");
  }

  return trainingYear.checkValidity();
}

/* ================= Skills Validation ================= */

function validateSkills() {
  let skillInputs =
    getSkillInputs();

  if (skillInputs.length === 0) {
    createSkillRow();

    skillInputs =
      getSkillInputs();
  }

  const usedSkills =
    new Set();

  for (const input of skillInputs) {
    const skill =
      input.value.trim();

    const normalizedSkill =
      skill
        .toLowerCase()
        .replace(/\s+/g, " ");

    if (skill === "") {
      input.setCustomValidity("");
      input.reportValidity();
      return false;
    }

    if (!englishTextPattern.test(skill)) {
      input.setCustomValidity(
        "Skill must start with a letter and contain English letters only."
      );
      input.reportValidity();
      return false;
    }

    if (usedSkills.has(normalizedSkill)) {
      input.setCustomValidity(
        "Duplicate skills are not allowed."
      );
      input.reportValidity();
      return false;
    }

    input.setCustomValidity("");
    usedSkills.add(normalizedSkill);
  }

  return true;
}

/* ================= Full Form Validation ================= */

function validateForm() {
  if (!validateProgramTitle()) {
    programTitle.reportValidity();
    return false;
  }

  if (!validateOpenings()) {
    numberOfOpenings.reportValidity();
    return false;
  }

  if (!validateTrainingSeason()) {
    trainingSeason.reportValidity();
    return false;
  }

  if (!validateTrainingYear()) {
    trainingYear.reportValidity();
    return false;
  }

  if (!validateSkills()) {
    return false;
  }

  return true;
}

/* ================= Submit ================= */

async function submitProgram(event) {
  event.preventDefault();

  if (!validateForm()) {
    return;
  }

  const programData = {
    title:
      programTitle.value === "Other"
        ? otherProgramTitle.value.trim()
        : programTitle.value,
    openings: Number(numberOfOpenings.value),
    training_season: trainingSeason.value,
    training_year: Number(trainingYear.value),
    skills: getSkills(),
  };

  const saveBtn = document.getElementById("saveRequirementBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = editingProgramId ? "Updating..." : "Saving...";

  programFormError.style.display = "none";

  let error;

  if (editingProgramId) {
    ({ error } = await sb
      .from("program_requirements")
      .update(programData)
      .eq("id", editingProgramId));
  } else {
    const { data: { user } } = await sb.auth.getUser();

    ({ error } = await sb
      .from("program_requirements")
      .insert({ ...programData, created_by: user ? user.id : null }));
  }

  if (error) {
    showProgramFormError(error.message || "Failed to save. Please try again.");
    saveBtn.disabled = false;
    saveBtn.innerHTML = editingProgramId
      ? '<i class="fa-regular fa-floppy-disk"></i> Update Requirement'
      : '<i class="fa-regular fa-floppy-disk"></i> Save Requirement';
    return;
  }

  window.location.href = "admin-jobs.html";
}

/* ================= Immediate Validation ================= */

programTitle.addEventListener(
  "change",
  validateProgramTitle
);

numberOfOpenings.addEventListener(
  "input",
  validateOpenings
);

trainingSeason.addEventListener(
  "change",
  validateTrainingSeason
);

trainingYear.addEventListener(
  "input",
  validateTrainingYear
);

/* ================= Prevent Invalid Number Keys ================= */

function preventInvalidNumberKeys(event) {
  const invalidKeys = [
    "e",
    "E",
    "+",
    "-",
    "."
  ];

  if (invalidKeys.includes(event.key)) {
    event.preventDefault();
  }
}

numberOfOpenings.addEventListener(
  "keydown",
  preventInvalidNumberKeys
);

trainingYear.addEventListener(
  "keydown",
  preventInvalidNumberKeys
);

/* ================= Events ================= */

addSkillButton.addEventListener(
  "click",
  () => {
    createSkillRow();
  }
);

skillsContainer.addEventListener(
  "click",
  deleteSkill
);

programForm.addEventListener(
  "submit",
  submitProgram
);

/* ================= Initialize ================= */

trainingYear.min =
  String(currentYear);

trainingYear.max =
  "2100";

async function loadExistingProgram() {
  if (!editingProgramId) {
    createSkillRow();
    updateSkillsCount();
    return;
  }

  document.getElementById("pageHeading").textContent = "Edit Program Requirement";
  document.getElementById("saveRequirementBtn").innerHTML =
    '<i class="fa-regular fa-floppy-disk"></i> Update Requirement';

  const { data: program, error } = await sb
    .from("program_requirements")
    .select("title, openings, training_season, training_year, skills")
    .eq("id", editingProgramId)
    .single();

  if (error || !program) {
    showProgramFormError("Could not load this program requirement.");
    createSkillRow();
    updateSkillsCount();
    return;
  }

  const predefinedTitles = Array.from(programTitle.options)
    .map((option) => option.value)
    .filter((value) => value !== "" && value !== "Other");

  if (predefinedTitles.includes(program.title)) {
    programTitle.value = program.title;
  } else {
    programTitle.value = "Other";
    otherProgramTitle.value = program.title || "";
  }

  updateOtherProgramTitleVisibility();

  numberOfOpenings.value = program.openings || "";
  trainingSeason.value = program.training_season || "";
  trainingYear.value = program.training_year || "";

  skillsContainer.innerHTML = "";

  const existingSkills = Array.isArray(program.skills) ? program.skills : [];

  if (existingSkills.length === 0) {
    createSkillRow();
  } else {
    existingSkills.forEach((skill) => createSkillRow(skill));
  }

  updateSkillsCount();
}

loadExistingProgram();