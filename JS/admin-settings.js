/* ================= Admin Settings ================= */

let currentAdminUser = null;

const namePattern = /^[A-Za-z][A-Za-z\s]*$/;
const phonePattern = /^966[0-9]{9}$/;

/* ================= Initialisation ================= */

document.addEventListener("DOMContentLoaded", async () => {
  const adminProfile = await requireAdmin();
  if (!adminProfile) return;

  setupSidebar();
  setupProfileValidation();
  setupPasswordValidation();
  setupForms();

  await loadProfile();
});

/* ================= Load Profile ================= */

async function loadProfile() {
  try {
    const {
      data: { user },
      error: userError,
    } = await sb.auth.getUser();

    if (userError || !user) {
      window.location.href = "Login.html";
      return;
    }

    currentAdminUser = user;

    const { data: profile, error: profileError } = await sb
      .from("profiles")
      .select("full_name, email, phone, gender, language, role")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    const fullNameInput = document.getElementById("fullName");
    const genderInput = document.getElementById("gender");
    const phoneInput = document.getElementById("phone");
    const emailInput = document.getElementById("email");
    const languageInput = document.getElementById("language");

    if (fullNameInput) {
      fullNameInput.value = profile.full_name || "";
      fullNameInput.dataset.initialValue = fullNameInput.value;
    }

    if (genderInput) {
      genderInput.value = profile.gender || "";
      genderInput.dataset.initialValue = genderInput.value;
    }

    if (phoneInput) {
      phoneInput.value = profile.phone || "";
      phoneInput.dataset.initialValue = phoneInput.value;
    }

    if (emailInput) {
      emailInput.value = profile.email || user.email || "";
    }

    if (languageInput) {
      languageInput.value = profile.language || "english";
      languageInput.dataset.initialValue = languageInput.value;
    }

    updateDisplayedAdminName(profile.full_name || profile.email || user.email || "Admin");
  } catch (error) {
    console.error("Admin profile loading error:", error);
    alert("Unable to load your profile information.");
  }
}

function updateDisplayedAdminName(name) {
  const topbarName = document.getElementById("topbarAdminName");
  if (topbarName) topbarName.textContent = name;
}

/* ================= Profile Editing ================= */

function toggleEditField(id, icon) {
  const input = document.getElementById(id);
  if (!input || !icon) return;

  if (input.hasAttribute("readonly")) {
    input.dataset.oldValue = input.value;
    input.removeAttribute("readonly");
    input.classList.add("active-edit");
    input.focus();

    icon.classList.remove("fa-pen");
    icon.classList.add("fa-xmark", "cancel-edit-icon");
    icon.title = "Cancel edit";
  } else {
    input.value = input.dataset.oldValue || "";
    input.setCustomValidity("");
    lockEditedField(id);
  }
}

function lockEditedField(id) {
  const input = document.getElementById(id);
  if (!input) return;

  input.setAttribute("readonly", "");
  input.classList.remove("active-edit");
  input.setCustomValidity("");

  const wrapper = input.closest(".input-with-icon");
  const icon = wrapper?.querySelector(".edit-icon");

  if (icon) {
    icon.classList.remove("fa-xmark", "cancel-edit-icon");
    icon.classList.add("fa-pen");
    icon.title = id === "password" ? "Change password" : "Edit";
  }
}

/* ================= Profile Validation ================= */

function setupProfileValidation() {
  const fullNameInput = document.getElementById("fullName");
  const phoneInput = document.getElementById("phone");

  fullNameInput?.addEventListener("input", () => {
    validateFullName(fullNameInput, true);
  });

  phoneInput?.addEventListener("input", () => {
    phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, 12);
    validatePhone(phoneInput, true);
  });
}

