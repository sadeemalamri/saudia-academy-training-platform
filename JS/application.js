// ===============================
// Show / Hide Other City Field
// ===============================

const citySelect = document.getElementById("city");
const otherCityField = document.getElementById("otherCityField");
const otherCity = document.getElementById("otherCity");

citySelect.addEventListener("change", function () {

    if (this.value === "Other") {
        otherCityField.style.display = "flex";
        otherCity.required = true;
    } else {
        otherCityField.style.display = "none";
        otherCity.required = false;
        otherCity.value = "";
        otherCity.setCustomValidity("");
    }

});

// ===============================
// Custom validation rules
// (all use the browser's native validation bubble — same one as
//  "Please fill out this field." — but with our own message)
// ===============================

// Helper: only apply the custom rule once the field is non-empty,
// so an empty field still shows the plain native "required" message.
function addValidator(input, testFn, message) {

    input.addEventListener("input", () => {

        if (input.value.trim() === "" || testFn(input.value)) {
            input.setCustomValidity("");
        } else {
            input.setCustomValidity(message);
            input.reportValidity();
        }

    });

}

// ---- First / Last Name / Other City: must start with a letter, English letters only ----

const namePattern = /^[A-Za-z][A-Za-z\s]*$/;

const firstName = document.getElementById("firstName");
const lastName = document.getElementById("lastName");

addValidator(
    firstName,
    (v) => namePattern.test(v),
    "Name must start with a letter and contain English letters only."
);

addValidator(
    lastName,
    (v) => namePattern.test(v),
    "Name must start with a letter and contain English letters only."
);

addValidator(
    otherCity,
    (v) => namePattern.test(v),
    "City must start with a letter and contain English letters only."
);

// ---- National ID: exactly 10 digits, numbers only ----

const nationalId = document.getElementById("nationalId");

// Strip any non-digit character immediately, and hard-limit to 10 digits (even on paste)
nationalId.addEventListener("input", () => {

    nationalId.value = nationalId.value
        .replace(/\D/g, "")
        .slice(0, 10);

});

addValidator(
    nationalId,
    (v) => /^[0-9]{10}$/.test(v),
    "National ID must be exactly 10 digits, numbers only."
);

// ---- Mobile Number: 12 digits total, must start with 966 (966 + 9-digit number) ----

const mobile = document.getElementById("mobile");
const mobilePrefix = "966";

mobile.addEventListener("input", () => {

    // Hard-block anything beyond 12 digits, even on paste, and strip non-digit characters
    mobile.value = mobile.value
        .replace(/\D/g, "")
        .slice(0, 12);

    const value = mobile.value;

    if (value.length === 0) {
        mobile.setCustomValidity("");
        return;
    }

    // Check whether what's typed so far could still become a valid "966..." number.
    // Catches a wrong start immediately (e.g. typing "5" first), not just after
    // the full number is done.
    const stillMatchesPrefix =
        mobilePrefix.startsWith(value) ||
        value.startsWith(mobilePrefix);

    if (!stillMatchesPrefix) {

        mobile.setCustomValidity(
            "Phone number must start with 966."
        );

        mobile.reportValidity();
        return;
    }

    // Once the prefix is correct, check the full 12-digit rule
    if (!/^966[0-9]{9}$/.test(value)) {

        mobile.setCustomValidity(
            "Phone number must start with 966 followed by 9 digits (12 digits total)."
        );

    } else {

        mobile.setCustomValidity("");

    }

});

// ---- Email: English characters only (no Arabic) ----

const email = document.getElementById("email");

addValidator(
    email,
    (v) => !/[\u0600-\u06FF]/.test(v),
    "Please enter a valid email address using English characters only."
);

// ===============================
// Password validation
// ===============================

const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");

const passwordPattern =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}$/;

addValidator(
    password,
    (v) => passwordPattern.test(v),
    "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number."
);

// Check whether both passwords match
function validatePasswordMatch() {

    if (confirmPassword.value === "") {

        confirmPassword.setCustomValidity("");
        return;

    }

    if (confirmPassword.value !== password.value) {

        confirmPassword.setCustomValidity(
            "Passwords do not match."
        );

    } else {

        confirmPassword.setCustomValidity("");

    }

}

password.addEventListener("input", validatePasswordMatch);

confirmPassword.addEventListener("input", () => {

    validatePasswordMatch();

    if (!confirmPassword.checkValidity()) {
        confirmPassword.reportValidity();
    }

});

// ===============================
// Show / Hide Password
// ===============================

const togglePassword =
    document.getElementById("togglePassword");

const toggleConfirmPassword =
    document.getElementById("toggleConfirmPassword");

function togglePasswordVisibility(input, icon) {

    if (input.type === "password") {

        input.type = "text";

        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");

        icon.title = "Hide password";

    } else {

        input.type = "password";

        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");

        icon.title = "Show password";

    }

}

togglePassword.addEventListener("click", () => {

    togglePasswordVisibility(
        password,
        togglePassword
    );

});

toggleConfirmPassword.addEventListener("click", () => {

    togglePasswordVisibility(
        confirmPassword,
        toggleConfirmPassword
    );

});

// ---- Date of Birth: cannot be in the future ----

const dobInput = document.getElementById("dob");
const today = new Date().toISOString().split("T")[0];

dobInput.setAttribute("max", today); // blocks future dates in the picker itself

dobInput.addEventListener("input", () => {

    if (dobInput.value && dobInput.value > today) {

        dobInput.setCustomValidity(
            "Date of birth cannot be in the future."
        );

    } else {

        dobInput.setCustomValidity("");

    }

});

