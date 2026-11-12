document.addEventListener("DOMContentLoaded", function () {

    // Buttons
    const nextButton = document.getElementById("nextButton");
    const previousButton = document.getElementById("previousButton");
    const nextLoanButton = document.getElementById("nextLoanButton");
    const previousLoanButton = document.getElementById("previousLoanButton");
    const finishSignupButton = document.getElementById("finishSignupButton");

    // Sections
    const signupForm = document.getElementById("signupForm");
    const bankSection = document.getElementById("bankSection");
    const loanSection = document.getElementById("loanSection");

    // First page sections
    const personalSections = document.querySelectorAll(
        "#signupForm > .form-section:not(#bankSection):not(#loanSection)"
    );

    const personalButtonContainer = nextButton.parentElement;
    const bankButtonContainer = previousButton.parentElement;
    let isTransitioning = false;

    function sanitizeInput(value, filter) {
        if (filter === "letters") {
            return value.replace(/[^\p{L}\p{M} ]/gu, "").replace(/ {2,}/g, " ");
        }

        if (filter === "digits") {
            return value.replace(/[^0-9]/g, "");
        }

        if (filter === "decimal") {
            const cleaned = value.replace(/[^0-9.]/g, "");
            const decimalIndex = cleaned.indexOf(".");
            return decimalIndex === -1
                ? cleaned
                : cleaned.slice(0, decimalIndex + 1) +
                    cleaned.slice(decimalIndex + 1).replace(/\./g, "").slice(0, 2);
        }

        if (filter === "pan") {
            return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
        }

        if (filter === "ifsc") {
            return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
        }

        return value;
    }

    signupForm.querySelectorAll("[data-input-filter]").forEach(function (input) {
        input.addEventListener("beforeinput", function (event) {
            if (input.type !== "number" || !event.data ||
                !event.inputType.startsWith("insert")) {
                return;
            }

            const filter = input.dataset.inputFilter;
            const invalidCharacters = filter === "decimal"
                ? /[^0-9.]/.test(event.data)
                : /[^0-9]/.test(event.data);
            const duplicateDecimal = filter === "decimal" &&
                event.data.includes(".") && input.value.includes(".");

            if (invalidCharacters || duplicateDecimal) {
                event.preventDefault();
            }
        });

        input.addEventListener("input", function () {
            const filter = input.dataset.inputFilter;
            const sanitizedValue = sanitizeInput(input.value, filter);

            if (input.value !== sanitizedValue) {
                input.value = sanitizedValue;
            }
        });
    });

    signupForm.querySelectorAll('input[type="file"]').forEach(function (input) {
        input.addEventListener("change", function () {
            const file = input.files[0];
            const acceptedTypes = input.accept.split(",").map(function (type) {
                return type.trim().toLowerCase();
            });
            const extension = file?.name.split(".").pop().toLowerCase();
            const allowedExtensions = [".jpg", ".jpeg", ".png", ".pdf"];
            const isAllowed = !file ||
                acceptedTypes.includes(file.type.toLowerCase()) ||
                allowedExtensions.includes("." + extension);

            input.setCustomValidity(
                isAllowed ? "" : "Choose a JPG, PNG, or PDF file."
            );
        });
    });

    function transitionTo(updateSection) {
        if (isTransitioning) {
            return;
        }

        isTransitioning = true;
        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;
        const transitionDuration = prefersReducedMotion ? 1 : 180;
        const entryDuration = prefersReducedMotion ? 1 : 280;

        signupForm.classList.remove("is-entering");
        signupForm.classList.add("is-leaving");

        window.setTimeout(function () {
            updateSection();
            signupForm.classList.remove("is-leaving");
            signupForm.classList.add("is-entering");
            window.scrollTo(0, 0);

            window.setTimeout(function () {
                signupForm.classList.remove("is-entering");
                isTransitioning = false;
            }, entryDuration);
        }, transitionDuration);
    }

    // Validate fields of current screen only
    function validateSection(section) {

        const fields = section.querySelectorAll("input, select, textarea");

        for (const field of fields) {

            if (!field.checkValidity()) {
                field.reportValidity();
                return false;
            }

        }

        return true;
    }

    // Show Personal Information screen
    function showPersonalSection() {
        transitionTo(function () {
            personalSections.forEach(function (section) {
                section.style.display = "";
            });

            personalButtonContainer.style.display = "flex";

            bankSection.hidden = true;
            loanSection.hidden = true;
        });
    }

    // Show Bank Details screen
    function showBankSection() {
        transitionTo(function () {
            personalSections.forEach(function (section) {
                section.style.display = "none";
            });

            personalButtonContainer.style.display = "none";

            bankSection.hidden = false;
            loanSection.hidden = true;
        });
    }

    // Show Existing Loan screen
    function showLoanSection() {
        transitionTo(function () {
            personalSections.forEach(function (section) {
                section.style.display = "none";
            });

            personalButtonContainer.style.display = "none";

            bankSection.hidden = true;
            loanSection.hidden = false;
        });
    }

    // STEP 1: Personal Information -> Bank Details
    nextButton.addEventListener("click", function () {

        for (const section of personalSections) {

            if (!validateSection(section)) {
                return;
            }

        }

        showBankSection();

    });

    // STEP 2: Bank Details -> Personal Information
    previousButton.addEventListener("click", function () {

        showPersonalSection();

    });

    // STEP 3: Bank Details -> Existing Loan Details
    nextLoanButton.addEventListener("click", function () {

        if (!validateSection(bankSection)) {
            return;
        }

        showLoanSection();

    });

    // STEP 4: Existing Loan -> Bank Details
    previousLoanButton.addEventListener("click", function () {

        showBankSection();

    });

    // STEP 5: Finish Registration
    finishSignupButton.addEventListener("click", function () {

        if (!validateSection(loanSection)) {
            return;
        }

        alert("All registration details completed successfully!");

    });

});