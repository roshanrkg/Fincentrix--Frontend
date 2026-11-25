document.addEventListener("DOMContentLoaded", async () => {

    "use strict";

    const API_BASE_URL = "http://localhost:3000/api";

    // =============================================
    // 01. AUTHENTICATION & ROUTE GUARD
    // =============================================

    const token = localStorage.getItem("fincentrix_token");
    if (!token) {
        window.location.replace("index.html");
        return;
    }

    let currentUser = null;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok || !data.success || !data.user) {
            localStorage.removeItem("fincentrix_token");
            localStorage.removeItem("fincentrix_user");
            window.location.replace("index.html");
            return;
        }

        currentUser = data.user;
        localStorage.setItem("fincentrix_user", JSON.stringify(currentUser));

    } catch (err) {
        console.error("Auth check failed:", err);
        // On connection error, redirect to login
        window.location.replace("index.html");
        return;
    }

    // =============================================
    // 02. SELECT HTML ELEMENTS
    // =============================================

    const greetingMessage = document.getElementById("greetingMessage");
    const sidebar = document.getElementById("sidebar");
    const menuButton = document.getElementById("menuButton");
    const sidebarClose = document.getElementById("sidebarClose");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const upgradeButton = document.getElementById("upgradeButton");
    const profileButton = document.getElementById("profileButton");
    const logoutButton = document.getElementById("logoutButton");
    const sidebarUserName = document.getElementById("sidebarUserName");
    const sidebarUserRole = document.getElementById("sidebarUserRole");
    const sidebarUserAvatar = document.getElementById("sidebarUserAvatar");
    const topbarUserAvatar = document.getElementById("topbarUserAvatar");

    const navLinks = document.querySelectorAll(".nav-link");
    const bottomNavLinks = document.querySelectorAll(".bottom-nav-link");

    const eligibilityBadge = document.getElementById("eligibilityBadge");
    const eligibilityHeading = document.getElementById("eligibilityHeading");
    const eligibilityDescription = document.getElementById("eligibilityDescription");
    const eligibilityAmountBox = document.getElementById("eligibilityAmountBox");
    const eligibleLoanAmount = document.getElementById("eligibleLoanAmount");
    const eligibilityActionButton = document.getElementById("eligibilityActionButton");
    const payNowBtn = document.getElementById("payNowBtn");
    const activeFacilityEmiGrid = document.getElementById("activeFacilityEmiGrid");
    const eligibilityStandardAmount = document.getElementById("eligibilityStandardAmount");

    const loanProductsCount = document.getElementById("loanProductsCount");
    const loanCardGrid = document.getElementById("loanCardGrid");

    // =============================================
    // 03. POPULATE USER PROFILE & DYNAMIC GREETING
    // =============================================

    const userFirstName = currentUser.fname || "Customer";
    const userLastName = currentUser.lname || "";
    const userInitials = `${userFirstName.charAt(0)}${userLastName.charAt(0)}`.toUpperCase() || "FX";

    if (sidebarUserName) {
        sidebarUserName.textContent = `${userFirstName} ${userLastName}`.trim();
    }
    if (sidebarUserRole) {
        sidebarUserRole.textContent = currentUser.role === "admin" ? "Administrator" : "Verified Customer";
    }
    if (sidebarUserAvatar) {
        sidebarUserAvatar.textContent = userInitials;
    }
    if (topbarUserAvatar) {
        topbarUserAvatar.textContent = userInitials;
    }

    function updateGreeting() {
        if (!greetingMessage) return;
        const hour = new Date().getHours();
        let greeting;

        if (hour >= 5 && hour < 12) {
            greeting = `Good Morning, ${userFirstName}!`;
        } else if (hour >= 12 && hour < 17) {
            greeting = `Good Afternoon, ${userFirstName}!`;
        } else if (hour >= 17 && hour < 21) {
            greeting = `Good Evening, ${userFirstName}!`;
        } else {
            greeting = `Good Night, ${userFirstName}!`;
        }

        greetingMessage.textContent = greeting;
    }

    updateGreeting();

    // =============================================
    // 04. LOGOUT HANDLER
    // =============================================

    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            try {
                await fetch(`${API_BASE_URL}/auth/logout`, { method: "POST" });
            } catch (e) {
                // Ignore network errors on logout
            }
            localStorage.removeItem("fincentrix_token");
            localStorage.removeItem("fincentrix_user");
            window.location.replace("index.html");
        });
    }

    // =============================================
    // 05. DYNAMIC LOAN ELIGIBILITY SYSTEM
    // =============================================

    function formatLoanAmount(amount) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(amount);
    }

    // =============================================
    // 05. TOP BANNER & DYNAMIC ELIGIBILITY SYSTEM
    // =============================================

    function calculateMonthlyEmi(principal, annualRate, tenureMonths) {
        const P = parseFloat(principal || 0);
        const N = parseInt(tenureMonths || 0, 10);
        const R = (parseFloat(annualRate || 10.49)) / (12 * 100);

        if (P <= 0 || N <= 0) return 0;
        const emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
        return Math.round(emi);
    }

    function getNextEmiDate(disbursalDateRaw) {
        const base = new Date(disbursalDateRaw || Date.now());
        const dueDay = base.getDate(); // Use disbursement date as recurring day of the month
        const now = new Date();
        
        // Consider disbursement date as EMI recurring date starting from next months
        let nextDate = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
        if (nextDate.getDate() !== dueDay) {
            nextDate.setDate(0); // Protect against month-end edge
        }
        return nextDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    function formatLoanAmount(amount) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(amount);
    }

    function renderTopBanner(pendingApp) {
        if (!eligibilityBadge || !eligibilityHeading || !eligibilityDescription ||
            !eligibilityAmountBox || !eligibleLoanAmount || !eligibilityActionButton) {
            return;
        }

        // STATE 1: USER HAS AN ACTIVE / PENDING LOAN APPLICATION
        if (pendingApp) {
            const appDate = new Date(pendingApp.applied_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric"
            });
            const isApproved = ["approved", "sanctioned", "disbursed"].includes(pendingApp.status);
            const displayAmt = pendingApp.sanctioned_amount || pendingApp.requested_amount;
            const displayTenure = pendingApp.sanctioned_tenure_months || pendingApp.requested_tenure_months;
            const requestedFormatted = formatLoanAmount(displayAmt);

            const maturityDateFormatted = pendingApp.tenure_end_date 
                ? new Date(pendingApp.tenure_end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : null;

            if (isApproved) {
                // Calculate next EMI date based on disbursement date / applied date
                const disbursalDateRaw = pendingApp.disbursed_at || pendingApp.applied_at || Date.now();
                const nextEmiDateStr = getNextEmiDate(disbursalDateRaw);
                const annualRate = pendingApp.sanctioned_interest_rate || pendingApp.min_interest_rate || 10.49;
                const emiValue = pendingApp.sanctioned_emi || calculateMonthlyEmi(displayAmt, annualRate, displayTenure);
                const emiFormatted = formatLoanAmount(emiValue);

                eligibilityBadge.innerHTML = `<i class="fa-solid fa-circle-check mr-1"></i> ACTIVE LOAN FACILITY`;
                eligibilityBadge.className = "welcome-tag inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3.5 py-1.5 text-[8px] sm:text-[9px] font-extrabold tracking-[1.2px] text-emerald-200 backdrop-blur-sm";

                eligibilityHeading.innerHTML = `
                    Active Facility Approved, ${userFirstName}!
                    <br>
                    <span class="text-emerald-300 font-extrabold text-xl sm:text-[26px]">${pendingApp.loan_name}</span>
                `;

                eligibilityDescription.innerHTML = `
                    Your loan (<strong class="font-mono text-white tracking-wide">${pendingApp.application_ref}</strong>) is active. Further loan applications are blocked until tenure completion on <strong>${maturityDateFormatted || 'maturity'}</strong>.
                `;

                // Show dynamic dual-card stats (Sanctioned Amount + Next Monthly EMI)
                if (eligibilityStandardAmount) eligibilityStandardAmount.classList.add("hidden");
                if (activeFacilityEmiGrid) {
                    activeFacilityEmiGrid.classList.remove("hidden");
                    const sanctionedAmtEl = document.getElementById("activeSanctionedAmount");
                    const tenureSubtextEl = document.getElementById("activeLoanTenureSubtext");
                    const emiAmtEl = document.getElementById("activeNextEmiAmount");
                    const emiDateEl = document.getElementById("activeNextEmiDate");

                    if (sanctionedAmtEl) sanctionedAmtEl.textContent = requestedFormatted;
                    if (tenureSubtextEl) {
                        tenureSubtextEl.innerHTML = `Tenure: <strong>${displayTenure} Months</strong> • <span class="text-emerald-300 font-semibold">Approved & Sanctioned</span>`;
                    }
                    if (emiAmtEl) emiAmtEl.textContent = emiFormatted;
                    if (emiDateEl) emiDateEl.textContent = nextEmiDateStr;
                }

                // Show static Pay EMI Now button
                if (payNowBtn) {
                    payNowBtn.classList.remove("hidden");
                    payNowBtn.onclick = (e) => {
                        e.preventDefault();
                        openPayNowModal({
                            ref: pendingApp.application_ref,
                            loanName: pendingApp.loan_name,
                            amount: emiFormatted,
                            dueDate: nextEmiDateStr
                        });
                    };
                }
            } else {
                if (activeFacilityEmiGrid) activeFacilityEmiGrid.classList.add("hidden");
                if (eligibilityStandardAmount) eligibilityStandardAmount.classList.remove("hidden");
                if (payNowBtn) payNowBtn.classList.add("hidden");

                const statusLabel = pendingApp.status === "rejected"
                    ? "Action Required"
                    : "Under Review";

                eligibilityBadge.innerHTML = `<i class="fa-solid fa-clock-rotate-left mr-1"></i> APPLICATION IN REVIEW`;
                eligibilityBadge.className = "welcome-tag inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/20 px-3.5 py-1.5 text-[8px] sm:text-[9px] font-extrabold tracking-[1.2px] text-amber-200 backdrop-blur-sm";

                eligibilityHeading.innerHTML = `
                    Application in Progress, ${userFirstName}!
                    <br>
                    <span class="text-amber-300 font-extrabold text-xl sm:text-[26px]">${pendingApp.loan_name}</span>
                `;

                eligibilityDescription.innerHTML = `
                    Your application (<strong class="font-mono text-white tracking-wide">${pendingApp.application_ref}</strong>) submitted on ${appDate} is currently being processed by our underwriting team.
                `;

                const amountLabel = eligibilityAmountBox.querySelector("p");
                if (amountLabel) {
                    amountLabel.textContent = "REQUESTED LOAN AMOUNT";
                }

                eligibleLoanAmount.textContent = requestedFormatted;

                const subtext = eligibilityAmountBox.querySelectorAll("p")[1];
                if (subtext) {
                    const statusBadgeText = pendingApp.status === "rejected"
                        ? "Rejected"
                        : "Under Review";
                    const statusColor = "text-amber-200";
                    subtext.innerHTML = `Tenure: <strong>${displayTenure} Months</strong> • Status: <span class="${statusColor} font-semibold">${statusBadgeText}</span>`;
                }
            }

            eligibilityAmountBox.classList.remove("hidden");
            eligibilityAmountBox.style.display = "block";

            eligibilityActionButton.innerHTML = `
                Track Application Status
                <i class="fa-solid fa-arrow-right transition-transform duration-300 group-hover:translate-x-1"></i>
            `;

            // Open application tracking modal on click
            eligibilityActionButton.onclick = (e) => {
                e.preventDefault();
                openTrackingModal({
                    ref: pendingApp.application_ref,
                    loanName: pendingApp.loan_name,
                    slug: pendingApp.loan_slug,
                    amount: requestedFormatted,
                    tenure: `${displayTenure} Months`,
                    applicant: pendingApp.applicant_name || `${userFirstName} ${userLastName}`,
                    date: appDate,
                    status: pendingApp.status,
                    sanctionedAmount: pendingApp.sanctioned_amount,
                    sanctionedTenure: pendingApp.sanctioned_tenure_months,
                    isActiveTenure: pendingApp.is_active_tenure === 1,
                    remainingTenureMonths: pendingApp.remaining_tenure_months,
                    tenureEndDate: pendingApp.tenure_end_date
                });
            };

            return;
        }

        // STATE 2: NO APPLICATION PENDING -> SHOW PRE-APPROVED CEILING OR PROFILE INCOMPLETE
        if (activeFacilityEmiGrid) activeFacilityEmiGrid.classList.add("hidden");
        if (eligibilityStandardAmount) eligibilityStandardAmount.classList.remove("hidden");
        if (payNowBtn) payNowBtn.classList.add("hidden");
        const income = parseFloat(currentUser.monthly_income || 0);
        const cibil = parseInt(currentUser.cibil_score || 0, 10);

        if (income > 0) {
            let multiplier = 20;
            if (cibil >= 750) multiplier = 35;
            else if (cibil >= 700) multiplier = 25;
            else if (cibil >= 650) multiplier = 18;

            const maxLoan = Math.round(income * multiplier);

            eligibilityBadge.innerHTML = `<i class="fa-solid fa-circle-check mr-1"></i> PROFILE VERIFIED`;
            eligibilityBadge.className = "welcome-tag inline-block rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-[8px] sm:text-[9px] font-extrabold tracking-[1.2px] text-emerald-200 backdrop-blur-sm";

            eligibilityHeading.innerHTML = `
                Congratulations, ${userFirstName}!
                <br>
                You're Loan Eligible.
            `;

            eligibilityDescription.textContent =
                `Based on your CIBIL score (${cibil || "Active"}) and verified monthly income (${formatLoanAmount(income)}), you have been pre-approved for up to:`;

            eligibilityAmountBox.classList.remove("hidden");
            eligibilityAmountBox.style.display = "block";

            const amountLabel = eligibilityAmountBox.querySelector("p");
            if (amountLabel) {
                amountLabel.textContent = "YOUR MAXIMUM LOAN ELIGIBILITY";
            }

            eligibleLoanAmount.textContent = formatLoanAmount(maxLoan);

            const subtext = eligibilityAmountBox.querySelectorAll("p")[1];
            if (subtext) {
                subtext.textContent = "Subject to final lender approval and terms.";
            }

            eligibilityActionButton.innerHTML = `
                Explore Loan Offers
                <i class="fa-solid fa-arrow-down transition-transform duration-300 group-hover:translate-y-1"></i>
            `;
            eligibilityActionButton.onclick = (e) => {
                e.preventDefault();
                const loanSection = document.getElementById("loanTypes");
                if (loanSection) {
                    loanSection.scrollIntoView({ behavior: "smooth" });
                }
            };

        } else {
            // Profile incomplete
            eligibilityBadge.textContent = "VERIFICATION PENDING";
            eligibilityBadge.className = "welcome-tag inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[8px] sm:text-[9px] font-extrabold tracking-[1.2px] text-[#e2eaff] backdrop-blur-sm";

            eligibilityHeading.innerHTML = `
                Complete Your
                <br>
                Financial Profile.
            `;
            eligibilityDescription.textContent =
                "Add your monthly income and employment details to unlock your customized pre-approved loan limit.";
            eligibilityAmountBox.classList.add("hidden");
            eligibilityAmountBox.style.display = "none";
            eligibilityActionButton.innerHTML = `
                Browse Loans
                <i class="fa-solid fa-arrow-right transition-transform duration-300 group-hover:translate-x-1"></i>
            `;
            eligibilityActionButton.onclick = (e) => {
                e.preventDefault();
                const loanSection = document.getElementById("loanTypes");
                if (loanSection) {
                    loanSection.scrollIntoView({ behavior: "smooth" });
                }
            };
        }
    }

    // =============================================
    // 06. FETCH & RENDER LOAN CATALOG & APPLICATIONS
    // =============================================

    async function loadDashboardData() {
        if (!loanCardGrid) return;

        try {
            // Fetch catalog and user's submitted applications in parallel
            const [catalogRes, appsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/loans/catalog`),
                token ? fetch(`${API_BASE_URL}/loans/my-applications`, {
                    headers: { "Authorization": `Bearer ${token}` }
                }).catch(() => null) : Promise.resolve(null)
            ]);

            const catalogResult = await catalogRes.json();

            if (!catalogRes.ok || !catalogResult.success || !Array.isArray(catalogResult.data)) {
                console.warn("Could not load dynamic loans catalog:", catalogResult.message);
                return;
            }

            const products = catalogResult.data;

            // Process applications
            let userApplications = {};
            let allUserApps = [];
            if (appsRes && appsRes.ok) {
                const appsResult = await appsRes.json();
                allUserApps = appsResult.data || [];
                allUserApps.forEach(app => {
                    if (!userApplications[app.loan_slug]) {
                        userApplications[app.loan_slug] = app;
                    }
                });
            }

            // Find active approved/disbursed loan first, then pending/in-review
            const activeLoanApp = allUserApps.find(a => a.is_active_tenure === 1 || ["approved", "sanctioned", "disbursed"].includes(a.status));
            const latestPendingApp = activeLoanApp || allUserApps.find(a => a.status === "pending" || a.status === "in_review") || allUserApps[0] || null;

            // Render top hero card (pending application state OR pre-approved eligibility)
            renderTopBanner(latestPendingApp);

            // Update sidebar application count
            const sidebarAppsBadge = document.getElementById("sidebarApplicationsBadge");
            if (sidebarAppsBadge) {
                if (allUserApps.length > 0) {
                    sidebarAppsBadge.textContent = allUserApps.length.toString().padStart(2, "0");
                    sidebarAppsBadge.classList.remove("hidden");
                } else {
                    sidebarAppsBadge.classList.add("hidden");
                }
            }

            if (loanProductsCount) {
                loanProductsCount.textContent = `${products.length} PRODUCTS`;
            }

            // Render catalog cards below (standard clean catalog grid)
            loanCardGrid.innerHTML = products.map(product => {
                const hasApp = userApplications[product.slug];

                const badgeHtml = hasApp
                    ? `<span class="popular-badge absolute top-2 right-2 z-[3] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[8px] font-extrabold uppercase border border-amber-300"><i class="fa-solid fa-clock mr-1"></i>Applied</span>`
                    : product.badge
                    ? `<span class="popular-badge absolute top-2 right-2 z-[3] px-2 py-1 rounded-full bg-[#e4f8f0] text-[#168778] text-[8px] font-extrabold uppercase">${product.badge}</span>`
                    : "";

                const benefits = Array.isArray(product.benefits_tags)
                    ? product.benefits_tags.map(tag => `<span>${tag}</span>`).join("")
                    : "";

                const buttonText = hasApp ? "View Details" : "Apply Now";

                return `
                    <article class="loan-product-card group" data-loan-card="${product.slug}">
                        <div class="loan-card-visual relative w-full h-[85px] sm:h-[100px] shrink-0 overflow-hidden rounded-[11px] bg-[var(--accent-soft)]">
                            <img src="${product.image_url}"
                                alt="${product.name}"
                                class="h-full w-full object-cover transition-transform duration-700"
                                loading="lazy">
                            <span class="loan-category absolute top-2 left-2 z-[2] px-2 py-1 rounded-[5px] bg-white/90 backdrop-blur-md text-[#29446e] text-[8px] font-extrabold tracking-wider">
                                ${product.category}
                            </span>
                            ${badgeHtml}
                        </div>

                        <div class="loan-card-content px-1 pt-2.5">
                            <div class="loan-card-heading flex items-center justify-between gap-1.5">
                                <h3 class="text-[11px] xs:text-xs sm:text-[13px] font-extrabold text-navy truncate">
                                    ${product.name}
                                </h3>
                                <span class="loan-card-arrow grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-xs text-[var(--accent)] transition-all duration-300">
                                    ↗
                                </span>
                            </div>

                            <p class="loan-short-description mt-1 text-[9px] xs:text-[10px] leading-tight text-muted line-clamp-2">
                                ${product.short_description}
                            </p>

                            <div class="loan-extra-details">
                                <p class="text-[10px] text-[#475569] leading-relaxed">
                                    ${product.short_description} Interest rates starting from ${product.min_interest_rate}% p.a.
                                </p>
                                <div class="loan-benefits">
                                    ${benefits}
                                </div>
                                <button type="button" class="apply-loan-btn" data-loan="${product.name}" data-slug="${product.slug}">
                                    ${buttonText} <span>→</span>
                                </button>
                            </div>
                        </div>
                    </article>
                `;
            }).join("");

            // Re-bind touch events and apply button listeners
            setupLoanCardInteractions();

        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        }
    }

    // =============================================
    // 07. LOAN CARD INTERACTIONS & TRACKING MODAL
    // =============================================

    const trackingModal = document.getElementById("trackingModal");
    const closeTrackingModalBtn = document.getElementById("closeTrackingModalBtn");
    const trackModalCloseBtn = document.getElementById("trackModalCloseBtn");

    function openTrackingModal(app) {
        if (!trackingModal) return;

        const refEl = document.getElementById("trackModalRef");
        const nameEl = document.getElementById("trackModalLoanName");
        const amountEl = document.getElementById("trackModalAmount");
        const amountLabelEl = document.getElementById("trackModalAmountLabel");
        const tenureEl = document.getElementById("trackModalTenure");
        const applicantEl = document.getElementById("trackModalApplicant");
        const dateEl = document.getElementById("trackModalDate");
        const linkEl = document.getElementById("trackModalLoanLink");
        const badgeEl = document.getElementById("trackModalStatusBadge");
        const timelineEl = document.getElementById("trackModalTimeline");

        const isApproved = ["approved", "sanctioned", "disbursed"].includes(app.status);
        const isInReview = app.status === "in_review" || app.status === "under_review";
        const isRejected = app.status === "rejected";

        if (refEl) refEl.textContent = `Ref: ${app.ref}`;
        if (nameEl) nameEl.textContent = app.loanName;
        if (amountEl) amountEl.textContent = app.amount;
        if (amountLabelEl) amountLabelEl.textContent = isApproved ? "Sanctioned Amount:" : "Requested Amount:";
        if (tenureEl) tenureEl.textContent = app.tenure;
        if (applicantEl) applicantEl.textContent = app.applicant;
        if (dateEl) dateEl.textContent = app.date;
        if (linkEl) linkEl.href = `loans.html?slug=${encodeURIComponent(app.slug)}`;

        if (badgeEl) {
            if (app.status === "disbursed") {
                badgeEl.className = "px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5";
                badgeEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span><span>Disbursed</span>`;
            } else if (isApproved) {
                badgeEl.className = "px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5";
                badgeEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span><span>Approved & Sanctioned</span>`;
            } else if (isRejected) {
                badgeEl.className = "px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5";
                badgeEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span><span>Rejected</span>`;
            } else if (isInReview) {
                badgeEl.className = "px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1.5";
                badgeEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span><span>Under Credit Review</span>`;
            } else {
                badgeEl.className = "px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5";
                badgeEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span><span>Under Review</span>`;
            }
        }

        // Dynamically build the 4-stage timeline synchronized with applications.html
        if (timelineEl) {
            let stage1 = {
                status: "completed",
                title: "Application Submitted",
                desc: "Digital form & loan terms registered."
            };
            let stage2 = {
                status: "pending",
                title: "Document & KYC Verification",
                desc: "Credit officer is reviewing Aadhaar, PAN, and bank statement verification."
            };
            let stage3 = {
                status: "pending",
                title: "Credit Underwriting",
                desc: "Automated CIBIL validation & risk pricing approval."
            };
            let stage4 = {
                status: "pending",
                title: "Sanction & Disbursal",
                desc: "Digital agreement e-sign & fund transfer to account."
            };

            if (isApproved) {
                stage2.status = "completed";
                stage2.title = "Document & KYC Verification (Completed)";
                stage2.desc = "Aadhaar, PAN, and bank statements verified successfully.";

                stage3.status = "completed";
                stage3.title = "Credit Underwriting (Completed)";
                stage3.desc = "CIBIL check passed and risk underwriting approved.";

                stage4.status = "completed";
                stage4.title = app.status === "disbursed" ? "Sanction & Disbursal (Disbursed)" : "Sanction & Disbursal (Approved & Sanctioned)";
                stage4.desc = app.status === "disbursed" ? "Loan proceeds disbursed to bank account." : "Digital agreement finalized & ready for disbursal.";
            } else if (isInReview) {
                stage2.status = "completed";
                stage2.title = "Document & KYC Verification (Completed)";
                stage2.desc = "Documents verified and cleared for underwriting.";

                stage3.status = "in_progress";
                stage3.title = "Credit Underwriting (In Progress)";
                stage3.desc = "Underwriting team is evaluating credit limit & risk score.";
            } else if (isRejected) {
                stage2.status = "rejected";
                stage2.title = "Document & KYC Verification (Rejected)";
                stage2.desc = "Application did not meet underwriting or KYC eligibility criteria.";
            } else {
                stage2.status = "in_progress";
                stage2.title = "Document & KYC Verification (In Progress)";
                stage2.desc = "Credit officer is reviewing Aadhaar, PAN, and bank statements.";
            }

            const steps = [
                { ...stage1, icon: "fa-solid fa-check" },
                { ...stage2, icon: stage2.status === "completed" ? "fa-solid fa-check" : stage2.status === "rejected" ? "fa-solid fa-xmark" : "fa-solid fa-clock" },
                { ...stage3, icon: stage3.status === "completed" ? "fa-solid fa-check" : stage3.status === "in_progress" ? "fa-solid fa-clock" : "fa-solid fa-shield-halved" },
                { ...stage4, icon: stage4.status === "completed" ? "fa-solid fa-check" : "fa-solid fa-hand-holding-dollar" }
            ];

            timelineEl.innerHTML = steps.map(step => {
                let circleClass = "";
                let titleClass = "text-xs font-bold";
                let descClass = "text-[10px]";
                let containerClass = "relative flex items-start gap-3";

                if (step.status === "completed") {
                    circleClass = "w-7 h-7 rounded-full bg-emerald-500 text-white grid place-items-center text-xs shrink-0 z-10 shadow-sm";
                    titleClass += " text-slate-800";
                    descClass += " text-slate-500";
                } else if (step.status === "in_progress") {
                    circleClass = "w-7 h-7 rounded-full bg-amber-500 text-white grid place-items-center text-xs shrink-0 z-10 shadow-sm animate-pulse";
                    titleClass += " text-amber-900";
                    descClass += " text-amber-700";
                } else if (step.status === "rejected") {
                    circleClass = "w-7 h-7 rounded-full bg-rose-500 text-white grid place-items-center text-xs shrink-0 z-10 shadow-sm";
                    titleClass += " text-rose-900";
                    descClass += " text-rose-600";
                } else {
                    containerClass += " opacity-60";
                    circleClass = "w-7 h-7 rounded-full bg-slate-200 text-slate-500 grid place-items-center text-xs shrink-0 z-10";
                    titleClass += " text-slate-700";
                    descClass += " text-muted";
                }

                return `
                    <div class="${containerClass}">
                        <span class="${circleClass}">
                            <i class="${step.icon}"></i>
                        </span>
                        <div>
                            <p class="${titleClass}">${step.title}</p>
                            <p class="${descClass}">${step.desc}</p>
                        </div>
                    </div>
                `;
            }).join("");
        }

        trackingModal.classList.remove("opacity-0", "invisible");
        trackingModal.querySelector("div").classList.remove("scale-95");
        trackingModal.querySelector("div").classList.add("scale-100");
        document.body.classList.add("overflow-hidden");
    }

    function closeTrackingModal() {
        if (!trackingModal) return;
        trackingModal.classList.add("opacity-0", "invisible");
        trackingModal.querySelector("div").classList.remove("scale-100");
        trackingModal.querySelector("div").classList.add("scale-95");
        document.body.classList.remove("overflow-hidden");
    }

    if (closeTrackingModalBtn) closeTrackingModalBtn.addEventListener("click", closeTrackingModal);
    if (trackModalCloseBtn) trackModalCloseBtn.addEventListener("click", closeTrackingModal);

    if (trackingModal) {
        trackingModal.addEventListener("click", function (e) {
            if (e.target === trackingModal) closeTrackingModal();
        });
    }

    // =============================================
    // 08.5 PAY EMI MODAL HANDLERS (STATIC DEMO)
    // =============================================
    const payNowModal = document.getElementById("payNowModal");
    const closePayModalBtn = document.getElementById("closePayModalBtn");
    const payModalCloseBtn = document.getElementById("payModalCloseBtn");
    const payModalConfirmBtn = document.getElementById("payModalConfirmBtn");

    function openPayNowModal(data) {
        if (!payNowModal) return;

        const refEl = document.getElementById("payModalRef");
        const nameEl = document.getElementById("payModalLoanName");
        const amountEl = document.getElementById("payModalAmount");
        const dueDateEl = document.getElementById("payModalDueDate");

        if (refEl) refEl.textContent = `Ref: ${data.ref}`;
        if (nameEl) nameEl.textContent = data.loanName;
        if (amountEl) amountEl.textContent = data.amount;
        if (dueDateEl) dueDateEl.textContent = data.dueDate;

        payNowModal.classList.remove("opacity-0", "invisible");
        payNowModal.querySelector("div").classList.remove("scale-95");
        payNowModal.querySelector("div").classList.add("scale-100");
        document.body.classList.add("overflow-hidden");
    }

    function closePayNowModal() {
        if (!payNowModal) return;
        payNowModal.classList.add("opacity-0", "invisible");
        payNowModal.querySelector("div").classList.remove("scale-100");
        payNowModal.querySelector("div").classList.add("scale-95");
        document.body.classList.remove("overflow-hidden");
    }

    if (closePayModalBtn) closePayModalBtn.addEventListener("click", closePayNowModal);
    if (payModalCloseBtn) payModalCloseBtn.addEventListener("click", closePayNowModal);

    if (payModalConfirmBtn) {
        payModalConfirmBtn.addEventListener("click", function () {
            alert("Payment Simulation: Live UPI / NACH auto-debit will be activated upon live gateway onboarding. No debit was made.");
            closePayNowModal();
        });
    }

    if (payNowModal) {
        payNowModal.addEventListener("click", function (e) {
            if (e.target === payNowModal) closePayNowModal();
        });
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            if (trackingModal && !trackingModal.classList.contains("invisible")) {
                closeTrackingModal();
            }
            if (payNowModal && !payNowModal.classList.contains("invisible")) {
                closePayNowModal();
            }
        }
    });

    function isTouchDevice() {
        return window.matchMedia("(hover: none)").matches;
    }

    function setupLoanCardInteractions() {
        const dynamicCards = document.querySelectorAll(".loan-product-card");
        const dynamicApplyButtons = document.querySelectorAll(".apply-loan-btn");
        const dynamicTrackButtons = document.querySelectorAll(".track-application-btn");

        dynamicCards.forEach(card => {
            card.addEventListener("click", function (event) {
                if (!isTouchDevice()) return;
                if (event.target.closest(".apply-loan-btn") || event.target.closest(".track-application-btn")) return;

                const isExpanded = this.classList.contains("expanded");
                dynamicCards.forEach(c => c.classList.remove("expanded"));
                if (!isExpanded) {
                    this.classList.add("expanded");
                }
            });
        });

        dynamicApplyButtons.forEach(button => {
            button.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();

                const slug = this.dataset.slug || "";
                if (slug) {
                    window.location.href = `loans.html?slug=${encodeURIComponent(slug)}`;
                } else {
                    window.location.href = "loans.html";
                }
            });
        });
    }

    // Load dashboard and dynamic data on load
    await loadDashboardData();

    // =============================================
    // 08. SIDEBAR FUNCTIONALITY
    // =============================================

    function openSidebar() {
        if (!sidebar) return;
        sidebar.classList.add("active");
        sidebarOverlay?.classList.add("active");
        document.body.classList.add("sidebar-open");
        menuButton?.setAttribute("aria-expanded", "true");
    }

    function closeSidebar() {
        if (!sidebar) return;
        sidebar.classList.remove("active");
        sidebarOverlay?.classList.remove("active");
        document.body.classList.remove("sidebar-open");
        menuButton?.setAttribute("aria-expanded", "false");
    }

    menuButton?.addEventListener("click", () => {
        if (sidebar?.classList.contains("active")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    sidebarClose?.addEventListener("click", closeSidebar);
    sidebarOverlay?.addEventListener("click", closeSidebar);

    // Sidebar navigation tabs
    navLinks.forEach(link => {
        link.addEventListener("click", function (event) {
            const href = this.getAttribute("href");
            // If the link points to a separate page, allow normal navigation
            if (href && href !== "#" && !href.startsWith("#")) {
                return;
            }

            event.preventDefault();
            navLinks.forEach(item => item.classList.remove("active"));
            this.classList.add("active");

            if (href && href.startsWith("#") && href.length > 1) {
                const targetEl = document.querySelector(href);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: "smooth" });
                }
            }

            if (window.innerWidth <= 650) {
                closeSidebar();
            }
        });
    });

    // Mobile Bottom Navigation
    bottomNavLinks.forEach(link => {
        link.addEventListener("click", function (event) {
            const href = this.getAttribute("href");
            if (href && href !== "#" && !href.startsWith("#")) {
                return;
            }

            event.preventDefault();
            bottomNavLinks.forEach(item => item.classList.remove("active"));
            this.classList.add("active");
        });
    });

    // Upgrade Button
    upgradeButton?.addEventListener("click", () => {
        upgradeButton.classList.add("clicked");
        setTimeout(() => {
            upgradeButton.classList.remove("clicked");
        }, 400);
    });

    // Profile Button
    profileButton?.addEventListener("click", () => {
        profileButton.classList.add("profile-active");
        setTimeout(() => {
            profileButton.classList.remove("profile-active");
        }, 300);
    });

});
