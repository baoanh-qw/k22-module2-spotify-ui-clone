document.addEventListener("DOMContentLoaded", function () {
  // Lấy thông tin tài khoản đã lưu sau khi đăng nhập
  const token = localStorage.getItem("access_token");
  const userData = localStorage.getItem("current_user");

  // Nếu chưa đăng nhập thì giữ nguyên Header hiện tại
  if (!token || !userData) {
    return;
  }

  const user = JSON.parse(userData);

  // Tìm Header
  const headerRight = document.querySelector(".header-right");

  if (!headerRight) {
    console.error("Không tìm thấy .header-right trong HTML");
    return;
  }

  // Ẩn nút Log in và Sign up
  const loginButton = headerRight.querySelector(".btn-login");
  const signupButton = headerRight.querySelector(".btn-signup");

  if (loginButton) {
    loginButton.style.display = "none";
  }

  if (signupButton) {
    signupButton.style.display = "none";
  }

  // Tránh tạo avatar nhiều lần
  if (headerRight.querySelector(".user-profile")) {
    return;
  }

  // Tạo khu vực tài khoản
  const profile = document.createElement("div");
  profile.className = "user-profile";

  const avatar = document.createElement("img");
  avatar.className = "user-avatar";
  avatar.alt = "Avatar";

  // Nếu chưa có ảnh đại diện thì dùng chữ cái đầu
  if (user.avatar_url) {
    avatar.src = user.avatar_url;
  } else {
    avatar.style.display = "none";
  }

  const displayName = document.createElement("span");
  displayName.className = "user-name";
  displayName.textContent = user.display_name || user.username || user.email;

  profile.appendChild(avatar);
  profile.appendChild(displayName);

  headerRight.appendChild(profile);
});
