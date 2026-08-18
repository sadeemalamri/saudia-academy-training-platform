// ===============================================================
// Supabase Client
// ===============================================================

const SUPABASE_URL =
  "https://xrugicrmtqzxohjbueoi.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhydWdpY3JtdHF6eG9oamJ1ZW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NTU3MDgsImV4cCI6MjEwMDAzMTcwOH0.CSu0e7tBXtPH0HEN610pbzEdfXOtQA4CIZmn5vdoEaU";

const sb = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

window.sb = sb;

/* ===============================================================
   Get Current User Profile
================================================================ */

async function getCurrentUserProfile() {
  const {
    data: { user },
    error: authError
  } = await sb.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      profile: null
    };
  }

  const {
    data: profile,
    error: profileError
  } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error(
      "Error loading profile:",
      profileError
    );

    return {
      user,
      profile: null
    };
  }

  return {
    user,
    profile
  };
}

/* ===============================================================
   Require Authentication
================================================================ */

async function requireAuth(
  redirectTo = "Login.html"
) {
  const {
    data: { session },
    error
  } = await sb.auth.getSession();

  if (error) {
    console.error(
      "Session error:",
      error
    );
  }

  if (!session) {
    window.location.replace(
      redirectTo
    );

    return null;
  }

  return session;
}

/* ===============================================================
   Require Admin
================================================================ */

async function requireAdmin(
  redirectTo = "student-dashboard.html"
) {
  const {
    user,
    profile
  } = await getCurrentUserProfile();

  if (
    !user ||
    !profile ||
    profile.role !== "admin"
  ) {
    window.location.replace(
      redirectTo
    );

    return null;
  }

  return profile;
}

/* ===============================================================
   Real Logout
================================================================ */

async function signOut(
  redirectTo = "loading.html"
) {
  const {
    error
  } = await sb.auth.signOut();

  if (error) {
    console.error(
      "Logout error:",
      error
    );

    throw error;
  }

  sessionStorage.clear();

  window.location.replace(
    redirectTo
  );
}

/* ===============================================================
   Shared Logout Handler

   أي رابط يحمل data-logout سيستخدم تسجيل الخروج الحقيقي
================================================================ */

document.addEventListener(
  "click",
  async (event) => {
    const logoutLink =
      event.target.closest(
        "[data-logout]"
      );

    if (!logoutLink) return;

    event.preventDefault();

    /*
      يمنع تشغيل أكواد Logout القديمة الموجودة
      في ملفات الصفحات الأخرى.
    */

    event.stopImmediatePropagation();

    if (
      logoutLink.dataset.loggingOut ===
      "true"
    ) {
      return;
    }

    logoutLink.dataset.loggingOut =
      "true";

    logoutLink.setAttribute(
      "aria-disabled",
      "true"
    );

    try {
      await signOut(
        "loading.html"
      );
    } catch (error) {
      logoutLink.dataset.loggingOut =
        "false";

      logoutLink.removeAttribute(
        "aria-disabled"
      );

      alert(
        "Unable to log out. Please try again."
      );
    }
  },
  true
);