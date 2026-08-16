// ======================================================
// Application Form — Step 3: Documents
// ======================================================

// ===============================
// Guard: must be logged in
// ===============================

requireAuth();

// ===============================
// Document configuration
// ===============================

const requiredDocs = [
    {
        fileId: "cvFile",
        labelId: "cvLabel",
        nameId: "cvFileName",
        docType: "cv"
    },
    {
        fileId: "academicFile",
        labelId: "academicLabel",
        nameId: "academicFileName",
        docType: "academic_transcript"
    },
    {
        fileId: "certificatesFile",
        labelId: "certificatesLabel",
        nameId: "certificatesFileName",
        docType: "certificates"
    }
];

const optionalDocs = [
    {
        fileId: "recommendationFile",
        labelId: "recommendationLabel",
        nameId: "recommendationFileName",
        docType: "recommendation_letter"
    }
];

const allDocs = [
    ...requiredDocs,
    ...optionalDocs
];

const uploadPlan = [
    {
        fileId: "cvFile",
        docType: "cv",
        required: true
    },
    {
        fileId: "academicFile",
        docType: "academic_transcript",
        required: true
    },
    {
        fileId: "certificatesFile",
        docType: "certificates",
        required: true
    },
    {
        fileId: "recommendationFile",
        docType: "recommendation_letter",
        required: false
    }
];

// ===============================
// Get page elements
// ===============================

const docsError =
    document.getElementById("docsError");

const prevBtn =
    document.getElementById("prevBtn");

const nextBtn =
    document.getElementById("nextBtn");

// ===============================
// Error helpers
// ===============================

function showDocsError(message) {
    docsError.textContent = message;
    docsError.style.display = "block";
}

function hideDocsError() {
    docsError.textContent = "";
    docsError.style.display = "none";
}

function resetNextButton() {
    nextBtn.disabled = false;

    const buttonText =
        nextBtn.querySelector("span");

    if (buttonText) {
        buttonText.textContent = "Next";
    }
}

// ===============================
// Read saved documents
// ===============================

function getSavedDocs() {
    try {
        return JSON.parse(
            sessionStorage.getItem("wizard_docs") || "{}"
        );
    } catch (error) {
        console.error(
            "Unable to read saved documents:",
            error
        );

        return {};
    }
}

// ===============================
// Save documents map
// ===============================

function saveDocsMap(docsMap) {
    sessionStorage.setItem(
        "wizard_docs",
        JSON.stringify(docsMap)
    );
}

// ===============================
// Update one upload row visually
// ===============================

function showUploadedState(
    fileInput,
    label,
    fileNameEl,
    removeBtn,
    fileName,
    docType,
    source
) {
    const row =
        fileInput.closest(".upload-row");

    const labelText =
        label.querySelector(".upload-label-text");

    const icon =
        label.querySelector(".upload-icon");

    fileNameEl.textContent =
        fileName || "Uploaded file";

    fileNameEl.title =
        fileName || "Uploaded file";

    labelText.textContent = "Change";

    icon.classList.remove(
        "fa-cloud-arrow-up"
    );

    icon.classList.add(
        "fa-circle-check"
    );

    row.classList.add("uploaded");

    removeBtn.style.display =
        "inline-block";

    row.dataset.docType = docType;
    row.dataset.uploadSource = source;
}

function showEmptyState(
    fileInput,
    label,
    fileNameEl,
    removeBtn
) {
    const row =
        fileInput.closest(".upload-row");

    const labelText =
        label.querySelector(".upload-label-text");

    const icon =
        label.querySelector(".upload-icon");

    fileInput.value = "";
    fileInput.setCustomValidity("");

    fileNameEl.textContent = "";
    fileNameEl.removeAttribute("title");

    labelText.textContent = "Upload";

    icon.classList.remove(
        "fa-circle-check"
    );

    icon.classList.add(
        "fa-cloud-arrow-up"
    );

    row.classList.remove("uploaded");

    removeBtn.style.display = "none";

    delete row.dataset.docType;
    delete row.dataset.uploadSource;
}

// ===============================
// Setup file input behavior
// ===============================

function setupFileDisplay(doc) {
    const fileInput =
        document.getElementById(doc.fileId);

    const label =
        document.getElementById(doc.labelId);

    const fileNameEl =
        document.getElementById(doc.nameId);

    const row =
        fileInput.closest(".upload-row");

    const removeBtn =
        row.querySelector(".remove-file");

    fileInput.addEventListener(
        "change",
        () => {
            hideDocsError();

            if (fileInput.files.length === 0) {
                showEmptyState(
                    fileInput,
                    label,
                    fileNameEl,
                    removeBtn
                );

                return;
            }

            const file =
                fileInput.files[0];

            const maxFileSize =
                5 * 1024 * 1024;

            if (file.size > maxFileSize) {
                fileInput.value = "";

                fileInput.setCustomValidity(
                    "File size must not exceed 5MB."
                );

                fileInput.reportValidity();

                showEmptyState(
                    fileInput,
                    label,
                    fileNameEl,
                    removeBtn
                );

                return;
            }

            fileInput.setCustomValidity("");

            showUploadedState(
                fileInput,
                label,
                fileNameEl,
                removeBtn,
                file.name,
                doc.docType,
                "new"
            );
        }
    );
}

