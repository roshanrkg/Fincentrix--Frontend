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

    function calculateAndDisplayEligibility() {
        if (!eligibilityBadge || !eligibilityHeading || !eligibilityDescription ||
            !eligibilityAmountBox || !eligibleLoanAmount || !eligibilityActionButton) {
            return;
        }

        const income = parseFloat(currentUser.monthly_income || 0);
        const cibil = parseInt(currentUser.cibil_score || 0, 10);

        if (income > 0) {
            // Calculate pre-approved loan ceiling
            let multiplier = 20;
            if (cibil >= 750) multiplier = 35;
            else if (cibil >= 700) multiplier = 25;
            else if (cibil >= 650) multiplier = 18;

            const maxLoan = Math.round(income * multiplier);

            eligibilityBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> PROFILE VERIFIED`;
            eligibilityBadge.classList.add("bg-emerald-500/20", "border-emerald-400/40", "text-emerald-200");

            eligibilityHeading.innerHTML = `
                Congratulations, ${userFirstName}!
                <br>
                You're Loan Eligible.
            `;

            eligibilityDescription.textContent =
                `Based on your CIBIL score (${cibil || "Active"}) and verified monthly income (${formatLoanAmount(income)}), you have been pre-approved for up to:`;

            eligibilityAmountBox.classList.remove("hidden");
            eligibilityAmountBox.style.display = "block";
            eligibleLoanAmount.textContent = formatLoanAmount(maxLoan);

            eligibilityActionButton.innerHTML = `
                Explore Loan Offers
                <i class="fa-solid fa-arrow-down transition-transform duration-300 group-hover:translate-y-1"></i>
            `;
            eligibilityActionButton.addEventListener("click", (e) => {
                e.preventDefault();
                const loanSection = document.getElementById("loanTypes");
                if (loanSection) {
                    loanSection.scrollIntoView({ behavior: "smooth" });
                }
            });

        } else {
            // Profile incomplete or no income recorded
            eligibilityBadge.textContent = "VERIFICATION PENDING";
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
            eligibilityActionButton.addEventListener("click", (e) => {
                e.preventDefault();
                const loanSection = document.getElementById("loanTypes");
                if (loanSection) {
                    loanSection.scrollIntoView({ behavior: "smooth" });
                }
            });
        }
    }

    calculateAndDisplayEligibility();

    // =============================================
    // 06. FETCH & RENDER DYNAMIC LOAN PRODUCTS
    // =============================================

    async function loadLoanCatalog() {
        if (!loanCardGrid) return;

        try {
            const response = await fetch(`${API_BASE_URL}/loans/catalog`);
            const result = await response.json();

            if (!response.ok || !result.success || !Array.isArray(result.data)) {
                console.warn("Could not load dynamic loans catalog:", result.message);
                return;
            }

            const products = result.data;

            if (loanProductsCount) {
                loanProductsCount.textContent = `${products.length} PRODUCTS`;
            }

            // Generate card markup
            loanCardGrid.innerHTML = products.map(product => {
                const badgeHtml = product.badge
                    ? `<span class="popular-badge absolute top-2 right-2 z-[3] px-2 py-1 rounded-full bg-[#e4f8f0] text-[#168778] text-[8px] font-extrabold uppercase">${product.badge}</span>`
                    : "";

                const benefits = Array.isArray(product.benefits_tags)
                    ? product.benefits_tags.map(tag => `<span>${tag}</span>`).join("")
                    : "";

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
                                    Apply Now <span>→</span>
                                </button>
                            </div>
                        </div>
                    </article>
                `;
            }).join("");

            // Re-bind touch events and apply button listeners to dynamically inserted cards
            setupLoanCardInteractions();

        } catch (error) {
            console.error("Failed to fetch loans catalog:", error);
        }
    }

    // =============================================
    // 07. LOAN CARD INTERACTIONS & APPLY BUTTON
    // =============================================

    function isTouchDevice() {
        return window.matchMedia("(hover: none)").matches;
    }

    function setupLoanCardInteractions() {
        const dynamicCards = document.querySelectorAll(".loan-product-card");
        const dynamicApplyButtons = document.querySelectorAll(".apply-loan-btn");

        dynamicCards.forEach(card => {
            card.addEventListener("click", function (event) {
                if (!isTouchDevice()) return;
                if (event.target.closest(".apply-loan-btn")) return;

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

    // Load catalog dynamically on load
    await loadLoanCatalog();

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
