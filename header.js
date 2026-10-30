const header = document.querySelector(".header");

const signupBtn = document.querySelector(".btn-signup");
const loginBtn = document.querySelector(".btn-login");
const userInfo = document.querySelector("#user-info");
const userName = document.querySelector("#user-name");
const userEmail = document.querySelector("#user-email");
const userAvatar = document.querySelector("#user-avatar");
const avatarLetter = document.querySelector("#avatar-letter");
const logoutBtn = document.querySelector("#logout-btn");
const homeView = document.querySelector("#home-view");
const detailView = document.querySelector("#playlist-detail-view");
const homeNavigationButtons = [
  document.querySelector("#logo"),
  document.querySelector("#home-btn"),
].filter(Boolean);

function navigateHome(event) {
  event.preventDefault();

  if (homeView) homeView.hidden = false;
  if (detailView) detailView.hidden = true;

  window.dispatchEvent(new CustomEvent("app:navigate-home"));
}

homeNavigationButtons.forEach((button) => {
  button.addEventListener("click", navigateHome);
});

function updateHeader() {
  const token = localStorage.getItem("access_token");
  const userData = localStorage.getItem("current_user");

  let user = null;

  try {
    user = userData ? JSON.parse(userData) : null;
  } catch {
    user = null;
  }

  const isLoggedIn = Boolean(token && user);

  // Hiện hoặc ẩn các phần tử tài khoản
  signupBtn.hidden = isLoggedIn;
  loginBtn.hidden = isLoggedIn;
  userInfo.hidden = !isLoggedIn;

  // Chuyển CSS theo trạng thái đăng nhập
  header.classList.toggle("logged-in", isLoggedIn);

  if (isLoggedIn) {
    userName.textContent = user.display_name || user.username || "Người dùng";

    userEmail.textContent = user.email || "";

    if (user.avatar_url) {
      userAvatar.src = user.avatar_url;
      userAvatar.hidden = false;
      avatarLetter.hidden = true;
    } else {
      userAvatar.hidden = true;
      avatarLetter.hidden = false;

      const name = user.display_name || user.username || "A";
      avatarLetter.textContent = name.charAt(0).toUpperCase();
    }
  }
}

// Mở hoặc đóng menu khi nhấn avatar
const profileBtn = document.querySelector("#profile-btn");
const profileMenu = document.querySelector("#profile-menu");

if (profileBtn && profileMenu) {
  profileBtn.addEventListener("click", function () {
    profileMenu.hidden = !profileMenu.hidden;
  });
}

// Đăng xuất
logoutBtn.addEventListener("click", function () {
  localStorage.removeItem("access_token");
  localStorage.removeItem("current_user");

  if (profileMenu) {
    profileMenu.hidden = true;
  }

  updateHeader();
});

// Kiểm tra trạng thái khi mở trang
updateHeader();