// ===============================
// Require all fields before moving to the next step
// ===============================

const personalForm =
    document.getElementById("personalForm");

const nextBtn =
    document.getElementById("nextBtn");

const signupError = document.getElementById("signupError");

const signupErrorText = document.getElementById("signupErrorText");
const signupLogoutLink = document.getElementById("signupLogoutLink");

function showSignupError(message, showLogoutLink = false) {
    signupErrorText.textContent = message;
    signupError.style.display = "block";
    signupLogoutLink.style.display = showLogoutLink ? "inline" : "none";
}

if (signupLogoutLink) {
    signupLogoutLink.addEventListener("click", async (e) => {
        e.preventDefault();
        await sb.auth.signOut();
        window.location.reload();
    });
}

// ===============================
// Warn immediately on page load if someone is already logged in —
// don't wait until they've filled the whole form to find out.
// ===============================

(async function warnIfAlreadyLoggedIn() {
    const { data: { session } } = await sb.auth.getSession();

    if (session) {
        showSignupError(
            `You're currently logged in as ${session.user.email}.`,
            true
        );
        nextBtn.disabled = true;
    }
})();

// ===============================
// Restore saved Step 1 data
// ===============================

const savedStep1 = JSON.parse(
    sessionStorage.getItem("wizard_step1") || "{}"
);

if (Object.keys(savedStep1).length > 0) {

    firstName.value = savedStep1.first_name || "";
    lastName.value = savedStep1.last_name || "";
    nationalId.value = savedStep1.national_id || "";
    email.value = savedStep1.email || "";
    mobile.value = savedStep1.mobile || "";
    dobInput.value = savedStep1.dob || "";
    citySelect.value = savedStep1.city || "";

    if (savedStep1.gender) {

        const genderInput = personalForm.querySelector(
            `input[name="gender"][value="${savedStep1.gender}"]`
        );

        if (genderInput) {
            genderInput.checked = true;
        }

    }

    if (savedStep1.city === "Other") {

        otherCityField.style.display = "flex";
        otherCity.required = true;
        otherCity.value = savedStep1.other_city || "";

    } else {

        otherCityField.style.display = "none";
        otherCity.required = false;

    }

}

nextBtn.addEventListener("click", async () => {

    validatePasswordMatch();

    if (!personalForm.checkValidity()) {

        personalForm.reportValidity();
        return;

    }

    signupError.style.display = "none";
    nextBtn.disabled = true;
    nextBtn.querySelector("span").textContent = "Please wait...";

    // ---- 1) Create the auth account. If a session already exists (e.g.
    //         the admin forgot to log out first), block instead of
    //         silently reusing that account — this used to overwrite
    //         whoever was logged in with the new person's data. ----

    const { data: { session: existingSession } } = await sb.auth.getSession();

    if (existingSession) {
        showSignupError(
            `You're currently logged in as ${existingSession.user.email}.`,
            true
        );
        nextBtn.disabled = false;
        nextBtn.querySelector("span").textContent = "Next";
        return;
    }
    const normalizedEmail =
        email.value.trim().toLowerCase();

    const { data, error } = await sb.auth.signUp({
        email: normalizedEmail,
        password: password.value,
        options: {
            data: {
                full_name: `${firstName.value.trim()} ${lastName.value.trim()}`,
            },
        },
    });

    if (error) {
        showSignupError(
            error.message.includes("already registered")
                ? "This email is already registered. Please log in instead."
                : error.message
        );
        nextBtn.disabled = false;
        nextBtn.querySelector("span").textContent = "Next";
        return;
    }

    // If Supabase requires email confirmation, signUp() succeeds but
    // returns no session — the student can't continue the wizard yet.
    if (!data.session) {
        showSignupError(
            "Account created! Please check your email and confirm your address before continuing, then log in from the Login page."
        );
        nextBtn.disabled = false;
        nextBtn.querySelector("span").textContent = "Next";
        return;
    }

    const currentUser = data.user;

    // ---- 2) Save the personal info collected here straight to the
    //         student's profile row too (phone, dob, gender, national_id,
    //         city already exist as real profile fields, not just
    //         application-specific ones). ----
    if (currentUser) {

        const { error: profileError } = await sb
            .from("profiles")
            .update({
                phone: mobile.value.trim(),
                dob: dobInput.value,
                gender: personalForm.querySelector('input[name="gender"]:checked')?.value || null,
                national_id: nationalId.value.trim(),
                city: citySelect.value,
                other_city: citySelect.value === "Other" ? otherCity.value.trim() : null,
            })
            .eq("id", currentUser.id);

        if (profileError) {
            console.error("Failed to update profile:", profileError);
            // Not fatal — the same data is also stashed in sessionStorage
            // below and will still reach `applications` at the end.
        }

    }

    // ---- 3) Stash step 1 data in sessionStorage so later steps
    //         (academic, documents, review) can build the final
    //         `applications` row without saving anything to the
    //         database yet. Never store the password. ----
    const step1Data = {
        first_name: firstName.value.trim(),
        last_name: lastName.value.trim(),
        national_id: nationalId.value.trim(),
        mobile: mobile.value.trim(),
        dob: dobInput.value,
        gender: personalForm.querySelector('input[name="gender"]:checked')?.value || "",
        city: citySelect.value,
        other_city: citySelect.value === "Other" ? otherCity.value.trim() : null,
        email: normalizedEmail,
    };

    sessionStorage.setItem("wizard_step1", JSON.stringify(step1Data));

    window.location.href = "academic.html";

});