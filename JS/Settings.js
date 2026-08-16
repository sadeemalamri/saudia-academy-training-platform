requireAuth();

document.addEventListener("DOMContentLoaded", async function () {

  const dobInput = document.getElementById("dob");
  const phoneInput = document.getElementById("phone");
  const emailInput = document.getElementById("email");
  const fullNameInput = document.getElementById("fullName");
  const genderInput = document.getElementById("gender");

  const headerUserName = document.getElementById("headerUserName");
  const logoutBtn = document.getElementById("logoutBtn");

  const saveBtn = document.getElementById("saveChangesBtn");
  const profileForm = document.getElementById("profileForm");
  const passwordForm = document.getElementById("passwordForm");

  let currentUser = null;

  /* Prevent future dates */
  if (dobInput) {
    const today = new Date().toISOString().split("T")[0];
    dobInput.setAttribute("max", today);
  }

  setupProfileValidation();
  setupPasswordValidation();
  setupSidebarToggle();

  await loadProfileData();
  await setupStudentNotifications();

  if (saveBtn) {
    saveBtn.addEventListener("click", async function () {
      await validateProfileBeforeSave(profileForm);
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener("submit", function (event) {
      event.preventDefault();
      validatePasswordBeforeUpdate(passwordForm);
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function (event) {
      event.preventDefault();

      const { error } = await sb.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
        alert("Unable to log out.");
        return;
      }

      sessionStorage.clear();
      window.location.href = "Login.html";
    });
  }

  /* ===============================
     Load Profile from Supabase
  ================================ */

  async function loadProfileData() {
    try {
      const {
        data: { user },
        error: userError
      } = await sb.auth.getUser();

      if (userError || !user) {
        window.location.href = "Login.html";
        return;
      }

      currentUser = user;

      const {
        data: profile,
        error: profileError
      } = await sb
        .from("profiles")
        .select(`
          full_name,
          email,
          phone,
          dob,
          gender,
          role
        `)
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile loading error:", profileError);
        alert("Unable to load profile information.");
        return;
      }

      if (!profile) {
        alert("No profile was found for this account.");
        return;
      }

      if (profile.role === "admin") {
        window.location.href = "admin-dashboard.html";
        return;
      }

      const displayName =
        profile.full_name?.trim() ||
        user.user_metadata?.full_name?.trim() ||
        user.email?.split("@")[0] ||
        "Student";

      if (fullNameInput) {
        fullNameInput.value = displayName;
        fullNameInput.dataset.initialValue = fullNameInput.value;
      }

      if (headerUserName) {
        headerUserName.textContent = displayName;
      }

      if (dobInput) {
        dobInput.value = profile.dob || "";
        dobInput.dataset.initialValue = dobInput.value;
      }

      if (genderInput) {
        genderInput.value = profile.gender || "";
      }

      if (phoneInput) {
        phoneInput.value = profile.phone || "";
        phoneInput.dataset.initialValue = phoneInput.value;
      }

      if (emailInput) {
        emailInput.value =
          profile.email ||
          user.email ||
          "";

        emailInput.dataset.initialValue = emailInput.value;
      }

    } catch (error) {
      console.error("Settings loading error:", error);
      alert("Something went wrong while loading your profile.");
    }
  }
});


/* ===============================
   Student Notifications
================================ */

async function setupStudentNotifications() {
  const notificationBtn =
    document.getElementById("notificationBtn");

  const notificationDropdown =
    document.getElementById("notificationDropdown");

  const notificationBadge =
    document.getElementById("notificationBadge");

  const notificationList =
    document.getElementById("notificationList");

  const unreadText =
    document.getElementById("unreadText");

  let currentNotificationKey = null;

  function updateNotificationCount(count) {
    if (notificationBadge) {
      notificationBadge.textContent = count;

      notificationBadge.classList.toggle(
        "hidden",
        count === 0
      );
    }

    if (unreadText) {
      unreadText.textContent =
        count === 1
          ? "1 unread notification"
          : "No unread notifications";
    }
  }

  function renderStatusNotification(application) {
    if (!notificationList) {
      return;
    }

    if (
      !application ||
      !["accepted", "rejected"].includes(
        application.status
      )
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

    const isAccepted =
      application.status === "accepted";

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
      localStorage.getItem(
        currentNotificationKey
      ) === "read";

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

    updateNotificationCount(
      isRead ? 0 : 1
    );
  }

  function markStatusNotificationAsRead() {
    if (!currentNotificationKey) {
      return;
    }

    localStorage.setItem(
      currentNotificationKey,
      "read"
    );

    const notificationItem =
      document.getElementById(
        "statusNotificationItem"
      );

    notificationItem?.classList.remove(
      "unread"
    );

    notificationItem
      ?.querySelector(".unread-dot")
      ?.remove();

    updateNotificationCount(0);
  }

  if (
    notificationBtn &&
    notificationDropdown
  ) {
    notificationBtn.addEventListener(
      "click",
      function (event) {
        event.stopPropagation();

        const isOpening =
          !notificationDropdown.classList.contains(
            "show"
          );

        notificationDropdown.classList.toggle(
          "show"
        );

        if (isOpening) {
          markStatusNotificationAsRead();
        }
      }
    );

    notificationDropdown.addEventListener(
      "click",
      function (event) {
        event.stopPropagation();
      }
    );

    document.addEventListener(
      "click",
      function () {
        notificationDropdown.classList.remove(
          "show"
        );
      }
    );
  }

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
      .order(
        "created_at",
        { ascending: false }
      )
      .limit(1)
      .maybeSingle();

    if (applicationError) {
      console.error(
        "Error loading notification:",
        applicationError
      );

      renderStatusNotification(null);
      return;
    }

    renderStatusNotification(application);

  } catch (error) {
    console.error(
      "Notification loading error:",
      error
    );

    renderStatusNotification(null);
  }
}

/* ===============================
   Sidebar
================================ */

function setupSidebarToggle() {
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
}

/* ===============================
   Date Picker
================================ */

function openDatePicker() {
  const input = document.getElementById("dob");

  if (!input) return;

  input.removeAttribute("readonly");
  input.classList.add("active-edit");

  if (input.showPicker) {
    input.showPicker();
  } else {
    input.focus();
  }
}

/* ===============================
   Edit / Cancel Fields
================================ */

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
    input.setAttribute("readonly", "");
    input.classList.remove("active-edit");

    icon.classList.remove("fa-xmark", "cancel-edit-icon");
    icon.classList.add("fa-pen");
    icon.title = "Edit";
  }
}

