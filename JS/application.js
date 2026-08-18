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

const nationalId = document.getElementById("nationalId");

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


const mobile = document.getElementById("mobile");
const mobilePrefix = "966";

mobile.addEventListener("input", () => {

    mobile.value = mobile.value
        .replace(/\D/g, "")
        .slice(0, 12);

    const value = mobile.value;

    if (value.length === 0) {
        mobile.setCustomValidity("");
        return;
    }

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

    if (!/^966[0-9]{9}$/.test(value)) {

        mobile.setCustomValidity(
            "Phone number must start with 966 followed by 9 digits (12 digits total)."
        );

    } else {

        mobile.setCustomValidity("");

    }

});

const email = document.getElementById("email");

addValidator(
    email,
    (v) => !/[\u0600-\u06FF]/.test(v),
    "Please enter a valid email address using English characters only."
);


const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");

const passwordPattern =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}$/;

addValidator(
    password,
    (v) => passwordPattern.test(v),
    "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number."
);

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

password.addEventListener(
    "input",
    validatePasswordMatch
);

confirmPassword.addEventListener(
    "input",
    () => {

        validatePasswordMatch();

        if (!confirmPassword.checkValidity()) {
            confirmPassword.reportValidity();
        }

    }
);


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

togglePassword.addEventListener(
    "click",
    () => {

        togglePasswordVisibility(
            password,
            togglePassword
        );

    }
);

toggleConfirmPassword.addEventListener(
    "click",
    () => {

        togglePasswordVisibility(
            confirmPassword,
            toggleConfirmPassword
        );

    }
);


const dobInput = document.getElementById("dob");
const today =
    new Date()
        .toISOString()
        .split("T")[0];

dobInput.setAttribute(
    "max",
    today
);

dobInput.addEventListener(
    "input",
    () => {

        if (
            dobInput.value &&
            dobInput.value > today
        ) {

            dobInput.setCustomValidity(
                "Date of birth cannot be in the future."
            );

        } else {

            dobInput.setCustomValidity("");

        }

    }
);


const personalForm =
    document.getElementById("personalForm");

const nextBtn =
    document.getElementById("nextBtn");

const signupError =
    document.getElementById("signupError");

const signupErrorText =
    document.getElementById("signupErrorText");

const signupLogoutLink =
    document.getElementById("signupLogoutLink");


function showSignupError(
    message,
    showLogoutLink = false
) {

    if (signupErrorText) {
        signupErrorText.textContent =
            message;
    }

    if (signupError) {
        signupError.style.display =
            "block";
    }

    if (signupLogoutLink) {
        signupLogoutLink.style.display =
            showLogoutLink
                ? "inline"
                : "none";
    }

}


if (signupLogoutLink) {

    signupLogoutLink.addEventListener(
        "click",
        async (e) => {

            e.preventDefault();

            await sb.auth.signOut();

            window.location.reload();

        }
    );

}


// ========================================
// Restore Step 1 data
// ========================================

const savedStep1 = JSON.parse(
    sessionStorage.getItem(
        "wizard_step1"
    ) || "{}"
);


if (
    Object.keys(savedStep1).length > 0
) {

    firstName.value =
        savedStep1.first_name || "";

    lastName.value =
        savedStep1.last_name || "";

    nationalId.value =
        savedStep1.national_id || "";

    email.value =
        savedStep1.email || "";

    mobile.value =
        savedStep1.mobile || "";

    dobInput.value =
        savedStep1.dob || "";

    citySelect.value =
        savedStep1.city || "";


    if (savedStep1.gender) {

        const genderInput =
            personalForm.querySelector(
                `input[name="gender"][value="${savedStep1.gender}"]`
            );

        if (genderInput) {
            genderInput.checked = true;
        }

    }


    if (
        savedStep1.city === "Other"
    ) {

        otherCityField.style.display =
            "flex";

        otherCity.required =
            true;

        otherCity.value =
            savedStep1.other_city || "";

    } else {

        otherCityField.style.display =
            "none";

        otherCity.required =
            false;

    }

}


// ========================================
// Check if user returned with same account
// ========================================

let returningWithSameAccount =
    false;


async function checkReturningAccount() {

    const {
        data: { session }
    } =
        await sb.auth.getSession();


    if (!session) {
        return;
    }


    const loggedInEmail =
        session.user.email
            ?.trim()
            .toLowerCase();


    const savedEmail =
        savedStep1.email
            ?.trim()
            .toLowerCase();


    if (
        savedEmail &&
        loggedInEmail === savedEmail
    ) {

        returningWithSameAccount =
            true;


        password.required =
            false;

        confirmPassword.required =
            false;


        password.value =
            "";

        confirmPassword.value =
            "";


        password.setCustomValidity(
            ""
        );

        confirmPassword.setCustomValidity(
            ""
        );


        password.placeholder =
            "Account already created";

        confirmPassword.placeholder =
            "Account already created";


        if (signupError) {

            signupError.style.display =
                "none";
        }


        if (nextBtn) {

            nextBtn.disabled =
                false;
        }

    }

}


checkReturningAccount();


// ========================================
// Save Step 1
// ========================================

