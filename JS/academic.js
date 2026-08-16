// ======================================================
// Application Form — Step 2: Academic Information
// ======================================================

// ===============================
// Guard: user must be logged in
// ===============================

requireAuth();

// ===============================
// Get HTML Elements
// ===============================

const academicForm =
    document.getElementById("academicForm");

const programSelect =
    document.getElementById("programRequirement");

const universitySelect =
    document.getElementById("university");

const otherUniversityField =
    document.getElementById("otherUniversityField");

const otherUniversity =
    document.getElementById("otherUniversity");

const otherProgramField =
    document.getElementById("otherProgramField");

const otherProgram =
    document.getElementById("otherProgram");

// Keeps id -> title so saveStep2Data() can store the program's title as
// the student's "major" without needing another query.
const programTitles = {};

const studentLevel =
    document.getElementById("studentLevel");

const gpa =
    document.getElementById("gpa");

const gpaScore =
    document.getElementById("gpaScore");

const gradYear =
    document.getElementById("gradYear");

const trainingStart =
    document.getElementById("trainingStart");

const trainingEnd =
    document.getElementById("trainingEnd");

const prevBtn =
    document.getElementById("prevBtn");

const nextBtn =
    document.getElementById("nextBtn");

// ===============================
// Load Available Programs
// ===============================

async function loadPrograms() {
    programSelect.disabled = true;

    programSelect.innerHTML =
        '<option value="">Loading programs...</option>';

    const { data: programs, error } = await sb
        .from("program_requirements")
        .select("id, title, training_term, openings")
        .order("created_at", {
            ascending: false
        });

    programSelect.innerHTML = "";

    if (error) {
        console.error(
            "Error loading programs:",
            error
        );

        programSelect.innerHTML =
            '<option value="">Select a program</option>' +
            '<option value="other">Other (not listed)</option>';

        programSelect.disabled = false;
        return false;
    }

    if (!programs || programs.length === 0) {
        programSelect.innerHTML =
            '<option value="">Select a program</option>' +
            '<option value="other">Other (not listed)</option>';

        programSelect.disabled = false;
        return true;
    }

    programSelect.innerHTML =
        '<option value="">Select a program</option>';

    programs.forEach((program) => {
        const option =
            document.createElement("option");

        option.value = program.id;

        option.textContent =
            `${program.title} — ` +
            `${program.training_term} ` +
            `(${program.openings} openings)`;

        programSelect.appendChild(option);

        programTitles[program.id] = program.title;
    });

    const otherOption =
        document.createElement("option");

    otherOption.value = "other";
    otherOption.textContent = "Other (not listed)";

    programSelect.appendChild(otherOption);

    programSelect.disabled = false;
    return true;
}

// ===============================
// Show / Hide Other University
// ===============================

function updateOtherUniversityVisibility() {
    if (universitySelect.value === "Other") {
        otherUniversityField.style.display = "flex";
        otherUniversity.required = true;
    } else {
        otherUniversityField.style.display = "none";
        otherUniversity.required = false;
        otherUniversity.value = "";
        otherUniversity.setCustomValidity("");
    }
}

universitySelect.addEventListener(
    "change",
    updateOtherUniversityVisibility
);

// ===============================
// Show / Hide Other Program
// ===============================

function updateOtherProgramVisibility() {
    if (programSelect.value === "other") {
        otherProgramField.style.display = "flex";
        otherProgram.required = true;
    } else {
        otherProgramField.style.display = "none";
        otherProgram.required = false;
        otherProgram.value = "";
        otherProgram.setCustomValidity("");
    }
}

programSelect.addEventListener(
    "change",
    updateOtherProgramVisibility
);

// ===============================
// Validation Helper
// ===============================

function addValidator(input, testFn, message) {
    input.addEventListener("input", () => {
        const value = input.value.trim();

        if (value === "" || testFn(value)) {
            input.setCustomValidity("");
        } else {
            input.setCustomValidity(message);
            input.reportValidity();
        }
    });
}

// ===============================
// Other University
// English letters only
// ===============================

const namePattern =
    /^[A-Za-z][A-Za-z\s]*$/;

addValidator(
    otherUniversity,
    (value) => namePattern.test(value),
    "University must start with a letter and contain English letters only."
);

// ===============================
// GPA Validation
// ===============================

function validateGPA() {
    let scale = null;

    if (gpaScore.value === "Out of 4") {
        scale = 4;
    }

    if (gpaScore.value === "Out of 5") {
        scale = 5;
    }

    if (gpa.value.trim() === "" || scale === null) {
        gpa.setCustomValidity("");
        return true;
    }

    const value =
        Number(gpa.value.trim());

    if (
        Number.isNaN(value) ||
        value < 0 ||
        value > scale
    ) {
        gpa.setCustomValidity(
            `GPA must be a valid number between 0 and ${scale}.`
        );

        return false;
    }

    gpa.setCustomValidity("");
    return true;
}

gpa.addEventListener("input", () => {
    validateGPA();

    if (!gpa.checkValidity()) {
        gpa.reportValidity();
    }
});

gpaScore.addEventListener(
    "change",
    validateGPA
);

// ===============================
// Date Validation
// ===============================

