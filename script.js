// Select the HTML elements
const form = document.getElementById("signupForm");
const contactInput = document.getElementById("contact");
const errorMessage = document.getElementById("error");
const googleButton = document.getElementById("googleButton");

// Check whether the value is a valid email or phone number
function isValidContact(value) {
  const trimmedValue = value.trim();

  const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/;
  const phonePattern = /^\\+?[0-9\\s()-]{8,16}$/;

  return emailPattern.test(trimmedValue) ||
         phonePattern.test(trimmedValue.replace(/\\s/g, ""));
}

// Form submit event
form.addEventListener("submit", function (event) {
  event.preventDefault();

  const value = contactInput.value.trim();

  // Empty input validation
  if (value === "") {
    errorMessage.textContent =
      "Please enter your email or phone number.";
    contactInput.focus();
    return;
  }

  // Email and phone validation
  if (!isValidContact(value)) {
    errorMessage.textContent =
      "Please enter a valid email address or phone number.";
    contactInput.focus();
    return;
  }

  // If input is valid
  errorMessage.textContent = "";

  alert(
    "Demo page: your contact detail is valid. " +
    "Connect a backend to continue signup."
  );
});

// Remove error message while user types
contactInput.addEventListener("input", function () {
  errorMessage.textContent = "";
});

// Google button demo interaction
googleButton.addEventListener("click", function () {
  alert("Google sign-in needs OAuth configuration in your project.");
});