/* ===============================
   Validation Helper
================================ */

function addValidator(input, testFn, message) {
  if (!input) return;

  input.addEventListener("input", function () {
    if (
      input.value.trim() === "" ||
      testFn(input.value.trim())
    ) {
      input.setCustomValidity("");
    } else {
      input.setCustomValidity(message);
      input.reportValidity();
    }
  });

  input.addEventListener("change", function () {
    if (
      input.value.trim() === "" ||
      testFn(input.value.trim())
    ) {
      input.setCustomValidity("");
    } else {
      input.setCustomValidity(message);
      input.reportValidity();
    }
  });
}

/* ===============================
   Profile Validation
================================ */

function setupProfileValidation() {
  const fullNameInput = document.getElementById("fullName");
  const dobInput = document.getElementById("dob");
  const phoneInput = document.getElementById("phone");
  const emailInput = document.getElementById("email");

  const namePattern = /^[A-Za-z][A-Za-z\s]*$/;

  addValidator(
    fullNameInput,
    function (value) {
      return namePattern.test(value);
    },
    "Name must start with a letter and contain English letters only."
  );

  if (dobInput) {
    const today = new Date().toISOString().split("T")[0];

    dobInput.addEventListener("input", function () {
      if (dobInput.value && dobInput.value > today) {
        dobInput.setCustomValidity(
          "Date of birth cannot be in the future."
        );

        dobInput.reportValidity();
      } else {
        dobInput.setCustomValidity("");
      }
    });
  }

  if (phoneInput) {
    const phonePrefix = "966";

    phoneInput.addEventListener("input", function () {
      phoneInput.value = phoneInput.value
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
          "Phone number must start with 966 followed by 9 digits."
        );
      } else {
        phoneInput.setCustomValidity("");
      }
    });
  }

  addValidator(
    emailInput,
    function (value) {
      if (/[\u0600-\u06FF]/.test(value)) {
        return false;
      }

      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    },
    "Please enter a valid email address using English characters only."
  );
}

