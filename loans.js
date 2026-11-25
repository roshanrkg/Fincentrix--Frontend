/**
 * Fincentrix - Dedicated Loan Product Details & Interactive Application Engine
 * loans.js
 */

document.addEventListener("DOMContentLoaded", async function () {
    const API_BASE = "http://localhost:3000/api";
    const token = localStorage.getItem("fincentrix_token");

    // State
    let currentUser = null;
    let catalogProducts = [];
    let currentLoan = null;

    // Elements
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const menuButton = document.getElementById("menuButton");
    const sidebarClose = document.getElementById("sidebarClose");
    const logoutButton = document.getElementById("logoutButton");

    // User Profile Elements
    const sidebarUserAvatar = document.getElementById("sidebarUserAvatar");
    const sidebarUserName = document.getElementById("sidebarUserName");
    const sidebarUserRole = document.getElementById("sidebarUserRole");
    const topbarMobileAvatar = document.getElementById("topbarMobileAvatar");

    // Catalog & Breadcrumb
    const breadcrumbLoanName = document.getElementById("breadcrumbLoanName");
    const loanProductSelector = document.getElementById("loanProductSelector");

    // Hero Elements
    const heroCategory = document.getElementById("heroCategory");
    const heroBadge = document.getElementById("heroBadge");
    const heroLoanName = document.getElementById("heroLoanName");
    const heroShortDesc = document.getElementById("heroShortDesc");
    const metricInterest = document.getElementById("metricInterest");
    const metricMaxAmount = document.getElementById("metricMaxAmount");
    const metricTenure = document.getElementById("metricTenure");
    const metricFee = document.getElementById("metricFee");
    const heroImage = document.getElementById("heroImage");
    const heroIcon = document.getElementById("heroIcon");

    // Overview & Highlights
    const loanOverviewText = document.getElementById("loanOverviewText");
    const featuresList = document.getElementById("featuresList");

    // Calculator Elements
    const loanAmountSlider = document.getElementById("loanAmountSlider");
    const loanTenureSlider = document.getElementById("loanTenureSlider");
    const sliderAmountValue = document.getElementById("sliderAmountValue");
    const sliderTenureValue = document.getElementById("sliderTenureValue");
    const sliderMinAmount = document.getElementById("sliderMinAmount");
    const sliderMaxAmount = document.getElementById("sliderMaxAmount");
    const sliderMinTenure = document.getElementById("sliderMinTenure");
    const sliderMaxTenure = document.getElementById("sliderMaxTenure");
    const sliderRateValue = document.getElementById("sliderRateValue");
    const calcEmiOutput = document.getElementById("calcEmiOutput");
    const calcTotalInterest = document.getElementById("calcTotalInterest");
    const calcTotalPayable = document.getElementById("calcTotalPayable");

    // Eligibility Elements
    const eligibilityAge = document.getElementById("eligibilityAge");
    const eligibilityCibil = document.getElementById("eligibilityCibil");
    const eligibilityIncome = document.getElementById("eligibilityIncome");
    const eligibilityExperience = document.getElementById("eligibilityExperience");
    const eligibilityRulesList = document.getElementById("eligibilityRulesList");

    // Documents & Terms
    const documentsContainer = document.getElementById("documentsContainer");
    const termInterestType = document.getElementById("termInterestType");
    const termForeclosure = document.getElementById("termForeclosure");
    const termPrepayment = document.getElementById("termPrepayment");
    const termsList = document.getElementById("termsList");

    // Application Modal & Trigger
    const openApplyModalBtn = document.getElementById("openApplyModalBtn");
    const applicationModal = document.getElementById("applicationModal");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const loanApplyForm = document.getElementById("loanApplyForm");
    const modalLoanTitle = document.getElementById("modalLoanTitle");
    const modalApplicantName = document.getElementById("modalApplicantName");
    const modalApplicantPhone = document.getElementById("modalApplicantPhone");
    const modalApplicantCibil = document.getElementById("modalApplicantCibil");
    const modalApplicantIncome = document.getElementById("modalApplicantIncome");
    const modalLoanAmount = document.getElementById("modalLoanAmount");
    const modalLoanTenure = document.getElementById("modalLoanTenure");
    const modalLoanPurpose = document.getElementById("modalLoanPurpose");
    const modalAlertBox = document.getElementById("modalAlertBox");
    const submitApplicationBtn = document.getElementById("submitApplicationBtn");
    const userPreapprovedBox = document.getElementById("userPreapprovedBox");

    // -------------------------------------------------------------
    // Helper: Currency & Number Formatter
    // -------------------------------------------------------------
    function formatCurrency(val) {
        const num = Math.round(Number(val) || 0);
        return "₹" + num.toLocaleString("en-IN");
    }

    function formatLakhOrCr(val) {
        const num = Number(val) || 0;
        if (num >= 10000000) {
            return `Up to ₹${(num / 10000000).toFixed(1)} Cr`;
        }
        if (num >= 100000) {
            const lakhs = (num / 100000);
            return `Up to ₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)} Lakh`;
        }
        return `Up to ${formatCurrency(num)}`;
    }

    // -------------------------------------------------------------
    // 01. Mobile Navigation & Logout Handlers
    // -------------------------------------------------------------
    function openSidebar() {
        if (!sidebar || !sidebarOverlay) return;
        sidebar.classList.remove("-translate-x-full");
        sidebarOverlay.classList.remove("opacity-0", "invisible");
        sidebarOverlay.classList.add("opacity-100", "visible");
        document.body.classList.add("overflow-hidden");
    }

    function closeSidebar() {
        if (!sidebar || !sidebarOverlay) return;
        sidebar.classList.add("-translate-x-full");
        sidebarOverlay.classList.add("opacity-0", "invisible");
        sidebarOverlay.classList.remove("opacity-100", "visible");
        document.body.classList.remove("overflow-hidden");
    }

    if (menuButton) menuButton.addEventListener("click", openSidebar);
    if (sidebarClose) sidebarClose.addEventListener("click", closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);

    if (logoutButton) {
        logoutButton.addEventListener("click", function () {
            localStorage.removeItem("fincentrix_token");
            localStorage.removeItem("fincentrix_user");
            window.location.replace("index.html");
        });
    }

    // -------------------------------------------------------------
    // 02. Fetch Authenticated User Profile
    // -------------------------------------------------------------
    async function loadUserProfile() {
        if (!token) {
            window.location.replace("index.html");
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!res.ok) {
                if (res.status === 401) {
                    localStorage.removeItem("fincentrix_token");
                    window.location.replace("index.html");
                }
                return;
            }

            const data = await res.json();
            currentUser = data.data || data.user || null;

            if (currentUser) {
                const fname = currentUser.fname || "User";
                const lname = currentUser.lname || "";
                const initials = (fname.charAt(0) + (lname.charAt(0) || "")).toUpperCase() || "FX";

                const profileImg = currentUser.profile_image
                    ? (currentUser.profile_image.startsWith("http") ? currentUser.profile_image : `http://localhost:3000/${currentUser.profile_image.replace(/^\/+/, '')}`)
                    : null;

                const setAvatar = (el) => {
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

                if (sidebarUserName) sidebarUserName.textContent = `${fname} ${lname}`.trim();
                setAvatar(sidebarUserAvatar);
                setAvatar(topbarMobileAvatar);
                if (sidebarUserRole) {
                    sidebarUserRole.textContent = currentUser.role ? currentUser.role.toUpperCase() : "CUSTOMER";
                }

                // If user has verified financial profile, highlight on the sticky card
                if (userPreapprovedBox && currentUser.monthly_income && currentUser.cibil_score) {
                    const income = parseFloat(currentUser.monthly_income);
                    const cibil = parseInt(currentUser.cibil_score, 10);
                    let multiplier = 20;
                    if (cibil >= 750) multiplier = 35;
                    else if (cibil >= 700) multiplier = 25;
                    else if (cibil >= 650) multiplier = 18;
                    const maxEligibility = income * multiplier;

                    userPreapprovedBox.innerHTML = `
                        <div class="flex items-center gap-2 font-bold mb-1 text-emerald-800">
                            <i class="fa-solid fa-circle-check text-emerald-600"></i>
                            <span>Verified KYC Advantage</span>
                        </div>
                        <p class="text-[11px] leading-relaxed text-emerald-700">
                            Pre-approved borrowing limit: <strong class="text-emerald-900">${formatCurrency(maxEligibility)}</strong> 
                            based on your verified CIBIL (${cibil}) and monthly income (${formatCurrency(income)}).
                        </p>
                    `;
                }
            }
        } catch (error) {
            console.error("Failed to load user profile:", error);
        }
    }

    // -------------------------------------------------------------
    // 03. Fetch Catalog List for Loan Switcher Dropdown
    // -------------------------------------------------------------
    async function loadCatalogList(selectedSlug) {
        try {
            const res = await fetch(`${API_BASE}/loans/catalog`);
            if (!res.ok) throw new Error("Catalog fetch error");

            const data = await res.json();
            catalogProducts = data.data || [];

            if (loanProductSelector && catalogProducts.length > 0) {
                loanProductSelector.innerHTML = catalogProducts.map(p => `
                    <option value="${p.slug}" ${p.slug === selectedSlug ? "selected" : ""}>
                        ${p.name}
                    </option>
                `).join("");

                loanProductSelector.addEventListener("change", function () {
                    const newSlug = this.value;
                    const url = new URL(window.location.href);
                    url.searchParams.set("slug", newSlug);
                    window.history.pushState({}, "", url);
                    loadLoanDetails(newSlug);
                });
            }
        } catch (error) {
            console.error("Failed to load loan catalog list:", error);
        }
    }

    // -------------------------------------------------------------
    // 04. Interactive EMI Calculation Engine
    // -------------------------------------------------------------
    function updateEmiCalculations() {
        if (!currentLoan) return;

        const amount = parseFloat(loanAmountSlider.value);
        const tenureMonths = parseInt(loanTenureSlider.value, 10);
        const annualRate = parseFloat(currentLoan.min_interest_rate) || 10.5;

        // Display current slider values
        if (sliderAmountValue) sliderAmountValue.textContent = formatCurrency(amount);
        if (sliderTenureValue) sliderTenureValue.textContent = `${tenureMonths} Months (${(tenureMonths / 12).toFixed(1)} Yrs)`;

        // Calculate Monthly EMI (Standard reducing balance formula)
        // E = P * r * (1 + r)^n / ((1 + r)^n - 1)
        const monthlyRate = (annualRate / 12) / 100;
        let emi = 0;
        if (monthlyRate === 0) {
            emi = amount / tenureMonths;
        } else {
            const compoundFactor = Math.pow(1 + monthlyRate, tenureMonths);
            emi = (amount * monthlyRate * compoundFactor) / (compoundFactor - 1);
        }

        const totalPayable = emi * tenureMonths;
        const totalInterest = totalPayable - amount;

        // Render Outputs
        if (calcEmiOutput) calcEmiOutput.textContent = formatCurrency(emi);
        if (calcTotalInterest) calcTotalInterest.textContent = formatCurrency(totalInterest);
        if (calcTotalPayable) calcTotalPayable.textContent = formatCurrency(totalPayable);
    }

    function setupCalculatorSliders(loan) {
        if (!loanAmountSlider || !loanTenureSlider) return;

        const minAmount = parseFloat(loan.min_amount) || 25000;
        const maxAmount = parseFloat(loan.max_amount) || 2500000;
        const minTenure = parseInt(loan.min_tenure_months, 10) || 12;
        const maxTenure = parseInt(loan.max_tenure_months, 10) || 60;

        // Set Slider Constraints
        loanAmountSlider.min = minAmount;
        loanAmountSlider.max = maxAmount;
        loanAmountSlider.step = (maxAmount > 1000000) ? 25000 : 5000;

        // Reasonable default: 25% of max or 5,00,000 within boundaries
        let defaultAmount = 500000;
        if (defaultAmount > maxAmount) defaultAmount = maxAmount;
        if (defaultAmount < minAmount) defaultAmount = minAmount;
        loanAmountSlider.value = defaultAmount;

        loanTenureSlider.min = minTenure;
        loanTenureSlider.max = maxTenure;
        loanTenureSlider.step = (maxTenure <= 60) ? 6 : 12;

        let defaultTenure = 36;
        if (defaultTenure > maxTenure) defaultTenure = maxTenure;
        if (defaultTenure < minTenure) defaultTenure = minTenure;
        loanTenureSlider.value = defaultTenure;

        // Set Boundary Labels
        if (sliderMinAmount) sliderMinAmount.textContent = formatCurrency(minAmount);
        if (sliderMaxAmount) sliderMaxAmount.textContent = formatCurrency(maxAmount);
        if (sliderMinTenure) sliderMinTenure.textContent = `${minTenure} Mo`;
        if (sliderMaxTenure) sliderMaxTenure.textContent = `${maxTenure} Mo (${(maxTenure / 12).toFixed(0)} Yrs)`;

        if (sliderRateValue) {
            sliderRateValue.textContent = `${loan.min_interest_rate}% p.a.`;
        }

        // Attach Event Listeners
        loanAmountSlider.oninput = updateEmiCalculations;
        loanTenureSlider.oninput = updateEmiCalculations;

        // Run initial calculation
        updateEmiCalculations();
    }

    // -------------------------------------------------------------
    // 05. Populate Dynamic Loan Product Details
    // -------------------------------------------------------------
    async function loadLoanDetails(slug) {
        try {
            const res = await fetch(`${API_BASE}/loans/catalog/${slug}`);
            if (!res.ok) {
                throw new Error(`Failed to load loan with slug: ${slug}`);
            }

            const json = await res.json();
            currentLoan = json.data;

            if (!currentLoan) return;

            // Page title & Breadcrumb
            document.title = `${currentLoan.name} | Fincentrix`;
            if (breadcrumbLoanName) breadcrumbLoanName.textContent = currentLoan.name;
            if (loanProductSelector) loanProductSelector.value = currentLoan.slug;

            // Hero Section
            if (heroCategory) heroCategory.textContent = currentLoan.category || "FINANCE";
            if (heroBadge) heroBadge.textContent = currentLoan.badge || "VERIFIED";
            if (heroLoanName) heroLoanName.textContent = currentLoan.name;
            if (heroShortDesc) heroShortDesc.textContent = currentLoan.short_description;

            if (metricInterest) metricInterest.textContent = `From ${currentLoan.min_interest_rate}%`;
            if (metricMaxAmount) metricMaxAmount.textContent = formatLakhOrCr(currentLoan.max_amount);
            if (metricTenure) {
                const years = (currentLoan.max_tenure_months / 12);
                metricTenure.textContent = `Up to ${years % 1 === 0 ? years.toFixed(0) : years.toFixed(1)} Years`;
            }
            if (metricFee) metricFee.textContent = `${currentLoan.processing_fee_percentage}%`;

            if (heroImage && (currentLoan.banner_image_url || currentLoan.image_url)) {
                heroImage.src = currentLoan.banner_image_url || currentLoan.image_url;
                heroImage.alt = currentLoan.name;
            }

            if (heroIcon && currentLoan.icon) {
                // Remove existing fa classes and inject current
                heroIcon.className = `${currentLoan.icon} text-primary-light`;
            }

            // Overview & Highlights
            if (loanOverviewText) {
                loanOverviewText.textContent = currentLoan.overview || currentLoan.short_description;
            }

            if (featuresList && Array.isArray(currentLoan.features)) {
                featuresList.innerHTML = currentLoan.features.map(f => {
                    // Check if feature already has Font Awesome tag
                    if (f.includes("<i class=")) {
                        return `<div class="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 font-medium">${f}</div>`;
                    }
                    return `
                        <div class="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 font-medium">
                            <i class="fa-solid fa-circle-check text-emerald-500 mt-0.5 shrink-0"></i>
                            <span>${f}</span>
                        </div>
                    `;
                }).join("");
            }

            // Interactive EMI Calculator
            setupCalculatorSliders(currentLoan);

            // Eligibility Criteria
            const criteria = currentLoan.eligibility_criteria || {};
            if (eligibilityAge) {
                eligibilityAge.textContent = `${criteria.min_age || 21} - ${criteria.max_age || 60} Yrs`;
            }
            if (eligibilityCibil) {
                eligibilityCibil.textContent = `${criteria.min_cibil_score || 700}+`;
            }
            if (eligibilityIncome) {
                eligibilityIncome.textContent = formatCurrency(criteria.min_monthly_income || 20000) + " / mo";
            }
            if (eligibilityExperience) {
                eligibilityExperience.textContent = `${criteria.work_experience_months || 12} Months`;
            }

            if (eligibilityRulesList && Array.isArray(criteria.rules)) {
                eligibilityRulesList.innerHTML = criteria.rules.map(rule => {
                    if (rule.includes("<i class=")) {
                        return `<div class="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 font-medium">${rule}</div>`;
                    }
                    return `
                        <div class="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 font-medium">
                            <i class="fa-solid fa-check text-primary shrink-0"></i>
                            <span>${rule}</span>
                        </div>
                    `;
                }).join("");
            }

            // Documents Required
            const docs = currentLoan.documents_required || {};
            if (documentsContainer) {
                const docCards = [];

                if (docs.identity_proof && docs.identity_proof.length > 0) {
                    docCards.push(`
                        <div class="doc-card p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                            <div>
                                <div class="flex items-center gap-2 font-bold text-navy text-xs mb-2 pb-2 border-b border-slate-100">
                                    <i class="fa-solid fa-id-card text-primary text-sm"></i>
                                    <span>Identity Verification</span>
                                </div>
                                <ul class="space-y-1.5 text-xs text-slate-600">
                                    ${docs.identity_proof.map(item => `
                                        <li class="flex items-center gap-2">
                                            <i class="fa-solid fa-check text-emerald-500 text-[10px]"></i>
                                            <span>${item}</span>
                                        </li>
                                    `).join("")}
                                </ul>
                            </div>
                            <span class="mt-3 text-[10px] text-muted font-semibold uppercase">Self-Attested Copy</span>
                        </div>
                    `);
                }

                if (docs.address_proof && docs.address_proof.length > 0) {
                    docCards.push(`
                        <div class="doc-card p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                            <div>
                                <div class="flex items-center gap-2 font-bold text-navy text-xs mb-2 pb-2 border-b border-slate-100">
                                    <i class="fa-solid fa-house-chimney text-emerald-600 text-sm"></i>
                                    <span>Address Proof</span>
                                </div>
                                <ul class="space-y-1.5 text-xs text-slate-600">
                                    ${docs.address_proof.map(item => `
                                        <li class="flex items-center gap-2">
                                            <i class="fa-solid fa-check text-emerald-500 text-[10px]"></i>
                                            <span>${item}</span>
                                        </li>
                                    `).join("")}
                                </ul>
                            </div>
                            <span class="mt-3 text-[10px] text-muted font-semibold uppercase">Current Residence Proof</span>
                        </div>
                    `);
                }

                if (docs.income_proof && docs.income_proof.length > 0) {
                    docCards.push(`
                        <div class="doc-card p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                            <div>
                                <div class="flex items-center gap-2 font-bold text-navy text-xs mb-2 pb-2 border-b border-slate-100">
                                    <i class="fa-solid fa-file-invoice-dollar text-purple-600 text-sm"></i>
                                    <span>Income & Banking Proof</span>
                                </div>
                                <ul class="space-y-1.5 text-xs text-slate-600">
                                    ${docs.income_proof.map(item => `
                                        <li class="flex items-center gap-2">
                                            <i class="fa-solid fa-check text-emerald-500 text-[10px]"></i>
                                            <span>${item}</span>
                                        </li>
                                    `).join("")}
                                </ul>
                            </div>
                            <span class="mt-3 text-[10px] text-muted font-semibold uppercase">Digital PDF / Net Banking</span>
                        </div>
                    `);
                }

                // Check other document categories (property_documents, asset_proof, etc.)
                const otherKeys = Object.keys(docs).filter(k => !["identity_proof", "address_proof", "income_proof"].includes(k));
                otherKeys.forEach(k => {
                    const list = docs[k];
                    if (Array.isArray(list) && list.length > 0) {
                        const title = k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                        docCards.push(`
                            <div class="doc-card p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                                <div>
                                    <div class="flex items-center gap-2 font-bold text-navy text-xs mb-2 pb-2 border-b border-slate-100">
                                        <i class="fa-solid fa-file-shield text-amber-500 text-sm"></i>
                                        <span>${title}</span>
                                    </div>
                                    <ul class="space-y-1.5 text-xs text-slate-600">
                                        ${list.map(item => `
                                            <li class="flex items-center gap-2">
                                                <i class="fa-solid fa-check text-emerald-500 text-[10px]"></i>
                                                <span>${item}</span>
                                            </li>
                                        `).join("")}
                                    </ul>
                                </div>
                                <span class="mt-3 text-[10px] text-muted font-semibold uppercase">Verification Required</span>
                            </div>
                        `);
                    }
                });

                documentsContainer.innerHTML = docCards.join("");
            }

            // Terms & Conditions
            if (termInterestType) termInterestType.textContent = (currentLoan.interest_type || "Floating").toUpperCase();
            if (termForeclosure) termForeclosure.textContent = currentLoan.foreclosure_charges || "Nil";
            if (termPrepayment) termPrepayment.textContent = currentLoan.prepayment_charges || "Nil";

            if (termsList && Array.isArray(currentLoan.terms_and_conditions)) {
                termsList.innerHTML = currentLoan.terms_and_conditions.map(term => {
                    if (term.includes("<i class=")) {
                        return `<div class="flex items-start gap-2">${term}</div>`;
                    }
                    return `
                        <div class="flex items-start gap-2">
                            <i class="fa-solid fa-circle-dot text-[8px] text-primary mt-1 shrink-0"></i>
                            <span>${term}</span>
                        </div>
                    `;
                }).join("");
            }

            // Check if user has an active application for this loan
            if (token) {
                try {
                    const appsRes = await fetch(`${API_BASE}/loans/my-applications`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    if (appsRes.ok) {
                        const appsData = await appsRes.json();
                        const userApps = appsData.data || [];
                        const activeTenureLoan = userApps.find(a => a.is_active_tenure === 1 || ["approved", "sanctioned", "disbursed"].includes(a.status));
                        const existingApp = userApps.find(a => a.loan_slug === currentLoan.slug);

                        const sidebarBadge = document.getElementById("sidebarApplicationsBadge");
                        if (sidebarBadge) {
                            if (userApps.length > 0) {
                                sidebarBadge.textContent = userApps.length.toString().padStart(2, "0");
                                sidebarBadge.classList.remove("hidden");
                            } else {
                                sidebarBadge.classList.add("hidden");
                            }
                        }

                        if (activeTenureLoan && userPreapprovedBox) {
                            const tenureEndFormatted = activeTenureLoan.tenure_end_date 
                                ? new Date(activeTenureLoan.tenure_end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                                : "tenure maturity";
                            const activeAmountFormatted = formatCurrency(activeTenureLoan.sanctioned_amount || activeTenureLoan.requested_amount);
                            const activeTenureMonths = activeTenureLoan.sanctioned_tenure_months || activeTenureLoan.requested_tenure_months;

                            userPreapprovedBox.className = "bg-rose-50 border border-rose-300 rounded-xl p-4 mb-5 text-xs text-rose-950 shadow-xs";
                            userPreapprovedBox.innerHTML = `
                                <div class="flex items-center justify-between mb-1.5">
                                    <span class="flex items-center gap-1.5 font-bold text-rose-800">
                                        <i class="fa-solid fa-lock"></i>
                                        <span>Further Applications Restricted</span>
                                    </span>
                                    <span class="font-mono text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-rose-200">${activeTenureLoan.application_ref}</span>
                                </div>
                                <p class="text-[11px] leading-relaxed text-rose-700">
                                    You have an active ${activeTenureLoan.status === 'disbursed' ? 'disbursed' : 'approved'} <strong>${activeTenureLoan.loan_name}</strong> (${activeAmountFormatted} for ${activeTenureMonths} Mo). Under bank policy, applications for further loans are blocked until your active tenure is completed on <strong>${tenureEndFormatted}</strong> (${activeTenureLoan.remaining_tenure_months || 0} months remaining).
                                </p>
                            `;

                            if (openApplyModalBtn) {
                                openApplyModalBtn.disabled = true;
                                openApplyModalBtn.className = "w-full h-12 rounded-xl bg-slate-200 text-slate-500 font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2 border border-slate-300";
                                openApplyModalBtn.innerHTML = `
                                    <i class="fa-solid fa-lock text-xs"></i>
                                    <span>Blocked: Active Loan In Progress</span>
                                `;
                            }
                        } else if (existingApp && userPreapprovedBox) {
                            const appDateFormatted = new Date(existingApp.applied_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                            });

                            userPreapprovedBox.className = "bg-amber-50 border border-amber-300 rounded-xl p-3.5 mb-5 text-xs text-amber-900";
                            userPreapprovedBox.innerHTML = `
                                <div class="flex items-center justify-between mb-1.5">
                                    <span class="flex items-center gap-1.5 font-bold text-amber-800">
                                        <i class="fa-solid fa-clock-rotate-left"></i>
                                        <span>Application Under Review</span>
                                    </span>
                                    <span class="font-mono text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-amber-200">${existingApp.application_ref}</span>
                                </div>
                                <p class="text-[11px] leading-relaxed text-amber-700">
                                    You have already applied for <strong>${formatCurrency(existingApp.requested_amount)}</strong> (${existingApp.requested_tenure_months} Mo) on ${appDateFormatted}. Credit underwriting is in progress.
                                </p>
                            `;

                            if (openApplyModalBtn) {
                                openApplyModalBtn.className = "w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer";
                                openApplyModalBtn.innerHTML = `
                                    <i class="fa-solid fa-clock"></i>
                                    <span>Application Under Review</span>
                                `;
                            }
                        }
                    }
                } catch (err) {
                    console.error("Failed to check active applications:", err);
                }
            }

        } catch (error) {
            console.error("Error loading loan product details:", error);
        }
    }

    // -------------------------------------------------------------
    // 06. Loan Application Modal Logic
    // -------------------------------------------------------------
    function openModal() {
        if (!applicationModal || !currentLoan) return;

        if (modalLoanTitle) modalLoanTitle.textContent = currentLoan.name;

        if (currentUser) {
            if (modalApplicantName) modalApplicantName.value = `${currentUser.fname || ''} ${currentUser.lname || ''}`.trim();
            if (modalApplicantPhone) modalApplicantPhone.value = currentUser.phone || '';
            if (modalApplicantCibil) modalApplicantCibil.value = currentUser.cibil_score ? `${currentUser.cibil_score} (Verified)` : 'Pending';
            if (modalApplicantIncome) {
                modalApplicantIncome.value = currentUser.monthly_income ? formatCurrency(currentUser.monthly_income) : 'Pending';
            }
        }

        // Pre-fill slider values
        if (modalLoanAmount) {
            modalLoanAmount.value = loanAmountSlider.value;
            modalLoanAmount.min = currentLoan.min_amount;
            modalLoanAmount.max = currentLoan.max_amount;
        }

        if (modalLoanTenure) {
            modalLoanTenure.value = loanTenureSlider.value;
            modalLoanTenure.min = currentLoan.min_tenure_months;
            modalLoanTenure.max = currentLoan.max_tenure_months;
        }

        if (modalAlertBox) {
            modalAlertBox.classList.add("hidden");
            modalAlertBox.innerHTML = "";
        }

        applicationModal.classList.remove("opacity-0", "invisible");
        applicationModal.querySelector("div").classList.remove("scale-95");
        applicationModal.querySelector("div").classList.add("scale-100");
        document.body.classList.add("overflow-hidden");
    }

    function closeModal() {
        if (!applicationModal) return;
        applicationModal.classList.add("opacity-0", "invisible");
        applicationModal.querySelector("div").classList.remove("scale-100");
        applicationModal.querySelector("div").classList.add("scale-95");
        document.body.classList.remove("overflow-hidden");
    }

    if (openApplyModalBtn) openApplyModalBtn.addEventListener("click", openModal);
    if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);

    if (applicationModal) {
        applicationModal.addEventListener("click", function (e) {
            if (e.target === applicationModal) closeModal();
        });
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && applicationModal && !applicationModal.classList.contains("invisible")) {
            closeModal();
        }
    });

    // -------------------------------------------------------------
    // 07. Handle Application Form Submission
    // -------------------------------------------------------------
    if (loanApplyForm) {
        loanApplyForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            if (!currentLoan) return;

            const requestedAmount = parseFloat(modalLoanAmount.value);
            const requestedTenure = parseInt(modalLoanTenure.value, 10);
            const purpose = modalLoanPurpose ? modalLoanPurpose.value.trim() : "";

            if (!requestedAmount || requestedAmount < parseFloat(currentLoan.min_amount) || requestedAmount > parseFloat(currentLoan.max_amount)) {
                if (modalAlertBox) {
                    modalAlertBox.className = "text-xs p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 block";
                    modalAlertBox.innerHTML = `<i class="fa-solid fa-circle-exclamation mr-1.5"></i> Amount must be between ${formatCurrency(currentLoan.min_amount)} and ${formatCurrency(currentLoan.max_amount)}.`;
                }
                return;
            }

            if (!requestedTenure || requestedTenure < currentLoan.min_tenure_months || requestedTenure > currentLoan.max_tenure_months) {
                if (modalAlertBox) {
                    modalAlertBox.className = "text-xs p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 block";
                    modalAlertBox.innerHTML = `<i class="fa-solid fa-circle-exclamation mr-1.5"></i> Tenure must be between ${currentLoan.min_tenure_months} and ${currentLoan.max_tenure_months} months.`;
                }
                return;
            }

            // Set loading state
            submitApplicationBtn.disabled = true;
            const originalBtnHtml = submitApplicationBtn.innerHTML;
            submitApplicationBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-sm"></i> Submitting Digital Application...`;

            try {
                const response = await fetch(`${API_BASE}/loans/apply`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        slug: currentLoan.slug,
                        requested_amount: requestedAmount,
                        requested_tenure_months: requestedTenure,
                        purpose: purpose,
                        applicant_name: modalApplicantName.value,
                        applicant_phone: modalApplicantPhone.value
                    })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || "Failed to submit loan application.");
                }

                // Show Success Notification
                if (modalAlertBox) {
                    modalAlertBox.className = "text-xs p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 block shadow-sm";
                    modalAlertBox.innerHTML = `
                        <div class="flex items-center gap-2 font-bold text-sm text-emerald-900 mb-1">
                            <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i>
                            <span>Application Submitted Successfully!</span>
                        </div>
                        <p class="text-xs text-emerald-700 leading-relaxed">
                            Application Reference: <strong class="font-mono text-emerald-900 bg-white px-1.5 py-0.5 rounded border border-emerald-200">${result.data.applicationRef}</strong>
                        </p>
                        <p class="text-[11px] text-emerald-600 mt-2">
                            Redirecting you to dashboard in 2 seconds...
                        </p>
                    `;
                }

                submitApplicationBtn.classList.add("hidden");

                setTimeout(() => {
                    window.location.href = "dashboard2.html";
                }, 2200);

            } catch (err) {
                console.error("Submission error:", err);
                if (modalAlertBox) {
                    modalAlertBox.className = "text-xs p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 block";
                    modalAlertBox.innerHTML = `<i class="fa-solid fa-circle-exclamation mr-1.5"></i> ${err.message}`;
                }
                submitApplicationBtn.disabled = false;
                submitApplicationBtn.innerHTML = originalBtnHtml;
            }
        });
    }

    // -------------------------------------------------------------
    // 08. Initialization Sequence
    // -------------------------------------------------------------
    const urlParams = new URLSearchParams(window.location.search);
    const initialSlug = urlParams.get("slug") || "personal-loan";

    await loadUserProfile();
    await loadCatalogList(initialSlug);
    await loadLoanDetails(initialSlug);
});