const today =
    new Date().toISOString().split("T")[0];

gradYear.setAttribute("min", today);
trainingStart.setAttribute("min", today);

function validateGraduationDate() {
    if (
        gradYear.value &&
        gradYear.value < today
    ) {
        gradYear.setCustomValidity(
            "Expected graduation date cannot be in the past."
        );

        return false;
    }

    gradYear.setCustomValidity("");
    return true;
}

function validateTrainingStart() {
    if (
        trainingStart.value &&
        trainingStart.value < today
    ) {
        trainingStart.setCustomValidity(
            "Training start date cannot be in the past."
        );

        return false;
    }

    trainingStart.setCustomValidity("");
    return true;
}

function validateTrainingEnd() {
    if (
        trainingStart.value &&
        trainingEnd.value &&
        trainingEnd.value <= trainingStart.value
    ) {
        trainingEnd.setCustomValidity(
            "Training end date must be after the start date."
        );

        return false;
    }

    trainingEnd.setCustomValidity("");
    return true;
}

gradYear.addEventListener("input", () => {
    validateGraduationDate();

    if (!gradYear.checkValidity()) {
        gradYear.reportValidity();
    }
});

trainingStart.addEventListener("input", () => {
    validateTrainingStart();
    validateTrainingEnd();

    if (!trainingStart.checkValidity()) {
        trainingStart.reportValidity();
    }
});

trainingEnd.addEventListener("input", () => {
    validateTrainingEnd();

    if (!trainingEnd.checkValidity()) {
        trainingEnd.reportValidity();
    }
});

// ===============================
// Read Saved Step 2 Data
// ===============================

function getSavedStep2Data() {
    try {
        return JSON.parse(
            sessionStorage.getItem("wizard_step2") ||
            "{}"
        );
    } catch (error) {
        console.error(
            "Unable to read Step 2 data:",
            error
        );

        return {};
    }
}

// ===============================
// Restore Saved Step 2 Data
// ===============================

async function restoreStep2Data() {
    /*
        Programs must load first because the program
        select options come from Supabase.
    */
    await loadPrograms();

    const savedStep2 =
        getSavedStep2Data();

    if (
        !savedStep2 ||
        Object.keys(savedStep2).length === 0
    ) {
        updateOtherUniversityVisibility();
        updateOtherProgramVisibility();
        return;
    }

    programSelect.value =
        savedStep2.program_selection || "";

    universitySelect.value =
        savedStep2.university || "";

    updateOtherUniversityVisibility();
    updateOtherProgramVisibility();

    if (
        savedStep2.university === "Other"
    ) {
        otherUniversity.value =
            savedStep2.other_university || "";
    }

    if (
        savedStep2.program_selection === "other"
    ) {
        otherProgram.value =
            savedStep2.major || "";
    }

    studentLevel.value =
        savedStep2.student_level || "";

    gpa.value =
        savedStep2.gpa || "";

    gpaScore.value =
        savedStep2.gpa_scale || "";

    gradYear.value =
        savedStep2.expected_graduation || "";

    trainingStart.value =
        savedStep2.training_start || "";

    trainingEnd.value =
        savedStep2.training_end || "";

    validateGPA();
    validateGraduationDate();
    validateTrainingStart();
    validateTrainingEnd();
}

// ===============================
// Save Current Step 2 Data
// ===============================

function saveStep2Data() {
    const isOtherProgram =
        programSelect.value === "other";

    const step2Data = {
        program_selection:
            programSelect.value,

        program_requirement_id:
            isOtherProgram ? null : (programSelect.value || null),

        major:
            isOtherProgram
                ? otherProgram.value.trim()
                : (programTitles[programSelect.value] || ""),

        university:
            universitySelect.value,

        other_university:
            universitySelect.value === "Other"
                ? otherUniversity.value.trim()
                : null,

        student_level:
            studentLevel.value,

        gpa:
            gpa.value.trim(),

        gpa_scale:
            gpaScore.value,

        expected_graduation:
            gradYear.value,

        training_start:
            trainingStart.value,

        training_end:
            trainingEnd.value
    };

    sessionStorage.setItem(
        "wizard_step2",
        JSON.stringify(step2Data)
    );
}

// ===============================
// Previous Button
// Save before going back
// ===============================

prevBtn.addEventListener("click", () => {
    /*
        Save whatever the user entered before returning
        to Step 1, even if some fields are incomplete.
    */
    saveStep2Data();

    window.location.href =
        "application.html";
});

// ===============================
// Next Button
// ===============================

nextBtn.addEventListener("click", () => {
    validateGPA();
    validateGraduationDate();
    validateTrainingStart();
    validateTrainingEnd();

    if (!academicForm.checkValidity()) {
        academicForm.reportValidity();
        return;
    }

    saveStep2Data();

    window.location.href =
        "documents.html";
});

// ===============================
// Save Changes While Typing
// This gives extra protection if the user navigates away
// ===============================

academicForm.addEventListener(
    "input",
    () => {
        saveStep2Data();
    }
);

academicForm.addEventListener(
    "change",
    () => {
        saveStep2Data();
    }
);

// ===============================
// Initialize Page
// ===============================

restoreStep2Data();