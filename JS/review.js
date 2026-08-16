// ===============================
// Guard: must be logged in to reach this step
// ===============================

requireAuth();

// ===============================
// Load everything collected in the previous 3 steps
// ===============================

const wizardStep1 = JSON.parse(
  sessionStorage.getItem("wizard_step1") || "{}"
);

const wizardStep2 = JSON.parse(
  sessionStorage.getItem("wizard_step2") || "{}"
);

const wizardDocs = JSON.parse(
  sessionStorage.getItem("wizard_docs") || "{}"
);

// ===============================
// University "Other" dropdown — same behavior as academic.html
// ===============================

const reviewUniversity =
  document.getElementById("reviewUniversity");

const reviewOtherUniversityField =
  document.getElementById(
    "reviewOtherUniversityField"
  );

const reviewOtherUniversity =
  document.getElementById(
    "reviewOtherUniversity"
  );

if (reviewUniversity) {
  reviewUniversity.addEventListener(
    "change",
    () => {
      const isOther =
        reviewUniversity.value === "Other";

      reviewOtherUniversityField.style.display =
        isOther ? "flex" : "none";

      if (isOther) {
        reviewOtherUniversity.setAttribute(
          "required",
          "required"
        );
      } else {
        reviewOtherUniversity.removeAttribute(
          "required"
        );

        reviewOtherUniversity.value = "";

        reviewOtherUniversity.setCustomValidity("");
      }
    }
  );
}

// ===============================
// Same validation rules used on the Personal Info / Academic Info pages
// ===============================

function addValidator(input, testFn, message) {
  if (!input) return;

  input.addEventListener("input", () => {
    if (
      input.value.trim() === "" ||
      testFn(input.value)
    ) {
      input.setCustomValidity("");
    } else {
      input.setCustomValidity(message);
      input.reportValidity();
    }
  });
}

const namePattern =
  /^[A-Za-z][A-Za-z\s]*$/;

// Full Name: must start with a letter, English letters only
addValidator(
  document.querySelector(
    '[data-input="fullName"]'
  ),
  (value) => namePattern.test(value),
  "Name must start with a letter and contain English letters only."
);

// Other University: must start with a letter, English letters only
addValidator(
  reviewOtherUniversity,
  (value) => namePattern.test(value),
  "University must start with a letter and contain English letters only."
);

// National ID: exactly 10 digits, numbers only
const nationalIdInput =
  document.querySelector(
    '[data-input="nationalId"]'
  );

if (nationalIdInput) {
  nationalIdInput.addEventListener(
    "input",
    () => {
      nationalIdInput.value =
        nationalIdInput.value
          .replace(/\D/g, "")
          .slice(0, 10);
    }
  );

  addValidator(
    nationalIdInput,
    (value) => /^[0-9]{10}$/.test(value),
    "National ID must be exactly 10 digits, numbers only."
  );
}

// Email: English characters only
addValidator(
  document.querySelector(
    '[data-input="email"]'
  ),
  (value) =>
    !/[\u0600-\u06FF]/.test(value),
  "Please enter a valid email address using English characters only."
);

// Phone: must start with 966, 12 digits total
const phoneInput =
  document.querySelector(
    '[data-input="phone"]'
  );

const phonePrefix = "966";

if (phoneInput) {
  phoneInput.addEventListener(
    "input",
    () => {
      phoneInput.value =
        phoneInput.value
          .replace(/\D/g, "")
          .slice(0, 12);

      const value = phoneInput.value;

      if (value.length === 0) {
        phoneInput.setCustomValidity("");
        return;
      }

      const stillMatchesPrefix =
        phonePrefix.startsWith(value) ||
        value.startsWith(phonePrefix);

      if (!stillMatchesPrefix) {
        phoneInput.setCustomValidity(
          "Phone number must start with 966."
        );

        phoneInput.reportValidity();
        return;
      }

      if (!/^966[0-9]{9}$/.test(value)) {
        phoneInput.setCustomValidity(
          "Phone number must start with 966 followed by 9 digits (12 digits total)."
        );
      } else {
        phoneInput.setCustomValidity("");
      }
    }
  );
}

// Major: must start with a letter, English letters only
addValidator(
  document.querySelector(
    '[data-input="major"]'
  ),
  (value) => namePattern.test(value),
  "Major must start with a letter and contain English letters only."
);