function validateFullName(input, report = false) {
  const value = input.value.trim();

  if (!value) {
    input.setCustomValidity("This field cannot be empty.");
  } else if (!namePattern.test(value)) {
    input.setCustomValidity(
      "Name must start with a letter and contain English letters only."
    );
  } else {
    input.setCustomValidity("");
  }

  if (report && !input.checkValidity()) input.reportValidity();
  return input.checkValidity();
}

function validatePhone(input, report = false) {
  const value = input.value.trim();

  if (!value) {
    input.setCustomValidity("");
  } else if (!phonePattern.test(value)) {
    input.setCustomValidity(
      "Phone number must start with 966 followed by 9 digits (12 digits total)."
    );
  } else {
    input.setCustomValidity("");
  }

  if (report && !input.checkValidity()) input.reportValidity();
  return input.checkValidity();
}

/* ================= Save Profile ================= */

function setupForms() {
  const profileForm = document.getElementById("adminSettingsForm");
  const passwordForm = document.getElementById("passwordForm");

  profileForm?.addEventListener("submit", saveProfile);
  passwordForm?.addEventListener("submit", updatePassword);
}

async function saveProfile(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const saveBtn = document.getElementById("saveChangesBtn");
  const fullNameInput = document.getElementById("fullName");
  const genderInput = document.getElementById("gender");
  const phoneInput = document.getElementById("phone");
  const languageInput = document.getElementById("language");

  validateFullName(fullNameInput);
  validatePhone(phoneInput);

  if (!genderInput.value) {
    genderInput.setCustomValidity("Please select your gender.");
  } else {
    genderInput.setCustomValidity("");
  }

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    const {
      data: { user },
      error: userError,
    } = await sb.auth.getUser();

    if (userError || !user) {
      window.location.href = "Login.html";
      return;
    }

    const fullName = fullNameInput.value.trim();
    const gender = genderInput.value;
    const phone = phoneInput.value.trim() || null;
    const language = languageInput.value;

    const { error: profileError } = await sb
      .from("profiles")
      .update({
        full_name: fullName,
        gender,
        phone,
        language,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) throw profileError;

    const { error: metadataError } = await sb.auth.updateUser({
      data: { full_name: fullName },
    });

    if (metadataError) {
      console.warn("Profile saved, but Auth metadata was not updated:", metadataError);
    }

    fullNameInput.dataset.initialValue = fullName;
    genderInput.dataset.initialValue = gender;
    phoneInput.dataset.initialValue = phone || "";
    languageInput.dataset.initialValue = language;

    lockEditedField("fullName");
    lockEditedField("phone");
    updateDisplayedAdminName(fullName);

    alert("Changes saved successfully.");
  } catch (error) {
    console.error("Admin profile update error:", error);
    alert(error?.message || "Unable to save changes.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Changes";
  }
}

/* ================= Password Modal ================= */

function openPasswordModal() {
  const modal = document.getElementById("passwordModal");
  const errorBox = document.getElementById("passwordUpdateError");

  if (errorBox) {
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  modal?.classList.add("show");
  document.getElementById("currentPassword")?.focus();
}

function closePasswordModal() {
  const modal = document.getElementById("passwordModal");
  const form = document.getElementById("passwordForm");
  const errorBox = document.getElementById("passwordUpdateError");

  modal?.classList.remove("show");
  form?.reset();

  ["currentPassword", "newPassword", "confirmPassword"].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.type = "password";
    input.setCustomValidity("");
  });

  document.querySelectorAll(".toggle-pass").forEach((icon) => {
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
    icon.title = "Show password";
  });

  if (errorBox) {
    errorBox.hidden = true;
    errorBox.textContent = "";
  }
}

function togglePassword(inputId, icon) {
  const input = document.getElementById(inputId);
  if (!input || !icon) return;

  const shouldShow = input.type === "password";
  input.type = shouldShow ? "text" : "password";

  icon.classList.toggle("fa-eye", shouldShow);
  icon.classList.toggle("fa-eye-slash", !shouldShow);
  icon.title = shouldShow ? "Hide password" : "Show password";
}

