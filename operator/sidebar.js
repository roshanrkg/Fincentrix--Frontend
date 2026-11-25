/**
 * Fincentrix Operator Console - Global Sidebar Component
 * File: fincentrix.01/operator/sidebar.js
 * Maintains unified, responsive, dynamic sidebar navigation across all operator pages.
 */

(function () {
  "use strict";

  const SidebarNav = {
    init() {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.render());
      } else {
        this.render();
      }
    },

    getCurrentPage() {
      const path = window.location.pathname;
      const file = path.substring(path.lastIndexOf("/") + 1) || "index.html";
      const params = new URLSearchParams(window.location.search);
      return { file, status: params.get("status"), risk: params.get("risk") };
    },

    render() {
      const aside = document.querySelector("aside.sidebar") || document.getElementById("sidebar");
      if (!aside) return;

      // Ensure aside has proper TailAdmin classes & attributes
      aside.id = "sidebar";
      aside.setAttribute("aria-label", "Operator Console Navigation");

      const current = this.getCurrentPage();
      const isIndex = current.file === "index.html" || current.file === "";
      const isProfile = current.file === "profile.html";
      const isAnalytics = current.file === "analytics.html";

      // Ensure brand-logo system is loaded
      if (!window.FincentrixBrand && !document.querySelector('script[src*="brand-logo.js"]')) {
        const brandScript = document.createElement("script");
        brandScript.src = "brand-logo.js";
        document.head.appendChild(brandScript);
      }

      const logoHtml = window.FincentrixBrand
        ? FincentrixBrand.renderLogo({ href: 'index.html', badge: 'Operator Console', size: 'md' })
        : `<fincentrix-logo href="index.html" badge="Operator Console" size="md"></fincentrix-logo>`;

      aside.innerHTML = `
        <!-- Sidebar Brand Header -->
        <div class="sidebar-header flex items-center justify-between gap-2 py-5 border-b border-gray-100 dark:border-gray-800">
          ${logoHtml}
          <!-- Close toggle for mobile screens -->
          <button 
            type="button" 
            @click="sidebarToggle = false" 
            class="xl:hidden flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Close Sidebar"
          >
            <i class="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        <!-- Sidebar Navigation Menu -->
        <div class="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear py-4 flex-1">
          <nav>
            <!-- SECTION 1: WORKSTATION -->
            <div class="mb-4">
              <h3 class="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Workstation
              </h3>
              <ul class="flex flex-col gap-1">
                <!-- Underwriting Queue -->
                <li>
                  <a 
                    href="index.html" 
                    class="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                      isIndex && !current.status && !current.risk
                        ? "bg-brand-50 text-brand-600 font-semibold shadow-theme-xs dark:bg-brand-500/15 dark:text-brand-400"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
                    }"
                  >
                    <i class="fa-solid fa-table-list text-sm w-4 text-center"></i>
                    <span>Underwriting Queue</span>
                    <span 
                      id="sidebar-queue-badge" 
                      class="ml-auto inline-flex items-center justify-center rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"
                    >
                      0
                    </span>
                  </a>
                </li>

                <!-- Pending Review Filter -->
                <li>
                  <a 
                    href="javascript:void(0)" 
                    onclick="window.sidebarNav.navigateFilter('status', 'pending')"
                    class="group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                      isIndex && current.status === "pending"
                        ? "bg-brand-50 text-brand-600 font-semibold dark:bg-brand-500/15 dark:text-brand-400"
                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                    }"
                  >
                    <i class="fa-solid fa-clock-rotate-left text-xs w-4 text-center text-amber-500"></i>
                    <span>Pending Review</span>
                  </a>
                </li>

                <!-- Sanctioned Loans -->
                <li>
                  <a 
                    href="javascript:void(0)" 
                    onclick="window.sidebarNav.navigateFilter('status', 'sanctioned')"
                    class="group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                      isIndex && current.status === "sanctioned"
                        ? "bg-brand-50 text-brand-600 font-semibold dark:bg-brand-500/15 dark:text-brand-400"
                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                    }"
                  >
                    <i class="fa-solid fa-stamp text-xs w-4 text-center text-indigo-500"></i>
                    <span>Sanctioned Offers</span>
                  </a>
                </li>

                <!-- Disbursed Loans -->
                <li>
                  <a 
                    href="javascript:void(0)" 
                    onclick="window.sidebarNav.navigateFilter('status', 'disbursed')"
                    class="group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                      isIndex && current.status === "disbursed"
                        ? "bg-brand-50 text-brand-600 font-semibold dark:bg-brand-500/15 dark:text-brand-400"
                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                    }"
                  >
                    <i class="fa-solid fa-circle-check text-xs w-4 text-center text-green-500"></i>
                    <span>Disbursed Loans</span>
                  </a>
                </li>
              </ul>
            </div>

            <!-- SECTION 2: RISK & SURVEILLANCE -->
            <div class="mb-4">
              <h3 class="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Surveillance & Risk
              </h3>
              <ul class="flex flex-col gap-1">
                <!-- High-Risk Triage -->
                <li>
                  <a 
                    href="javascript:void(0)" 
                    onclick="window.sidebarNav.navigateFilter('risk', 'high')"
                    class="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                      isIndex && current.risk === "high"
                        ? "bg-red-50 text-red-600 font-semibold dark:bg-red-500/15 dark:text-red-400"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
                    }"
                  >
                    <i class="fa-solid fa-triangle-exclamation text-sm w-4 text-center text-red-500"></i>
                    <span>Scam & High Risk</span>
                    <span 
                      id="sidebar-risk-badge" 
                      class="ml-auto inline-flex items-center justify-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-400"
                    >
                      0
                    </span>
                  </a>
                </li>
              </ul>
            </div>

            <!-- SECTION 3: SYSTEM & ACCOUNT -->
            <div class="mb-2">
              <h3 class="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Account & Portal
              </h3>
              <ul class="flex flex-col gap-1">
                <!-- Customer Portal Link -->
                <li>
                  <a 
                    href="../index.html" 
                    target="_blank"
                    class="group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white transition-all"
                  >
                    <i class="fa-solid fa-arrow-up-right-from-square text-xs w-4 text-center"></i>
                    <span>Customer Portal</span>
                  </a>
                </li>

                <!-- Sign Out -->
                <li>
                  <a 
                    href="javascript:void(0)" 
                    onclick="handleSignOut()"
                    class="group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-all cursor-pointer"
                  >
                    <i class="fa-solid fa-right-from-bracket text-xs w-4 text-center"></i>
                    <span>Sign Out</span>
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <!-- Sidebar Footer / Operator Profile Card -->
        <div class="pt-4 pb-4 border-t border-gray-100 dark:border-gray-800">
          <div class="flex items-center gap-3 p-2 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-gray-800">
            <div class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white font-bold text-sm shadow-theme-xs">
              <span id="sidebar-operator-avatar">OP</span>
              <span class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-gray-900"></span>
            </div>
            <div class="overflow-hidden">
              <div id="sidebar-operator-name" class="truncate text-xs font-bold text-gray-800 dark:text-white/90">
                Operator
              </div>
              <div id="sidebar-operator-spec" class="truncate text-[10px] text-brand-600 dark:text-brand-400 font-semibold">
                Underwriting Officer
              </div>
            </div>
          </div>
        </div>
      `;

      // Apply initial user info from localStorage if available
      this.populateCachedUser();
    },

    navigateFilter(type, value) {
      if (window.operatorApp && typeof window.operatorApp.setFilter === "function") {
        window.operatorApp.setFilter(type, value);
      } else {
        window.location.href = `index.html?${type}=${value}`;
      }
    },

    populateCachedUser() {
      try {
        const user = JSON.parse(localStorage.getItem("fincentrix_user"));
        if (user) {
          const nameEl = document.getElementById("sidebar-operator-name");
          const avatarEl = document.getElementById("sidebar-operator-avatar");
          if (nameEl) nameEl.textContent = `${user.fname || ""} ${user.lname || ""}`.trim() || user.name || "Operator";
          if (avatarEl) {
            const initials = `${(user.fname || "O")[0]}${(user.lname || "P")[0]}`.toUpperCase();
            avatarEl.textContent = initials;
          }
        }
      } catch (e) {}
    },

    updateBadges(data) {
      if (!data) return;
      const q = data.myQueue || data;

      const queueBadge = document.getElementById("sidebar-queue-badge");
      const riskBadge = document.getElementById("sidebar-risk-badge");

      if (queueBadge && q.pending !== undefined) {
        queueBadge.textContent = q.pending;
      }
      if (riskBadge && q.highRiskAlerts !== undefined) {
        riskBadge.textContent = q.highRiskAlerts;
      }

      if (data.operator) {
        const nameEl = document.getElementById("sidebar-operator-name");
        const avatarEl = document.getElementById("sidebar-operator-avatar");
        const specEl = document.getElementById("sidebar-operator-spec");

        if (nameEl && data.operator.name) nameEl.textContent = data.operator.name;
        if (avatarEl && data.operator.name) {
          const parts = data.operator.name.split(" ");
          avatarEl.textContent = `${parts[0]?.[0] || "O"}${parts[1]?.[0] || "P"}`.toUpperCase();
        }
        if (specEl && data.specializations && data.specializations.length > 0) {
          const specs = [...new Set(data.specializations.map(s => s.loan_name || s.loan_category))];
          specEl.textContent = specs.join(", ");
        }
      }
    }
  };

  window.sidebarNav = SidebarNav;
  SidebarNav.init();
})();