// GPA: must be a valid number between 0 and 5
addValidator(
  document.querySelector(
    '[data-input="gpa"]'
  ),
  (value) => {
    const numberValue =
      Number(value.trim());

    return (
      !isNaN(numberValue) &&
      numberValue >= 0 &&
      numberValue <= 5
    );
  },
  "GPA must be a valid number between 0 and 5."
);

// ===============================
// Fill personal + education fields
// ===============================

function setInputValue(selector, value) {
  const el = document.querySelector(selector);

  if (el) {
    el.value = value ?? "";
  }
}

setInputValue(
  '[data-input="fullName"]',
  `${wizardStep1.first_name || ""} ${wizardStep1.last_name || ""}`.trim()
);

setInputValue(
  '[data-input="nationalId"]',
  wizardStep1.national_id
);

setInputValue(
  '[data-input="email"]',
  wizardStep1.email
);

setInputValue(
  '[data-input="phone"]',
  wizardStep1.mobile
);

if (reviewUniversity) {
  if (wizardStep2.university === "Other") {
    reviewUniversity.value = "Other";

    reviewOtherUniversityField.style.display =
      "flex";

    reviewOtherUniversity.value =
      wizardStep2.other_university || "";
  } else {
    reviewUniversity.value =
      wizardStep2.university || "";
  }
}

setInputValue(
  '[data-input="major"]',
  wizardStep2.major
);

setInputValue(
  '[data-input="studyLevel"]',
  wizardStep2.student_level
);

setInputValue(
  '[data-input="gpa"]',
  wizardStep2.gpa
);

setInputValue(
  '[data-input="trainingPeriod"]',
  wizardStep2.training_start &&
  wizardStep2.training_end
    ? `${wizardStep2.training_start} to ${wizardStep2.training_end}`
    : ""
);

// ===============================
// Show uploaded document names
// ===============================

const docDisplayKeys = {
  cv: "cv",
  academic_transcript: "transcript",
  certificates: "certificates",
  recommendation_letter: "recommendation"
};

Object.entries(docDisplayKeys).forEach(
  ([docType, displayKey]) => {
    const span = document.querySelector(
      `[data-section="documents"] [data-value="${displayKey}"]`
    );

    if (!span) return;

    span.textContent =
      wizardDocs[docType]?.file_name ||
      "Not uploaded";
  }
);

const documentsEditBtn =
  document.querySelector(
    '[data-section="documents"] .edit-btn'
  );

if (documentsEditBtn) {
  documentsEditBtn.addEventListener(
    "click",
    () => {
      window.location.href =
        "documents.html";
    }
  );
}

// ===============================
// Review sections
// ===============================

const sections =
  document.querySelectorAll(".review-box");

sections.forEach((section) => {

  // Important:
  // The Documents section is already filled from wizardDocs.
  // Do not run fillView() on it because file inputs are empty
  // after navigating between pages and would show "Not uploaded".
  if (section.dataset.section === "documents") {
    return;
  }

  const editBtn =
    section.querySelector(".edit-btn");

  const cancelBtn =
    section.querySelector(".cancel-btn");

  const saveBtn =
    section.querySelector(".save-btn");

  const viewMode =
    section.querySelector(".view-mode");

  const editMode =
    section.querySelector(".edit-mode");

  const inputs =
    section.querySelectorAll("[data-input]");

  // ===============================
  // Fill the view-mode text
  // ===============================

  function fillView() {
    inputs.forEach((input) => {
      const key =
        input.dataset.input;

      const valueSpan =
        section.querySelector(
          `[data-value="${key}"]`
        );

      if (!valueSpan) return;

      if (
        key === "university" &&
        input.value === "Other"
      ) {
        valueSpan.textContent =
          reviewOtherUniversity &&
          reviewOtherUniversity.value.trim()
            ? reviewOtherUniversity.value.trim()
            : "Other";
      } else {
        valueSpan.textContent =
          input.value;
      }
    });
  }

  fillView();

  editBtn.addEventListener(
    "click",
    () => {
      section.classList.add("editing");

      viewMode.style.display = "none";
      editMode.style.display = "block";
      editBtn.style.display = "none";
    }
  );

  cancelBtn.addEventListener(
    "click",
    () => {
      section.classList.remove("editing");

      viewMode.style.display = "block";
      editMode.style.display = "none";
      editBtn.style.display = "block";
    }
  );

  // ===============================
  // Save validation
  // ===============================

  saveBtn.addEventListener(
    "click",
    () => {
      let firstInvalid = null;

      for (const input of inputs) {
        if (
          input === reviewUniversity &&
          input.value === "Other"
        ) {
          if (
            !reviewOtherUniversity.checkValidity()
          ) {
            if (!firstInvalid) {
              firstInvalid =
                reviewOtherUniversity;
            }
          }
        } else if (!input.checkValidity()) {
          if (!firstInvalid) {
            firstInvalid = input;
          }
        }
      }

      if (firstInvalid) {
        firstInvalid.reportValidity();
        return;
      }

      fillView();

      section.classList.remove("editing");

      viewMode.style.display = "block";
      editMode.style.display = "none";
      editBtn.style.display = "block";
    }
  );
});

