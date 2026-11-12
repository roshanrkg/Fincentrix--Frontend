document.addEventListener("DOMContentLoaded", function () {

    const API_BASE_URL = "http://localhost:3000/api";

    // Clear stale registration session on fresh page load so tests start clean
    sessionStorage.removeItem("fincentrix_user_id");
    sessionStorage.removeItem("fincentrix_user_email");
    sessionStorage.removeItem("fincentrix_token");
    sessionStorage.removeItem("fincentrix_bank_accounts");

    // Helper: Convert File to Base64 object without external dependencies
    function fileToBase64(file) {
        return new Promise(function (resolve, reject) {
            if (!file) return resolve(null);
            const reader = new FileReader();
            reader.onload = function () {
                resolve({
                    fileName: file.name,
                    mimeType: file.type,
                    fileData: reader.result
                });
            };
            reader.onerror = function (error) {
                reject(error);
            };
            reader.readAsDataURL(file);
        });
    }

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

    function bindInputFilters(container) {
        container.querySelectorAll("[data-input-filter]").forEach(function (input) {
            if (input._filterBound) return;
            input._filterBound = true;

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

        container.querySelectorAll('input[type="file"]').forEach(function (input) {
            if (input._fileBound) return;
            input._fileBound = true;

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
    }

    bindInputFilters(signupForm);

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

    // Alert Banner Helper
    function showAlertBanner(message, type = "error") {
        const banner = document.getElementById("formAlertBanner");
        if (!banner) {
            alert(message);
            return;
        }

        banner.className = `form-alert-banner ${type}`;
        const icon = type === "error" ? "⚠️" : type === "warning" ? "🔔" : type === "success" ? "✓" : "ℹ️";
        banner.innerHTML = `
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;">
                <div style="display: flex; align-items: flex-start; gap: 8px;">
                    <span style="font-size: 18px; line-height: 1.2;">${icon}</span>
                    <span>${message}</span>
                </div>
                <button type="button" style="background: none; border: none; font-size: 16px; cursor: pointer; color: inherit; padding: 0 4px; line-height: 1;" onclick="document.getElementById('formAlertBanner').style.display='none'">✕</button>
            </div>
        `;
        banner.style.display = "block";
        banner.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function hideAlertBanner() {
        const banner = document.getElementById("formAlertBanner");
        if (banner) banner.style.display = "none";
    }

    // Reset input highlights on change
    ["email", "phone"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", function () {
                this.style.borderColor = "";
                hideAlertBanner();
            });
        }
    });

    // Validate fields of current screen only
    function validateSection(section) {

        const fields = section.querySelectorAll("input, select, textarea");

        for (const field of fields) {

            if (!field.checkValidity()) {
                field.reportValidity();
                const labelText = field.labels?.[0]?.textContent?.replace("*", "").trim() || field.placeholder || field.name || "a required field";
                showAlertBanner(`Please provide a valid value for "${labelText}".`, "warning");
                return false;
            }

        }

        hideAlertBanner();
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
    nextButton.addEventListener("click", async function () {

        for (const section of personalSections) {

            if (!validateSection(section)) {
                return;
            }

        }

        // Process file uploads (convert to base64)
        const aadhaarFileInput = document.getElementById("aadhaar_card_file");
        const panFileInput = document.getElementById("pan_card_file");

        const aadhaarFile = aadhaarFileInput && aadhaarFileInput.files[0]
            ? await fileToBase64(aadhaarFileInput.files[0])
            : null;

        const panFile = panFileInput && panFileInput.files[0]
            ? await fileToBase64(panFileInput.files[0])
            : null;

        // Collect all Step 1 user data
        const payload = {
            fname: document.getElementById("fname").value.trim(),
            lname: document.getElementById("lname").value.trim(),
            email: document.getElementById("email").value.trim(),
            phone: document.getElementById("phone").value.trim(),
            password: document.getElementById("password").value,
            dob: document.getElementById("dob").value || null,
            address_line1: document.getElementById("address_line1").value.trim() || null,
            address_line2: document.getElementById("address_line2").value.trim() || null,
            address_line3: document.getElementById("address_line3").value.trim() || null,
            city: document.getElementById("city").value.trim() || null,
            state: document.getElementById("state").value.trim() || null,
            pincode: document.getElementById("pincode").value.trim() || null,
            aadhaar_number: document.getElementById("aadhaar_number").value.trim() || null,
            pan_number: document.getElementById("pan_number").value.trim() || null,
            cibil_score: document.getElementById("cibil_score").value || null,
            monthly_income: document.getElementById("monthly_income").value || null,
            employment_type: document.getElementById("employment_type").value || null,
            aadhaar_file: aadhaarFile,
            pan_file: panFile
        };

        const originalButtonText = nextButton.textContent;
        nextButton.disabled = true;
        nextButton.textContent = "Creating Account...";

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                const errorMsg = data.message || "Failed to create account. Please check your details.";
                showAlertBanner(errorMsg, "error");

                // Highlight duplicate or invalid fields
                if (errorMsg.toLowerCase().includes("email")) {
                    const emailInput = document.getElementById("email");
                    if (emailInput) {
                        emailInput.style.borderColor = "#ef4444";
                        emailInput.focus();
                    }
                } else if (errorMsg.toLowerCase().includes("phone")) {
                    const phoneInput = document.getElementById("phone");
                    if (phoneInput) {
                        phoneInput.style.borderColor = "#ef4444";
                        phoneInput.focus();
                    }
                }
                return;
            }

            hideAlertBanner();

            // Save user credentials and IDs for bank details (Step 2) & loans (Step 3)
            sessionStorage.setItem("fincentrix_user_id", data.data.userId);
            sessionStorage.setItem("fincentrix_user_email", data.data.email);
            sessionStorage.setItem("fincentrix_token", data.data.token);

            showBankSection();

        } catch (error) {
            console.error("Network or server error during registration:", error);
            showAlertBanner("Unable to connect to the backend server. Make sure the server is running on port 3000.", "error");
        } finally {
            nextButton.disabled = false;
            nextButton.textContent = originalButtonText;
        }

    });

    // STEP 2: Bank Details -> Personal Information
    previousButton.addEventListener("click", function () {

        showPersonalSection();

    });

    // Multiple Bank Accounts Management
    const addBankButton = document.getElementById("addBankButton");
    const bankAccountsList = document.getElementById("bankAccountsList");

    function updateBankCardsUI() {
        if (!bankAccountsList) return;
        const cards = bankAccountsList.querySelectorAll(".bank-account-card");
        cards.forEach(function (card, index) {
            card.setAttribute("data-bank-index", index);
            const title = card.querySelector(".bank-card-title");
            if (title) title.textContent = `Bank Account #${index + 1}`;
            const removeBtn = card.querySelector(".remove-bank-btn");
            if (removeBtn) {
                removeBtn.style.display = cards.length > 1 ? "inline-block" : "none";
            }
        });
    }

    function createBankAccountCard(index) {
        const card = document.createElement("div");
        card.className = "bank-account-card";
        card.setAttribute("data-bank-index", index);
        card.innerHTML = `
            <div class="bank-card-header">
                <span class="bank-card-title">Bank Account #${index + 1}</span>
                <button type="button" class="remove-bank-btn">✕ Remove</button>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Bank Name *</label>
                    <input type="text" name="bank_name" placeholder="Enter bank name"
                        pattern="[\\p{L}\\p{M} ]+" data-input-filter="letters"
                        title="Use letters and spaces only" required>
                </div>
                <div class="form-group">
                    <label>Account Holder Name *</label>
                    <input type="text" name="account_holder_name" placeholder="Enter account holder name"
                        pattern="[\\p{L}\\p{M} ]+" data-input-filter="letters"
                        title="Use letters and spaces only" required>
                </div>
                <div class="form-group">
                    <label>Account Number *</label>
                    <input type="password" name="account_number" placeholder="Enter account number"
                        inputmode="numeric" pattern="[0-9]+" data-input-filter="digits"
                        title="Use digits only" required>
                </div>
                <div class="form-group">
                    <label>Branch Name *</label>
                    <input type="text" name="branch_name" placeholder="Enter branch name"
                        pattern="[\\p{L}\\p{M} ]+" data-input-filter="letters"
                        title="Use letters and spaces only" required>
                </div>
                <div class="form-group">
                    <label>IFSC Code *</label>
                    <input type="text" name="ifsc_code" maxlength="11" placeholder="Enter IFSC code"
                        pattern="[A-Z]{4}0[A-Z0-9]{6}" data-input-filter="ifsc"
                        title="Enter a valid 11-character IFSC code" required>
                </div>
                <div class="form-group">
                    <label>Primary Account</label>
                    <select name="is_primary">
                        <option value="0">No</option>
                        <option value="1">Yes</option>
                    </select>
                </div>
                <div class="form-group full-width">
                    <label>Upload Passbook / Bank Statement (Optional)</label>
                    <input type="file" name="passbook_file" accept="image/jpeg,image/png,application/pdf">
                    <small>JPG, PNG or PDF</small>
                </div>
            </div>
        `;

        card.querySelector(".remove-bank-btn").addEventListener("click", function () {
            card.remove();
            updateBankCardsUI();
        });

        bindInputFilters(card);
        return card;
    }

    if (addBankButton) {
        addBankButton.addEventListener("click", function () {
            const currentCount = bankAccountsList.querySelectorAll(".bank-account-card").length;
            const newCard = createBankAccountCard(currentCount);
            bankAccountsList.appendChild(newCard);
            updateBankCardsUI();
            newCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
    }

    // STEP 3: Bank Details -> Existing Loan Details
    nextLoanButton.addEventListener("click", async function () {

        if (!validateSection(bankSection)) {
            return;
        }

        const userId = sessionStorage.getItem("fincentrix_user_id");
        const token = sessionStorage.getItem("fincentrix_token");

        if (!userId) {
            alert("User identity not found. Please go back to Step 1 and complete personal details.");
            showPersonalSection();
            return;
        }

        const cards = bankAccountsList.querySelectorAll(".bank-account-card");
        const accountsPayload = [];

        const originalText = nextLoanButton.textContent;
        nextLoanButton.disabled = true;
        nextLoanButton.textContent = "Saving Bank Details & Passbooks...";

        try {
            for (const card of cards) {
                const bankNameInput = card.querySelector('input[name="bank_name"]');
                const holderInput = card.querySelector('input[name="account_holder_name"]');
                const numberInput = card.querySelector('input[name="account_number"]');
                const branchInput = card.querySelector('input[name="branch_name"]');
                const ifscInput = card.querySelector('input[name="ifsc_code"]');
                const primaryInput = card.querySelector('select[name="is_primary"]');
                const passbookInput = card.querySelector('input[name="passbook_file"]');

                let passbookObj = null;
                if (passbookInput && passbookInput.files && passbookInput.files[0]) {
                    passbookObj = await fileToBase64(passbookInput.files[0]);
                }

                accountsPayload.push({
                    bank_name: bankNameInput.value.trim(),
                    account_holder_name: holderInput.value.trim(),
                    account_number: numberInput.value.trim(),
                    branch_name: branchInput.value.trim(),
                    ifsc_code: ifscInput.value.trim().toUpperCase(),
                    is_primary: primaryInput.value,
                    passbook_file: passbookObj
                });
            }

            const headers = {
                "Content-Type": "application/json"
            };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/bank`, {
                method: "POST",
                headers: headers,
                body: JSON.stringify({
                    user_id: parseInt(userId, 10),
                    accounts: accountsPayload
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                showAlertBanner(data.message || "Failed to save bank details. Please check the fields.", "error");
                return;
            }

            hideAlertBanner();

            // Save in session
            sessionStorage.setItem("fincentrix_bank_accounts", JSON.stringify(data.data.accounts));

            showLoanSection();

        } catch (error) {
            console.error("Error saving bank details:", error);
            showAlertBanner("Unable to connect to the backend server. Make sure the server is running on port 3000.", "error");
        } finally {
            nextLoanButton.disabled = false;
            nextLoanButton.textContent = originalText;
        }

    });

    // Multiple Loans Management
    const addLoanButton = document.getElementById("addLoanButton");
    const loansList = document.getElementById("loansList");

    function updateLoanCardsUI() {
        if (!loansList) return;
        const cards = loansList.querySelectorAll(".loan-account-card");
        cards.forEach(function (card, index) {
            card.setAttribute("data-loan-index", index);
            const title = card.querySelector(".loan-card-title");
            if (title) title.textContent = `Loan #${index + 1}`;
            const removeBtn = card.querySelector(".remove-loan-btn");
            if (removeBtn) {
                removeBtn.style.display = cards.length > 1 ? "inline-block" : "none";
            }
        });
    }

    function createLoanCard(index) {
        const card = document.createElement("div");
        card.className = "loan-account-card";
        card.setAttribute("data-loan-index", index);
        card.innerHTML = `
            <div class="loan-card-header">
                <span class="loan-card-title">Loan #${index + 1}</span>
                <button type="button" class="remove-loan-btn">✕ Remove</button>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Lender Name *</label>
                    <input type="text" name="lender_name" placeholder="Enter bank or lender name"
                        pattern="[\\p{L}\\p{M} ]+" data-input-filter="letters"
                        title="Use letters and spaces only" required>
                </div>
                <div class="form-group">
                    <label>Loan Type *</label>
                    <select name="loan_type" required>
                        <option value="">Select loan type</option>
                        <option value="Personal Loan">Personal Loan</option>
                        <option value="Home Loan">Home Loan</option>
                        <option value="Education Loan">Education Loan</option>
                        <option value="Vehicle Loan">Vehicle Loan</option>
                        <option value="Business Loan">Business Loan</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Original Loan Amount (₹) *</label>
                    <input type="number" name="loan_amount" min="0" step="0.01"
                        inputmode="decimal" data-input-filter="decimal"
                        placeholder="Enter original loan amount" required>
                </div>
                <div class="form-group">
                    <label>Outstanding Amount (₹) *</label>
                    <input type="number" name="outstanding_amount" min="0" step="0.01"
                        inputmode="decimal" data-input-filter="decimal"
                        placeholder="Enter outstanding amount" required>
                </div>
                <div class="form-group">
                    <label>Loan Duration (Months) *</label>
                    <input type="number" name="loan_duration_months" min="1" step="1"
                        inputmode="numeric" data-input-filter="digits"
                        placeholder="Example: 60" required>
                </div>
                <div class="form-group">
                    <label>Remaining Months *</label>
                    <input type="number" name="remaining_months" min="0" step="1"
                        inputmode="numeric" data-input-filter="digits"
                        placeholder="Enter remaining months" required>
                </div>
                <div class="form-group">
                    <label>Monthly EMI (₹) *</label>
                    <input type="number" name="monthly_emi" min="0" step="0.01"
                        inputmode="decimal" data-input-filter="decimal"
                        placeholder="Enter monthly EMI" required>
                </div>
                <div class="form-group">
                    <label>Loan Start Date *</label>
                    <input type="date" name="loan_start_date" required>
                </div>
                <div class="form-group">
                    <label>Loan End Date</label>
                    <input type="date" name="loan_end_date">
                </div>
                <div class="form-group">
                    <label>Loan Status *</label>
                    <select name="loan_status" required>
                        <option value="">Select loan status</option>
                        <option value="Active">Active</option>
                        <option value="Closed">Closed</option>
                    </select>
                </div>
            </div>
        `;

        card.querySelector(".remove-loan-btn").addEventListener("click", function () {
            card.remove();
            updateLoanCardsUI();
        });

        bindInputFilters(card);
        return card;
    }

    if (addLoanButton) {
        addLoanButton.addEventListener("click", function () {
            const currentCount = loansList.querySelectorAll(".loan-account-card").length;
            const newCard = createLoanCard(currentCount);
            loansList.appendChild(newCard);
            updateLoanCardsUI();
            newCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
    }

    // STEP 4: Existing Loan -> Bank Details
    previousLoanButton.addEventListener("click", function () {

        showBankSection();

    });

    // STEP 5: Finish Registration
    finishSignupButton.addEventListener("click", async function () {

        if (!validateSection(loanSection)) {
            return;
        }

        const userId = sessionStorage.getItem("fincentrix_user_id");
        const token = sessionStorage.getItem("fincentrix_token");

        if (!userId) {
            showAlertBanner("User identity not found. Please start registration from Step 1.", "error");
            showPersonalSection();
            return;
        }

        const cards = loansList ? loansList.querySelectorAll(".loan-account-card") : [];
        const loansPayload = [];

        for (const card of cards) {
            loansPayload.push({
                lender_name: card.querySelector('input[name="lender_name"]')?.value.trim() || "",
                loan_type: card.querySelector('select[name="loan_type"]')?.value || "",
                loan_amount: card.querySelector('input[name="loan_amount"]')?.value || "0",
                outstanding_amount: card.querySelector('input[name="outstanding_amount"]')?.value || null,
                loan_duration_months: card.querySelector('input[name="loan_duration_months"]')?.value || "0",
                remaining_months: card.querySelector('input[name="remaining_months"]')?.value || null,
                monthly_emi: card.querySelector('input[name="monthly_emi"]')?.value || "0",
                loan_start_date: card.querySelector('input[name="loan_start_date"]')?.value || null,
                loan_end_date: card.querySelector('input[name="loan_end_date"]')?.value || null,
                loan_status: card.querySelector('select[name="loan_status"]')?.value?.toLowerCase() || "active"
            });
        }

        const originalText = finishSignupButton.textContent;
        finishSignupButton.disabled = true;
        finishSignupButton.textContent = "Finalizing Registration...";

        try {
            const headers = {
                "Content-Type": "application/json"
            };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/loans`, {
                method: "POST",
                headers: headers,
                body: JSON.stringify({
                    user_id: parseInt(userId, 10),
                    loans: loansPayload
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                showAlertBanner(data.message || "Failed to save loan details. Please check the fields.", "error");
                return;
            }

            // Clear session storage on completion
            sessionStorage.clear();

            // Display success alert banner
            showAlertBanner("Congratulations! Your registration has been completed successfully. Redirecting to login...", "success");

            finishSignupButton.textContent = "Registered Successfully ✓";

            setTimeout(function () {
                window.location.href = "index.html";
            }, 2500);

        } catch (error) {
            console.error("Error saving loan details:", error);
            showAlertBanner("Unable to connect to the backend server. Make sure the server is running on port 3000.", "error");
        } finally {
            finishSignupButton.disabled = false;
            finishSignupButton.textContent = originalText;
        }

    });

});