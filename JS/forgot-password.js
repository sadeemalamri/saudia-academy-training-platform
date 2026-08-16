/* ================= STEP NAVIGATION ================= */

const panels = document.querySelectorAll(".fp-step-panel");
const stepIndicators = document.querySelectorAll("[data-step-indicator]");

function goToStep(step) {
    panels.forEach(panel => {
        panel.classList.toggle("active", panel.dataset.step === String(step));
    });

    stepIndicators.forEach(indicator => {
        const indicatorStep = Number(indicator.dataset.stepIndicator);
        indicator.classList.toggle("active", indicatorStep === step);
        indicator.classList.toggle("done", indicatorStep < step);
    });
}

/* ================= STEP 1: EMAIL ================= */

const fpEmail = document.getElementById("fpEmail");
const fpEmailDisplay = document.getElementById("fpEmailDisplay");

fpEmail.addEventListener("input", () => {
    if (/[\u0600-\u06FF]/.test(fpEmail.value)) {
        fpEmail.setCustomValidity("Please enter a valid email address using English characters only.");
    } else {
        fpEmail.setCustomValidity("");
    }
});

const fpEmailError = document.getElementById("fpEmailError");

function showFpEmailError(message) {
    fpEmailError.textContent = message;
    fpEmailError.style.display = "block";
}

async function sendResetCode() {
    const sendBtn = document.querySelector('[data-next="1"]');

    fpEmailError.style.display = "none";
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending...";

    const { error } = await sb.auth.resetPasswordForEmail(fpEmail.value.trim());

    sendBtn.disabled = false;
    sendBtn.textContent = "Send Code";

    if (error) {
        showFpEmailError(error.message || "Failed to send the code. Please try again.");
        return false;
    }

    return true;
}

document.querySelector('[data-next="1"]').addEventListener("click", async () => {
    // Native browser validation bubble (uses the "required" + type="email" attributes)
    if (!fpEmail.checkValidity()) {
        fpEmail.reportValidity();
        return;
    }

    fpEmailDisplay.textContent = fpEmail.value.trim();

    const sent = await sendResetCode();
    if (!sent) return;

    goToStep(2);
});

/* ================= STEP 2: OTP ================= */

const otpBoxes = document.querySelectorAll(".otp-box");
const resendCode = document.getElementById("resendCode");

otpBoxes.forEach((box, index) => {
    box.addEventListener("input", () => {
        box.value = box.value.replace(/[^0-9]/g, "");
        otpBoxes[otpBoxes.length - 1].setCustomValidity("");

        if (box.value && index < otpBoxes.length - 1) {
            otpBoxes[index + 1].focus();
        }
    });

    box.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !box.value && index > 0) {
            otpBoxes[index - 1].focus();
        }
    });
});

document.querySelector('[data-next="2"]').addEventListener("click", async () => {
    // Find the first empty box and let the browser show its native bubble on it
    const emptyBox = Array.from(otpBoxes).find(box => !box.checkValidity());

    if (emptyBox) {
        emptyBox.reportValidity();
        return;
    }

    const enteredCode = Array.from(otpBoxes).map(box => box.value).join("");
    const verifyBtn = document.querySelector('[data-next="2"]');

    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verifying...";

    const { error } = await sb.auth.verifyOtp({
        email: fpEmail.value.trim(),
        token: enteredCode,
        type: "recovery",
    });

    verifyBtn.disabled = false;
    verifyBtn.textContent = "Verify Code";

    if (error) {
        otpBoxes[otpBoxes.length - 1].setCustomValidity("Incorrect or expired code. Please try again.");
        otpBoxes[otpBoxes.length - 1].reportValidity();
        return;
    }

    // Verifying the OTP signs the user in with a temporary "recovery"
    // session — this is what lets step 3 call updateUser() next.
    goToStep(3);
});

resendCode.addEventListener("click", async (e) => {
    e.preventDefault();
    otpBoxes.forEach(box => {
        box.value = "";
        box.setCustomValidity("");
    });
    otpBoxes[0].focus();

    const originalText = resendCode.textContent;
    resendCode.textContent = "Sending...";

    const sent = await sendResetCode();

    resendCode.textContent = sent ? "Code sent!" : originalText;

    setTimeout(() => {
        resendCode.textContent = originalText;
    }, 2000);
});

/* ================= STEP 3: NEW PASSWORD ================= */

const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");

function setupToggle(inputId, toggleId) {
    const input = document.getElementById(inputId);
    const toggle = document.getElementById(toggleId);

    toggle.addEventListener("click", () => {
        if (input.type === "password") {
            input.type = "text";
            toggle.classList.remove("fa-eye-slash");
            toggle.classList.add("fa-eye");
        } else {
            input.type = "password";
            toggle.classList.remove("fa-eye");
            toggle.classList.add("fa-eye-slash");
        }
    });
}

setupToggle("newPassword", "toggleNewPassword");
setupToggle("confirmPassword", "toggleConfirmPassword");

// Same rule used on the signup page (application.js): at least 8
// characters, with an uppercase letter, a lowercase letter, and a number.
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}$/;

function validateNewPasswordStrength() {
    if (newPassword.value.trim() === "") {
        newPassword.setCustomValidity("");
        return;
    }

    if (!passwordPattern.test(newPassword.value)) {
        newPassword.setCustomValidity(
            "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number."
        );
        newPassword.reportValidity();
    } else {
        newPassword.setCustomValidity("");
    }
}

function validatePasswordsMatch() {
    if (confirmPassword.value.trim() === "") {
        confirmPassword.setCustomValidity("");
        return;
    }

    if (confirmPassword.value !== newPassword.value) {
        confirmPassword.setCustomValidity("Passwords do not match.");
    } else {
        confirmPassword.setCustomValidity("");
    }
}

// Live validation as the user types, same UX as application.js
newPassword.addEventListener("input", () => {
    validateNewPasswordStrength();
    validatePasswordsMatch();
});

confirmPassword.addEventListener("input", () => {
    validatePasswordsMatch();
    if (!confirmPassword.checkValidity()) {
        confirmPassword.reportValidity();
    }
});

const fpResetError = document.getElementById("fpResetError");

function showFpResetError(message) {
    fpResetError.textContent = message;
    fpResetError.style.display = "block";
}

document.querySelector('[data-next="3"]').addEventListener("click", async () => {
    validateNewPasswordStrength();
    validatePasswordsMatch();

    // 1) Empty field? -> native "Please fill out this field."
    if (!newPassword.checkValidity()) {
        newPassword.reportValidity();
        return;
    }

    if (!confirmPassword.checkValidity()) {
        confirmPassword.reportValidity();
        return;
    }

    const resetBtn = document.querySelector('[data-next="3"]');

    fpResetError.style.display = "none";
    resetBtn.disabled = true;
    resetBtn.textContent = "Resetting...";

    const { error } = await sb.auth.updateUser({
        password: newPassword.value,
    });

    resetBtn.disabled = false;
    resetBtn.textContent = "Reset Password";

    if (error) {
        showFpResetError(error.message || "Failed to reset password. Please try again.");
        return;
    }

    goToStep(4);
});

/* ================= BACK BUTTONS ================= */

document.querySelectorAll("[data-back]").forEach(backEl => {
    backEl.addEventListener("click", () => {
        const currentStep = Number(backEl.dataset.back);
        goToStep(currentStep - 1);
    });
});