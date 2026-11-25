/**
 * Fincentrix - Shared Universal Sidebar Component
 * sidebar.js
 * 
 * Automatically mounts the unified sidebar across all Fincentrix pages,
 * detects the active page tab, loads the live user profile, fetches the
 * real-time application count badge, and wires mobile navigation and logout.
 */

(function () {
    "use strict";

    const API_BASE = "http://localhost:3000/api";

    // 1. Detect Active Page Tab
    function getActiveTab() {
        const mount = document.getElementById("sidebar-container") || document.getElementById("sidebar-mount");
        if (mount && mount.dataset.active) {
            return mount.dataset.active.toLowerCase();
        }

        const path = window.location.pathname.toLowerCase();
        if (path.includes("loans.html") || path.includes("loan.html")) return "loans";
        if (path.includes("applications.html") || path.includes("application.html")) return "applications";
        if (path.includes("profile.html")) return "profile";
        if (path.includes("settings.html")) return "settings";
        return "dashboard";
    }

    // 2. Build Sidebar HTML Template
    function buildSidebarHtml(activeTab, user, appsCount) {
        const fname = user?.fname || "";
        const lname = user?.lname || "";
        const fullName = `${fname} ${lname}`.trim() || "User Profile";
        const initials = ((fname.charAt(0) || "F") + (lname.charAt(0) || "X")).toUpperCase();
        const role = user?.role === "admin" ? "Administrator" : "User";
        const profileImg = user?.profile_image
            ? (user.profile_image.startsWith("http") ? user.profile_image : `http://localhost:3000/${user.profile_image.replace(/^\/+/, '')}`)
            : null;
        const avatarStyle = profileImg
            ? `style="background-image: url('${profileImg}'); background-size: cover; background-position: center;"`
            : "";
        const avatarContent = profileImg ? "" : initials;

        const isDash = activeTab === "dashboard";
        const isLoans = activeTab === "loans";
        const isApps = activeTab === "applications";
        const isProfile = activeTab === "profile";
        const isSettings = activeTab === "settings";
        const sidebarDesktopClass = isApps ? "lg:translate-x-0" : "sm:translate-x-0";
        const sidebarCloseClass = isApps ? "lg:hidden" : "sm:hidden";

        const baseLinkClass = "nav-link relative flex h-[48px] items-center gap-[14px] rounded-xl px-[14px] text-[13px] font-medium transition-all duration-300 border group";
        const activeLinkClass = "active text-white border-primary/40";
        const inactiveLinkClass = "text-[#a3b1ca] border-transparent hover:text-white hover:bg-[#315cff]/[0.08] hover:border-[#315cff]/25";

        // Ensure brand-logo system is loaded
        if (!window.FincentrixBrand && !document.querySelector('script[src*="brand-logo.js"]')) {
            const brandScript = document.createElement("script");
            brandScript.src = "brand-logo.js";
            document.head.appendChild(brandScript);
        }

        const brandLogoHtml = window.FincentrixBrand
            ? FincentrixBrand.renderLogo({ href: 'dashboard2.html', theme: 'dark', size: 'md' })
            : `<fincentrix-logo href="dashboard2.html" theme="dark" size="md"></fincentrix-logo>`;

        return `
        <!-- =========================================
             SHARED UNIVERSAL SIDEBAR
        ========================================== -->
        <aside id="sidebar"
            class="sidebar fixed top-0 left-0 z-[100] h-screen w-[265px] -translate-x-full ${sidebarDesktopClass} [&.active]:translate-x-0 transition-transform duration-300 ease-out bg-navy-darker border-r border-white/10 flex flex-col justify-between p-5 text-white shadow-2xl">

            <div class="sidebar-top flex flex-col">
                <!-- BRAND HEADER -->
                <div class="sidebar-header flex items-center justify-between pb-5 border-b border-white/10">
                    ${brandLogoHtml}

                    <button id="sidebarClose" class="sidebar-close ${sidebarCloseClass} grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-white/70 hover:text-white cursor-pointer" aria-label="Close menu">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <!-- NAVIGATION LINKS -->
                <nav class="sidebar-nav mt-6 flex flex-col gap-1.5" aria-label="Main Navigation">
                    <a href="dashboard2.html" class="${baseLinkClass} ${isDash ? activeLinkClass : inactiveLinkClass}" data-page="home">
                        <i class="fa-solid fa-house text-base w-[20px] text-center ${isDash ? 'text-primary-light' : ''}"></i>
                        <span>Dashboard</span>
                    </a>

                    <a href="loans.html" class="${baseLinkClass} ${isLoans ? activeLinkClass : inactiveLinkClass}" data-page="loans">
                        <i class="fa-solid fa-hand-holding-dollar text-base w-[20px] text-center ${isLoans ? 'text-primary-light' : ''}"></i>
                        <span>Loan Products</span>
                        <span class="nav-count ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white">
                            10
                        </span>
                    </a>

                    <a href="applications.html" class="${baseLinkClass} ${isApps ? activeLinkClass : inactiveLinkClass}" data-page="applications">
                        <i class="fa-solid fa-list-check text-base w-[20px] text-center ${isApps ? 'text-primary-light' : ''}"></i>
                        <span>My Applications</span>
                        <span id="sidebarApplicationsBadge" class="nav-count ml-auto rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 text-[10px] font-bold ${appsCount > 0 ? '' : 'hidden'}">
                            ${appsCount > 0 ? String(appsCount).padStart(2, '0') : '0'}
                        </span>
                    </a>

                    <a href="profile.html" class="${baseLinkClass} ${isProfile ? activeLinkClass : inactiveLinkClass}" data-page="profile">
                        <i class="fa-solid fa-user text-base w-[20px] text-center ${isProfile ? 'text-primary-light' : ''}"></i>
                        <span>My Profile</span>
                    </a>

                    <a href="dashboard2.html#loanTypes" class="${baseLinkClass} ${isSettings ? activeLinkClass : inactiveLinkClass}" data-page="settings">
                        <i class="fa-solid fa-gear text-base w-[20px] text-center ${isSettings ? 'text-primary-light' : ''}"></i>
                        <span>Settings</span>
                    </a>
                </nav>
            </div>

            <!-- SIDEBAR FOOTER -->
            <div class="sidebar-footer flex flex-col gap-4">
                <!-- USER PROFILE -->
                <div class="user-profile flex items-center gap-[11px] border-t border-white/10 pt-[17px]">
                    <div id="sidebarUserAvatar" class="user-avatar grid h-[39px] w-[39px] shrink-0 place-items-center rounded-full border-2 border-white/10 bg-gradient-to-br from-[#4778ff] to-[#2449c9] text-[11px] font-bold text-white uppercase overflow-hidden" ${avatarStyle}>
                        ${avatarContent}
                    </div>
                    <div class="user-info min-w-0 flex-1">
                        <h4 id="sidebarUserName" class="text-[11px] font-bold text-white truncate" title="${fullName}">
                            ${fullName}
                        </h4>
                        <p id="sidebarUserRole" class="mt-0.5 text-[9px] text-[#8295b4] truncate">
                            ${role}
                        </p>
                    </div>
                    <button id="logoutButton"
                        class="profile-button ml-auto border-0 bg-transparent text-[#9baecc] hover:text-red-400 transition-colors cursor-pointer text-sm font-semibold p-1.5 rounded-lg hover:bg-white/5"
                        title="Log Out"
                        aria-label="Log Out">
                        <i class="fa-solid fa-arrow-right-from-bracket"></i>
                    </button>
                </div>
            </div>
        </aside>

        <!-- SIDEBAR OVERLAY FOR MOBILE -->
        <div id="sidebarOverlay" class="sidebar-overlay fixed inset-0 z-[90] bg-[#050f23]/60 opacity-0 invisible transition-all duration-300 [&.active]:opacity-100 [&.active]:visible ${sidebarCloseClass}"></div>
        `;
    }

    // 3. Mount and Wire Events
    function mountSidebar() {
        let mount = document.getElementById("sidebar-container") || document.getElementById("sidebar-mount");

        // If an existing static <aside id="sidebar"> is present, wrap or replace its position
        if (!mount) {
            const existingSidebar = document.getElementById("sidebar");
            const existingOverlay = document.getElementById("sidebarOverlay");
            if (existingSidebar) {
                mount = document.createElement("div");
                mount.id = "sidebar-container";
                existingSidebar.parentNode.insertBefore(mount, existingSidebar);
                existingSidebar.remove();
                if (existingOverlay) existingOverlay.remove();
            }
        }

        if (!mount) return;

        // Read cached user session if available
        let cachedUser = null;
        try {
            cachedUser = JSON.parse(localStorage.getItem("fincentrix_user"));
        } catch (e) {}

        const activeTab = getActiveTab();
        mount.innerHTML = buildSidebarHtml(activeTab, cachedUser, 0);

        wireSidebarInteractions();
        syncSidebarData();
    }

    // 4. Wire Interactions: Mobile Drawer & Logout
    function wireSidebarInteractions() {
        const sidebar = document.getElementById("sidebar");
        const sidebarOverlay = document.getElementById("sidebarOverlay");
        const menuButton = document.getElementById("menuButton");
        const sidebarClose = document.getElementById("sidebarClose");
        const logoutButton = document.getElementById("logoutButton");

        function openSidebar() {
            if (!sidebar) return;
            sidebar.classList.add("active");
            sidebarOverlay?.classList.add("active", "opacity-100", "visible");
            sidebarOverlay?.classList.remove("opacity-0", "invisible");
            document.body.classList.add("overflow-hidden");
        }

        function closeSidebar() {
            if (!sidebar) return;
            sidebar.classList.remove("active");
            sidebarOverlay?.classList.remove("active", "opacity-100", "visible");
            sidebarOverlay?.classList.add("opacity-0", "invisible");
            document.body.classList.remove("overflow-hidden");
        }

        if (menuButton) menuButton.onclick = openSidebar;
        if (sidebarClose) sidebarClose.onclick = closeSidebar;
        if (sidebarOverlay) sidebarOverlay.onclick = closeSidebar;

        if (logoutButton) {
            logoutButton.onclick = async function () {
                try {
                    await fetch(`${API_BASE}/auth/logout`, { method: "POST" });
                } catch (e) {}
                localStorage.removeItem("fincentrix_token");
                localStorage.removeItem("fincentrix_user");
                window.location.replace("index.html");
            };
        }
    }

    // 5. Asynchronous Data Sync (Profile + Active Applications Badge)
    async function syncSidebarData() {
        const token = localStorage.getItem("fincentrix_token");
        if (!token) return;

        try {
            // Fetch profile and applications in parallel
            const [profileRes, appsRes] = await Promise.all([
                fetch(`${API_BASE}/auth/me`, {
                    headers: { "Authorization": `Bearer ${token}` }
                }).catch(() => null),
                fetch(`${API_BASE}/loans/my-applications`, {
                    headers: { "Authorization": `Bearer ${token}` }
                }).catch(() => null)
            ]);

            // Sync User Info
            if (profileRes && profileRes.ok) {
                const profileData = await profileRes.json();
                const user = profileData.data || profileData.user;
                if (user) {
                    localStorage.setItem("fincentrix_user", JSON.stringify(user));
                    const fname = user.fname || "";
                    const lname = user.lname || "";
                    const fullName = `${fname} ${lname}`.trim() || "User Profile";
                    const initials = ((fname.charAt(0) || "F") + (lname.charAt(0) || "X")).toUpperCase();
                    const role = user.role === "admin" ? "Administrator" : "User";

                    const nameEl = document.getElementById("sidebarUserName");
                    const avatarEl = document.getElementById("sidebarUserAvatar");
                    const roleEl = document.getElementById("sidebarUserRole");
                    const topbarMobileAvatar = document.getElementById("topbarMobileAvatar");
                    const topbarUserAvatar = document.getElementById("topbarUserAvatar");

                    const profileImg = user.profile_image
                        ? (user.profile_image.startsWith("http") ? user.profile_image : `http://localhost:3000/${user.profile_image.replace(/^\/+/, '')}`)
                        : null;

                    const applyAvatar = (el) => {
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

                    if (nameEl) nameEl.textContent = fullName;
                    if (roleEl) roleEl.textContent = role;
                    applyAvatar(avatarEl);
                    applyAvatar(topbarMobileAvatar);
                    applyAvatar(topbarUserAvatar);
                }
            }

            // Sync Applications Badge
            if (appsRes && appsRes.ok) {
                const appsData = await appsRes.json();
                const apps = appsData.data || [];
                const badge = document.getElementById("sidebarApplicationsBadge");
                if (badge) {
                    if (apps.length > 0) {
                        badge.textContent = String(apps.length).padStart(2, "0");
                        badge.classList.remove("hidden");
                    } else {
                        badge.classList.add("hidden");
                    }
                }
            }

        } catch (e) {
            console.warn("Sidebar data sync error:", e);
        }
    }

    // Auto-mount immediately if DOM is ready, or on DOMContentLoaded
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mountSidebar);
    } else {
        mountSidebar();
    }

    // Export helper to window for programmatic refresh if needed
    window.FincentrixSidebar = {
        refresh: syncSidebarData,
        mount: mountSidebar
    };

})();
