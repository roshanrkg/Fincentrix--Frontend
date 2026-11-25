/**
 * Fincentrix Operator Portal & Underwriting Console
 * fincentrix.01/operator/operator.js
 */

const API_BASE_URL = "http://localhost:3000/api";

// Global Sign Out function
function handleSignOut() {
    localStorage.removeItem("fincentrix_token");
    localStorage.removeItem("fincentrix_user");
    window.location.href = "login.html";
}

// Global Operator State & App Controller
window.operatorApp = {
    currentOperator: null,
    stats: {
        myQueue: { pending: 0, sanctioned: 0, rejected: 0, highRiskAlerts: 0, counterOffersPending: 0 },
        department: { pendingApplications: 0, categoriesCovered: [] }
    },
    applications: [],
    filter: {
        status: "all",
        risk: "all",
        search: ""
    },
    activeDossier: null,
    activeTab: "overview",
    loading: false,

    // Initialize portal
    async init() {
        console.log("[Operator App] Initializing Underwriting Console...");
        const authed = await this.checkAuth();
        if (!authed) return;

        // Setup real-time search listener
        const searchInput = document.getElementById("queue-search-input");
        if (searchInput) {
            let debounceTimer = null;
            searchInput.addEventListener("input", (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.filter.search = e.target.value.trim();
                    this.fetchApplications();
                }, 300);
            });
        }

        // Setup dark mode observer for live chart theme re-rendering
        const observer = new MutationObserver(() => {
            this.renderDynamicCharts();
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

        // Close modal on ESC key
        window.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                const modal = document.getElementById("dossier-modal");
                if (modal && !modal.classList.contains("hidden")) {
                    this.closeModal();
                }
            }
        });

        await this.loadDashboardData();
    },

    // Check operator authentication
    async checkAuth() {
        const token = localStorage.getItem("fincentrix_token");
        let user = null;
        try {
            user = JSON.parse(localStorage.getItem("fincentrix_user"));
        } catch (e) {
            user = null;
        }

        if (!token || !user || user.role !== "operator") {
            window.location.href = "login.html";
            return false;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/operator/profile`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                this.currentOperator = data.data.operator;
                this.currentOperator.specializations = data.data.specializations || [];
                this.renderOperatorProfile();
                return true;
            } else {
                handleSignOut();
                return false;
            }
        } catch (err) {
            console.error("Auth verification failed:", err);
            return true; // Use cached session if server temporarily unresponsive
        }
    },

    // Render operator profile in header dropdown
    renderOperatorProfile() {
        if (!this.currentOperator) return;

        const headerName = document.getElementById("header-operator-name");
        const dropdownName = document.getElementById("dropdown-operator-name");
        const dropdownEmail = document.getElementById("dropdown-operator-email");
        const specBadges = document.getElementById("operator-spec-badges");

        if (headerName) headerName.textContent = this.currentOperator.name;
        if (dropdownName) dropdownName.textContent = this.currentOperator.name;
        if (dropdownEmail) dropdownEmail.textContent = this.currentOperator.email;

        if (specBadges && this.currentOperator.specializations) {
            const specs = this.currentOperator.specializations.map(s => s.loan_name || s.loan_category);
            const unique = [...new Set(specs)];
            specBadges.innerHTML = unique.map(s => 
                `<span class="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                    <i class="fa-solid fa-certificate text-[10px]"></i> ${s}
                </span>`
            ).join("");
        }

        if (window.sidebarNav && typeof window.sidebarNav.updateBadges === "function") {
            window.sidebarNav.updateBadges({
                operator: this.currentOperator,
                specializations: this.currentOperator.specializations,
                myQueue: this.stats.myQueue
            });
        }
    },

    // Load metrics and queue data
    async loadDashboardData() {
        this.loading = true;
        const token = localStorage.getItem("fincentrix_token");
        if (!token) return;

        try {
            // 1. Fetch KPI metrics
            const statsRes = await fetch(`${API_BASE_URL}/operator/dashboard-stats`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                this.stats = statsData.data;
                this.renderStats();
            }

            // 2. Fetch assigned applications
            await this.fetchApplications();
        } catch (err) {
            console.error("Failed to load dashboard data:", err);
        } finally {
            this.loading = false;
        }
    },

    volumeChartInstance: null,
    targetChartInstance: null,

    // Update KPI card numbers & dashboard telemetry
    renderStats() {
        const q = this.stats.myQueue || {};
        const res = this.stats.resolution || {};

        const elPending = document.getElementById("stat-pending-count");
        const elRisk = document.getElementById("stat-risk-count");
        const elSanctioned = document.getElementById("stat-sanctioned-count");
        const elDisbursed = document.getElementById("stat-disbursed-amount");

        if (elPending) elPending.textContent = q.pending || 0;
        if (elRisk) elRisk.textContent = q.highRiskAlerts || 0;
        if (elSanctioned) elSanctioned.textContent = (q.sanctioned || 0) + (q.disbursed || 0);
        if (elDisbursed) elDisbursed.textContent = `₹${Number(q.totalDisbursedAmount || 0).toLocaleString("en-IN")}`;

        // Update Target resolution stats
        const elResRate = document.getElementById("target-resolution-rate");
        const elResText = document.getElementById("target-resolution-text");
        const elSancVal = document.getElementById("target-sanctioned-val");
        const elDisbVal = document.getElementById("target-disbursed-val");

        const rate = res.rate !== undefined ? res.rate : 100;
        if (elResRate) elResRate.textContent = `${rate}%`;
        if (elResText) {
            elResText.textContent = `You have reviewed ${res.processed || 0} of ${res.total || 0} assigned loan applications.`;
        }
        if (elSancVal) elSancVal.textContent = `₹${Number(q.totalSanctionedAmount || 0).toLocaleString("en-IN")}`;
        if (elDisbVal) elDisbVal.textContent = `₹${Number(q.totalDisbursedAmount || 0).toLocaleString("en-IN")}`;

        // Sync with global sidebar
        if (window.sidebarNav && typeof window.sidebarNav.updateBadges === "function") {
            window.sidebarNav.updateBadges(this.stats);
        }

        // Render dynamic interactive charts
        this.renderDynamicCharts();
    },

    // Render Dynamic ApexCharts
    renderDynamicCharts() {
        if (typeof window.ApexCharts === "undefined") {
            console.warn("ApexCharts not yet loaded, retrying in 200ms...");
            setTimeout(() => this.renderDynamicCharts(), 200);
            return;
        }

        const isDark = document.documentElement.classList.contains("dark") || document.body.classList.contains("dark");
        const monthsData = this.stats.monthlyVolume || [
            { month: "Jun", evaluated: 0, sanctioned: 0 },
            { month: "Jul", evaluated: 0, sanctioned: 0 },
            { month: "Aug", evaluated: 0, sanctioned: 0 },
            { month: "Sep", evaluated: 0, sanctioned: 0 },
            { month: "Oct", evaluated: 0, sanctioned: 0 },
            { month: "Nov", evaluated: 1, sanctioned: 1 }
        ];

        // 1. Underwriting Volume Chart (Bar Chart)
        const volumeEl = document.querySelector("#dynamicVolumeChart");
        if (volumeEl) {
            const categories = monthsData.map(m => m.month);
            const evaluatedSeries = monthsData.map(m => m.evaluated);
            const sanctionedSeries = monthsData.map(m => m.sanctioned);

            const volumeOptions = {
                colors: ["#465FFF", "#10B981"],
                chart: {
                    fontFamily: "Outfit, sans-serif",
                    type: "bar",
                    height: 220,
                    toolbar: { show: false }
                },
                plotOptions: {
                    bar: {
                        horizontal: false,
                        columnWidth: "40%",
                        borderRadius: 6,
                        borderRadiusApplication: "around"
                    }
                },
                dataLabels: { enabled: false },
                stroke: { show: true, width: 2, colors: ["transparent"] },
                series: [
                    { name: "Evaluated Applications", data: evaluatedSeries },
                    { name: "Sanctioned / Disbursed", data: sanctionedSeries }
                ],
                xaxis: {
                    categories: categories,
                    axisBorder: { show: false },
                    axisTicks: { show: false },
                    labels: {
                        style: {
                            colors: isDark ? "#94A3B8" : "#64748B",
                            fontFamily: "Outfit, sans-serif"
                        }
                    }
                },
                yaxis: {
                    labels: {
                        style: {
                            colors: isDark ? "#94A3B8" : "#64748B",
                            fontFamily: "Outfit, sans-serif"
                        }
                    }
                },
                legend: {
                    show: true,
                    position: "top",
                    horizontalAlign: "right",
                    labels: { colors: isDark ? "#E2E8F0" : "#334155" }
                },
                grid: {
                    borderColor: isDark ? "#1E293B" : "#F1F5F9",
                    yaxis: { lines: { show: true } }
                },
                tooltip: {
                    theme: isDark ? "dark" : "light"
                }
            };

            if (this.volumeChartInstance) {
                this.volumeChartInstance.destroy();
            }
            this.volumeChartInstance = new ApexCharts(volumeEl, volumeOptions);
            this.volumeChartInstance.render();
        }

        // 2. Underwriting Resolution Target Chart (Radial Bar Gauge)
        const targetEl = document.querySelector("#dynamicTargetChart");
        if (targetEl) {
            const rate = this.stats.resolution?.rate !== undefined ? this.stats.resolution.rate : 100;

            const targetOptions = {
                series: [rate],
                colors: ["#465FFF"],
                chart: {
                    fontFamily: "Outfit, sans-serif",
                    type: "radialBar",
                    height: 280,
                    sparkline: { enabled: true }
                },
                plotOptions: {
                    radialBar: {
                        startAngle: -90,
                        endAngle: 90,
                        hollow: { size: "75%" },
                        track: {
                            background: isDark ? "#1E293B" : "#E2E8F0",
                            strokeWidth: "100%",
                            margin: 5
                        },
                        dataLabels: {
                            name: { show: false },
                            value: {
                                fontSize: "32px",
                                fontWeight: "700",
                                offsetY: -35,
                                color: isDark ? "#FFFFFF" : "#1E293B",
                                formatter: val => `${val}%`
                            }
                        }
                    }
                },
                fill: {
                    type: "gradient",
                    gradient: {
                        shade: "light",
                        type: "horizontal",
                        shadeIntensity: 0.5,
                        gradientToColors: ["#10B981"],
                        stops: [0, 100]
                    }
                },
                stroke: { lineCap: "round" }
            };

            if (this.targetChartInstance) {
                this.targetChartInstance.destroy();
            }
            this.targetChartInstance = new ApexCharts(targetEl, targetOptions);
            this.targetChartInstance.render();
        }
    },

    // Fetch applications
    async fetchApplications() {
        const token = localStorage.getItem("fincentrix_token");
        if (!token) return;

        let url = `${API_BASE_URL}/operator/my-applications?status=${this.filter.status}&risk=${this.filter.risk}`;
        if (this.filter.search) {
            url += `&search=${encodeURIComponent(this.filter.search)}`;
        }

        try {
            const res = await fetch(url, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                this.applications = data.data || [];
                this.renderApplicationsTable();
            }
        } catch (err) {
            console.error("Failed to fetch applications:", err);
        }
    },

    // Apply status or risk filter
    setFilter(key, value) {
        this.filter[key] = value;
        if (key === "status") {
            document.querySelectorAll(".tab-status-btn").forEach(btn => {
                if (btn.dataset.status === value) {
                    btn.classList.add("bg-brand-500", "text-white");
                    btn.classList.remove("text-gray-500", "dark:text-gray-400", "bg-transparent");
                } else {
                    btn.classList.remove("bg-brand-500", "text-white");
                    btn.classList.add("text-gray-500", "dark:text-gray-400", "bg-transparent");
                }
            });
        }
        this.fetchApplications();
    },

    // Render applications into TailAdmin table
    renderApplicationsTable() {
        const tbody = document.getElementById("applications-table-body");
        const emptyState = document.getElementById("applications-empty-state");
        const countBadge = document.getElementById("queue-count-badge");

        if (countBadge) countBadge.textContent = `${this.applications.length} Assigned`;
        if (!tbody) return;

        if (this.applications.length === 0) {
            tbody.innerHTML = "";
            if (emptyState) emptyState.classList.remove("hidden");
            return;
        }

        if (emptyState) emptyState.classList.add("hidden");

        tbody.innerHTML = this.applications.map(app => {
            const requested = Number(app.requested_amount || 0).toLocaleString("en-IN");
            const fraudScore = app.fraud_risk_score !== null ? app.fraud_risk_score : "-";
            const isScam = app.is_scam_suspected === 1;

            // Risk Badge
            let riskBadge = `<span class="inline-flex h-6 items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">Pending AI</span>`;
            if (app.fraud_risk_score !== null) {
                if (isScam || app.fraud_risk_score >= 60) {
                    riskBadge = `<span class="inline-flex h-6 items-center gap-1 rounded-lg bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-500/15 dark:text-red-400">
                        <i class="fa-solid fa-triangle-exclamation text-[10px]"></i> High Risk (${fraudScore})
                    </span>`;
                } else if (app.fraud_risk_score >= 25) {
                    riskBadge = `<span class="inline-flex h-6 items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                        <i class="fa-solid fa-circle-exclamation text-[10px]"></i> Moderate (${fraudScore})
                    </span>`;
                } else {
                    riskBadge = `<span class="inline-flex h-6 items-center gap-1 rounded-lg bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-600 dark:bg-green-500/15 dark:text-green-500">
                        <i class="fa-solid fa-shield-check text-[10px]"></i> Low Risk (${fraudScore})
                    </span>`;
                }
            }

            // Status Badge
            const statusMap = {
                pending: { label: "Pending", cls: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" },
                under_review: { label: "Under Review", cls: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" },
                sanctioned: { label: "Sanctioned", cls: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400" },
                approved: { label: "Approved", cls: "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-500" },
                disbursed: { label: "Disbursed", cls: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 font-bold" },
                counter_offered: { label: "Counter-Offered", cls: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400" },
                rejected: { label: "Rejected", cls: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400" }
            };
            const s = statusMap[app.status] || { label: app.status, cls: "bg-gray-100 text-gray-600" };

            return `
                <tr class="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td class="py-3.5 pr-4">
                        <div class="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                            ${app.application_ref}
                        </div>
                        <div class="text-[11px] text-gray-400">Applied on ${new Date(app.applied_at).toLocaleDateString()}</div>
                    </td>
                    <td class="py-3.5 px-4">
                        <div class="text-sm font-medium text-gray-800 dark:text-white/90">
                            ${app.applicant_name || 'Applicant'}
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                            <span><i class="fa-solid fa-phone text-[10px]"></i> ${app.applicant_phone || '-'}</span>
                            <span>•</span>
                            <span>CIBIL: <strong>${app.applicant_cibil || 'N/A'}</strong></span>
                        </div>
                    </td>
                    <td class="py-3.5 px-4 text-sm text-gray-500 dark:text-gray-400">
                        <div class="font-medium text-gray-800 dark:text-white/90">${app.loan_name}</div>
                        <div class="text-[11px] text-gray-400 uppercase tracking-wider">${app.loan_category}</div>
                    </td>
                    <td class="py-3.5 px-4">
                        <div class="text-sm font-bold text-gray-800 dark:text-white/90">₹${requested}</div>
                        <div class="text-[11px] text-gray-500">${app.requested_tenure_months} Months</div>
                    </td>
                    <td class="py-3.5 px-4">
                        ${riskBadge}
                        ${app.is_counter_offer_proposed ? `
                            <div class="mt-1">
                                <span class="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                                    <i class="fa-solid fa-arrows-split-up-and-left text-[9px]"></i> Counter: ₹${Number(app.counter_offer_amount).toLocaleString('en-IN')}
                                </span>
                            </div>` : ''}
                    </td>
                    <td class="py-3.5 px-4">
                        <span class="inline-flex h-6 items-center rounded-lg px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${s.cls}">
                            ${s.label}
                        </span>
                    </td>
                    <td class="py-3.5 pl-4 text-right">
                        <button 
                            onclick="operatorApp.openDossier(${app.id})" 
                            class="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white shadow-theme-xs hover:bg-brand-600 active:scale-95 transition-all cursor-pointer">
                            <i class="fa-solid fa-folder-open text-[11px]"></i> Review Dossier
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    },

    // Open Underwriting Dossier Modal
    async openDossier(applicationId) {
        const token = localStorage.getItem("fincentrix_token");
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/operator/applications/${applicationId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.data) {
                this.activeDossier = data.data;
                this.activeTab = "overview";
                this.renderModalContent();

                const modal = document.getElementById("dossier-modal");
                if (modal) {
                    modal.classList.remove("hidden");
                    document.body.classList.add("overflow-hidden");
                }
            } else {
                alert(data.message || "Failed to load dossier.");
            }
        } catch (err) {
            console.error("Error opening dossier:", err);
        }
    },

    // Close Modal
    closeModal() {
        this.activeDossier = null;
        const modal = document.getElementById("dossier-modal");
        const card = document.getElementById("dossier-modal-card");
        const icon = document.getElementById("modal-fullscreen-icon");
        if (modal) {
            modal.classList.add("hidden");
            document.body.classList.remove("overflow-hidden");
        }
        if (card && card.classList.contains("fullscreen-modal")) {
            card.classList.remove("fullscreen-modal");
            card.style.maxWidth = "1400px";
            card.style.width = "98%";
            card.style.height = "96vh";
            card.style.maxHeight = "96vh";
            card.style.borderRadius = "1.5rem";
            if (icon) icon.className = "fa-solid fa-expand text-sm";
        }
    },

    // Toggle Fullscreen Modal
    toggleFullscreenModal() {
        const card = document.getElementById("dossier-modal-card");
        const icon = document.getElementById("modal-fullscreen-icon");
        if (!card) return;
        const isFull = card.classList.toggle("fullscreen-modal");
        if (isFull) {
            card.style.maxWidth = "100vw";
            card.style.width = "100vw";
            card.style.height = "100vh";
            card.style.maxHeight = "100vh";
            card.style.borderRadius = "0";
            card.style.margin = "0";
            if (icon) icon.className = "fa-solid fa-compress text-sm";
        } else {
            card.style.maxWidth = "1400px";
            card.style.width = "98%";
            card.style.height = "96vh";
            card.style.maxHeight = "96vh";
            card.style.borderRadius = "1.5rem";
            card.style.margin = "auto";
            if (icon) icon.className = "fa-solid fa-expand text-sm";
        }
    },

    // Switch Tabs inside Modal
    switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll(".dossier-tab-btn").forEach(btn => {
            if (btn.dataset.tab === tab) {
                btn.classList.add("border-brand-500", "text-brand-600", "dark:text-brand-400");
                btn.classList.remove("border-transparent", "text-gray-500", "dark:text-gray-400");
            } else {
                btn.classList.remove("border-brand-500", "text-brand-600", "dark:text-brand-400");
                btn.classList.add("border-transparent", "text-gray-500", "dark:text-gray-400");
            }
        });

        document.querySelectorAll(".dossier-pane").forEach(pane => pane.classList.add("hidden"));
        const target = document.getElementById(`pane-${tab}`);
        if (target) target.classList.remove("hidden");
    },

    // Render Modal Content
    renderModalContent() {
        if (!this.activeDossier) return;
        const d = this.activeDossier;
        const app = d.application;
        const applicant = d.applicant;
        const ai = d.aiEvaluation;
        const docs = d.documents || [];
        const banks = d.bankAccounts || [];
        const debts = d.existingLoans || [];

        // Header info
        document.getElementById("modal-app-ref").textContent = app.reference;
        document.getElementById("modal-app-loan").textContent = `${app.loanProduct.name} (${app.loanProduct.category})`;
        document.getElementById("modal-applicant-name").textContent = applicant.fullName;

        // Render individual panes
        this.renderOverviewTab(app, applicant, debts, banks);
        this.renderAiAuditTab(ai, app);
        this.renderDocumentsTab(docs);
        this.renderSanctionTab(app, ai, banks);

        this.switchTab("overview");
    },

    // Tab 1: Overview
    renderOverviewTab(app, applicant, debts, banks) {
        const pane = document.getElementById("pane-overview");
        if (!pane) return;

        const totalDebtEmi = debts.reduce((acc, l) => acc + Number(l.monthly_emi || 0), 0);
        let formattedDob = 'Not specified';
        if (applicant.dob) {
            const d = new Date(applicant.dob);
            formattedDob = !isNaN(d.getTime()) ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : applicant.dob;
        }

        pane.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Applicant Profile -->
                <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
                    <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-user-check text-brand-500"></i> Applicant Profile
                    </h4>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                            <span class="text-gray-500 dark:text-gray-400">Full Name</span>
                            <span class="font-semibold text-gray-800 dark:text-white/90">${applicant.fullName}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                            <span class="text-gray-500 dark:text-gray-400">Phone</span>
                            <span class="font-medium text-gray-800 dark:text-white/90">${applicant.phone || '-'}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                            <span class="text-gray-500 dark:text-gray-400">Email</span>
                            <span class="font-medium text-gray-800 dark:text-white/90">${applicant.email || '-'}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                            <span class="text-gray-500 dark:text-gray-400">Date of Birth</span>
                            <span class="font-medium text-gray-800 dark:text-white/90">${formattedDob}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                            <span class="text-gray-500 dark:text-gray-400">PAN</span>
                            <span class="font-mono font-bold text-gray-800 dark:text-white/90">${applicant.panNumber || 'Not verified'}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                            <span class="text-gray-500 dark:text-gray-400">Aadhaar Status</span>
                            <span class="font-medium text-green-600">${applicant.aadhaarPresent ? 'Verified (Encrypted)' : 'Pending'}</span>
                        </div>
                        <div class="flex justify-between py-1">
                            <span class="text-gray-500 dark:text-gray-400">City / State</span>
                            <span class="font-medium text-gray-800 dark:text-white/90">${applicant.address?.city || ''}, ${applicant.address?.state || ''}</span>
                        </div>
                    </div>
                </div>

                <!-- Financial Capacity -->
                <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
                    <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-chart-line-up text-brand-500"></i> Financial Capacity
                    </h4>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div class="bg-gray-50 dark:bg-white/[0.02] p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                            <div class="text-xs text-gray-500 dark:text-gray-400">Monthly Income</div>
                            <div class="text-lg font-bold text-green-600">₹${Number(applicant.monthlyIncome || 0).toLocaleString('en-IN')}</div>
                        </div>
                        <div class="bg-gray-50 dark:bg-white/[0.02] p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                            <div class="text-xs text-gray-500 dark:text-gray-400">CIBIL Score</div>
                            <div class="text-lg font-bold ${Number(applicant.cibilScore) >= 750 ? 'text-green-600' : 'text-amber-500'}">
                                ${applicant.cibilScore || 'N/A'}
                            </div>
                        </div>
                    </div>

                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                            <span class="text-gray-500 dark:text-gray-400">Requested Amount</span>
                            <span class="font-bold text-gray-800 dark:text-white/90">₹${Number(app.requestedAmount).toLocaleString('en-IN')}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                            <span class="text-gray-500 dark:text-gray-400">Requested Tenure</span>
                            <span class="font-medium text-gray-800 dark:text-white/90">${app.requestedTenureMonths} Months</span>
                        </div>
                        <div class="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                            <span class="text-gray-500 dark:text-gray-400">Stated Purpose</span>
                            <span class="font-medium text-gray-800 dark:text-white/90 text-right max-w-[200px] truncate" title="${app.purpose || 'General financing'}">
                                "${app.purpose || 'General financing'}"
                            </span>
                        </div>
                        <div class="flex justify-between py-1">
                            <span class="text-gray-500 dark:text-gray-400">Existing Monthly Debt</span>
                            <span class="font-bold text-amber-600">₹${totalDebtEmi.toLocaleString('en-IN')}/mo</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Existing Loans Table (if any) -->
            <div class="mt-6">
                <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Active Debt Obligations (${debts.length})
                </h4>
                ${debts.length === 0 ? `
                    <div class="bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 p-4 rounded-xl text-xs border border-green-200 dark:border-green-800 flex items-center gap-2">
                        <i class="fa-solid fa-circle-check text-sm"></i> No active debt obligations recorded. Clean credit record.
                    </div>
                ` : `
                    <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                        <table class="w-full text-left text-xs">
                            <thead class="bg-gray-50 dark:bg-gray-800/50 uppercase text-gray-400 border-b border-gray-100 dark:border-gray-800">
                                <tr>
                                    <th class="py-2.5 px-4 font-semibold">Lender</th>
                                    <th class="py-2.5 px-4 font-semibold">Loan Type</th>
                                    <th class="py-2.5 px-4 font-semibold">Amount</th>
                                    <th class="py-2.5 px-4 font-semibold">Monthly EMI</th>
                                    <th class="py-2.5 px-4 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                                ${debts.map(d => `
                                    <tr>
                                        <td class="py-2.5 px-4 font-medium text-gray-800 dark:text-white/90">${d.lender_name}</td>
                                        <td class="py-2.5 px-4 text-gray-500">${d.loan_type}</td>
                                        <td class="py-2.5 px-4 font-semibold">₹${Number(d.loan_amount).toLocaleString('en-IN')}</td>
                                        <td class="py-2.5 px-4 font-bold text-amber-600">₹${Number(d.monthly_emi).toLocaleString('en-IN')}</td>
                                        <td class="py-2.5 px-4"><span class="px-2 py-0.5 text-[10px] font-semibold rounded bg-green-50 text-green-600">${d.loan_status || 'active'}</span></td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        `;
    },

    // Tab 2: AI Fraud & Underwriting Audit
    renderAiAuditTab(ai, app) {
        const pane = document.getElementById("pane-ai_audit");
        if (!pane) return;

        if (!ai) {
            pane.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <i class="fa-solid fa-spinner animate-spin text-2xl mb-2 text-brand-500"></i>
                    <p class="text-sm font-semibold">AI Underwriting Evaluation In Progress</p>
                </div>
            `;
            return;
        }

        const score = ai.fraudRiskScore || 0;
        const isHighRisk = ai.isScamSuspected || score >= 60;
        const foir = ai.financialCapacity?.foirPercentage || 0;
        const foirSafe = foir <= 50;

        pane.innerHTML = `
            <div class="space-y-6">
                <!-- AI Verdict Banner -->
                <div class="p-4 rounded-2xl border ${ai.overallVerdict?.verdict === 'approved' 
                    ? 'bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-800'
                    : ai.overallVerdict?.verdict === 'counter_offer'
                    ? 'bg-purple-50 border-purple-200 dark:bg-purple-500/10 dark:border-purple-800'
                    : 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-800'}">
                    <div class="flex items-start gap-3">
                        <div class="p-2.5 rounded-xl ${ai.overallVerdict?.verdict === 'approved' ? 'bg-green-600 text-white' : ai.overallVerdict?.verdict === 'counter_offer' ? 'bg-purple-600 text-white' : 'bg-red-600 text-white'}">
                            <i class="fa-solid fa-robot text-lg"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="font-bold text-sm capitalize ${ai.overallVerdict?.verdict === 'approved' ? 'text-green-900 dark:text-green-300' : ai.overallVerdict?.verdict === 'counter_offer' ? 'text-purple-900 dark:text-purple-300' : 'text-red-900 dark:text-red-300'}">
                                AI Recommendation: ${ai.overallVerdict?.verdict?.replace('_', ' ')}
                            </h4>
                            <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">${ai.overallVerdict?.summary || 'Review complete.'}</p>
                        </div>
                    </div>
                </div>

                <!-- 3 Pillars Grid -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <!-- Fraud Score -->
                    <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Fraud Risk Score</span>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isHighRisk ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}">
                                ${isHighRisk ? 'SCAM FLAGGED' : 'GENUINE'}
                            </span>
                        </div>
                        <div class="text-2xl font-extrabold ${isHighRisk ? 'text-red-600' : 'text-green-600'}">
                            ${score}<span class="text-xs font-normal text-gray-400">/100</span>
                        </div>
                        <div class="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden mt-3">
                            <div class="h-full ${isHighRisk ? 'bg-red-500' : score >= 25 ? 'bg-amber-500' : 'bg-green-500'}" style="width: ${Math.min(100, score)}%"></div>
                        </div>
                        <div class="mt-3 text-xs text-gray-500">
                            <strong>Doc Authenticity:</strong> <span class="capitalize font-semibold text-gray-800 dark:text-gray-200">${ai.documentAuthenticityVerdict || 'verified'}</span>
                        </div>
                    </div>

                    <!-- FOIR -->
                    <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Calculated FOIR</span>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${foirSafe ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}">
                                ${foirSafe ? 'SAFE (<=50%)' : 'EXCEEDED (>50%)'}
                            </span>
                        </div>
                        <div class="text-2xl font-extrabold ${foirSafe ? 'text-green-600' : 'text-red-600'}">
                            ${foir.toFixed(1)}<span class="text-xs font-normal text-gray-400">%</span>
                        </div>
                        <div class="mt-3 text-xs text-gray-500 space-y-1">
                            <div>Proposed EMI: <strong>₹${Number(ai.financialCapacity?.calculatedProposedEmi || 0).toLocaleString('en-IN')}/mo</strong></div>
                            <div>Sanctionable: <strong class="${ai.financialCapacity?.isAmountSanctionable ? 'text-green-600' : 'text-red-600'}">${ai.financialCapacity?.isAmountSanctionable ? 'Yes' : 'No'}</strong></div>
                        </div>
                    </div>

                    <!-- Purpose Sanity -->
                    <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Purpose Sanity</span>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${ai.purposeSanity?.verdict === 'aligned' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}">
                                ${ai.purposeSanity?.verdict?.toUpperCase() || 'ALIGNED'}
                            </span>
                        </div>
                        <div class="text-xs font-medium text-gray-700 dark:text-gray-300 mt-2">
                            "${ai.purposeSanity?.notes || 'Stated purpose aligns logically with loan category.'}"
                        </div>
                    </div>
                </div>

                <!-- Counter-Offer Banner (if proposed) -->
                ${ai.counterOffer?.proposed ? `
                    <div class="p-4 rounded-2xl border border-purple-200 dark:border-purple-800/80 bg-purple-50/60 dark:bg-purple-950/20">
                        <div class="flex items-center justify-between mb-3">
                            <h4 class="font-bold text-xs text-purple-900 dark:text-purple-300 uppercase tracking-wider flex items-center gap-2">
                                <i class="fa-solid fa-arrows-split-up-and-left text-purple-600"></i> AI Automated Counter-Offer
                            </h4>
                            <button 
                                onclick="operatorApp.applyCounterOfferTerms()" 
                                class="px-3 py-1 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all cursor-pointer">
                                Adopt Terms
                            </button>
                        </div>
                        <div class="grid grid-cols-3 gap-3 text-xs mb-2">
                            <div class="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900/50">
                                <div class="text-[10px] text-gray-400">Amount</div>
                                <div class="text-sm font-bold text-purple-700 dark:text-purple-300">₹${Number(ai.counterOffer.amount).toLocaleString('en-IN')}</div>
                            </div>
                            <div class="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900/50">
                                <div class="text-[10px] text-gray-400">Tenure</div>
                                <div class="text-sm font-bold text-purple-700 dark:text-purple-300">${ai.counterOffer.tenureMonths} Mo.</div>
                            </div>
                            <div class="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900/50">
                                <div class="text-[10px] text-gray-400">Safe EMI</div>
                                <div class="text-sm font-bold text-purple-700 dark:text-purple-300">₹${Number(ai.counterOffer.emi).toLocaleString('en-IN')}/mo</div>
                            </div>
                        </div>
                        <p class="text-xs text-purple-800 dark:text-purple-300/80">${ai.counterOffer.reason}</p>
                    </div>
                ` : ''}

                <!-- Observations -->
                <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
                    <h5 class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Integrity Observations</h5>
                    <p class="text-xs text-gray-600 dark:text-gray-300">
                        ${ai.documentIntegrityDetails?.observations || 'All KYC documents and income records verified against bank benchmarks.'}
                    </p>
                </div>
            </div>
        `;
    },

    // Tab 3: Documents Review
    renderDocumentsTab(docs) {
        const pane = document.getElementById("pane-documents");
        if (!pane) return;

        if (docs.length === 0) {
            pane.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <i class="fa-solid fa-file-slash text-2xl mb-2 text-gray-400"></i>
                    <p class="text-xs">No KYC documents uploaded by this applicant.</p>
                </div>
            `;
            return;
        }

        pane.innerHTML = `
            <div class="space-y-3">
                ${docs.map(doc => {
                    const isVerified = doc.verification_status === "verified";
                    const isRejected = doc.verification_status === "rejected";
                    const fileUrl = `http://localhost:3000/${doc.storage_key}`;

                    return `
                        <div class="flex items-center justify-between p-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl flex items-center justify-center ${doc.mime_type?.includes('pdf') ? 'bg-red-50 text-red-500 dark:bg-red-500/15' : 'bg-blue-50 text-blue-500 dark:bg-blue-500/15'}">
                                    <i class="fa-solid ${doc.mime_type?.includes('pdf') ? 'fa-file-pdf' : 'fa-file-image'} text-base"></i>
                                </div>
                                <div>
                                    <div class="font-bold text-xs text-gray-800 dark:text-white/90 capitalize flex items-center gap-2">
                                        ${doc.document_type}
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isVerified ? 'bg-green-50 text-green-600' : isRejected ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}">
                                            ${doc.verification_status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div class="text-[11px] text-gray-400">${doc.file_name || 'Uploaded Document'}</div>
                                    ${doc.reviewer_remarks ? `<div class="text-[11px] text-gray-400 italic">"${doc.reviewer_remarks}"</div>` : ''}
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <a href="${fileUrl}" target="_blank" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors">
                                    <i class="fa-solid fa-eye text-[11px]"></i> View
                                </a>
                                <button 
                                    onclick="operatorApp.updateDocumentStatus(${doc.id}, 'verified')" 
                                    class="px-3 py-1.5 rounded-lg text-xs font-semibold ${isVerified ? 'bg-green-600 text-white cursor-default' : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-500/15 dark:text-green-400'} transition-colors cursor-pointer">
                                    <i class="fa-solid fa-check text-[11px]"></i> ${isVerified ? 'Verified' : 'Verify'}
                                </button>
                                <button 
                                    onclick="operatorApp.promptRejectDocument(${doc.id})" 
                                    class="px-3 py-1.5 rounded-lg text-xs font-semibold ${isRejected ? 'bg-red-600 text-white cursor-default' : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/15 dark:text-red-400'} transition-colors cursor-pointer">
                                    <i class="fa-solid fa-xmark text-[11px]"></i> Reject
                                </button>
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    },

    // Tab 4: Sanction & Disbursement
    renderSanctionTab(app, ai, banks) {
        const pane = document.getElementById("pane-sanction");
        if (!pane) return;

        const defaultAmount = app.sanctioned_amount || ai?.counterOffer?.amount || app.requested_amount;
        const defaultTenure = app.sanctioned_tenure_months || ai?.counterOffer?.tenureMonths || app.requested_tenure_months;
        const defaultRate = app.sanctioned_interest_rate || app.loanProduct?.minInterestRate || 10.5;

        const isDisbursed = app.status === "disbursed";
        const primaryBank = banks.find(b => b.is_primary) || banks[0];

        pane.innerHTML = `
            <div class="space-y-5">
                <!-- Disbursement Bank Card -->
                <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
                    <h5 class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                        <i class="fa-solid fa-building-columns text-brand-500"></i> Target Bank Account
                    </h5>
                    ${primaryBank ? `
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400 flex items-center justify-center font-bold text-sm">
                                    <i class="fa-solid fa-bank"></i>
                                </div>
                                <div>
                                    <div class="font-bold text-sm text-gray-800 dark:text-white/90">${primaryBank.bank_name}</div>
                                    <div class="text-xs text-gray-400 font-mono">A/C: ${primaryBank.account_number} • IFSC: ${primaryBank.ifsc_code}</div>
                                    <div class="text-xs text-gray-500">Beneficiary: ${primaryBank.account_holder_name}</div>
                                </div>
                            </div>
                            <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400">
                                PRIMARY
                            </span>
                        </div>
                    ` : `
                        <div class="text-amber-600 text-xs">No registered bank account found for applicant.</div>
                    `}
                </div>

                <!-- Sanction Terms Input Form -->
                <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
                    <h5 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-file-signature text-brand-500"></i> Final Sanction & Offer Terms
                    </h5>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Sanction Amount (₹)</label>
                            <input 
                                type="number" 
                                id="input-sanction-amount" 
                                value="${defaultAmount}" 
                                oninput="operatorApp.calculateLiveEmi()" 
                                class="w-full px-3 py-2 text-sm font-bold rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                                ${isDisbursed ? 'disabled' : ''}
                            />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Tenure (Months)</label>
                            <input 
                                type="number" 
                                id="input-sanction-tenure" 
                                value="${defaultTenure}" 
                                oninput="operatorApp.calculateLiveEmi()" 
                                class="w-full px-3 py-2 text-sm font-bold rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                                ${isDisbursed ? 'disabled' : ''}
                            />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Interest Rate (% p.a.)</label>
                            <input 
                                type="number" 
                                step="0.1" 
                                id="input-sanction-rate" 
                                value="${defaultRate}" 
                                oninput="operatorApp.calculateLiveEmi()" 
                                class="w-full px-3 py-2 text-sm font-bold rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                                ${isDisbursed ? 'disabled' : ''}
                            />
                        </div>
                    </div>

                    <!-- Computed EMI -->
                    <div class="p-3 bg-brand-50 dark:bg-brand-500/10 rounded-xl flex items-center justify-between mb-4">
                        <span class="text-xs text-brand-700 dark:text-brand-300 font-semibold">Calculated Monthly EMI:</span>
                        <span id="live-emi-display" class="text-base font-extrabold text-brand-600 dark:text-brand-400 font-mono">₹0 / month</span>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Underwriter Remarks</label>
                        <textarea 
                            id="input-sanction-remarks" 
                            rows="2" 
                            placeholder="Add underwriting decision notes..." 
                            class="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                            ${isDisbursed ? 'disabled' : ''}>${app.operatorRemarks || ''}</textarea>
                    </div>

                    <!-- Actions -->
                    <div class="mt-6 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
                        ${isDisbursed ? `
                            <div class="w-full text-center py-2 text-green-600 font-bold text-xs bg-green-50 rounded-xl">
                                <i class="fa-solid fa-circle-check"></i> Disbursed on ${new Date(app.disbursedAt).toLocaleDateString()} (Ref: ${app.disbursementRef})
                            </div>
                        ` : `
                            <button 
                                onclick="operatorApp.submitDecision('reject')" 
                                class="px-4 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer">
                                <i class="fa-solid fa-ban"></i> Reject Application
                            </button>

                            <div class="flex items-center gap-3">
                                <button 
                                    onclick="operatorApp.submitDecision('approve')" 
                                    class="px-4 py-2 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer">
                                    <i class="fa-solid fa-stamp"></i> Sanction Only
                                </button>
                                <button 
                                    onclick="operatorApp.submitDisbursement()" 
                                    class="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all shadow-md shadow-green-600/20 cursor-pointer">
                                    <i class="fa-solid fa-paper-plane"></i> Sanction & Disburse to Bank
                                </button>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;

        this.calculateLiveEmi();
    },

    // Calculate live EMI
    calculateLiveEmi() {
        const amountEl = document.getElementById("input-sanction-amount");
        const tenureEl = document.getElementById("input-sanction-tenure");
        const rateEl = document.getElementById("input-sanction-rate");
        const displayEl = document.getElementById("live-emi-display");

        if (!amountEl || !tenureEl || !rateEl || !displayEl) return;

        const p = parseFloat(amountEl.value) || 0;
        const n = parseInt(tenureEl.value, 10) || 1;
        const rAnnual = parseFloat(rateEl.value) || 0;
        const rMonthly = (rAnnual / 12) / 100;

        let emi = 0;
        if (rMonthly > 0 && n > 0 && p > 0) {
            const factor = Math.pow(1 + rMonthly, n);
            emi = Math.round((p * rMonthly * factor) / (factor - 1));
        } else if (n > 0) {
            emi = Math.round(p / n);
        }

        displayEl.textContent = `₹${emi.toLocaleString('en-IN')} / month`;
    },

    // Adopt counter offer terms
    applyCounterOfferTerms() {
        if (!this.activeDossier?.aiEvaluation?.counterOffer) return;
        const co = this.activeDossier.aiEvaluation.counterOffer;
        this.switchTab("sanction");

        setTimeout(() => {
            const amountEl = document.getElementById("input-sanction-amount");
            const tenureEl = document.getElementById("input-sanction-tenure");
            if (amountEl && co.amount) amountEl.value = co.amount;
            if (tenureEl && co.tenureMonths) tenureEl.value = co.tenureMonths;
            this.calculateLiveEmi();
        }, 100);
    },

    // Verify KYC document
    async updateDocumentStatus(documentId, status, remarks = null) {
        const token = localStorage.getItem("fincentrix_token");
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/operator/documents/${documentId}/verify`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ status, remarks })
            });
            const data = await res.json();
            if (res.ok) {
                if (this.activeDossier) {
                    await this.openDossier(this.activeDossier.application.id);
                    this.switchTab("documents");
                }
            } else {
                alert(data.message || "Failed to update document.");
            }
        } catch (e) {
            console.error(e);
        }
    },

    // Prompt reject
    promptRejectDocument(documentId) {
        const remarks = prompt("Please provide a reason for rejecting this document:");
        if (remarks) {
            this.updateDocumentStatus(documentId, "rejected", remarks);
        }
    },

    // Submit Decision
    async submitDecision(decision) {
        if (!this.activeDossier) return;
        const token = localStorage.getItem("fincentrix_token");
        const appId = this.activeDossier.application.id;

        const amount = document.getElementById("input-sanction-amount")?.value;
        const tenure = document.getElementById("input-sanction-tenure")?.value;
        const rate = document.getElementById("input-sanction-rate")?.value;
        const remarks = document.getElementById("input-sanction-remarks")?.value;

        if (decision === "reject" && !confirm("Are you sure you want to reject this loan application?")) {
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/operator/applications/${appId}/decide`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    decision,
                    sanctioned_amount: amount,
                    sanctioned_tenure_months: tenure,
                    sanctioned_interest_rate: rate,
                    remarks
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                await this.openDossier(appId);
                await this.loadDashboardData();
            } else {
                alert(data.message || "Decision submission failed.");
            }
        } catch (e) {
            console.error(e);
        }
    },

    // Submit Disbursement
    async submitDisbursement() {
        if (!this.activeDossier) return;
        const token = localStorage.getItem("fincentrix_token");
        const appId = this.activeDossier.application.id;
        const remarks = document.getElementById("input-sanction-remarks")?.value;

        if (!confirm("Confirm sanction and execute bank fund disbursement?")) {
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/operator/applications/${appId}/disburse`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ remarks })
            });

            const data = await res.json();
            if (res.ok) {
                alert(`SUCCESS! ₹${data.data?.disbursedAmount?.toLocaleString('en-IN')} successfully disbursed! Transaction Ref: ${data.data?.disbursementRef}`);
                await this.openDossier(appId);
                await this.loadDashboardData();
            } else {
                alert(data.message || "Disbursement failed.");
            }
        } catch (e) {
            console.error(e);
        }
    }
};

// Auto-run on DOM ready
document.addEventListener("DOMContentLoaded", () => {
    window.operatorApp.init();
});