// ===============================
// Submit Application
// ===============================

async function resolveProgramRequirementId() {
  if (wizardStep2.program_requirement_id) {
    return wizardStep2.program_requirement_id;
  }

  const major =
    document.querySelector(
      '[data-input="major"]'
    )?.value.trim() ||
    wizardStep2.major?.trim();

  if (!major) {
    console.error(
      "Program requirement could not be resolved because the major is missing."
    );

    return null;
  }

  const {
    data: requirement,
    error
  } = await sb
    .from("program_requirements")
    .select("id, title")
    .ilike("title", major)
    .order("created_at", {
      ascending: false
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "Failed to find program requirement:",
      error
    );

    return null;
  }

  if (!requirement?.id) {
    console.error(
      `No program requirement was found for major: ${major}`
    );

    return null;
  }

  wizardStep2.program_requirement_id =
    requirement.id;

  sessionStorage.setItem(
    "wizard_step2",
    JSON.stringify(wizardStep2)
  );

  return requirement.id;
}

const CV_ANALYSIS_API =
  "https://project-coop-d7j3.onrender.com/analyze-cv";

async function startAutomaticCvAnalysis(application) {
  if (
    !application?.id ||
    !application?.program_requirement_id
  ) {
    console.error(
      "Automatic CV analysis was not started because the application or program requirement ID is missing.",
      application
    );

    return;
  }

  const requestBody = {
    application_id:
      application.id,

    program_requirements_id:
      application.program_requirement_id
  };

  console.log(
    "Starting automatic CV analysis:",
    requestBody
  );

  try {
    const response = await fetch(
      CV_ANALYSIS_API,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(
            requestBody
          )
      }
    );

    const responseText =
      await response.text();

    let responseData = null;

    if (responseText) {
      try {
        responseData =
          JSON.parse(
            responseText
          );
      } catch {
        responseData =
          responseText;
      }
    }

    console.log(
      "Automatic CV analysis status:",
      response.status
    );

    console.log(
      "Automatic CV analysis response:",
      responseData
    );

    if (!response.ok) {
      throw new Error(
        responseData?.detail ||
        responseData?.message ||
        responseText ||
        `Analysis failed with status ${response.status}.`
      );
    }
  } catch (analysisError) {
    console.error(
      "Automatic CV analysis failed:",
      analysisError
    );
  }
}

const submitBtn =
  document.getElementById("submitBtn");

const submitError =
  document.getElementById("submitError");

function showSubmitError(message) {
  submitError.textContent = message;
  submitError.style.display = "block";
}

