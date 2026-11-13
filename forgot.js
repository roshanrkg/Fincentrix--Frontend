const API_BASE_URL = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", function () {
    const emailSection = document.getElementById("emailSection");
    const emailInput = document.getElementById("email");
    const sendOtpButton = document.getElementById("sendOtpButton");
    const formMessage = document.getElementById("formMessage");
    const otpSection = document.getElementById("otpSection");
    const otpInputs = Array.from(document.querySelectorAll(".otp-inputs input"));
    const verifyOtpButton = document.getElementById("verifyOtpButton");
    const resendOtpBtn = document.getElementById("resendOtpBtn");
    const countdownText = document.getElementById("countdownText");
    const passwordSection = document.getElementById("passwordSection");
    const newPasswordInput = document.getElementById("newPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const resetPasswordButton = document.getElementById("resetPasswordButton");
    const recoveryTitle = document.getElementById("recoveryTitle");
    const recoverySubtitle = document.getElementById("recoverySubtitle");

    let currentEmail = "";
    let verifiedOtpCode = "";
    let countdownInterval = null;

    function showMessage(text, type = "info") {
        formMessage.textContent = text;
        formMessage.className = `form-message ${type}`;
    }

    function hideMessage() {
        formMessage.textContent = "";
        formMessage.className = "form-message";
    }

    function startTimer(durationSeconds) {
        clearInterval(countdownInterval);
        let remaining = durationSeconds;
        resendOtpBtn.disabled = true;

        function updateDisplay() {
            const minutes = Math.floor(remaining / 60).toString().padStart(2, "0");
            const seconds = (remaining % 60).toString().padStart(2, "0");
            countdownText.textContent = `Expires in ${minutes}:${seconds}`;

            if (remaining <= 0) {
                clearInterval(countdownInterval);
                countdownText.textContent = "Code expired";
                resendOtpBtn.disabled = false;
            }
            remaining--;
        }

        updateDisplay();
        countdownInterval = setInterval(updateDisplay, 1000);
    }

    // Step 1: Send OTP to Email
    sendOtpButton.addEventListener("click", async function () {
        const emailVal = emailInput.value.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

        if (!emailVal || !emailRegex.test(emailVal)) {
            showMessage("Please enter a valid email address.", "error");
            emailInput.focus();
            return;
        }

        currentEmail = emailVal;
        sendOtpButton.disabled = true;
        sendOtpButton.textContent = "Sending Code...";
        hideMessage();

        try {
            const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: currentEmail, purpose: "forgot_password" })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                showMessage(data.message || "Failed to send verification code.", "error");
                sendOtpButton.disabled = false;
                sendOtpButton.textContent = "Send Verification Code";
                return;
            }

            showMessage(`✅ Verification code sent to ${currentEmail}. Please check your inbox.`, "success");
            emailInput.disabled = true;
            sendOtpButton.style.display = "none";
            otpSection.hidden = false;
            otpInputs[0].focus();
            startTimer(600); // 10 minutes

        } catch (err) {
            console.error("Error sending OTP:", err);
            showMessage("Unable to connect to the backend server. Please verify port 3000.", "error");
            sendOtpButton.disabled = false;
            sendOtpButton.textContent = "Send Verification Code";
        }
    });

    // Handle OTP Box Auto-Advance
    otpInputs.forEach(function (input, index) {
        input.addEventListener("input", function () {
            input.value = input.value.replace(/[^0-9]/g, "").slice(-1);
            if (input.value && otpInputs[index + 1]) {
                otpInputs[index + 1].focus();
            }
        });

        input.addEventListener("keydown", function (event) {
            if (event.key === "Backspace" && !input.value && otpInputs[index - 1]) {
                otpInputs[index - 1].focus();
            }
        });

        input.addEventListener("paste", function (event) {
            const pastedDigits = event.clipboardData
                .getData("text")
                .replace(/[^0-9]/g, "")
                .slice(0, otpInputs.length);

            if (!pastedDigits) return;
            event.preventDefault();

            pastedDigits.split("").forEach(function (digit, digitIndex) {
                if (otpInputs[digitIndex]) {
                    otpInputs[digitIndex].value = digit;
                }
            });
            otpInputs[Math.min(pastedDigits.length, otpInputs.length - 1)].focus();
        });
    });

    // Resend OTP
    resendOtpBtn.addEventListener("click", async function () {
        if (!currentEmail) return;
        resendOtpBtn.disabled = true;
        showMessage("Sending new verification code...", "info");

        try {
            const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: currentEmail, purpose: "forgot_password" })
            });

            const data = await response.json();
            if (response.ok && data.success) {
                showMessage(`✅ New code sent to ${currentEmail}.`, "success");
                otpInputs.forEach(i => i.value = "");
                otpInputs[0].focus();
                startTimer(600);
            } else {
                showMessage(data.message || "Failed to resend code.", "error");
                resendOtpBtn.disabled = false;
            }
        } catch (err) {
            showMessage("Server error while resending code.", "error");
            resendOtpBtn.disabled = false;
        }
    });

    // Step 2: Verify Code
    verifyOtpButton.addEventListener("click", async function () {
        const otpVal = otpInputs.map(i => i.value.trim()).join("");

        if (otpVal.length !== 6) {
            showMessage("Please enter the complete 6-digit verification code.", "error");
            return;
        }

        verifyOtpButton.disabled = true;
        verifyOtpButton.textContent = "Verifying...";
        hideMessage();

        try {
            const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: currentEmail,
                    otp: otpVal,
                    purpose: "forgot_password"
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                showMessage(data.message || "Invalid or expired code. Please try again.", "error");
                verifyOtpButton.disabled = false;
                verifyOtpButton.textContent = "Verify Code";
                return;
            }

            verifiedOtpCode = otpVal;
            clearInterval(countdownInterval);
            showMessage("✅ Code verified! Please enter your new password below.", "success");

            // Transition UI to Step 3 (New Password)
            otpSection.hidden = true;
            passwordSection.hidden = false;
            recoveryTitle.textContent = "Reset Password";
            recoverySubtitle.textContent = `Set a new secure password for ${currentEmail}.`;
            newPasswordInput.focus();

        } catch (err) {
            console.error("Error verifying OTP:", err);
            showMessage("Server connection error during verification.", "error");
            verifyOtpButton.disabled = false;
            verifyOtpButton.textContent = "Verify Code";
        }
    });

    // Step 3: Set New Password
    resetPasswordButton.addEventListener("click", async function () {
        const newPass = newPasswordInput.value;
        const confirmPass = confirmPasswordInput.value;

        if (!newPass || newPass.length < 8) {
            showMessage("Password must be at least 8 characters long.", "error");
            newPasswordInput.focus();
            return;
        }

        if (newPass !== confirmPass) {
            showMessage("Passwords do not match. Please re-enter.", "error");
            confirmPasswordInput.focus();
            return;
        }

        resetPasswordButton.disabled = true;
        resetPasswordButton.textContent = "Updating Password...";
        hideMessage();

        try {
            const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: currentEmail,
                    otp: verifiedOtpCode,
                    new_password: newPass
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                showMessage(data.message || "Failed to reset password. Please try again.", "error");
                resetPasswordButton.disabled = false;
                resetPasswordButton.textContent = "Set New Password & Login";
                return;
            }

            showMessage("🎉 Password reset successfully! Redirecting you to login...", "success");
            resetPasswordButton.textContent = "Password Updated ✓";

            setTimeout(function () {
                window.location.href = "index.html";
            }, 2000);

        } catch (err) {
            console.error("Error resetting password:", err);
            showMessage("Server error while resetting password.", "error");
            resetPasswordButton.disabled = false;
            resetPasswordButton.textContent = "Set New Password & Login";
        }
    });
});
