document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    // =============================================
    // 01. SELECT HTML ELEMENTS
    // =============================================

    const greetingMessage = document.getElementById("greetingMessage");

    const sidebar = document.getElementById("sidebar");
    const menuButton = document.getElementById("menuButton");
    const sidebarClose = document.getElementById("sidebarClose");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    const upgradeButton = document.getElementById("upgradeButton");
    const profileButton = document.getElementById("profileButton");

    const navLinks = document.querySelectorAll(".nav-link");
    const loanCards = document.querySelectorAll(".loan-product-card");
    const applyButtons = document.querySelectorAll(".apply-loan-btn");
    const bottomNavLinks = document.querySelectorAll(".bottom-nav-link");


    // =============================================
    // 02. DYNAMIC GREETING
    // =============================================

    function updateGreeting() {

        if (!greetingMessage) return;

        const hour = new Date().getHours();

        let greeting;

        if (hour >= 5 && hour < 12) {
            greeting = "Good Morning, Sabir!";
        }

        else if (hour >= 12 && hour < 17) {
            greeting = "Good Afternoon, Sabir!";
        }

        else if (hour >= 17 && hour < 21) {
            greeting = "Good Evening, Sabir!";
        }

        else {
            greeting = "Good Night, Sabir!";
        }

        greetingMessage.textContent = greeting;

    }

    updateGreeting();


    // =============================================
    // 03. SIDEBAR FUNCTIONALITY
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


    // Toggle Sidebar

    menuButton?.addEventListener("click", () => {

        if (sidebar?.classList.contains("active")) {
            closeSidebar();
        }

        else {
            openSidebar();
        }

    });


    // Close Button

    sidebarClose?.addEventListener("click", closeSidebar);


    // Overlay Click

    sidebarOverlay?.addEventListener("click", closeSidebar);


    // =============================================
    // 04. SIDEBAR NAVIGATION
    // =============================================

    navLinks.forEach(link => {

        link.addEventListener("click", function (event) {

            event.preventDefault();

            navLinks.forEach(item => {
                item.classList.remove("active");
            });

            this.classList.add("active");

            if (window.innerWidth <= 650) {
                closeSidebar();
            }

        });

    });


    // =============================================
    // 05. UPGRADE BUTTON
    // =============================================

    upgradeButton?.addEventListener("click", () => {

        upgradeButton.classList.add("clicked");

        setTimeout(() => {
            upgradeButton.classList.remove("clicked");
        }, 400);

    });


    // =============================================
    // 06. PROFILE BUTTON
    // =============================================

    profileButton?.addEventListener("click", () => {

        profileButton.classList.add("profile-active");

        setTimeout(() => {
            profileButton.classList.remove("profile-active");
        }, 300);

    });


    // =============================================
    // 07. LOAN CARD INTERACTIONS
    // =============================================

    function isTouchDevice() {

        return window.matchMedia("(hover: none)").matches;

    }


    loanCards.forEach(card => {

        card.addEventListener("click", function (event) {

            // Desktop uses CSS hover effects

            if (!isTouchDevice()) return;

            // Do not expand when Apply button is clicked

            if (event.target.closest(".apply-loan-btn")) {
                return;
            }

            const isExpanded = this.classList.contains("expanded");


            // Close other cards

            loanCards.forEach(otherCard => {
                otherCard.classList.remove("expanded");
            });


            // Toggle current card

            if (!isExpanded) {
                this.classList.add("expanded");
            }

        });

    });


    // =============================================
    // 08. APPLY NOW BUTTON
    // =============================================

    applyButtons.forEach(button => {

        button.addEventListener("click", function (event) {

            event.preventDefault();

            event.stopPropagation();

            const loanType =
                this.dataset.loan ||
                this.closest(".loan-product-card")
                    ?.querySelector("h3")
                    ?.textContent.trim() ||
                "Loan";


            alert(
                `Welcome to Fincentrix!\n\n` +
                `You selected: ${loanType}.\n\n` +
                `Loan application feature will be available soon.`
            );

        });

    });


    // =============================================
    // 09. MOBILE BOTTOM NAVIGATION
    // =============================================

    bottomNavLinks.forEach(link => {

        link.addEventListener("click", function (event) {

            event.preventDefault();

            bottomNavLinks.forEach(item => {
                item.classList.remove("active");
            });

            this.classList.add("active");

        });

    });


    // =============================================
    // 10. LOAN ELIGIBILITY SYSTEM
    // FRONTEND DEMO ONLY
    // =============================================


    // DEMO USER DATA
    // Change values to test different conditions.

    const demoUser = {

        signupCompleted: true,

        verificationStatus: "verified",

        eligible: true,

        maxLoanAmount: 500000

    };


    // SELECT ELIGIBILITY ELEMENTS

    const eligibilityBadge =
        document.getElementById("eligibilityBadge");

    const eligibilityHeading =
        document.getElementById("eligibilityHeading");

    const eligibilityDescription =
        document.getElementById("eligibilityDescription");

    const eligibilityAmountBox =
        document.getElementById("eligibilityAmountBox");

    const eligibleLoanAmount =
        document.getElementById("eligibleLoanAmount");

    const eligibilityActionButton =
        document.getElementById("eligibilityActionButton");


    // FORMAT AMOUNT INTO INDIAN CURRENCY

    function formatLoanAmount(amount) {

        return new Intl.NumberFormat("en-IN", {

            style: "currency",

            currency: "INR",

            maximumFractionDigits: 0

        }).format(amount);

    }


    // UPDATE ELIGIBILITY BANNER

    function updateEligibilityBanner() {

        if (
            !eligibilityBadge ||
            !eligibilityHeading ||
            !eligibilityDescription ||
            !eligibilityAmountBox ||
            !eligibleLoanAmount ||
            !eligibilityActionButton
        ) {
            return;
        }


        // CASE 1: SIGNUP INCOMPLETE

        if (!demoUser.signupCompleted) {

            eligibilityBadge.textContent = "PROFILE INCOMPLETE";

            eligibilityHeading.innerHTML = `
                Complete Your
                <br>
                Profile First.
            `;

            eligibilityDescription.textContent =
                "Complete your personal details to continue your financial journey.";

            eligibilityAmountBox.classList.add("hidden");

            eligibilityActionButton.textContent = "Complete Profile";

            eligibilityActionButton.href = "profile.html";

            return;

        }


        // CASE 2: DOCUMENT VERIFICATION PENDING

        if (demoUser.verificationStatus !== "verified") {

            eligibilityBadge.textContent = "VERIFICATION PENDING";

            eligibilityHeading.innerHTML = `
                Complete Your
                <br>
                Document Verification.
            `;

            eligibilityDescription.textContent =
                "Verify your documents to discover your personalized loan eligibility.";

            eligibilityAmountBox.classList.add("hidden");

            eligibilityActionButton.textContent = "Verify Documents";

            eligibilityActionButton.href = "verification.html";

            return;

        }


        // CASE 3: USER NOT ELIGIBLE

        if (
            !demoUser.eligible ||
            !Number.isFinite(Number(demoUser.maxLoanAmount)) ||
            Number(demoUser.maxLoanAmount) <= 0
        ) {

            eligibilityBadge.textContent = "PROFILE VERIFIED";

            eligibilityHeading.innerHTML = `
                Your Eligibility
                <br>
                Is Under Review.
            `;

            eligibilityDescription.textContent =
                "Your documents are verified. Check again later for available loan offers.";

            eligibilityAmountBox.classList.add("hidden");

            eligibilityActionButton.textContent = "View Profile";

            eligibilityActionButton.href = "profile.html";

            return;

        }


        // CASE 4: USER VERIFIED AND ELIGIBLE

        eligibilityBadge.textContent = "✓ DOCUMENTS VERIFIED";

        eligibilityHeading.innerHTML = `
            Congratulations!
            <br>
            You're Loan Eligible.
        `;

        eligibilityDescription.textContent =
            "Based on your demo profile, you may be eligible for a loan up to:";

        eligibilityAmountBox.classList.remove("hidden");

        eligibleLoanAmount.textContent =
            formatLoanAmount(Number(demoUser.maxLoanAmount));

        eligibilityActionButton.innerHTML = `
            Get Your Loan
            <i class="fa-solid fa-arrow-right"></i>
        `;

        eligibilityActionButton.href = "loan-application.html";

    }


    // INITIALIZE ELIGIBILITY BANNER

    updateEligibilityBanner();


    // =============================================
    // 11. ESCAPE KEY FUNCTIONALITY
    // =============================================

    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {

            closeSidebar();

            loanCards.forEach(card => {
                card.classList.remove("expanded");
            });

        }

    });


    // =============================================
    // 12. WINDOW RESIZE
    // =============================================

    window.addEventListener("resize", () => {

        if (window.innerWidth > 650) {
            closeSidebar();
        }

    });


    // =============================================
    // 13. DASHBOARD INITIALIZATION
    // =============================================

    console.log("------------------------------------");

    console.log("FINCENTRIX DASHBOARD");

    console.log("------------------------------------");

    console.log("Dashboard Status: Initialized");

    console.log("Loan Products:", loanCards.length);

    console.log("Navigation Links:", navLinks.length);

    console.log("Apply Buttons:", applyButtons.length);

    console.log(
        "Eligibility Status:",
        demoUser.verificationStatus
    );

    console.log("------------------------------------");

});