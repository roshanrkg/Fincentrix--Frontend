/**
 * Fincentrix - My Loan Applications & Tracking Engine
 * applications.js
 */

document.addEventListener("DOMContentLoaded", async function () {
    const API_BASE = "http://localhost:3000/api";
    const token = localStorage.getItem("fincentrix_token");

    if (!token) {
        window.location.replace("index.html");
        return;
    }

    // State
    let currentUser = null;
    let allApplications = [];
    let currentFilter = "all";

    // Select Elements
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const menuButton = document.getElementById("menuButton");
    const sidebarClose = document.getElementById("sidebarClose");
    const logoutButton = document.getElementById("logoutButton");

    // Profile Elements
    const sidebarUserName = document.getElementById("sidebarUserName");
    const sidebarUserAvatar = document.getElementById("sidebarUserAvatar");
    const sidebarUserRole = document.getElementById("sidebarUserRole");
    const topbarMobileAvatar = document.getElementById("topbarMobileAvatar");
    const sidebarApplicationsBadge = document.getElementById("sidebarApplicationsBadge");

    // Summary Metric Elements
    const statTotalApps = document.getElementById("statTotalApps");
    const statInReviewApps = document.getElementById("statInReviewApps");
    const statApprovedApps = document.getElementById("statApprovedApps");
    const statTotalAmount = document.getElementById("statTotalAmount");

    // Container & States
    const applicationsContainer = document.getElementById("applicationsContainer");
    const loadingState = document.getElementById("loadingState");
    const emptyState = document.getElementById("emptyState");
    const filterTabs = document.querySelectorAll(".filter-tab");

    // Helper: Format Currency (INR)
    function formatCurrency(val) {
        const num = Math.round(Number(val) || 0);
        return "₹" + num.toLocaleString("en-IN");
    }

    // -------------------------------------------------------------
    // 01. Mobile Navigation & Drawer Handlers
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
    // 02. Fetch Current User Profile
    // -------------------------------------------------------------
    async function loadUserProfile() {
        try {
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: { "Authorization": `Bearer ${token}` }
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

                if (sidebarUserName) sidebarUserName.textContent = `${fname} ${lname}`.trim();
                if (sidebarUserAvatar) sidebarUserAvatar.textContent = initials;
                if (topbarMobileAvatar) topbarMobileAvatar.textContent = initials;
                if (sidebarUserRole) {
                    sidebarUserRole.textContent = currentUser.role ? currentUser.role.toUpperCase() : "CUSTOMER";
                }
            }
        } catch (err) {
            console.error("Failed to load user profile:", err);
        }
    }

    // -------------------------------------------------------------
    // 03. Fetch Applications & Update Metrics
    // -------------------------------------------------------------
    async function loadApplications() {
        try {
            if (loadingState) loadingState.classList.remove("hidden");
            if (emptyState) emptyState.classList.add("hidden");

            const res = await fetch(`${API_BASE}/loans/my-applications`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to fetch applications.");

            const json = await res.json();
            allApplications = json.data || [];

            // Update Summary Stats
            const totalCount = allApplications.length;
            const inReviewCount = allApplications.filter(a => a.status === "pending" || a.status === "in_review").length;
            const approvedCount = allApplications.filter(a => a.status === "approved").length;
            const totalAmountVal = allApplications.reduce((sum, a) => sum + (parseFloat(a.requested_amount) || 0), 0);

            if (statTotalApps) statTotalApps.textContent = totalCount;
            if (statInReviewApps) statInReviewApps.textContent = inReviewCount;
            if (statApprovedApps) statApprovedApps.textContent = approvedCount;
            if (statTotalAmount) statTotalAmount.textContent = formatCurrency(totalAmountVal);

            if (sidebarApplicationsBadge) {
                sidebarApplicationsBadge.textContent = totalCount.toString().padStart(2, "0");
            }

            // Render List
            renderApplicationsList();

        } catch (err) {
            console.error("Error loading applications:", err);
            if (applicationsContainer) {
                applicationsContainer.innerHTML = `
                    <div class="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs">
                        <i class="fa-solid fa-circle-exclamation mr-1.5"></i> Could not load applications. Please check your network connection.
                    </div>
                `;
            }
        } finally {
            if (loadingState) loadingState.classList.add("hidden");
        }
    }

    // -------------------------------------------------------------
    // 04. Stage Calculation & Timeline Builder
    // -------------------------------------------------------------
    function renderStagesTimeline(status) {
        // Status maps:
        // pending -> Stage 1 Done, Stage 2 Active (Doc Verification), Stage 3 Pending, Stage 4 Pending
        // in_review -> Stage 1 & 2 Done, Stage 3 Active (Credit Underwriting), Stage 4 Pending
        // approved -> All 4 Stages Completed
        // rejected -> Stage 1 Done, Stage 2 Failed

        let stage1Status = "completed";
        let stage2Status = "active";
        let stage3Status = "pending";
        let stage4Status = "pending";

        if (status === "in_review") {
            stage2Status = "completed";
            stage3Status = "active";
        } else if (status === "approved") {
            stage2Status = "completed";
            stage3Status = "completed";
            stage4Status = "completed";
        } else if (status === "rejected") {
            stage2Status = "rejected";
        }

        const stages = [
            {
                number: 1,
                title: "Application Submitted",
                desc: "Digital form & loan terms registered",
                state: stage1Status,
                icon: "fa-solid fa-check"
            },
            {
                number: 2,
                title: "Document & KYC Verification",
                desc: stage2Status === "rejected" ? "Verification failed / Discrepancy" : "Aadhaar, PAN & bank verification",
                state: stage2Status,
                icon: stage2Status === "completed" ? "fa-solid fa-check" : stage2Status === "rejected" ? "fa-solid fa-xmark" : "fa-solid fa-clock"
            },
            {
                number: 3,
                title: "Credit Underwriting",
                desc: "CIBIL check & loan pricing approval",
                state: stage3Status,
                icon: stage3Status === "completed" ? "fa-solid fa-check" : stage3Status === "active" ? "fa-solid fa-clock" : "fa-solid fa-shield-halved"
            },
            {
                number: 4,
                title: "Sanction & Disbursal",
                desc: "Digital agreement e-sign & fund transfer",
                state: stage4Status,
                icon: stage4Status === "completed" ? "fa-solid fa-check" : stage4Status === "active" ? "fa-solid fa-clock" : "fa-solid fa-hand-holding-dollar"
            }
        ];

        return `
            <div class="mt-6 pt-6 border-t border-slate-100">
                <div class="flex items-center justify-between mb-4">
                    <span class="text-[11px] font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                        <i class="fa-solid fa-timeline text-primary"></i>
                        <span>Underwriting & Sanction Stages</span>
                    </span>
                    <span class="text-[10px] text-muted font-medium">Standard SLA: 24-48 Hours</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-2 relative">
                    ${stages.map((stage, idx) => {
                        let circleClass = "bg-slate-100 text-slate-400 border border-slate-200";
                        let titleClass = "text-slate-600";
                        let stateBadge = `<span class="text-[9px] font-semibold text-slate-400">Pending</span>`;

                        if (stage.state === "completed") {
                            circleClass = "bg-emerald-500 text-white shadow-md shadow-emerald-500/25";
                            titleClass = "text-emerald-900 font-extrabold";
                            stateBadge = `<span class="text-[9px] font-bold text-emerald-600 flex items-center gap-1"><i class="fa-solid fa-circle-check text-[8px]"></i> Completed</span>`;
                        } else if (stage.state === "active") {
                            circleClass = "bg-amber-500 text-white shadow-lg shadow-amber-500/30 animate-pulse";
                            titleClass = "text-amber-900 font-extrabold";
                            stateBadge = `<span class="text-[9px] font-bold text-amber-700 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span> In Progress</span>`;
                        } else if (stage.state === "rejected") {
                            circleClass = "bg-red-500 text-white shadow-md shadow-red-500/25";
                            titleClass = "text-red-900 font-extrabold";
                            stateBadge = `<span class="text-[9px] font-bold text-red-600">Action Required</span>`;
                        }

                        return `
                            <div class="flex sm:flex-col items-start gap-3 sm:gap-2 p-3 sm:p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                                <div class="w-8 h-8 rounded-full ${circleClass} grid place-items-center text-xs shrink-0">
                                    <i class="${stage.icon}"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between gap-1">
                                        <h5 class="text-xs font-bold ${titleClass} truncate">
                                            Stage ${stage.number}: ${stage.title}
                                        </h5>
                                    </div>
                                    <p class="text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-2">
                                        ${stage.desc}
                                    </p>
                                    <div class="mt-2">
                                        ${stateBadge}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        `;
    }

    // -------------------------------------------------------------
    // 05. Render Application Cards List
    // -------------------------------------------------------------
    function renderApplicationsList() {
        if (!applicationsContainer) return;

        let filtered = allApplications;
        if (currentFilter === "pending") {
            filtered = allApplications.filter(a => a.status === "pending" || a.status === "in_review");
        } else if (currentFilter === "approved") {
            filtered = allApplications.filter(a => a.status === "approved");
        }

        if (filtered.length === 0) {
            applicationsContainer.innerHTML = "";
            if (emptyState) emptyState.classList.remove("hidden");
            return;
        }

        if (emptyState) emptyState.classList.add("hidden");

        applicationsContainer.innerHTML = filtered.map(app => {
            const formattedDate = new Date(app.applied_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });

            const amountFormatted = formatCurrency(app.requested_amount);
            const statusLabel = app.status === "approved"
                ? "Approved & Sanctioned"
                : app.status === "rejected"
                ? "Rejected"
                : "Under Credit Review";

            const statusBadgeClass = app.status === "approved"
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : "bg-amber-50 text-amber-800 border-amber-300";

            const statusDotColor = app.status === "approved" ? "bg-emerald-500" : "bg-amber-500";

            return `
                <article class="application-card bg-white rounded-2xl p-5 sm:p-7 border border-slate-200/90 shadow-sm overflow-hidden" data-ref="${app.application_ref}">
                    
                    <!-- Top Card Strip -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
                        <div class="flex items-center gap-3.5">
                            <span class="w-11 h-11 rounded-xl bg-blue-50 text-primary grid place-items-center text-lg shrink-0 border border-blue-100 shadow-sm">
                                <i class="${app.loan_icon || 'fa-solid fa-hand-holding-dollar'}"></i>
                            </span>
                            <div>
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h3 class="text-base sm:text-lg font-extrabold text-navy">
                                        ${app.loan_name}
                                    </h3>
                                    <span class="px-2 py-0.5 rounded-md text-[9px] font-extrabold tracking-wider uppercase bg-slate-100 text-slate-700 border border-slate-200">
                                        ${app.loan_category || 'FINANCE'}
                                    </span>
                                </div>
                                <div class="flex items-center gap-2 text-xs text-muted mt-0.5">
                                    <span class="font-mono font-bold text-navy">Ref: ${app.application_ref}</span>
                                    <span>•</span>
                                    <span>Applied on ${formattedDate}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Status Badge -->
                        <div class="self-start sm:self-auto flex items-center gap-2">
                            <span class="px-3 py-1.5 rounded-full text-xs font-bold border ${statusBadgeClass} flex items-center gap-2 shadow-sm">
                                <span class="w-2 h-2 rounded-full ${statusDotColor} animate-pulse"></span>
                                <span>${statusLabel}</span>
                            </span>
                        </div>
                    </div>

                    <!-- Key Financials Snapshot Strip -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 py-5 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 rounded-xl px-4 my-4 border border-slate-100">
                        <div>
                            <span class="text-[10px] font-bold text-muted uppercase block">Requested Amount</span>
                            <span class="text-sm sm:text-base font-extrabold text-navy font-mono mt-0.5 block">${amountFormatted}</span>
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-muted uppercase block">Requested Tenure</span>
                            <span class="text-sm sm:text-base font-extrabold text-slate-800 mt-0.5 block">${app.requested_tenure_months} Months</span>
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-muted uppercase block">Interest Rate</span>
                            <span class="text-sm sm:text-base font-extrabold text-primary mt-0.5 block">From ${app.min_interest_rate || '10.49'}% p.a.</span>
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-muted uppercase block">Applicant Contact</span>
                            <span class="text-xs sm:text-sm font-bold text-slate-700 mt-0.5 block truncate">${app.applicant_phone || (currentUser ? currentUser.phone : 'Verified')}</span>
                        </div>
                    </div>

                    <!-- Application Stages Timeline -->
                    ${renderStagesTimeline(app.status)}

                    <!-- Card Actions Strip -->
                    <div class="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div class="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <i class="fa-solid fa-lock text-[10px] text-primary"></i>
                            <span>256-bit encrypted bank verification with RBI authorized partners.</span>
                        </div>

                        <div class="flex items-center gap-2">
                            <a href="loans.html?slug=${encodeURIComponent(app.loan_slug)}" class="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-navy font-bold text-xs transition-colors flex items-center gap-1.5">
                                <span>View Product Page</span>
                                <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                            </a>
                            <button type="button" class="print-receipt-btn px-3.5 py-2 rounded-lg bg-navy hover:bg-navy-dark text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1.5" data-ref="${app.application_ref}" data-loan="${app.loan_name}" data-amount="${amountFormatted}" data-date="${formattedDate}">
                                <i class="fa-solid fa-print text-[10px]"></i>
                                <span>Print Receipt</span>
                            </button>
                        </div>
                    </div>

                </article>
            `;
        }).join("");

        // Setup print receipt listeners
        document.querySelectorAll(".print-receipt-btn").forEach(btn => {
            btn.addEventListener("click", function () {
                const ref = this.dataset.ref;
                const loan = this.dataset.loan;
                const amount = this.dataset.amount;
                const date = this.dataset.date;
                window.print();
            });
        });
    }

    // -------------------------------------------------------------
    // 06. Filter Tabs Click Handlers
    // -------------------------------------------------------------
    filterTabs.forEach(tab => {
        tab.addEventListener("click", function () {
            filterTabs.forEach(t => {
                t.classList.remove("active", "bg-navy", "text-white");
                t.classList.add("text-slate-600");
            });

            this.classList.add("active", "bg-navy", "text-white");
            this.classList.remove("text-slate-600");

            currentFilter = this.dataset.filter || "all";
            renderApplicationsList();
        });
    });

    // -------------------------------------------------------------
    // 07. Initialization Sequence
    // -------------------------------------------------------------
    await loadUserProfile();
    await loadApplications();
});