allDocs.forEach(setupFileDisplay);

// ===============================
// Restore saved document names
// ===============================

function restoreSavedDocuments() {
    const savedDocs =
        getSavedDocs();

    allDocs.forEach((doc) => {
        const savedDocument =
            savedDocs[doc.docType];

        if (!savedDocument) {
            return;
        }

        const fileInput =
            document.getElementById(doc.fileId);

        const label =
            document.getElementById(doc.labelId);

        const fileNameEl =
            document.getElementById(doc.nameId);

        const row =
            fileInput.closest(".upload-row");

        const removeBtn =
            row.querySelector(".remove-file");

        showUploadedState(
            fileInput,
            label,
            fileNameEl,
            removeBtn,
            savedDocument.file_name,
            doc.docType,
            "saved"
        );
    });
}

// ===============================
// Remove file button
// ===============================

document
    .querySelectorAll(".remove-file")
    .forEach((removeBtn) => {
        removeBtn.addEventListener(
            "click",
            async () => {
                hideDocsError();

                const fileInput =
                    document.getElementById(
                        removeBtn.dataset.target
                    );

                const row =
                    fileInput.closest(".upload-row");

                const label =
                    row.querySelector(".upload-btn");

                const fileNameEl =
                    row.querySelector(".file-name");

                const docType =
                    row.dataset.docType;

                const uploadSource =
                    row.dataset.uploadSource;

                const savedDocs =
                    getSavedDocs();

                /*
                    If the file was already uploaded to Supabase,
                    remove it from the temporary storage too.
                */
                if (
                    docType &&
                    uploadSource === "saved" &&
                    savedDocs[docType]?.path
                ) {
                    const path =
                        savedDocs[docType].path;

                    const { error } =
                        await sb.storage
                            .from(
                                "application-documents"
                            )
                            .remove([path]);

                    if (error) {
                        console.error(
                            "Unable to delete temporary file:",
                            error
                        );

                        showDocsError(
                            "The file could not be removed. Please try again."
                        );

                        return;
                    }
                }

                if (
                    docType &&
                    savedDocs[docType]
                ) {
                    delete savedDocs[docType];
                    saveDocsMap(savedDocs);
                }

                showEmptyState(
                    fileInput,
                    label,
                    fileNameEl,
                    removeBtn
                );
            }
        );
    });

// ===============================
// Previous button
// ===============================

prevBtn.addEventListener(
    "click",
    () => {
        window.location.href =
            "academic.html";
    }
);

// ===============================
// Upload file to temporary folder
// ===============================

async function uploadToTemp(
    file,
    docType,
    userId
) {
    const extension =
        file.name.includes(".")
            ? file.name.split(".").pop()
            : "pdf";

    const safeExtension =
        extension.toLowerCase();

    const path =
        `temp/${userId}/${docType}.${safeExtension}`;

    const { error } =
        await sb.storage
            .from("application-documents")
            .upload(
                path,
                file,
                {
                    upsert: true,
                    contentType: file.type
                }
            );

    if (error) {
        throw error;
    }

    return {
        path,
        file_name: file.name
    };
}

// ===============================
// Validate required documents
// ===============================

function validateRequiredDocuments() {
    const savedDocs =
        getSavedDocs();

    for (const doc of requiredDocs) {
        const fileInput =
            document.getElementById(doc.fileId);

        const row =
            fileInput.closest(".upload-row");

        const hasNewFile =
            fileInput.files.length > 0;

        const hasSavedFile =
            Boolean(savedDocs[doc.docType]);

        if (!hasNewFile && !hasSavedFile) {
            fileInput.setCustomValidity(
                "Please upload this required document."
            );

            fileInput.reportValidity();

            row.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            return false;
        }

        fileInput.setCustomValidity("");
    }

    return true;
}

// ===============================
// Next button
// ===============================

nextBtn.addEventListener(
    "click",
    async () => {
        hideDocsError();

        if (!validateRequiredDocuments()) {
            return;
        }

        nextBtn.disabled = true;

        const buttonText =
            nextBtn.querySelector("span");

        if (buttonText) {
            buttonText.textContent =
                "Uploading...";
        }

        try {
            const {
                data: { user },
                error: userError
            } = await sb.auth.getUser();

            if (userError) {
                throw userError;
            }

            if (!user) {
                showDocsError(
                    "Your session has expired. Please log in again."
                );

                resetNextButton();
                return;
            }

            /*
                Start with the already uploaded files.
                New selections will replace only their matching document.
            */
            const docsMap =
                getSavedDocs();

            for (const plan of uploadPlan) {
                const fileInput =
                    document.getElementById(
                        plan.fileId
                    );

                if (
                    fileInput.files.length === 0
                ) {
                    continue;
                }

                docsMap[plan.docType] =
                    await uploadToTemp(
                        fileInput.files[0],
                        plan.docType,
                        user.id
                    );
            }

            saveDocsMap(docsMap);

            window.location.href =
                "review.html";
        } catch (error) {
            console.error(
                "File upload failed:",
                error
            );

            showDocsError(
                error?.message ||
                "File upload failed. Please try again."
            );

            resetNextButton();
        }
    }
);

// ===============================
// Initialize page
// ===============================

restoreSavedDocuments();