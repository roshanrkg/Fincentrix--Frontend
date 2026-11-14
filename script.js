const API_BASE_URL = "http://localhost:3000/api";

// Select the HTML elements
const form = document.getElementById("signupForm");
const contactInput = document.getElementById("contact");
const passwordInput = document.getElementById("password");
const errorMessage = document.getElementById("error");
const submitButton = form.querySelector('button[type="submit"]');
const googleButton = document.getElementById("googleButton");

// Check whether the value is a valid email or phone number
function isValidContact(value) {
  const trimmedValue = value.trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phonePattern = /^\+?[0-9\s()-]{8,16}$/;

  return emailPattern.test(trimmedValue) ||
         phonePattern.test(trimmedValue.replace(/\s/g, ""));
}

// Form submit event
form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const contactValue = contactInput.value.trim();
  const passwordValue = passwordInput ? passwordInput.value : "";

  // 1. Empty input validation
  if (contactValue === "") {
    errorMessage.textContent = "Please enter your email or phone number.";
    contactInput.focus();
    return;
  }

  // 2. Email or phone pattern validation
  if (!isValidContact(contactValue)) {
    errorMessage.textContent = "Please enter a valid email address or phone number.";
    contactInput.focus();
    return;
  }

  // 3. Password validation
  if (!passwordValue) {
    errorMessage.textContent = "Please enter your password.";
    if (passwordInput) passwordInput.focus();
    return;
  }

  errorMessage.textContent = "";
  const originalButtonText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = "Signing In...";

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contact: contactValue,
        password: passwordValue
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      errorMessage.textContent = data.message || "Invalid credentials. Please try again.";
      return;
    }

    // Save token and user details for dashboard access
    localStorage.setItem("fincentrix_token", data.data.token);
    localStorage.setItem("fincentrix_user", JSON.stringify(data.data));

    // Redirect to protected dashboard
    window.location.href = "dashboard.html";

  } catch (error) {
    console.error("Login request failed:", error);
    errorMessage.textContent = "Unable to connect to the backend server.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }
});

// Remove error message while user types
contactInput.addEventListener("input", function () {
  errorMessage.textContent = "";
});
if (passwordInput) {
  passwordInput.addEventListener("input", function () {
    errorMessage.textContent = "";
  });
}

// Google button demo interaction
if (googleButton) {
  googleButton.addEventListener("click", function () {
    alert("Google sign-in needs OAuth configuration in your project.");
  });
}
