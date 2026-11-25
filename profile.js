/**
 * Fincentrix - Customer Profile & Settings Controller
 * profile.js
 */

(function () {
    "use strict";

    const API_BASE = "http://localhost:3000/api";
    const BASE_URL = "http://localhost:3000";

    const token = localStorage.getItem("fincentrix_token");
    if (!token) {
        window.location.replace("index.html");
        return;
    }

    let currentUser = null;
    let currentBankAccounts = [];
    let currentApplications = [];

    // =========================================================
    // 01. TOAST NOTIFICATION UTILITY
    // =========================================================
    function showToast(message, type = "success") {
        let container = document.getElementById("toastContainer");
        if (!container) {
            container = document.createElement("div");
            container.id = "toastContainer";
            container.className = "fixed bottom-5 right-5 z-[300] flex flex-col gap-2 pointer-events-none";
            document.body.appendChild(container);
        }

        const toast = document.createElement("div");
        const isSuccess = type === "success";
        const isError = type === "error";

        toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold transform transition-all duration-300 translate-y-3 opacity-0 ${
            isSuccess
                ? "bg-emerald-900/90 text-white border-emerald-500 backdrop-blur-md"
                : isError
                ? "bg-rose-900/90 text-white border-rose-500 backdrop-blur-md"
                : "bg-navy/95 text-white border-blue-400 backdrop-blur-md"
        }`;

        const icon = isSuccess ? "fa-circle-check text-emerald-400" : isError ? "fa-circle-xmark text-rose-400" : "fa-circle-info text-blue-300";
        toast.innerHTML = `<i class="fa-solid ${icon} text-sm shrink-0"></i><span>${message}</span>`;

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.remove("translate-y-3", "opacity-0");
        });

        setTimeout(() => {
            toast.classList.add("opacity-0", "translate-y-2");
            setTimeout(() => toast.remove(), 350);
        }, 4000);
    }

    // =========================================================
    // 02. MODAL CONTROLS
    // =========================================================
    const modalElements = Array.from(document.querySelectorAll("[data-modal]"));
    let activeModal = null;

    function openModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        activeModal = modal;
        modal.hidden = false;
        modal.classList.add("flex");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("overflow-hidden");

        const firstInput = modal.querySelector("input:not([type='checkbox']):not([type='hidden'])");
        setTimeout(() => firstInput?.focus(), 50);
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.hidden = true;
        modal.classList.remove("flex");
        modal.setAttribute("aria-hidden", "true");
        if (activeModal === modal) activeModal = null;
        document.body.classList.remove("overflow-hidden");
    }

    document.querySelectorAll("[data-open-modal]").forEach((button) => {
        button.addEventListener("click", () => openModal(button.dataset.openModal));
    });

    modalElements.forEach((modal) => {
        modal.querySelectorAll("[data-close-modal]").forEach((button) => {
            button.addEventListener("click", () => closeModal(modal));
        });
        modal.addEventListener("click", (event) => {
            if (event.target === modal) closeModal(modal);
        });
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && activeModal) {
            closeModal(activeModal);
        }
    });

    // Password visibility toggle helper
    document.querySelectorAll("[data-toggle-password]").forEach((button) => {
        button.addEventListener("click", () => {
            const input = button.parentElement.querySelector("input");
            if (!input) return;
            const isPassword = input.type === "password";
            input.type = isPassword ? "text" : "password";
            button.innerHTML = isPassword ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
            button.setAttribute("aria-label", `${isPassword ? "Hide" : "Show"} password`);
        });
    });

    // =========================================================
    // 03. FETCH & RENDER USER PROFILE
    // =========================================================
    async function loadUserProfile() {
        try {
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) {
                if (res.status === 401) {
                    localStorage.removeItem("fincentrix_token");
                    localStorage.removeItem("fincentrix_user");
                    window.location.replace("index.html");
                    return;
                }
                throw new Error("Failed to load profile");
            }

            const data = await res.json();
            currentUser = data.user || data.data;
            if (!currentUser) return;

            localStorage.setItem("fincentrix_user", JSON.stringify(currentUser));
            renderProfileHeader(currentUser);
            renderPersonalInfo(currentUser);
            renderContactInfo(currentUser);
            renderKycDocuments(currentUser.documents || []);
        } catch (err) {
            console.error("Error loading user profile:", err);
            showToast("Failed to load profile details. Check connection.", "error");
        }
    }

    function renderProfileHeader(user) {
        const fname = user.fname || "Customer";
        const lname = user.lname || "";
        const fullName = `${fname} ${lname}`.trim();
        const initials = `${fname.charAt(0)}${lname.charAt(0)}`.toUpperCase() || "FX";

        // Top bar & Header avatars
        const avatarEl = document.getElementById("profileAvatar");
        const sidebarAvatar = document.getElementById("sidebarUserAvatar");
        const topbarMobileAvatar = document.getElementById("topbarMobileAvatar");
        const topbarUserAvatar = document.getElementById("topbarUserAvatar");

        const profileImg = user.profile_image
            ? (user.profile_image.startsWith("http") ? user.profile_image : `${BASE_URL}/${user.profile_image.replace(/^\/+/, '')}`)
            : null;

        const updateAvatar = (el) => {
            if (!el) return;
            if (profileImg) {
                el.style.backgroundImage = `url("${profileImg}")`;
                el.style.backgroundSize = "cover";
                el.style.backgroundPosition = "center";
                el.textContent = "";
            } else {
                el.style.backgroundImage = "none";
                el.textContent = initials;
            }
        };

        updateAvatar(avatarEl);
        updateAvatar(sidebarAvatar);
        updateAvatar(topbarMobileAvatar);
        updateAvatar(topbarUserAvatar);

        // Name, Customer ID, Member Since
        const nameEl = document.getElementById("profileName");
        if (nameEl) nameEl.textContent = fullName;

        const customerIdEl = document.querySelector("[data-customer-id]");
        if (customerIdEl) customerIdEl.textContent = `FXC-${String(user.id).padStart(7, "0")}`;

        const memberSinceEl = document.querySelector("[data-member-since]");
        if (memberSinceEl) {
            const date = user.created_at ? new Date(user.created_at) : new Date();
            memberSinceEl.textContent = date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
        }

        // CIBIL Score gauge
        const cibil = parseInt(user.cibil_score || 750, 10);
        const scoreBox = document.querySelector("#profileOverview .sm\\:max-w-\\[270px\\]");
        if (scoreBox) {
            const scoreText = scoreBox.querySelector("p.text-3xl");
            const progressBar = scoreBox.querySelector("[role='img'] div");
            if (scoreText) {
                let rating = "Good";
                let ratingColor = "text-emerald-200";
                if (cibil >= 780) { rating = "Excellent"; ratingColor = "text-emerald-200"; }
                else if (cibil >= 720) { rating = "Very Good"; ratingColor = "text-emerald-200"; }
                else if (cibil >= 650) { rating = "Fair"; ratingColor = "text-amber-200"; }
                else { rating = "Needs Attention"; ratingColor = "text-rose-200"; }

                scoreText.innerHTML = `${cibil} <span class="text-xs font-semibold ${ratingColor}">${rating}</span>`;
            }
            if (progressBar) {
                const pct = Math.min(100, Math.max(0, ((cibil - 300) / 600) * 100));
                progressBar.style.width = `${pct}%`;
                progressBar.style.background = "linear-gradient(to right, #ef4444 0%, #f59e0b 50%, #10b981 100%)";
            }
        }
    }

    function renderPersonalInfo(user) {
        // Section A: All fields locked/readonly
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || "Not specified";
        };

        const fullName = `${user.fname || ""} ${user.lname || ""}`.trim();
        setVal("identityFullName", fullName);

        if (user.dob) {
            const d = new Date(user.dob);
            setVal("identityDob", isNaN(d) ? user.dob : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }));
        } else {
            setVal("identityDob", "Not specified");
        }

        setVal("identityGender", user.gender || "Not specified");
        setVal("identityAddress1", user.address_line1 || user.address_line2 || "Not specified");
        setVal("identityCity", user.city || "Not specified");
        setVal("identityState", user.state || "Not specified");
        setVal("identityPincode", user.pincode || "Not specified");

        // Masked PAN & Aadhaar
        if (user.pan_number) {
            const p = user.pan_number.trim();
            setVal("identityPan", p.length >= 4 ? `••••••${p.slice(-4)}` : p);
        } else {
            setVal("identityPan", "••••••••••");
        }

        if (user.aadhaar_number) {
            const a = user.aadhaar_number.trim();
            setVal("identityAadhaar", a.length >= 4 ? `•••• •••• ${a.slice(-4)}` : a);
        } else {
            setVal("identityAadhaar", "•••• •••• ••••");
        }
    }

    function renderContactInfo(user) {
        const emailEl = document.querySelector("[data-contact-email]");
        if (emailEl) emailEl.textContent = user.email || "No email registered";

        const phoneEl = document.querySelector("[data-contact-phone]");
        if (phoneEl) {
            const raw = user.phone || "";
            phoneEl.textContent = raw.length === 10 ? `+91 ${raw.slice(0, 5)} ${raw.slice(5)}` : raw || "No phone registered";
        }
    }

    /**
     * RULE 1: KYC verified badge will appear ONLY when Aadhaar, PAN, and passbook are verified by the operator
     */
    function renderKycDocuments(documents) {
        const aadhaarDoc = documents.find(d => d.document_type === "aadhaar" || d.document_type === "aadhaar_card");
        const panDoc = documents.find(d => d.document_type === "pan" || d.document_type === "pan_card");
        const passbookDoc = documents.find(d => d.document_type === "passbook" || d.document_type === "bank_statement");

        const updateDocCard = (selector, doc) => {
            const card = document.querySelector(`[data-kyc-document="${selector}"]`);
            if (!card) return;

            const nameEl = card.querySelector("p.truncate");
            const dateEl = card.querySelector("p.text-\\[9px\\]");
            const statusEl = card.querySelector("[data-document-status]");

            if (doc) {
                if (nameEl) nameEl.textContent = doc.file_name || `${selector}_document.pdf`;
                if (dateEl && doc.uploaded_at) {
                    const dt = new Date(doc.uploaded_at);
                    dateEl.textContent = `Uploaded ${dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
                }

                const status = (doc.verification_status || "pending").toLowerCase();
                card.dataset.status = status;

                if (statusEl) {
                    if (status === "verified") {
                        statusEl.className = "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700";
                        statusEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> Verified`;
                    } else if (status === "rejected") {
                        statusEl.className = "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700";
                        statusEl.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Rejected`;
                    } else {
                        statusEl.className = "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700";
                        statusEl.innerHTML = `<i class="fa-solid fa-clock"></i> Pending Review`;
                    }
                }
            } else {
                card.dataset.status = "pending";
                if (statusEl) {
                    statusEl.className = "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500";
                    statusEl.innerHTML = `<i class="fa-solid fa-circle-minus"></i> Not Uploaded`;
                }
            }
        };

        updateDocCard("aadhaar", aadhaarDoc);
        updateDocCard("pan", panDoc);
        updateDocCard("bank-passbook", passbookDoc);

        // Check if ALL 3 core documents are verified by operator
        const isAadhaarVerified = aadhaarDoc && aadhaarDoc.verification_status === "verified";
        const isPanVerified = panDoc && panDoc.verification_status === "verified";
        const isPassbookVerified = passbookDoc && passbookDoc.verification_status === "verified";

        const allCoreVerified = isAadhaarVerified && isPanVerified && isPassbookVerified;

        const verifiedBadge = document.getElementById("kycVerifiedBadge");
        const pendingBadge = document.getElementById("kycPendingBadge");

        if (allCoreVerified) {
            if (verifiedBadge) {
                verifiedBadge.classList.remove("hidden");
                verifiedBadge.classList.add("inline-flex");
            }
            if (pendingBadge) pendingBadge.classList.add("hidden");
        } else {
            if (verifiedBadge) {
                verifiedBadge.classList.add("hidden");
                verifiedBadge.classList.remove("inline-flex");
            }
            if (pendingBadge) {
                pendingBadge.classList.remove("hidden");
                const subtext = pendingBadge.querySelector("span.text-amber-100\\/90");
                if (subtext) {
                    const pendingList = [];
                    if (!isAadhaarVerified) pendingList.push("Aadhaar");
                    if (!isPanVerified) pendingList.push("PAN");
                    if (!isPassbookVerified) pendingList.push("Bank Passbook");
                    subtext.textContent = `Pending verification for: ${pendingList.join(", ")}.`;
                }
            }
        }
    }

    // =========================================================
    // 04. FETCH & RENDER BANK ACCOUNTS
    // =========================================================
    async function loadBankAccounts() {
        try {
            const res = await fetch(`${API_BASE}/bank`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to fetch bank accounts");
            const result = await res.json();
            currentBankAccounts = result.data || [];

            renderBankCard();
        } catch (err) {
            console.error("Error loading bank accounts:", err);
        }
    }

    function renderBankCard() {
        const primaryAcc = currentBankAccounts.find(a => a.is_primary === 1) || currentBankAccounts[0];

        const bankNameEl = document.querySelector("[data-bank-name]");
        const holderEl = document.querySelector("[data-account-holder]");
        const accNumEl = document.querySelector("[data-account-number]");
        const ifscEl = document.querySelector("[data-ifsc]");
        const branchEl = document.querySelector("[data-bank-branch]");
        const bankIdInput = document.getElementById("bankIdInput");

        if (primaryAcc) {
            if (bankNameEl) bankNameEl.textContent = primaryAcc.bank_name;
            if (holderEl) holderEl.textContent = `Account holder: ${primaryAcc.account_holder_name}`;
            if (accNumEl) {
                const num = String(primaryAcc.account_number).trim();
                accNumEl.textContent = num.length >= 4 ? `•••• •••• ${num.slice(-4)}` : num;
            }
            if (ifscEl) ifscEl.textContent = primaryAcc.ifsc_code;
            if (branchEl) branchEl.textContent = primaryAcc.branch_name || "Main Branch";
        } else {
            if (bankNameEl) bankNameEl.textContent = "No Bank Account Registered";
            if (holderEl) holderEl.textContent = "Please add your disbursement bank account.";
            if (accNumEl) accNumEl.textContent = "•••• •••• ••••";
            if (ifscEl) ifscEl.textContent = "—";
            if (branchEl) branchEl.textContent = "—";
        }

        // Wire Edit Bank button
        const editBtn = document.getElementById("editPrimaryBankBtn");
        if (editBtn) {
            editBtn.onclick = () => {
                const form = document.querySelector("[data-bank-form]");
                if (form) form.reset();
                if (primaryAcc) {
                    if (bankIdInput) bankIdInput.value = primaryAcc.id;
                    if (form.elements["bankName"]) form.elements["bankName"].value = primaryAcc.bank_name;
                    if (form.elements["accountNumber"]) form.elements["accountNumber"].value = primaryAcc.account_number;
                    if (form.elements["confirmAccountNumber"]) form.elements["confirmAccountNumber"].value = primaryAcc.account_number;
                    if (form.elements["ifscCode"]) form.elements["ifscCode"].value = primaryAcc.ifsc_code;
                    if (form.elements["setPrimary"]) form.elements["setPrimary"].checked = true;
                } else {
                    if (bankIdInput) bankIdInput.value = "new";
                }
                openModal("bankModal");
            };
        }

        // Wire Add Secondary button
        const addBtn = document.getElementById("addSecondaryBankBtn");
        if (addBtn) {
            addBtn.onclick = () => {
                const form = document.querySelector("[data-bank-form]");
                if (form) form.reset();
                if (bankIdInput) bankIdInput.value = "new";
                openModal("bankModal");
            };
        }
    }

    // Bank Form Submission
    const bankForm = document.querySelector("[data-bank-form]");
    if (bankForm) {
        bankForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = bankForm.querySelector("button[type='submit']");
            const bankIdInput = document.getElementById("bankIdInput");

            const bankName = bankForm.elements["bankName"]?.value.trim();
            const accountNumber = bankForm.elements["accountNumber"]?.value.trim();
            const confirmAccountNumber = bankForm.elements["confirmAccountNumber"]?.value.trim();
            const ifscCode = bankForm.elements["ifscCode"]?.value.trim().toUpperCase();
            const setPrimary = bankForm.elements["setPrimary"]?.checked;
            const bankId = bankIdInput?.value;

            if (!bankName || !accountNumber || !ifscCode) {
                showToast("Please fill in all bank details.", "error");
                return;
            }

            if (accountNumber !== confirmAccountNumber) {
                showToast("Account numbers do not match.", "error");
                return;
            }

            const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
            if (!ifscRegex.test(ifscCode)) {
                showToast("Invalid 11-digit IFSC code format.", "error");
                return;
            }

            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = "Saving...";

            try {
                const isUpdate = bankId && bankId !== "new";
                const url = isUpdate ? `${API_BASE}/bank/${bankId}` : `${API_BASE}/bank`;
                const method = isUpdate ? "PUT" : "POST";

                const bodyPayload = isUpdate
                    ? { bank_name: bankName, account_number: accountNumber, ifsc_code: ifscCode, is_primary: setPrimary ? 1 : 0 }
                    : { bank_name: bankName, account_holder_name: `${currentUser?.fname || ''} ${currentUser?.lname || ''}`.trim() || "Customer", account_number: accountNumber, branch_name: "Branch", ifsc_code: ifscCode, is_primary: setPrimary ? 1 : 0 };

                const res = await fetch(url, {
                    method: method,
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(bodyPayload)
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to save bank details");

                showToast(data.message || "Bank details saved successfully!");
                closeModal(document.getElementById("bankModal"));
                await loadBankAccounts();
            } catch (err) {
                console.error("Error saving bank details:", err);
                showToast(err.message || "Failed to save bank details.", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    // =========================================================
    // 05. EMAIL UPDATE WITH OTP FLOW (RULE 2)
    // =========================================================
    const emailNextBtn = document.querySelector("[data-email-next]");
    const emailVerifyBtn = document.querySelector("[data-email-verify]");
    const emailBackBtn = document.querySelector("[data-email-back]");
    const emailSteps = Array.from(document.querySelectorAll("[data-email-step]"));
    let pendingNewEmail = "";

    if (emailNextBtn) {
        emailNextBtn.addEventListener("click", async () => {
            const emailInput = document.getElementById("newEmail");
            const newEmail = emailInput?.value.trim().toLowerCase();

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
            if (!newEmail || !emailRegex.test(newEmail)) {
                showToast("Please enter a valid email address.", "error");
                return;
            }

            if (currentUser && newEmail === currentUser.email?.toLowerCase()) {
                showToast("This is already your current email address.", "error");
                return;
            }

            emailNextBtn.disabled = true;
            emailNextBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Sending OTP...`;

            try {
                const res = await fetch(`${API_BASE}/auth/send-otp`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ email: newEmail, purpose: "email_update" })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to send verification code");

                pendingNewEmail = newEmail;
                const destEl = document.querySelector("[data-email-destination]");
                if (destEl) destEl.textContent = newEmail;

                emailSteps.forEach(s => { s.hidden = s.dataset.emailStep !== "2"; });
                document.getElementById("emailOtp")?.focus();
                showToast(`Verification code sent to ${newEmail}`);
            } catch (err) {
                console.error("Error sending email update OTP:", err);
                showToast(err.message || "Failed to send code.", "error");
            } finally {
                emailNextBtn.disabled = false;
                emailNextBtn.innerHTML = `Continue to verification <i class="fa-solid fa-arrow-right ml-1"></i>`;
            }
        });
    }

    if (emailBackBtn) {
        emailBackBtn.addEventListener("click", () => {
            emailSteps.forEach(s => { s.hidden = s.dataset.emailStep !== "1"; });
            document.getElementById("newEmail")?.focus();
        });
    }

    if (emailVerifyBtn) {
        emailVerifyBtn.addEventListener("click", async () => {
            const otpInput = document.getElementById("emailOtp");
            const otp = otpInput?.value.trim();

            if (!otp || otp.length !== 6) {
                showToast("Please enter the 6-digit verification code.", "error");
                return;
            }

            emailVerifyBtn.disabled = true;
            emailVerifyBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Verifying...`;

            try {
                const res = await fetch(`${API_BASE}/auth/verify-email-update`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ newEmail: pendingNewEmail, otp: otp })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Verification failed");

                showToast("Email address updated successfully!");
                if (currentUser) currentUser.email = pendingNewEmail;

                const emailEl = document.querySelector("[data-contact-email]");
                if (emailEl) emailEl.textContent = pendingNewEmail;

                closeModal(document.getElementById("emailModal"));
                emailSteps.forEach(s => { s.hidden = s.dataset.emailStep !== "1"; });
                if (otpInput) otpInput.value = "";
            } catch (err) {
                console.error("Error verifying email update:", err);
                showToast(err.message || "Invalid verification code.", "error");
            } finally {
                emailVerifyBtn.disabled = false;
                emailVerifyBtn.textContent = "Verify & apply change";
            }
        });
    }

    // =========================================================
    // 06. PHONE NUMBER UPDATE (RULE 2)
    // =========================================================
    const phoneNextBtn = document.querySelector("[data-phone-next]");
    if (phoneNextBtn) {
        phoneNextBtn.addEventListener("click", async () => {
            const phoneInput = document.getElementById("newPhone");
            const newPhone = phoneInput?.value.trim().replace(/\D/g, "");

            if (!newPhone || newPhone.length !== 10) {
                showToast("Please enter a valid 10-digit mobile number.", "error");
                return;
            }

            phoneNextBtn.disabled = true;
            phoneNextBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Updating...`;

            try {
                const res = await fetch(`${API_BASE}/auth/update-phone`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ newPhone })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to update phone number");

                showToast("Phone number updated successfully!");
                if (currentUser) currentUser.phone = newPhone;

                const phoneEl = document.querySelector("[data-contact-phone]");
                if (phoneEl) phoneEl.textContent = `+91 ${newPhone.slice(0, 5)} ${newPhone.slice(5)}`;

                closeModal(document.getElementById("phoneModal"));
                if (phoneInput) phoneInput.value = "";
            } catch (err) {
                console.error("Error updating phone:", err);
                showToast(err.message || "Failed to update phone.", "error");
            } finally {
                phoneNextBtn.disabled = false;
                phoneNextBtn.textContent = "Continue to phone verification";
            }
        });
    }

    // =========================================================
    // 07. PROFILE PICTURE UPLOAD
    // =========================================================
    const pictureInput = document.getElementById("profilePictureInput");
    if (pictureInput) {
        pictureInput.addEventListener("change", async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file || !file.type.startsWith("image/")) {
                showToast("Please choose an image file (PNG/JPG).", "error");
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                showToast("Image must be smaller than 5 MB.", "error");
                return;
            }

            const reader = new FileReader();
            reader.onload = async () => {
                const base64Data = reader.result;

                // Immediate preview
                const avatarEl = document.getElementById("profileAvatar");
                if (avatarEl) {
                    avatarEl.style.backgroundImage = `url("${base64Data}")`;
                    avatarEl.style.backgroundSize = "cover";
                    avatarEl.style.backgroundPosition = "center";
                    avatarEl.textContent = "";
                }

                try {
                    const res = await fetch(`${API_BASE}/auth/profile-picture`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({ image: base64Data })
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || "Failed to upload picture");

                    showToast("Profile picture updated!");
                    if (currentUser) {
                        currentUser.profile_image = data.profile_image;
                        localStorage.setItem("fincentrix_user", JSON.stringify(currentUser));
                    }

                    const imgUrl = `${BASE_URL}/${data.profile_image.replace(/^\/+/, '')}`;

                    // Update all avatars on the current page immediately
                    [
                        document.getElementById("profileAvatar"),
                        document.getElementById("sidebarUserAvatar"),
                        document.getElementById("topbarMobileAvatar"),
                        document.getElementById("topbarUserAvatar")
                    ].forEach((el) => {
                        if (!el) return;
                        el.style.backgroundImage = `url("${imgUrl}")`;
                        el.style.backgroundSize = "cover";
                        el.style.backgroundPosition = "center";
                        el.textContent = "";
                    });
                } catch (err) {
                    console.error("Error uploading profile picture:", err);
                    showToast("Failed to save profile picture.", "error");
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // =========================================================
    // 08. FETCH & RENDER LOAN APPLICATIONS (SECTION E)
    // =========================================================
    async function loadLoanApplications() {
        try {
            const res = await fetch(`${API_BASE}/loans/my-applications`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) return;
            const result = await res.json();
            currentApplications = result.data || [];

            renderLoanPortfolio();
        } catch (err) {
            console.error("Error loading applications:", err);
        }
    }

    function renderLoanPortfolio() {
        const activeContainer = document.getElementById("activeLoanContainer");
        const recentList = document.getElementById("recentAppsList");

        // Find active facility
        const activeApp = currentApplications.find(a => ["approved", "sanctioned", "disbursed"].includes(a.status));

        if (activeApp && activeContainer) {
            activeContainer.classList.remove("hidden");
            const nameEl = document.getElementById("activeLoanName");
            const refEl = document.getElementById("activeLoanRef");
            const amtEl = document.getElementById("activeSanctionedAmt");
            const emiEl = document.getElementById("activeNextEmi");
            const dueDateEl = document.getElementById("activeEmiDueDate");

            if (nameEl) nameEl.textContent = activeApp.loan_name;
            if (refEl) refEl.textContent = `Ref: ${activeApp.application_ref}`;

            const amt = activeApp.sanctioned_amount || activeApp.requested_amount;
            if (amtEl) amtEl.textContent = `₹${Number(amt).toLocaleString("en-IN")}`;

            const emi = activeApp.sanctioned_emi || 16249;
            if (emiEl) emiEl.textContent = `₹${Number(emi).toLocaleString("en-IN")}`;

            // Calculate next EMI date using disbursement date as recurring day
            const baseDate = new Date(activeApp.disbursed_at || activeApp.applied_at || Date.now());
            const dueDay = baseDate.getDate();
            const now = new Date();
            let nextDate = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
            if (nextDate.getDate() !== dueDay) nextDate.setDate(0);

            if (dueDateEl) {
                dueDateEl.textContent = nextDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
            }
        } else if (activeContainer) {
            activeContainer.innerHTML = `
                <div class="p-5 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                    <i class="fa-solid fa-receipt text-2xl text-slate-300 block mb-2"></i>
                    <p class="font-bold text-navy">No active loan facility currently</p>
                    <p class="text-[10px] text-slate-400 mt-0.5">Explore our loan products to apply for immediate financing.</p>
                    <a href="loans.html" class="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-dark transition">
                        <span>Explore Loan Products</span>
                        <i class="fa-solid fa-arrow-right text-[10px]"></i>
                    </a>
                </div>
            `;
        }

        // Render recent applications list
        if (recentList) {
            if (currentApplications.length === 0) {
                recentList.innerHTML = `<li class="text-xs text-slate-400">No applications submitted yet.</li>`;
                return;
            }

            const recentSlice = currentApplications.slice(0, 3);
            recentList.innerHTML = recentSlice.map((app, idx) => {
                const isApproved = ["approved", "sanctioned", "disbursed"].includes(app.status);
                const isRejected = app.status === "rejected";
                const isUnderReview = app.status === "under_review" || app.status === "in_review" || app.status === "pending";

                const badgeClass = isApproved
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300/60"
                    : isRejected
                    ? "bg-rose-50 text-rose-700 border-rose-300/60"
                    : "bg-amber-50 text-amber-700 border-amber-300/60";

                const badgeText = isApproved ? "Approved & Sanctioned" : isRejected ? "Rejected" : "Under Review";
                const borderClass = idx < recentSlice.length - 1 ? "border-b border-slate-100 pb-2.5" : "";

                return `
                    <li class="flex flex-wrap items-center justify-between gap-2 ${borderClass}">
                        <div>
                            <p class="text-[11px] font-bold text-navy">${app.loan_name}</p>
                            <p class="mt-0.5 text-[9px] text-slate-500 font-mono">Ref: ${app.application_ref}</p>
                        </div>
                        <span class="rounded-full px-2.5 py-1 text-[9px] font-bold border ${badgeClass}">
                            ${badgeText}
                        </span>
                    </li>
                `;
            }).join("");
        }
    }

    // =========================================================
    // 09. ACCOUNT SECURITY - CHANGE PASSWORD
    // =========================================================
    const passwordForm = document.querySelector("[data-profile-form='password']");
    if (passwordForm) {
        passwordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = passwordForm.querySelector("button[type='submit']");

            const currentPassword = passwordForm.elements["currentPassword"]?.value;
            const newPassword = passwordForm.elements["newPassword"]?.value;
            const confirmPassword = passwordForm.elements["confirmPassword"]?.value;

            if (!currentPassword || !newPassword || !confirmPassword) {
                showToast("Please fill in all password fields.", "error");
                return;
            }

            if (newPassword.length < 6) {
                showToast("New password must be at least 6 characters long.", "error");
                return;
            }

            if (newPassword !== confirmPassword) {
                showToast("New passwords do not match.", "error");
                return;
            }

            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Updating...`;

            try {
                const res = await fetch(`${API_BASE}/auth/change-password`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ currentPassword, newPassword })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to update password");

                showToast("Password updated successfully!");
                passwordForm.reset();
            } catch (err) {
                console.error("Error changing password:", err);
                showToast(err.message || "Failed to change password.", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // =========================================================
    // 10. INITIALIZATION SEQUENCE
    // =========================================================
    async function init() {
        await loadUserProfile();
        await Promise.all([
            loadBankAccounts(),
            loadLoanApplications()
        ]);
    }

    init();
})();
