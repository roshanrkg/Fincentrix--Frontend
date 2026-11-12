document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("recoveryForm");
  const emailInput = document.getElementById("email");
  const formMessage = document.getElementById("formMessage");
  const otpSection = document.getElementById("otpSection");
  const otpInputs = Array.from(
    document.querySelectorAll(".otp-inputs input")
  );

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    formMessage.textContent = "";

    if (!emailInput.checkValidity()) {
      emailInput.reportValidity();
      return;
    }

    otpSection.hidden = false;
    otpInputs[0].focus();
  });

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

      if (!pastedDigits) {
        return;
      }

      event.preventDefault();
      pastedDigits.split("").forEach(function (digit, digitIndex) {
        otpInputs[digitIndex].value = digit;
      });
      otpInputs[Math.min(pastedDigits.length, otpInputs.length - 1)].focus();
    });
  });
});