/* ===============================
   Save Profile to Supabase
================================ */

async function validateProfileBeforeSave(form) {
  const fullNameInput = document.getElementById("fullName");
  const dobInput = document.getElementById("dob");
  const phoneInput = document.getElementById("phone");
  const emailInput = document.getElementById("email");
  const headerUserName = document.getElementById("headerUserName");
  const saveBtn = document.getElementById("saveChangesBtn");

  const today = new Date().toISOString().split("T")[0];

  const namePattern = /^[A-Za-z][A-Za-z\s]*$/;

  if (fullNameInput && fullNameInput.value.trim() !== "") {
    if (!namePattern.test(fullNameInput.value.trim())) {
      fullNameInput.setCustomValidity(
        "Name must start with a letter and contain English letters only."
      );
    }
  } else if (fullNameInput) {
    fullNameInput.setCustomValidity("This field cannot be empty.");
  }

  if (dobInput && dobInput.value && dobInput.value > today) {
    dobInput.setCustomValidity(
      "Date of birth cannot be in the future."
    );
  }

  if (phoneInput && phoneInput.value.trim() !== "") {
    const digitsOnly =
      phoneInput.value.trim().replace(/\D/g, "");

    if (!/^966[0-9]{9}$/.test(digitsOnly)) {
      phoneInput.setCustomValidity(
        "Phone number must start with 966 followed by 9 digits."
      );
    }
  }

  if (emailInput && emailInput.value.trim() !== "") {
    const emailValue = emailInput.value.trim();

    const hasArabic =
      /[\u0600-\u06FF]/.test(emailValue);

    const isValidFormat =
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailValue);

    if (hasArabic || !isValidFormat) {
      emailInput.setCustomValidity(
        "Please enter a valid email address using English characters only."
      );
    }
  }

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const fullNameChanged =
    fullNameInput &&
    fullNameInput.value.trim() !== fullNameInput.dataset.initialValue;

  const dobChanged =
    dobInput &&
    dobInput.value !== dobInput.dataset.initialValue;

  const phoneChanged =
    phoneInput &&
    phoneInput.value !== phoneInput.dataset.initialValue;

  const emailChanged =
    emailInput &&
    emailInput.value !== emailInput.dataset.initialValue;

  if (!fullNameChanged && !dobChanged && !phoneChanged && !emailChanged) {
    lockEditedField("fullName");
    lockEditedField("dob");
    lockEditedField("phone");
    lockEditedField("email");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    const {
      data: { user },
      error: userError
    } = await sb.auth.getUser();

    if (userError || !user) {
      window.location.href = "Login.html";
      return;
    }

    const updatedFullName =
      fullNameInput?.value.trim() || "";

    const updatedEmail =
      emailInput?.value.trim() || "";

    const {
      error: profileUpdateError
    } = await sb
      .from("profiles")
      .update({
        full_name: updatedFullName || null,
        dob: dobInput?.value || null,
        phone: phoneInput?.value.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (profileUpdateError) {
      throw profileUpdateError;
    }

    // Keep the name shown on admin pages (which read applications.first_name /
    // last_name, not profiles.full_name) in sync with what the student just set.
    if (fullNameChanged && updatedFullName) {
      const nameParts = updatedFullName.split(/\s+/).filter(Boolean);
      const newFirstName = nameParts[0] || updatedFullName;
      const newLastName = nameParts.slice(1).join(" ") || newFirstName;

      const {
        error: applicationsUpdateError
      } = await sb
        .from("applications")
        .update({
          first_name: newFirstName,
          last_name: newLastName
        })
        .eq("student_id", user.id);

      if (applicationsUpdateError) {
        console.error(
          "Could not sync name to applications:",
          applicationsUpdateError
        );
        // Not fatal — the profile itself still saved successfully.
      }
    }

    let emailChangeMessage = "";

    // The email is handled separately from the rest of the profile: it's
    // only ever written to `profiles.email` by a database trigger once
    // auth.users.email actually changes (i.e. after real confirmation) —
    // never directly here — so there's no risk of the two getting out of sync.
    if (
      updatedEmail &&
      updatedEmail !== user.email
    ) {
      const {
        error: authEmailError
      } = await sb.auth.updateUser({
        email: updatedEmail
      });

      if (authEmailError) {
        console.error("Email change error:", authEmailError);

        // Revert the field back to the real email — the change never took effect.
        if (emailInput) {
          emailInput.value = emailInput.dataset.initialValue;
        }

        emailChangeMessage =
          "\n\nYour email could not be changed right now. The rest of your changes were saved.";
      } else {
        emailChangeMessage =
          "\n\nCheck your new email address to confirm the change — your login email won't update until you do.";
      }
    }

    lockEditedField("fullName");
    lockEditedField("dob");
    lockEditedField("phone");
    lockEditedField("email");

    if (fullNameInput) {
      fullNameInput.dataset.initialValue =
        fullNameInput.value.trim();
    }

    if (headerUserName && updatedFullName) {
      headerUserName.textContent = updatedFullName;
    }

    if (dobInput) {
      dobInput.dataset.initialValue =
        dobInput.value;
    }

    if (phoneInput) {
      phoneInput.dataset.initialValue =
        phoneInput.value;
    }

    if (emailInput) {
      emailInput.dataset.initialValue =
        emailInput.value;
    }

    alert("Changes saved successfully." + emailChangeMessage);

  } catch (error) {
    console.error("Profile update error:", error);

    alert(
      error?.message ||
      "Unable to save changes."
    );

  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Changes";
  }
}

/* ===============================
   Password Modal
================================ */

function openPasswordModal() {
  const modal =
    document.getElementById("passwordModal");

  const passwordUpdateError =
    document.getElementById("passwordUpdateError");

  if (passwordUpdateError) {
    passwordUpdateError.style.display = "none";
  }

  modal.classList.add("show");
}

function closePasswordModal() {
  document
    .getElementById("passwordModal")
    .classList.remove("show");

  const currentPassword =
    document.getElementById("currentPassword");

  const newPassword =
    document.getElementById("newPassword");

  const confirmPassword =
    document.getElementById("confirmPassword");

  currentPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";

  currentPassword.setCustomValidity("");
  newPassword.setCustomValidity("");
  confirmPassword.setCustomValidity("");
}

function togglePassword(inputId, icon) {
  const input =
    document.getElementById(inputId);

  if (input.type === "password") {
    input.type = "text";

    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");

  } else {
    input.type = "password";

    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  }
}

window.onclick = function (event) {
  const modal =
    document.getElementById("passwordModal");

  if (event.target === modal) {
    closePasswordModal();
  }
};

/* ===============================
   Password Validation
================================ */

function setupPasswordValidation() {
  const currentPassword =
    document.getElementById("currentPassword");

  const newPassword =
    document.getElementById("newPassword");

  const confirmPassword =
    document.getElementById("confirmPassword");

  if (currentPassword) {
    currentPassword.addEventListener("input", function () {
      currentPassword.setCustomValidity("");
    });
  }

  if (newPassword) {
    newPassword.addEventListener("input", function () {
      validateNewPassword();
      validateConfirmPassword();
    });
  }

  if (confirmPassword) {
    confirmPassword.addEventListener("input", function () {
      validateConfirmPassword();
    });
  }
}

function validateNewPassword() {
  const newPassword =
    document.getElementById("newPassword");

  const newValue =
    newPassword.value.trim();

  if (newValue === "") {
    newPassword.setCustomValidity("");
    return true;
  }

  if (/[\u0600-\u06FF]/.test(newValue)) {
    newPassword.setCustomValidity(
      "Password cannot contain Arabic characters."
    );

    newPassword.reportValidity();
    return false;
  }

  if (newValue.length < 8) {
    newPassword.setCustomValidity(
      "New password must be at least 8 characters."
    );

    newPassword.reportValidity();
    return false;
  }

  newPassword.setCustomValidity("");
  return true;
}

function validateConfirmPassword() {
  const newPassword =
    document.getElementById("newPassword");

  const confirmPassword =
    document.getElementById("confirmPassword");

  const newValue =
    newPassword.value.trim();

  const confirmValue =
    confirmPassword.value.trim();

  if (confirmValue === "") {
    confirmPassword.setCustomValidity("");
    return true;
  }

  if (newValue !== confirmValue) {
    confirmPassword.setCustomValidity(
      "New password and confirmation do not match."
    );

    confirmPassword.reportValidity();
    return false;
  }

  confirmPassword.setCustomValidity("");
  return true;
}

function showPasswordUpdateError(message) {
  const passwordUpdateError =
    document.getElementById("passwordUpdateError");

  if (!passwordUpdateError) return;

  passwordUpdateError.textContent = message;
  passwordUpdateError.style.display = "block";
}

async function validatePasswordBeforeUpdate(form) {
  const currentPassword =
    document.getElementById("currentPassword");

  const newPassword =
    document.getElementById("newPassword");

  const confirmPassword =
    document.getElementById("confirmPassword");

  const updateBtn =
    document.getElementById("updatePasswordBtn");

  currentPassword.setCustomValidity("");

  validateNewPassword();
  validateConfirmPassword();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const passwordUpdateError =
    document.getElementById("passwordUpdateError");

  passwordUpdateError.style.display = "none";

  updateBtn.disabled = true;
  updateBtn.textContent = "Updating...";

  try {
    const {
      data: { user },
      error: userError
    } = await sb.auth.getUser();

    if (userError || !user) {
      showPasswordUpdateError(
        "Your session has expired. Please log in again."
      );

      return;
    }

    const {
      error: signInError
    } = await sb.auth.signInWithPassword({
      email: user.email,
      password: currentPassword.value
    });

    if (signInError) {
      currentPassword.setCustomValidity(
        "Current password is incorrect."
      );

      currentPassword.reportValidity();
      return;
    }

    const {
      error: updateError
    } = await sb.auth.updateUser({
      password: newPassword.value
    });

    if (updateError) {
      throw updateError;
    }

    alert("Password updated successfully.");

    closePasswordModal();

    const passwordInput =
      document.getElementById("password");

    passwordInput.placeholder =
      "Password updated";

  } catch (error) {
    console.error(
      "Password update error:",
      error
    );

    showPasswordUpdateError(
      error?.message ||
      "Failed to update password."
    );

  } finally {
    updateBtn.disabled = false;
    updateBtn.textContent =
      "Update Password";
  }
}

/* ===============================
   Lock Field
================================ */

function lockEditedField(id) {
  const input =
    document.getElementById(id);

  if (!input) return;

  input.setAttribute("readonly", "");
  input.classList.remove("active-edit");
  input.setCustomValidity("");

  const wrapper =
    input.closest(".input-with-icon");

  if (!wrapper) return;

  const icon =
    wrapper.querySelector(".edit-icon");

  if (!icon) return;

  icon.classList.remove(
    "fa-xmark",
    "cancel-edit-icon"
  );

  if (id === "dob") {
    icon.classList.remove("fa-pen");
    icon.classList.add(
      "fa-calendar-days"
    );

    icon.title = "Select date";

  } else {
    icon.classList.remove(
      "fa-calendar-days"
    );

    icon.classList.add("fa-pen");
    icon.title = "Edit";
  }
}