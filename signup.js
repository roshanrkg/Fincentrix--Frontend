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

    // Helper to flash an auto-filled input with visual confirmation
    function flashAutofilledInput(el, value) {
        if (!el || value === undefined || value === null || value === "") return;
        el.value = value;
        el.style.transition = "background-color 0.4s ease, border-color 0.4s ease";
        el.style.backgroundColor = "#f0fdf4";
        el.style.borderColor = "#22c55e";
        setTimeout(function () {
            el.style.backgroundColor = "";
            el.style.borderColor = "";
        }, 2200);
    }

    // ==========================================
    // Email OTP Verification for Signup
    // ==========================================
    let isEmailVerified = false;
    const emailInput = document.getElementById("email");
    const sendSignupOtpBtn = document.getElementById("sendSignupOtpBtn");
    const emailOtpRow = document.getElementById("emailOtpRow");
    const signupOtpInput = document.getElementById("signupOtpInput");
    const confirmSignupOtpBtn = document.getElementById("confirmSignupOtpBtn");
    const otpStatusMsg = document.getElementById("otpStatusMsg");
    const emailVerifiedBadge = document.getElementById("emailVerifiedBadge");

    function setOtpStatus(msg, isSuccess = false) {
        if (!otpStatusMsg) return;
        otpStatusMsg.textContent = msg;
        otpStatusMsg.style.display = "block";
        otpStatusMsg.style.color = isSuccess ? "#059669" : "#dc2626";
    }

    if (sendSignupOtpBtn && emailInput) {
        sendSignupOtpBtn.addEventListener("click", async function () {
            const emailVal = emailInput.value.trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

            if (!emailVal || !emailRegex.test(emailVal)) {
                showAlertBanner("Please enter a valid email address first.", "warning");
                emailInput.focus();
                return;
            }

            sendSignupOtpBtn.disabled = true;
            sendSignupOtpBtn.textContent = "Sending...";
            setOtpStatus("Sending verification code to your email...", true);
            if (emailOtpRow) emailOtpRow.style.display = "block";

            try {
                const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: emailVal, purpose: "signup" })
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    setOtpStatus(data.message || "Failed to send code.", false);
                    sendSignupOtpBtn.disabled = false;
                    sendSignupOtpBtn.textContent = "Verify Email";
                    return;
                }

                setOtpStatus(`✅ Code sent to ${emailVal}! Please enter it below.`, true);
                if (signupOtpInput) signupOtpInput.focus();

                // 60-second cooldown
                let cd = 60;
                sendSignupOtpBtn.textContent = `Resend (${cd}s)`;
                const timer = setInterval(() => {
                    cd--;
                    if (cd <= 0) {
                        clearInterval(timer);
                        sendSignupOtpBtn.disabled = false;
                        sendSignupOtpBtn.textContent = "Resend Code";
                    } else {
                        sendSignupOtpBtn.textContent = `Resend (${cd}s)`;
                    }
                }, 1000);

            } catch (err) {
                console.error("Signup send OTP error:", err);
                setOtpStatus("Failed to connect to backend server.", false);
                sendSignupOtpBtn.disabled = false;
                sendSignupOtpBtn.textContent = "Verify Email";
            }
        });
    }

    if (confirmSignupOtpBtn && signupOtpInput) {
        confirmSignupOtpBtn.addEventListener("click", async function () {
            const emailVal = emailInput.value.trim().toLowerCase();
            const otpVal = signupOtpInput.value.trim();

            if (!otpVal || otpVal.length !== 6) {
                setOtpStatus("Please enter the full 6-digit code.", false);
                signupOtpInput.focus();
                return;
            }

            confirmSignupOtpBtn.disabled = true;
            confirmSignupOtpBtn.textContent = "Verifying...";

            try {
                const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: emailVal, otp: otpVal, purpose: "signup" })
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    setOtpStatus(data.message || "Invalid code. Please try again.", false);
                    confirmSignupOtpBtn.disabled = false;
                    confirmSignupOtpBtn.textContent = "Confirm OTP";
                    return;
                }

                // Verified!
                isEmailVerified = true;
                if (emailOtpRow) emailOtpRow.style.display = "none";
                if (sendSignupOtpBtn) sendSignupOtpBtn.style.display = "none";
                if (emailVerifiedBadge) emailVerifiedBadge.style.display = "inline";
                emailInput.readOnly = true;
                emailInput.style.borderColor = "#10b981";
                showAlertBanner("✅ Email verified successfully! You can now proceed.", "success");

            } catch (err) {
                setOtpStatus("Verification failed. Check server connection.", false);
                confirmSignupOtpBtn.disabled = false;
                confirmSignupOtpBtn.textContent = "Confirm OTP";
            }
        });
    }

    // Auto-fill from Aadhaar card file selection using Mistral AI
    const aadhaarCardInput = document.getElementById("aadhaar_card_file");
    if (aadhaarCardInput) {
        aadhaarCardInput.addEventListener("change", async function () {
            const file = this.files[0];
            if (!file) return;

            showAlertBanner("✨ Mistral AI is analyzing your Aadhaar card to auto-fill your details...", "info");

            try {
                const fileObj = await fileToBase64(file);
                const response = await fetch(`${API_BASE_URL}/kyc/extract`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        document_type: "aadhaar",
                        file: fileObj
                    })
                });

                const result = await response.json();

                if (!response.ok || !result.success || !result.data) {
                    showAlertBanner(result.message || "Could not automatically read Aadhaar details. You can enter them manually.", "warning");
                    return;
                }

                const d = result.data;
                flashAutofilledInput(document.getElementById("aadhaar_number"), d.aadhaar_number);
                flashAutofilledInput(document.getElementById("fname"), d.fname);
                flashAutofilledInput(document.getElementById("lname"), d.lname);
                flashAutofilledInput(document.getElementById("dob"), d.dob);
                flashAutofilledInput(document.getElementById("address_line1"), d.address_line1);
                flashAutofilledInput(document.getElementById("address_line2"), d.address_line2);
                flashAutofilledInput(document.getElementById("address_line3"), d.address_line3);
                flashAutofilledInput(document.getElementById("city"), d.city);
                flashAutofilledInput(document.getElementById("state"), d.state);
                flashAutofilledInput(document.getElementById("pincode"), d.pincode);

                showAlertBanner("✅ Aadhaar details auto-filled successfully! Please review before continuing.", "success");

            } catch (err) {
                console.error("Aadhaar auto-fill error:", err);
                showAlertBanner("Could not auto-fill details. Please check the backend connection.", "warning");
            }
        });
    }

    // Auto-fill from PAN card file selection using Mistral AI
    const panCardInput = document.getElementById("pan_card_file");
    if (panCardInput) {
        panCardInput.addEventListener("change", async function () {
            const file = this.files[0];
            if (!file) return;

            showAlertBanner("✨ Mistral AI is analyzing your PAN card to auto-fill details...", "info");

            try {
                const fileObj = await fileToBase64(file);
                const response = await fetch(`${API_BASE_URL}/kyc/extract`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        document_type: "pan",
                        file: fileObj
                    })
                });

                const result = await response.json();

                if (!response.ok || !result.success || !result.data) {
                    showAlertBanner(result.message || "Could not automatically read PAN details.", "warning");
                    return;
                }

                const d = result.data;
                flashAutofilledInput(document.getElementById("pan_number"), d.pan_number);
                if (!document.getElementById("fname").value && d.fname) {
                    flashAutofilledInput(document.getElementById("fname"), d.fname);
                }
                if (!document.getElementById("lname").value && d.lname) {
                    flashAutofilledInput(document.getElementById("lname"), d.lname);
                }
                if (!document.getElementById("dob").value && d.dob) {
                    flashAutofilledInput(document.getElementById("dob"), d.dob);
                }

                showAlertBanner("✅ PAN details auto-filled successfully!", "success");

            } catch (err) {
                console.error("PAN auto-fill error:", err);
                showAlertBanner("Could not auto-fill PAN. Please check the backend connection.", "warning");
            }
        });
    }

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

        if (!isEmailVerified) {
            showAlertBanner("Please verify your email address with the verification code before continuing.", "warning");
            const emailEl = document.getElementById("email");
            if (emailEl) emailEl.focus();
            const verifyBtn = document.getElementById("sendSignupOtpBtn");
            if (verifyBtn) verifyBtn.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
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
        attachPassbookAutoFill(card);
        return card;
    }

    // Attach auto-fill to initial bank account card(s)
    function attachPassbookAutoFill(card) {
        const passbookInput = card.querySelector('input[name="passbook_file"]');
        if (!passbookInput) return;

        passbookInput.addEventListener("change", async function () {
            const file = this.files[0];
            if (!file) return;

            showAlertBanner("✨ Mistral AI is analyzing your bank passbook to auto-fill details...", "info");

            try {
                const fileObj = await fileToBase64(file);
                const response = await fetch(`${API_BASE_URL}/kyc/extract`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        document_type: "passbook",
                        file: fileObj
                    })
                });

                const result = await response.json();

                if (!response.ok || !result.success || !result.data) {
                    showAlertBanner(result.message || "Could not automatically read passbook details.", "warning");
                    return;
                }

                const d = result.data;
                flashAutofilledInput(card.querySelector('input[name="bank_name"]'), d.bank_name);
                flashAutofilledInput(card.querySelector('input[name="account_holder_name"]'), d.account_holder_name);
                flashAutofilledInput(card.querySelector('input[name="account_number"]'), d.account_number);
                flashAutofilledInput(card.querySelector('input[name="branch_name"]'), d.branch_name);
                flashAutofilledInput(card.querySelector('input[name="ifsc_code"]'), d.ifsc_code);

                showAlertBanner("✅ Bank account details auto-filled from passbook! Please verify before continuing.", "success");

            } catch (err) {
                console.error("Passbook auto-fill error:", err);
                showAlertBanner("Could not auto-fill passbook details. Please check the backend connection.", "warning");
            }
        });
    }

    if (bankAccountsList) {
        bankAccountsList.querySelectorAll(".bank-account-card").forEach(function (card) {
            attachPassbookAutoFill(card);
        });
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
        const placeholder = document.getElementById("noLoansPlaceholder");

        if (cards.length === 0) {
            if (placeholder) placeholder.style.display = "block";
        } else {
            if (placeholder) placeholder.style.display = "none";
        }

        cards.forEach(function (card, index) {
            card.setAttribute("data-loan-index", index);
            const title = card.querySelector(".loan-card-title");
            if (title) title.textContent = `Loan #${index + 1}`;
            const removeBtn = card.querySelector(".remove-loan-btn");
            if (removeBtn) {
                removeBtn.style.display = "inline-block";
            }
            bindLoanCardEvents(card);
        });
    }

    function bindLoanCardEvents(card) {
        const removeBtn = card.querySelector(".remove-loan-btn");
        if (removeBtn && !removeBtn._hasRemoveBound) {
            removeBtn._hasRemoveBound = true;
            removeBtn.addEventListener("click", function () {
                card.remove();
                updateLoanCardsUI();
            });
        }
        bindInputFilters(card);
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
                    <label>Lender Name</label>
                    <input type="text" name="lender_name" placeholder="Enter bank or lender name"
                        pattern="[\\p{L}\\p{M} ]+" data-input-filter="letters"
                        title="Use letters and spaces only">
                </div>
                <div class="form-group">
                    <label>Loan Type</label>
                    <select name="loan_type">
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
                    <label>Original Loan Amount (₹)</label>
                    <input type="number" name="loan_amount" min="0" step="0.01"
                        inputmode="decimal" data-input-filter="decimal"
                        placeholder="Enter original loan amount">
                </div>
                <div class="form-group">
                    <label>Outstanding Amount (₹)</label>
                    <input type="number" name="outstanding_amount" min="0" step="0.01"
                        inputmode="decimal" data-input-filter="decimal"
                        placeholder="Enter outstanding amount">
                </div>
                <div class="form-group">
                    <label>Loan Duration (Months)</label>
                    <input type="number" name="loan_duration_months" min="1" step="1"
                        inputmode="numeric" data-input-filter="digits"
                        placeholder="Example: 60">
                </div>
                <div class="form-group">
                    <label>Remaining Months</label>
                    <input type="number" name="remaining_months" min="0" step="1"
                        inputmode="numeric" data-input-filter="digits"
                        placeholder="Enter remaining months">
                </div>
                <div class="form-group">
                    <label>Monthly EMI (₹)</label>
                    <input type="number" name="monthly_emi" min="0" step="0.01"
                        inputmode="decimal" data-input-filter="decimal"
                        placeholder="Enter monthly EMI">
                </div>
                <div class="form-group">
                    <label>Loan Start Date</label>
                    <input type="date" name="loan_start_date">
                </div>
                <div class="form-group">
                    <label>Loan End Date</label>
                    <input type="date" name="loan_end_date">
                </div>
                <div class="form-group">
                    <label>Loan Status</label>
                    <select name="loan_status">
                        <option value="">Select loan status</option>
                        <option value="Active">Active</option>
                        <option value="Closed">Closed</option>
                    </select>
                </div>
            </div>
        `;

        bindLoanCardEvents(card);
        return card;
    }

    // Toggle for "I do not have any existing loans"
    const noLoansCheckbox = document.getElementById("noExistingLoansCheckbox");
    if (noLoansCheckbox) {
        noLoansCheckbox.addEventListener("change", function () {
            const addWrapper = document.querySelector(".add-loan-wrapper");
            const placeholder = document.getElementById("noLoansPlaceholder");
            if (this.checked) {
                if (loansList) loansList.style.display = "none";
                if (addWrapper) addWrapper.style.display = "none";
                if (placeholder) placeholder.style.display = "none";
                hideAlertBanner();
            } else {
                if (loansList) loansList.style.display = "block";
                if (addWrapper) addWrapper.style.display = "block";
                updateLoanCardsUI();
            }
        });
    }

    if (loansList) {
        loansList.querySelectorAll(".loan-account-card").forEach(function (card) {
            bindLoanCardEvents(card);
        });
        updateLoanCardsUI();
    }

    if (addLoanButton) {
        addLoanButton.addEventListener("click", function () {
            if (noLoansCheckbox && noLoansCheckbox.checked) {
                noLoansCheckbox.checked = false;
                if (loansList) loansList.style.display = "block";
                const addWrapper = document.querySelector(".add-loan-wrapper");
                if (addWrapper) addWrapper.style.display = "block";
            }
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
        hideAlertBanner();

        const userId = sessionStorage.getItem("fincentrix_user_id");
        const token = sessionStorage.getItem("fincentrix_token");

        if (!userId) {
            showAlertBanner("User identity not found. Please start registration from Step 1.", "error");
            showPersonalSection();
            return;
        }

        const noLoansChecked = document.getElementById("noExistingLoansCheckbox")?.checked;
        const cards = loansList ? loansList.querySelectorAll(".loan-account-card") : [];
        const loansPayload = [];
        let hasIncompleteLoan = false;

        // Only validate if user did not check "no loans" and there are loan cards present
        if (!noLoansChecked && cards.length > 0) {
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                const lender = card.querySelector('input[name="lender_name"]')?.value.trim() || "";
                const type = card.querySelector('select[name="loan_type"]')?.value || "";
                const amount = card.querySelector('input[name="loan_amount"]')?.value.trim() || "";
                const duration = card.querySelector('input[name="loan_duration_months"]')?.value.trim() || "";
                const emi = card.querySelector('input[name="monthly_emi"]')?.value.trim() || "";
                const outstanding = card.querySelector('input[name="outstanding_amount"]')?.value.trim() || null;
                const remaining = card.querySelector('input[name="remaining_months"]')?.value.trim() || null;
                const startDate = card.querySelector('input[name="loan_start_date"]')?.value || null;
                const endDate = card.querySelector('input[name="loan_end_date"]')?.value || null;
                const status = card.querySelector('select[name="loan_status"]')?.value?.toLowerCase() || "active";

                // Check if any field in this card has user input
                const isPartiallyFilled = Boolean(lender || type || amount || duration || emi || outstanding || remaining || startDate);

                if (isPartiallyFilled) {
                    if (!lender || !amount || !duration || !emi) {
                        showAlertBanner(`Loan #${i + 1}: Please fill in Lender Name, Loan Amount, Duration, and Monthly EMI.`, "warning");
                        hasIncompleteLoan = true;
                        break;
                    }

                    loansPayload.push({
                        lender_name: lender,
                        loan_type: type || null,
                        loan_amount: amount,
                        outstanding_amount: outstanding,
                        loan_duration_months: duration,
                        remaining_months: remaining,
                        monthly_emi: emi,
                        loan_start_date: startDate,
                        loan_end_date: endDate,
                        loan_status: status
                    });
                }
            }

            if (hasIncompleteLoan) {
                return;
            }
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