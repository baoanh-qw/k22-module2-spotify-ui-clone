const registerForm = document.querySelector("#register-form");
const usernameInput = document.querySelector("#username");
const emailInput = document.querySelector("#email");
const displayNameInput = document.querySelector("#display-name");
const passwordInput = document.querySelector("#password");
const message = document.querySelector("#register-message");
const registerBtn = document.querySelector("#register-btn");

const API_URL = "https://spotify.f8team.dev";

function validatePassword(password) {
  return (
    password.length >= 6 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

registerForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const displayName = displayNameInput.value.trim();
  const password = passwordInput.value;

  message.textContent = "";

  if (!validatePassword(password)) {
    message.textContent =
      "Mật khẩu cần ít nhất 6 ký tự, gồm chữ hoa, chữ thường và chữ số.";
    return;
  }

  registerBtn.disabled = true;
  registerBtn.textContent = "Đang đăng ký...";

  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        email,
        password,
        display_name: displayName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const code = data.error?.code;
      const errorMessage = data.error?.message;

      if (code === "EMAIL_EXISTS") {
        throw new Error("Email này đã được đăng ký.");
      }

      if (code === "USERNAME_EXISTS") {
        throw new Error("Tên tài khoản này đã tồn tại.");
      }

      throw new Error(errorMessage || "Đăng ký thất bại.");
    }

    // Nếu đăng ký thành công nhưng API không trả token,
    // gọi API đăng nhập bằng tài khoản vừa tạo.
    let loginData = data;

    if (!loginData.access_token) {
      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      loginData = await loginResponse.json();

      if (!loginResponse.ok || !loginData.access_token) {
        throw new Error(
          "Đăng ký thành công nhưng chưa thể tự đăng nhập. Vui lòng đăng nhập thủ công.",
        );
      }
    }

    const user = loginData.user;

    if (!user || !loginData.access_token) {
      throw new Error("API chưa trả về đủ thông tin tài khoản.");
    }

    localStorage.setItem("access_token", loginData.access_token);
    localStorage.setItem("current_user", JSON.stringify(user));

    message.style.color = "#1ed760";
    message.textContent = "Đăng ký thành công!";

    setTimeout(function () {
      window.location.href = "./index.html";
    }, 700);
  } catch (error) {
    message.style.color = "#ff6b6b";
    message.textContent = error.message;
  } finally {
    registerBtn.disabled = false;
    registerBtn.textContent = "Đăng ký";
  }
});
