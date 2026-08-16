const password = document.getElementById("password");
const toggle = document.getElementById("togglePassword");

const loginEmail = document.getElementById("loginEmail");

if (loginEmail) {
    loginEmail.addEventListener("input", () => {
        if (/[\u0600-\u06FF]/.test(loginEmail.value)) {
            loginEmail.setCustomValidity("Please enter a valid email address using English characters only.");
        } else {
            loginEmail.setCustomValidity("");
        }
    });
}

toggle.addEventListener("click", () => {
    if (password.type === "password") {
        password.type = "text";
        toggle.classList.remove("fa-eye-slash");
        toggle.classList.add("fa-eye");
    } else {
        password.type = "password";
        toggle.classList.remove("fa-eye");
        toggle.classList.add("fa-eye-slash");
    }
});

// ===============================
// Sign in via Supabase Auth
// ===============================

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");

function showLoginError(message) {
    loginError.textContent = message;
    loginError.style.display = "block";
}

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!loginForm.checkValidity()) {
            loginForm.reportValidity();
            return;
        }

        loginError.style.display = "none";
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.textContent = "Signing in...";

        const { data, error } = await sb.auth.signInWithPassword({
            email: loginEmail.value.trim(),
            password: password.value,
        });

        if (error) {
            showLoginError("Incorrect email or password. Please try again.");
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.textContent = "Login";
            return;
        }

        // Session is set — now check the profile's role to route correctly.
        const { data: profile, error: profileError } = await sb
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();

        if (profileError || !profile) {
            showLoginError("We couldn't load your account. Please try again.");
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.textContent = "Login";
            return;
        }

        window.location.href =
            profile.role === "admin" ? "admin-dashboard.html" : "student-dashboard.html";
    });
}