const BASE_URL = "https://spotify.f8team.dev";

const loginForm = document.querySelector("#loginForm");
const emailInput = document.querySelector("#email");
const passwordStep = document.querySelector("#passwordStep");
const passwordInput = document.querySelector("#password");
const message = document.querySelector("#loginMessage");
const continueButton = document.querySelector("#continueButton");

let passwordStepShown = false;

// Xử lý đăng nhập
loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  message.textContent = "";
  message.style.color = "#ff8a8a";

  const email = emailInput.value.trim();

  // Kiểm tra email
  if (!email || !emailInput.checkValidity()) {
    message.textContent = "Vui lòng nhập email hợp lệ.";
    emailInput.focus();
    return;
  }

  // Lần đầu bấm Continue: hiện trường mật khẩu
  if (!passwordStepShown) {
    passwordStep.hidden = false;
    passwordInput.required = true;
    passwordStepShown = true;

    continueButton.textContent = "Log in";
    passwordInput.focus();

    return;
  }

  const password = passwordInput.value;

  if (!password) {
    message.textContent = "Vui lòng nhập mật khẩu.";
    passwordInput.focus();
    return;
  }

  continueButton.disabled = true;
  continueButton.textContent = "Logging in...";

  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });

    const data = await response.json().catch(() => ({}));

    // API trả về lỗi
    if (!response.ok) {
      throw new Error(data.message || "Email hoặc mật khẩu không chính xác.");
    }

    // Kiểm tra response theo cấu trúc API đã thử trên Postman
    if (!data.access_token || !data.user) {
      throw new Error("Phản hồi đăng nhập không đúng định dạng mong đợi.");
    }

    // Lưu token và thông tin người dùng
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("current_user", JSON.stringify(data.user));

    message.style.color = "#1ed760";
    message.textContent = "Đăng nhập thành công!";

    // Chuyển về trang chủ
    window.location.href = "index.html";
  } catch (error) {
    message.style.color = "#ff8a8a";
    message.textContent = error.message || "Không thể kết nối đến máy chủ.";
  } finally {
    continueButton.disabled = false;
    continueButton.textContent = "Log in";
  }
});

// Các phương thức đăng nhập khác hiện chưa tích hợp API riêng
document.querySelectorAll(".social-button").forEach(function (button) {
  button.addEventListener("click", function () {
    const provider = button.dataset.provider;

    message.style.color = "#ff8a8a";
    message.textContent = `Đăng nhập bằng ${provider} chưa được tích hợp.`;
  });
});