function saveStep1Data(
    normalizedEmail
) {

    const step1Data = {

        first_name:
            firstName.value.trim(),

        last_name:
            lastName.value.trim(),

        national_id:
            nationalId.value.trim(),

        mobile:
            mobile.value.trim(),

        dob:
            dobInput.value,

        gender:
            personalForm.querySelector(
                'input[name="gender"]:checked'
            )?.value || "",

        city:
            citySelect.value,

        other_city:
            citySelect.value === "Other"
                ? otherCity.value.trim()
                : null,

        email:
            normalizedEmail

    };


    sessionStorage.setItem(
        "wizard_step1",
        JSON.stringify(step1Data)
    );

}


// ========================================
// Next Button
// ========================================

nextBtn.addEventListener(
    "click",
    async () => {

        if (
            !returningWithSameAccount
        ) {

            validatePasswordMatch();
        }


        if (
            !personalForm.checkValidity()
        ) {

            personalForm.reportValidity();
            return;

        }


        if (signupError) {

            signupError.style.display =
                "none";
        }


        nextBtn.disabled =
            true;


        const nextText =
            nextBtn.querySelector(
                "span"
            );


        if (nextText) {

            nextText.textContent =
                "Please wait...";
        }


        const normalizedEmail =
            email.value
                .trim()
                .toLowerCase();


        // ========================================
        // Check current Supabase session
        // ========================================

        const {
            data: {
                session:
                    existingSession
            }
        } =
            await sb.auth.getSession();


        if (existingSession) {

            const loggedInEmail =
                existingSession.user.email
                    ?.trim()
                    .toLowerCase();


            if (
                loggedInEmail ===
                normalizedEmail
            ) {

                saveStep1Data(
                    normalizedEmail
                );


                window.location.href =
                    "academic.html";

                return;

            }


            showSignupError(
                `You're currently logged in as ${existingSession.user.email}.`,
                true
            );


            nextBtn.disabled =
                false;


            if (nextText) {

                nextText.textContent =
                    "Next";
            }


            return;
        }


        // ========================================
        // Try to create account
        // ========================================

        const {
            data,
            error
        } =
            await sb.auth.signUp({

                email:
                    normalizedEmail,

                password:
                    password.value,

                options: {

                    data: {

                        full_name:
                            `${firstName.value.trim()} ${lastName.value.trim()}`

                    }

                }

            });


        // ========================================
        // Email already exists
        // Try logging in with same password
        // ========================================

        if (error) {

            const alreadyRegistered =
                error.message
                    .toLowerCase()
                    .includes(
                        "already"
                    );


            if (alreadyRegistered) {

                const {
                    data:
                        signInData,

                    error:
                        signInError
                } =
                    await sb.auth
                        .signInWithPassword({

                            email:
                                normalizedEmail,

                            password:
                                password.value

                        });


                if (
                    !signInError &&
                    signInData.user
                ) {

                    const currentUser =
                        signInData.user;


                    const {
                        error:
                            profileError
                    } =
                        await sb
                            .from(
                                "profiles"
                            )
                            .update({

                                phone:
                                    mobile.value.trim(),

                                dob:
                                    dobInput.value,

                                gender:
                                    personalForm.querySelector(
                                        'input[name="gender"]:checked'
                                    )?.value || null,

                                national_id:
                                    nationalId.value.trim(),

                                city:
                                    citySelect.value,

                                other_city:
                                    citySelect.value === "Other"
                                        ? otherCity.value.trim()
                                        : null

                            })
                            .eq(
                                "id",
                                currentUser.id
                            );


                    if (profileError) {

                        console.error(
                            "Failed to update profile:",
                            profileError
                        );

                    }


                    saveStep1Data(
                        normalizedEmail
                    );


                    window.location.href =
                        "academic.html";


                    return;
                }


                showSignupError(
                    "This email already has an account. Please enter the same password you used before, or log in."
                );

            } else {

                showSignupError(
                    error.message
                );

            }


            nextBtn.disabled =
                false;


            if (nextText) {

                nextText.textContent =
                    "Next";
            }


            return;
        }


        // ========================================
        // Email confirmation required
        // ========================================

        if (!data.session) {

            showSignupError(
                "Account created! Please check your email and confirm your address before continuing, then log in from the Login page."
            );


            nextBtn.disabled =
                false;


            if (nextText) {

                nextText.textContent =
                    "Next";
            }


            return;
        }


        // ========================================
        // New account successfully created
        // ========================================

        const currentUser =
            data.user;


        if (currentUser) {

            const {
                error:
                    profileError
            } =
                await sb
                    .from(
                        "profiles"
                    )
                    .update({

                        phone:
                            mobile.value.trim(),

                        dob:
                            dobInput.value,

                        gender:
                            personalForm.querySelector(
                                'input[name="gender"]:checked'
                            )?.value || null,

                        national_id:
                            nationalId.value.trim(),

                        city:
                            citySelect.value,

                        other_city:
                            citySelect.value === "Other"
                                ? otherCity.value.trim()
                                : null

                    })
                    .eq(
                        "id",
                        currentUser.id
                    );


            if (profileError) {

                console.error(
                    "Failed to update profile:",
                    profileError
                );

            }

        }


        saveStep1Data(
            normalizedEmail
        );


        window.location.href =
            "academic.html";

    }
);