window.addEventListener("click", (event) => {
  const modal = document.getElementById("passwordModal");
  if (event.target === modal) closePasswordModal();
});

/* ================= Password Validation ================= */

function setupPasswordValidation() {
  const currentPassword = document.getElementById("currentPassword");
  const newPassword = document.getElementById("newPassword");
  const confirmPassword = document.getElementById("confirmPassword");

  currentPassword?.addEventListener("input", () => {
    currentPassword.setCustomValidity("");
    validateNewPassword(false);
  });

  newPassword?.addEventListener("input", () => {
    validateNewPassword(true);
    validateConfirmPassword(false);
  });

  confirmPassword?.addEventListener("input", () => {
    validateConfirmPassword(true);
  });
}

function validateNewPassword(report = false) {
  const currentPassword = document.getElementById("currentPassword");
  const newPassword = document.getElementById("newPassword");
  const value = newPassword.value;

  if (!value) {
    newPassword.setCustomValidity("");
  } else if (/[\u0600-\u06FF]/.test(value)) {
    newPassword.setCustomValidity("Password cannot contain Arabic characters.");
  } else if (value.length < 8) {
    newPassword.setCustomValidity("New password must be at least 8 characters.");
  } else if (currentPassword.value && value === currentPassword.value) {
    newPassword.setCustomValidity("New password must be different from the current password.");
  } else {
    newPassword.setCustomValidity("");
  }

  if (report && !newPassword.checkValidity()) newPassword.reportValidity();
  return newPassword.checkValidity();
}

function validateConfirmPassword(report = false) {
  const newPassword = document.getElementById("newPassword");
  const confirmPassword = document.getElementById("confirmPassword");

  if (!confirmPassword.value) {
    confirmPassword.setCustomValidity("");
  } else if (confirmPassword.value !== newPassword.value) {
    confirmPassword.setCustomValidity("New password and confirmation do not match.");
  } else {
    confirmPassword.setCustomValidity("");
  }

  if (report && !confirmPassword.checkValidity()) confirmPassword.reportValidity();
  return confirmPassword.checkValidity();
}

function showPasswordError(message) {
  const errorBox = document.getElementById("passwordUpdateError");
  if (!errorBox) return;

  errorBox.textContent = message;
  errorBox.hidden = false;
}

async function updatePassword(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const currentPassword = document.getElementById("currentPassword");
  const newPassword = document.getElementById("newPassword");
  const updateBtn = document.getElementById("updatePasswordBtn");
  const errorBox = document.getElementById("passwordUpdateError");

  currentPassword.setCustomValidity("");
  validateNewPassword(false);
  validateConfirmPassword(false);

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if (errorBox) {
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  updateBtn.disabled = true;
  updateBtn.textContent = "Updating...";

  try {
    const {
      data: { user },
      error: userError,
    } = await sb.auth.getUser();

    if (userError || !user) {
      throw new Error("Your session has expired. Please log in again.");
    }

    const { error: signInError } = await sb.auth.signInWithPassword({
      email: user.email,
      password: currentPassword.value,
    });

    if (signInError) {
      currentPassword.setCustomValidity("Current password is incorrect.");
      currentPassword.reportValidity();
      return;
    }

    const { error: updateError } = await sb.auth.updateUser({
      password: newPassword.value,
    });

    if (updateError) throw updateError;

    alert("Password updated successfully.");
    closePasswordModal();

    const passwordInput = document.getElementById("password");
    if (passwordInput) passwordInput.placeholder = "Password updated";
  } catch (error) {
    console.error("Password update error:", error);
    showPasswordError(error?.message || "Failed to update password.");
  } finally {
    updateBtn.disabled = false;
    updateBtn.textContent = "Update Password";
  }
}

/* ================= Sidebar / Logout ================= */

function setupSidebar() {
  const menuToggle = document.getElementById("menuToggle");
  const sidebarClose = document.getElementById("sidebarClose");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

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

