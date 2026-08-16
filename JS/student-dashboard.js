document.addEventListener("DOMContentLoaded", async () => {

  // ===============================
  // Sidebar
  // ===============================

  const menuToggle =
    document.getElementById("menuToggle");

  const sidebarClose =
    document.getElementById("sidebarClose");

  const sidebar =
    document.getElementById("sidebar");

  const overlay =
    document.getElementById("sidebarOverlay");

  function openSidebar() {
    if (sidebar) {
      sidebar.classList.add("active");
    }

    if (overlay) {
      overlay.classList.add("active");
    }
  }

  function closeSidebar() {
    if (sidebar) {
      sidebar.classList.remove("active");
    }

    if (overlay) {
      overlay.classList.remove("active");
    }
  }

  if (menuToggle) {
    menuToggle.addEventListener(
      "click",
      openSidebar
    );
  }

  if (sidebarClose) {
    sidebarClose.addEventListener(
      "click",
      closeSidebar
    );
  }

  if (overlay) {
    overlay.addEventListener(
      "click",
      closeSidebar
    );
  }

  // ===============================
  // Dashboard HTML Elements
  // ===============================

  const headerUserName =
    document.getElementById("headerUserName");

  const welcomeUserName =
    document.getElementById("welcomeUserName");

  const applicationId =
    document.getElementById("applicationId");

  const university =
    document.getElementById("university");

  const major =
    document.getElementById("major");

  const applicationStatus =
    document.getElementById("applicationStatus");

  const trainingTerm =
    document.getElementById("trainingTerm");

  const submissionDate =
    document.getElementById("submissionDate");

  const logoutBtn =
    document.getElementById("logoutBtn");

  // ===============================
  // Notification Elements
  // ===============================

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

        ${isRead
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

  // ===============================
  // Status Display Names
  // ===============================

  const statusLabels = {
    pending: "Pending",
    under_review: "Under Review",
    interview: "Interview",
    accepted: "Accepted by Administration",
    rejected: "Rejected"
  };

  // ===============================
  // Date Formatter
  // ===============================

  function formatDate(dateValue) {
    if (!dateValue) {
      return "—";
    }

    const date =
      new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "short",
        day: "2-digit"
      }
    );
  }

  // ===============================
  // Set Empty Application Values
  // ===============================

  function showNoApplication() {
    if (applicationId) {
      applicationId.textContent =
        "No application";
    }

    if (university) {
      university.textContent = "—";
    }

    if (major) {
      major.textContent = "—";
    }

    if (applicationStatus) {
      applicationStatus.textContent =
        "Not Submitted";
    }

    if (trainingTerm) {
      trainingTerm.textContent = "—";
    }

    if (submissionDate) {
      submissionDate.textContent = "—";
    }
  }

  // ===============================
  // Load Student Dashboard Data
  // ===============================

  async function loadStudentDashboard() {

    try {

      // Get logged-in user
      const {
        data: { user },
        error: userError
      } = await sb.auth.getUser();

      if (userError) {
        console.error(
          "Error getting logged-in user:",
          userError
        );

        window.location.href =
          "Login.html";

        return;
      }

      if (!user) {
        window.location.href =
          "Login.html";

        return;
      }

      // ===============================
      // Get Student Profile
      // ===============================

      const {
        data: profile,
        error: profileError
      } = await sb
        .from("profiles")
        .select(
          "full_name, email, role"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Error loading profile:",
          profileError
        );
      }

      // Prevent admin from opening student dashboard
      if (profile?.role === "admin") {
        window.location.href =
          "admin-dashboard.html";

        return;
      }

      const fullName =
        profile?.full_name?.trim() ||
        user.user_metadata
          ?.full_name?.trim() ||
        user.email
          ?.split("@")[0] ||
        "Student";

      const firstName =
        fullName.split(" ")[0];

      if (headerUserName) {
        headerUserName.textContent =
          fullName;
      }

      if (welcomeUserName) {
        welcomeUserName.textContent =
          firstName;
      }

      // ===============================
      // Get Latest Student Application
      // ===============================

      const {
        data: application,
        error: applicationError
      } = await sb
        .from("applications")
        .select(`
          id,
          university,
          other_university,
          major,
          status,
          submitted_at,
          created_at,
          program_requirements (
            training_term
          )
        `)
        .eq("student_id", user.id)
        .order(
          "created_at",
          { ascending: false }
        )
        .limit(1)
        .maybeSingle();

      if (applicationError) {
        console.error(
          "Error loading application:",
          applicationError
        );

        showNoApplication();
        renderStatusNotification(null);
        return;
      }

      // Student has not submitted an application
      if (!application) {
        showNoApplication();
        renderStatusNotification(null);
        return;
      }

      // ===============================
      // Display Actual Application Data
      // ===============================

      if (applicationId) {
        applicationId.textContent =
          application.id
            ? application.id
              .split("-")[0]
              .toUpperCase()
            : "—";
      }

      if (university) {
        university.textContent =
          application.university === "Other"
            ? application.other_university ||
            "Other"
            : application.university ||
            "—";
      }

      if (major) {
        major.textContent =
          application.major || "—";
      }

      if (applicationStatus) {
        applicationStatus.textContent =
          statusLabels[
          application.status
          ] ||
          application.status ||
          "—";
      }

      if (trainingTerm) {
        trainingTerm.textContent =
          application
            .program_requirements
            ?.training_term ||
          "—";
      }

      if (submissionDate) {
        submissionDate.textContent =
          formatDate(
            application.submitted_at ||
            application.created_at
          );
      }
      renderStatusNotification(application);

    } catch (error) {

      console.error(
        "Dashboard loading error:",
        error
      );

      showNoApplication();
      renderStatusNotification(null);
    }
  }

  // ===============================
  // Logout
  // ===============================

  if (logoutBtn) {
    logoutBtn.addEventListener(
      "click",
      async (event) => {

        event.preventDefault();

        const { error } =
          await sb.auth.signOut();

        if (error) {
          console.error(
            "Logout error:",
            error
          );

          return;
        }

        sessionStorage.clear();

        window.location.href =
          "Login.html";
      }
    );
  }

  // ===============================
  // Initialize Dashboard
  // ===============================

  await loadStudentDashboard();

});