submitBtn.addEventListener(
  "click",
  async () => {
    if (
      !wizardStep1.email ||
      !wizardStep2.major
    ) {
      showSubmitError(
        "Some application data is missing. Please start again from Personal Info."
      );

      return;
    }

    submitError.style.display = "none";
    submitBtn.disabled = true;

    submitBtn.querySelector(
      "span"
    ).textContent = "Submitting...";

    const {
      data: { user }
    } = await sb.auth.getUser();

    if (!user) {
      showSubmitError(
        "Your session has expired. Please log in again."
      );

      submitBtn.disabled = false;

      submitBtn.querySelector(
        "span"
      ).textContent =
        "Submit Application";

      return;
    }

    const fullName =
      document.querySelector(
        '[data-input="fullName"]'
      )?.value.trim() || "";

    const [
      firstNameEdited,
      ...restName
    ] = fullName.split(" ");

    const lastNameEdited =
      restName.join(" ");

    const universityEdited =
      reviewUniversity
        ? reviewUniversity.value
        : wizardStep2.university;

    const otherUniversityEdited =
      universityEdited === "Other"
        ? (
            reviewOtherUniversity
              ?.value.trim() || null
          )
        : null;

    const programRequirementId =
      await resolveProgramRequirementId();

    if (!programRequirementId) {
      showSubmitError(
        "The selected program is not linked to analysis requirements. Please select an available program and try again."
      );

      submitBtn.disabled = false;

      submitBtn.querySelector(
        "span"
      ).textContent =
        "Submit Application";

      return;
    }

    const {
      data: application,
      error: insertError
    } = await sb
      .from("applications")
      .insert({
        student_id:
          user.id,

        program_requirement_id:
          programRequirementId,

        first_name:
          firstNameEdited ||
          wizardStep1.first_name,

        last_name:
          lastNameEdited ||
          wizardStep1.last_name,

        national_id:
          document.querySelector(
            '[data-input="nationalId"]'
          )?.value.trim() ||
          wizardStep1.national_id,

        mobile:
          document.querySelector(
            '[data-input="phone"]'
          )?.value.trim() ||
          wizardStep1.mobile,

        dob:
          wizardStep1.dob,

        gender:
          wizardStep1.gender,

        city:
          wizardStep1.city,

        other_city:
          wizardStep1.other_city,

        email:
          document.querySelector(
            '[data-input="email"]'
          )?.value.trim() ||
          wizardStep1.email,

        university:
          universityEdited,

        other_university:
          otherUniversityEdited,

        major:
          document.querySelector(
            '[data-input="major"]'
          )?.value.trim() ||
          wizardStep2.major,

        student_level:
          document.querySelector(
            '[data-input="studyLevel"]'
          )?.value ||
          wizardStep2.student_level,

        gpa:
          document.querySelector(
            '[data-input="gpa"]'
          )?.value.trim() ||
          wizardStep2.gpa,

        gpa_scale:
          wizardStep2.gpa_scale,

        expected_graduation:
          wizardStep2.expected_graduation,

        training_start:
          wizardStep2.training_start,

        training_end:
          wizardStep2.training_end,

        status:
          "pending",

        submitted_at:
          new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      showSubmitError(
        insertError.message.includes(
          "duplicate"
        )
          ? "You have already applied to this program with this national ID."
          : insertError.message
      );

      submitBtn.disabled = false;

      submitBtn.querySelector(
        "span"
      ).textContent =
        "Submit Application";

      return;
    }
    // ===============================
// Update Student Profile
// ===============================

const profileFullName =
  `${firstNameEdited || wizardStep1.first_name || ""} ${
    lastNameEdited || wizardStep1.last_name || ""
  }`.trim();

const profileEmail =
  document.querySelector(
    '[data-input="email"]'
  )?.value.trim() ||
  wizardStep1.email ||
  user.email;

const profilePhone =
  document.querySelector(
    '[data-input="phone"]'
  )?.value.trim() ||
  wizardStep1.mobile ||
  null;

const {
  error: profileUpdateError
} = await sb
  .from("profiles")
  .update({
    full_name: profileFullName,
    email: profileEmail,
    phone: profilePhone,
    dob: wizardStep1.dob || null,
    gender: wizardStep1.gender || null,
    updated_at: new Date().toISOString()
  })
  .eq("id", user.id);

if (profileUpdateError) {
  console.error(
    "Failed to update profile:",
    profileUpdateError
  );
}

    // Move documents from temp path
    for (
      const docType of Object.keys(
        wizardDocs
      )
    ) {
      const {
        path: tempPath,
        file_name
      } = wizardDocs[docType];

      const extension =
        tempPath.split(".").pop();

      const finalPath =
        `${application.id}/${docType}.${extension}`;

      const {
        error: moveError
      } = await sb.storage
        .from("application-documents")
        .move(
          tempPath,
          finalPath
        );

      if (moveError) {
        console.error(
          `Failed to move document (${docType}):`,
          moveError
        );

        continue;
      }

      const {
        error: docInsertError
      } = await sb
        .from("application_documents")
        .insert({
          application_id:
            application.id,

          doc_type:
            docType,

          file_path:
            finalPath,

          file_name:
            file_name
        });

      if (docInsertError) {
        console.error(
          `Failed to record document (${docType}):`,
          docInsertError
        );
      }
    }

    // Start CV analysis automatically
    // after all documents are saved.
    await startAutomaticCvAnalysis({
      ...application,
      program_requirement_id:
        application.program_requirement_id ||
        programRequirementId
    });

    sessionStorage.removeItem(
      "wizard_step1"
    );

    sessionStorage.removeItem(
      "wizard_step2"
    );

    sessionStorage.removeItem(
      "wizard_docs"
    );

    window.location.href =
      "done.html";
  }
);