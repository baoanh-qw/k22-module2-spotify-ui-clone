console.log("sidebar.js đã chạy!");

const SIDEBAR_API_URL = "https://spotify.f8team.dev";

const API_ENDPOINTS = {
  playlists: "/api/me/playlists",
  albums: "/api/me/albums/liked",
  artists: "/api/me/artists/followed",
  createPlaylist: "/api/playlists",
};

// Ảnh dự phòng khi API không có ảnh
const DEFAULT_IMAGE = "https://placehold.co/80x80/282828/FFFFFF.png?text=Music";

const LIKED_SONGS_IMAGE =
  "https://placehold.co/80x80/5038A0/FFFFFF.png?text=Liked%20Songs";

// Các phần tử HTML
const libraryList = document.querySelector("#library-list");
const emptyState = document.querySelector("#library-empty-state");
const searchButton = document.querySelector("#sidebar-search-btn");
const sidebarSearchInput = document.querySelector("#sidebar-search-input");
const sortSelect = document.querySelector("#library-sort");
const filterButtons = document.querySelectorAll(".sidebar-filters button");
const viewButton = document.querySelector("#library-view-btn");

const createButtons = [
  document.querySelector("#create-playlist-btn"),
  document.querySelector("#empty-create-playlist"),
];

// Dữ liệu thư viện
let playlists = [];
let albums = [];
let artists = [];

let currentFilter = "all";
let currentSearch = "";
let currentSort = "recent";

// Các chế độ hiển thị
const VIEW_MODES = [
  "compact-list",
  "default-list",
  "compact-grid",
  "default-grid",
];

let currentViewIndex = 1;

// ========================================
// 1. LẤY TOKEN ĐĂNG NHẬP
// ========================================

function getAccessToken() {
  return localStorage.getItem("access_token");
}

// ========================================
// 2. HÀM GỌI API
// ========================================

async function fetchAPI(endpoint, options = {}) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Không tìm thấy access_token. Hãy đăng nhập trước.");
  }

  const response = await fetch(`${SIDEBAR_API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `API lỗi ${response.status}: ${endpoint}`;

    try {
      const errorData = await response.json();
      message = errorData.message || errorData.error || message;
    } catch {
      // Giữ thông báo lỗi mặc định nếu API không trả JSON
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return {};
  }

  return response.json();
}

// ========================================
// 3. TẢI PLAYLISTS
// ========================================

async function loadPlaylists() {
  const data = await fetchAPI(API_ENDPOINTS.playlists);

  playlists = (data.playlists || []).map((item) => ({
    id: item.id,
    name: item.name || "Playlist không tên",
    image: item.image_url || null,
    type: "Playlist",
    filterType: "playlists",
    owner: item.user_display_name || "Bạn",
    savedAt: item.created_at || item.updated_at || null,
    original: item,
  }));
}

// ========================================
// 4. TẢI ALBUM ĐÃ LƯU
// ========================================

async function loadAlbums() {
  const data = await fetchAPI(API_ENDPOINTS.albums);

  albums = (data.albums || []).map((item) => ({
    id: item.id,
    name: item.title || "Album không tên",
    image: item.cover_image_url || null,
    type: "Album",
    filterType: "albums",
    owner: item.artist_name || "Nghệ sĩ không xác định",
    savedAt: item.saved_at || item.created_at || null,
    original: item,
  }));
}

// ========================================
// 5. TẢI NGHỆ SĨ ĐÃ THEO DÕI
// ========================================

async function loadArtists() {
  const data = await fetchAPI(API_ENDPOINTS.artists);

  artists = (data.artists || []).map((item) => ({
    id: item.id,
    name: item.name || "Nghệ sĩ không tên",
    image: item.image_url || null,
    type: "Artist",
    filterType: "artists",
    owner: item.name || "Nghệ sĩ",
    savedAt: item.followed_at || null,
    original: item,
  }));
}

// ========================================
// 6. LỌC VÀ SẮP XẾP DỮ LIỆU
// ========================================

function getFilteredItems() {
  let items = [];

  if (currentFilter === "all" || currentFilter === "playlists") {
    items.push(...playlists);
  }

  if (currentFilter === "all" || currentFilter === "albums") {
    items.push(...albums);
  }

  if (currentFilter === "all" || currentFilter === "artists") {
    items.push(...artists);
  }

  // Tìm kiếm theo tên, chủ sở hữu hoặc loại nội dung
  const keyword = currentSearch.trim().toLocaleLowerCase("vi");

  if (keyword) {
    items = items.filter((item) =>
      `${item.name} ${item.owner} ${item.type}`
        .toLocaleLowerCase("vi")
        .includes(keyword),
    );
  }

  // Sắp xếp
  if (currentSort === "alphabetical") {
    items.sort((a, b) => a.name.localeCompare(b.name, "vi"));
  } else if (currentSort === "creator") {
    items.sort((a, b) => a.owner.localeCompare(b.owner, "vi"));
  } else {
    items.sort((a, b) => {
      const dateA = new Date(a.savedAt || 0).getTime();
      const dateB = new Date(b.savedAt || 0).getTime();

      return dateB - dateA;
    });
  }

  return items;
}

// ========================================
// 7. TẠO CARD TRONG THƯ VIỆN
// ========================================

function createLibraryItem(item) {
  const card = document.createElement("div");

  card.className = "library-item";
  card.dataset.id = item.id;
  card.dataset.type = item.type;
  card.title = `${item.name} • ${item.type} • ${item.owner}`;

  // Ảnh
  const image = document.createElement("img");

  image.alt = item.name;
  image.loading = "lazy";

  if (item.image) {
    image.src = item.image;
  } else if (item.name === "Liked Songs") {
    image.src = LIKED_SONGS_IMAGE;
  } else {
    image.src = DEFAULT_IMAGE;
  }

  // Nếu ảnh lỗi, chuyển sang ảnh dự phòng
  image.addEventListener("error", () => {
    if (image.dataset.fallbackUsed === "true") {
      return;
    }

    image.dataset.fallbackUsed = "true";
    image.src = DEFAULT_IMAGE;
  });

  // Thông tin nội dung
  const info = document.createElement("div");
  info.className = "library-item-info";

  const name = document.createElement("p");
  name.className = "library-item-name";
  name.textContent = item.name;

  const type = document.createElement("span");
  type.className = "library-item-type";
  type.textContent = item.type;

  const owner = document.createElement("span");
  owner.className = "library-owner";
  owner.textContent = ` • ${item.owner}`;

  info.append(name, type, owner);
  card.append(image, info);

  // Nhấn vào playlist để mở chi tiết
  card.addEventListener("click", () => {
    if (item.type === "Playlist") {
      openPlaylistDetails(item);
    }
  });

  return card;
}

// ========================================
// 8. CẬP NHẬT CHẾ ĐỘ HIỂN THỊ
// ========================================

function updateViewMode() {
  if (!libraryList) return;

  const viewMode = VIEW_MODES[currentViewIndex];

  libraryList.classList.remove(...VIEW_MODES);
  libraryList.classList.add(viewMode);

  if (viewButton) {
    const labels = {
      "compact-list": "Compact list",
      "default-list": "Default list",
      "compact-grid": "Compact grid",
      "default-grid": "Default grid",
    };

    viewButton.title = `Chế độ hiện tại: ${labels[viewMode]}. Nhấn để đổi chế độ`;

    viewButton.setAttribute("aria-label", viewButton.title);
  }
}

// ========================================
// 9. HIỂN THỊ THƯ VIỆN
// ========================================

function renderLibrary() {
  if (!libraryList) return;

  libraryList.replaceChildren();

  const items = getFilteredItems();
  const totalItems = playlists.length + albums.length + artists.length;

  if (emptyState) {
    emptyState.hidden = totalItems > 0;
  }

  if (items.length === 0) {
    const message = document.createElement("p");

    message.className = "library-empty-message";

    message.textContent = currentSearch
      ? "Không tìm thấy nội dung phù hợp."
      : "Chưa có nội dung trong mục này.";

    libraryList.append(message);

    updateViewMode();
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const item of items) {
    fragment.append(createLibraryItem(item));
  }

  libraryList.append(fragment);

  updateViewMode();
}

window.addEventListener("app:navigate-home", () => {
  currentFilter = "all";
  currentSearch = "";

  if (sidebarSearchInput) {
    sidebarSearchInput.value = "";
  }

  filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === "all");
  });

  renderLibrary();
});

// ========================================
// 10. LỌC PLAYLISTS / ARTISTS / ALBUMS / ALL
// ========================================

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    if (!["all", "playlists", "artists", "albums"].includes(filter)) {
      return;
    }

    currentFilter = filter;

    filterButtons.forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    renderLibrary();
  });
});

// ========================================
// 11. MỞ HOẶC ĐÓNG Ô TÌM KIẾM
// ========================================

searchButton?.addEventListener("click", () => {
  if (!sidebarSearchInput) return;

  sidebarSearchInput.hidden = !sidebarSearchInput.hidden;

  if (sidebarSearchInput.hidden) {
    sidebarSearchInput.value = "";
    currentSearch = "";

    renderLibrary();
  } else {
    sidebarSearchInput.focus();
  }
});

// ========================================
// 12. TÌM KIẾM TRONG THƯ VIỆN
// ========================================

sidebarSearchInput?.addEventListener("input", () => {
  currentSearch = sidebarSearchInput.value;

  renderLibrary();
});

// ========================================
// 13. SẮP XẾP
// ========================================

sortSelect?.addEventListener("change", () => {
  currentSort = sortSelect.value;

  renderLibrary();
});

// ========================================
// 14. ĐỔI CHẾ ĐỘ HIỂN THỊ
// ========================================

viewButton?.addEventListener("click", () => {
  currentViewIndex = (currentViewIndex + 1) % VIEW_MODES.length;

  renderLibrary();
});

// ========================================
// 15. HỘP THOẠI TẠO PLAYLIST
// ========================================

function createPlaylistModal() {
  const overlay = document.createElement("div");

  overlay.className = "playlist-modal-overlay";
  overlay.hidden = true;

  overlay.innerHTML = `
    <div
      class="playlist-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="playlist-modal-title"
    >
      <h2 id="playlist-modal-title">Tạo playlist</h2>

      <p class="playlist-modal-description">
        Hãy đặt tên cho playlist mới của bạn.
      </p>

      <form id="playlist-modal-form">
        <label for="playlist-name-input">
          Tên playlist
        </label>

        <input
          id="playlist-name-input"
          type="text"
          placeholder="Ví dụ: Nhạc yêu thích"
          maxlength="100"
          autocomplete="off"
          required
        />

        <p
          id="playlist-modal-error"
          class="playlist-modal-error"
          role="alert"
        ></p>

        <div class="playlist-modal-actions">
          <button
            class="playlist-modal-cancel"
            id="playlist-modal-cancel"
            type="button"
          >
            Hủy
          </button>

          <button
            class="playlist-modal-submit"
            id="playlist-modal-submit"
            type="submit"
          >
            Tạo playlist
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const form = overlay.querySelector("#playlist-modal-form");
  const nameInput = overlay.querySelector("#playlist-name-input");
  const errorMessage = overlay.querySelector("#playlist-modal-error");
  const cancelButton = overlay.querySelector("#playlist-modal-cancel");
  const submitButton = overlay.querySelector("#playlist-modal-submit");

  function open() {
    overlay.hidden = false;
    nameInput.value = "";
    errorMessage.textContent = "";
    submitButton.disabled = false;
    submitButton.textContent = "Tạo playlist";

    nameInput.focus();
  }

  function close() {
    overlay.hidden = true;
  }

  cancelButton.addEventListener("click", close);

  // Nhấn ra ngoài hộp thoại để đóng
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  // Nhấn Escape để đóng
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) {
      close();
    }
  });

  // Gửi yêu cầu tạo playlist
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const playlistName = nameInput.value.trim();

    if (!playlistName) {
      errorMessage.textContent = "Vui lòng nhập tên playlist.";
      nameInput.focus();
      return;
    }

    if (playlistName.length > 100) {
      errorMessage.textContent = "Tên playlist không được dài quá 100 ký tự.";
      return;
    }

    errorMessage.textContent = "";
    submitButton.disabled = true;
    submitButton.textContent = "Đang tạo...";

    try {
      await fetchAPI(API_ENDPOINTS.createPlaylist, {
        method: "POST",
        body: JSON.stringify({
          name: playlistName,
          description: "Playlist mới tạo",
          is_public: false,
          image_url: null,
        }),
      });

      close();

      // Tải lại danh sách sau khi tạo thành công
      await loadPlaylists();
      renderLibrary();

      alert(`Đã tạo playlist "${playlistName}" thành công!`);
    } catch (error) {
      console.error("Lỗi tạo playlist:", error);

      errorMessage.textContent = error.message;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Tạo playlist";
    }
  });

  return { open, close };
}

// Khởi tạo hộp thoại tạo playlist
const playlistModal = createPlaylistModal();

// Hai nút Create cùng mở một hộp thoại
createButtons.forEach((button) => {
  button?.addEventListener("click", () => {
    playlistModal.open();
  });
});

// ========================================
// 16. MỞ CHI TIẾT PLAYLIST
// ========================================

function openPlaylistDetails(playlist) {
  const homeView = document.getElementById("home-view");
  const detailView = document.getElementById("playlist-detail-view");
  const detailContent = document.getElementById("playlist-detail-content");

  if (!homeView || !detailView || !detailContent) {
    console.error("Không tìm thấy vùng hiển thị playlist");
    return;
  }

  detailContent.innerHTML = `
    <!-- HEADER PLAYLIST -->
    <header class="playlist-detail-header">
      <div class="playlist-detail-cover-wrap">
        <img class="playlist-detail-cover" alt="Ảnh playlist">
        <span class="playlist-cover-placeholder">♫</span>
      </div>

      <div class="playlist-detail-heading">
        <p class="playlist-visibility">Danh sách phát công khai</p>
        <h1 class="playlist-detail-name"></h1>
        <p class="playlist-owner">
          <span class="playlist-owner-avatar">+</span>
          <span class="playlist-owner-name"></span>
        </p>
      </div>
    </header>

    <!-- THANH CÔNG CỤ -->
    <div class="playlist-detail-toolbar">
      <div class="playlist-toolbar-left">
      
<button
  type="button"
  class="playlist-play-button"
  aria-label="Phát playlist"
  title="Phát playlist">
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 3.5c-.6-.35-1.35.08-1.35.78v15.44c0 .7.75 1.13 1.35.78l12.2-7.72a.92.92 0 0 0 0-1.56L7 3.5Z"/>
  </svg>
</button>

        <button type="button"
          class="playlist-collaborator-button"
          aria-label="Mời người cộng tác"
          title="Mời người cộng tác">♙+</button>

        <button type="button"
          class="playlist-more-button"
          aria-label="Tùy chọn"
          title="Tùy chọn">•••</button>
      </div>

      <button type="button" class="playlist-list-button">
        <span>Danh sách</span>
        <span aria-hidden="true">☷</span>
      </button>
    </div>

    <!-- NÚT THÊM VÀ CHỈNH SỬA -->
    <div class="playlist-action-row">
      <button type="button" class="playlist-add-button">
        <span aria-hidden="true">＋</span> Thêm vào
      </button>

      <button type="button" class="playlist-edit-button">
        <span aria-hidden="true">✎</span> Tên và thông tin chi tiết
      </button>
    </div>

    <!-- TÌM BÀI HÁT -->
    <section class="playlist-empty-state" hidden>
      <button type="button"
        class="playlist-empty-close"
        aria-label="Đóng tìm kiếm">×</button>

      <h2>Hãy cùng tìm một bài hát cho danh sách phát của bạn nào!</h2>

      <label class="playlist-search">
        <span aria-hidden="true">⌕</span>
        <input
          class="playlist-search-input"
          type="search"
          placeholder="Tìm kiếm bài hát hoặc tập phim"
          aria-label="Tìm kiếm bài hát hoặc tập phim">
      </label>

      <div class="playlist-search-results"></div>
    </section>

    <!-- DANH SÁCH BÀI HÁT -->
    <section class="playlist-detail-tracks">
      <div class="playlist-track-header">
        <span>#</span>
        <span>Tiêu đề</span>
        <span>Album</span>
        <span>Thời lượng</span>
      </div>

      <p class="playlist-detail-message">Đang tải bài hát...</p>
      <div class="playlist-track-list"></div>
    </section>
  `;

  const $ = (selector) => detailContent.querySelector(selector);

  const API_BASE_URL = "https://spotify.f8team.dev";
  const playlistId = playlist.id;

  const cover = $(".playlist-detail-cover");
  const coverPlaceholder = $(".playlist-cover-placeholder");
  const emptyState = $(".playlist-empty-state");
  const searchInput = $(".playlist-search-input");
  const searchResults = $(".playlist-search-results");
  const trackList = $(".playlist-track-list");
  const trackMessage = $(".playlist-detail-message");
  const trackSection = $(".playlist-detail-tracks");

  let searchTimeout;
  let searchRequestId = 0;

  // Hiển thị tên và chủ sở hữu playlist
  $(".playlist-detail-name").textContent =
    playlist.name || "Danh sách phát của tôi";

  $(".playlist-owner-name").textContent = playlist.owner || "Bạn";

  // Hiển thị ảnh bìa
  if (playlist.image) {
    cover.src = playlist.image;

    cover.onload = () => {
      cover.hidden = false;
      coverPlaceholder.hidden = true;
    };

    cover.onerror = () => {
      cover.hidden = true;
      coverPlaceholder.hidden = false;
    };
  } else {
    cover.hidden = true;
    coverPlaceholder.hidden = false;
  }

  // Chuyển sang trang chi tiết playlist
  homeView.hidden = true;
  detailView.hidden = false;

  const playlistPlayButton = $(".playlist-play-button");
  playlistPlayButton.addEventListener("click", () => {
    if (!window.MusicPlayer) {
      console.error("MusicPlayer chưa được khởi tạo.");
      return;
    }

    window.MusicPlayer.togglePlay();
  });
  window.MusicPlayer?.syncPlaylistButton(playlistPlayButton);

  // Hàm gọi API chung
  async function playlistApiFetch(endpoint, options = {}) {
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("Bạn cần đăng nhập trước.");
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };

    if (options.body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        typeof data.error === "string" ? data.error : data.error?.message;

      throw new Error(
        data.message || errorMessage || `Yêu cầu thất bại (${response.status})`,
      );
    }

    return data;
  }

  // Lấy danh sách bài hát từ các dạng response phổ biến
  function extractTracks(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.tracks)) return data.tracks;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.data?.tracks)) return data.data.tracks;
    if (Array.isArray(data.playlist?.tracks)) {
      return data.playlist.tracks;
    }

    return [];
  }

  function normalizeTrack(item) {
    const track = item?.track || item?.song || item || {};

    return {
      id: track.track_id || track.id,

      title:
        track.track_title || track.title || track.name || "Bài hát không tên",

      artist:
        track.artist_name ||
        track.subtitle ||
        track.artist?.name ||
        "Nghệ sĩ không xác định",

      album:
        track.album_title || track.album?.title || track.album?.name || "—",

      image:
        track.track_image_url ||
        track.album_cover_image_url ||
        track.image_url ||
        track.image ||
        "",

      duration:
        track.track_duration ??
        track.duration_seconds ??
        track.duration ??
        null,
    };
  }

  // Chuyển thời lượng thành phút:giây

  function formatDuration(value) {
    if (value == null || value === "") return "—";

    const seconds = Number(value);

    if (!Number.isFinite(seconds) || seconds < 0) {
      return "—";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  // Tải danh sách bài hát trong playlist
  async function loadPlaylistTracks() {
    if (!playlistId) {
      trackMessage.textContent = "Không tìm thấy ID playlist.";
      return;
    }

    trackMessage.textContent = "Đang tải bài hát...";
    trackList.replaceChildren();

    try {
      const data = await playlistApiFetch(
        `/api/playlists/${encodeURIComponent(playlistId)}/tracks`,
      );

      console.log("DỮ LIỆU TRACK:", data);

      const items = extractTracks(data);

      if (items.length === 0) {
        trackMessage.textContent = "Playlist chưa có bài hát nào.";
        return;
      }

      trackMessage.textContent = "";

      items.forEach((item, index) => {
        const track = normalizeTrack(item);
        const row = document.createElement("div");

        row.className = "playlist-track-row";

        const number = document.createElement("span");
        number.className = "playlist-track-number";
        number.textContent = index + 1;

        const titleCell = document.createElement("div");
        titleCell.className = "playlist-track-info";

        if (track.image) {
          const image = document.createElement("img");
          image.className = "playlist-track-image";
          image.src = track.image;
          image.alt = "";
          image.loading = "lazy";
          titleCell.appendChild(image);
        }

        const textInfo = document.createElement("div");
        textInfo.className = "playlist-track-text";

        const title = document.createElement("div");
        title.className = "playlist-track-title";
        title.textContent = track.title;
        title.style.cursor = "pointer";

        title.addEventListener("click", () => {
          window.MusicPlayer.play(track, [track], 0);
        });

        const artist = document.createElement("div");
        artist.className = "playlist-track-artist";
        artist.textContent = track.artist;

        textInfo.append(title, artist);
        titleCell.appendChild(textInfo);

        const album = document.createElement("span");
        album.className = "playlist-track-album";
        album.textContent = track.album;

        const duration = document.createElement("span");
        duration.className = "playlist-track-duration";
        duration.textContent = formatDuration(track.duration);

        // Nút xóa hình dấu X ở cuối dòng
        const deleteButton = document.createElement("button");
        deleteButton.className = "playlist-track-delete";
        deleteButton.type = "button";
        deleteButton.textContent = "×";
        deleteButton.title = "Xóa khỏi playlist";
        deleteButton.setAttribute("aria-label", "Xóa khỏi playlist");

        deleteButton.addEventListener("click", async (event) => {
          event.stopPropagation();

          const playlistId = String(playlist.id || playlist.playlist_id || "");

          const trackId = String(
            item.track_id || item.id || item.track?.id || "",
          );

          if (!playlistId || !trackId) {
            alert("Không tìm thấy ID playlist hoặc ID bài hát.");
            console.error("Không tìm thấy ID:", { playlist, item, track });
            return;
          }

          if (!confirm(`Xóa "${track.title}" khỏi playlist?`)) {
            return;
          }

          const token = localStorage.getItem("access_token");

          if (!token) {
            alert("Vui lòng đăng nhập lại.");
            return;
          }

          deleteButton.disabled = true;

          try {
            const response = await fetch(
              `https://spotify.f8team.dev/api/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(trackId)}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            if (!response.ok) {
              const errorResult = await response.json().catch(() => ({}));

              throw new Error(
                errorResult.message ||
                  errorResult.detail ||
                  `Xóa bài hát thất bại (${response.status})`,
              );
            }

            // Xóa dòng sau khi server xác nhận thành công
            row.remove();

            // Đánh lại số thứ tự
            trackList
              .querySelectorAll(".playlist-track-row")
              .forEach((trackRow, newIndex) => {
                const numberElement = trackRow.querySelector(
                  ".playlist-track-number",
                );

                if (numberElement) {
                  numberElement.textContent = newIndex + 1;
                }
              });

            console.log("Đã xóa bài hát:", track.title);
          } catch (error) {
            console.error("Lỗi xóa bài hát:", error);
            alert(error.message || "Không thể xóa bài hát.");
            deleteButton.disabled = false;
          }
        });

        row.append(number, titleCell, album, duration, deleteButton);
        trackList.appendChild(row);

        // Nhấp đúp vào bài hát để phát nhạc
        row.addEventListener("dblclick", (event) => {
          if (event.target.closest(".playlist-track-delete")) return;

          console.log("ĐÃ NHẤP ĐÚP BÀI HÁT:", item);
          window.MusicPlayer.play(item, items, index);
        });
      });
    } catch (error) {
      console.error("Lỗi tải bài hát playlist:", error);
      trackMessage.textContent = error.message;
    }
  }

  // Mở khu vực tìm kiếm
  $(".playlist-add-button").addEventListener("click", () => {
    emptyState.hidden = false;
    searchInput.focus();
  });

  // Đóng khu vực tìm kiếm
  $(".playlist-empty-close").addEventListener("click", () => {
    emptyState.hidden = true;
  });

  $(".playlist-edit-button").addEventListener("click", () => {
    // Tránh mở nhiều cửa sổ cùng lúc
    if (document.querySelector(".playlist-edit-modal")) return;

    const modal = document.createElement("div");
    modal.className = "playlist-edit-modal";

    modal.innerHTML = `
    <div class="playlist-edit-dialog" role="dialog"
         aria-modal="true" aria-labelledby="playlist-edit-title">

      <div class="playlist-edit-heading">
        <h2 id="playlist-edit-title">Chỉnh sửa thông tin</h2>
        <button type="button" class="playlist-edit-close"
                aria-label="Đóng">×</button>
      </div>

      <form class="playlist-edit-form">
        <div class="playlist-edit-body">
          <button type="button" class="playlist-edit-image"
                  title="Đổi ảnh bìa">
            <img class="playlist-edit-cover" alt="Ảnh bìa playlist">
            <span class="playlist-edit-image-placeholder">♫</span>
            <span class="playlist-edit-image-overlay">Chọn ảnh</span>
          </button>

          <div class="playlist-edit-fields">
            <input class="playlist-edit-name-input"
                   type="text" maxlength="100"
                   placeholder="Tên playlist"
                   aria-label="Tên playlist" required>

            <textarea class="playlist-edit-description"
                      maxlength="300"
                      placeholder="Thêm mô tả tùy chọn"
                      aria-label="Mô tả playlist"></textarea>
          </div>
        </div>

        <input class="playlist-edit-file"
               type="file" accept="image/*" hidden>

        <div class="playlist-edit-footer">
          <button type="button" class="playlist-edit-privacy">
            🔒 Công khai
          </button>
          <button type="submit" class="playlist-edit-save">
            Lưu
          </button>
        </div>

        <p class="playlist-edit-note">
          Chỉ tải lên ảnh mà bạn có quyền sử dụng.
        </p>
        <p class="playlist-edit-error" role="status"></p>
      </form>
    </div>
  `;

    document.body.appendChild(modal);

    const dialog = modal.querySelector(".playlist-edit-dialog");
    const form = modal.querySelector(".playlist-edit-form");
    const nameInput = modal.querySelector(".playlist-edit-name-input");
    const descriptionInput = modal.querySelector(".playlist-edit-description");
    const imageButton = modal.querySelector(".playlist-edit-image");
    const fileInput = modal.querySelector(".playlist-edit-file");
    const coverImage = modal.querySelector(".playlist-edit-cover");
    const imagePlaceholder = modal.querySelector(
      ".playlist-edit-image-placeholder",
    );
    const errorMessage = modal.querySelector(".playlist-edit-error");
    const saveButton = modal.querySelector(".playlist-edit-save");
    const privacyButton = modal.querySelector(".playlist-edit-privacy");

    let selectedImage = null;
    let isPrivate = Boolean(playlist.is_private);

    nameInput.value = playlist.name || "";
    descriptionInput.value = playlist.description || "";

    function closeModal() {
      modal.remove();
      document.removeEventListener("keydown", onKeyDown);
    }

    function onKeyDown(event) {
      if (event.key === "Escape") closeModal();
    }

    document.addEventListener("keydown", onKeyDown);

    modal
      .querySelector(".playlist-edit-close")
      .addEventListener("click", closeModal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });

    if (playlist.image) {
      coverImage.src = playlist.image;
      coverImage.hidden = false;
      imagePlaceholder.hidden = true;
    } else {
      coverImage.hidden = true;
      imagePlaceholder.hidden = false;
    }

    coverImage.onerror = () => {
      coverImage.hidden = true;
      imagePlaceholder.hidden = false;
    };

    imageButton.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        errorMessage.textContent = "Vui lòng chọn tệp hình ảnh.";
        return;
      }

      selectedImage = file;

      const previewUrl = URL.createObjectURL(file);
      coverImage.src = previewUrl;
      coverImage.hidden = false;
      imagePlaceholder.hidden = true;
      errorMessage.textContent = "";
    });

    privacyButton.addEventListener("click", () => {
      isPrivate = !isPrivate;
      privacyButton.textContent = isPrivate ? "🔒 Riêng tư" : "🔒 Công khai";
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const newName = nameInput.value.trim();
      const newDescription = descriptionInput.value.trim();

      if (!newName) {
        errorMessage.textContent = "Tên playlist không được để trống.";
        nameInput.focus();
        return;
      }

      const token = localStorage.getItem("access_token");

      if (!token) {
        errorMessage.textContent =
          "Bạn chưa đăng nhập. Vui lòng đăng nhập lại.";
        return;
      }

      const playlistId = playlist.id || playlist.playlist_id;

      if (!playlistId) {
        errorMessage.textContent = "Không tìm thấy ID playlist.";
        return;
      }

      let imageUrl =
        playlist.image_url || playlist.image || playlist.cover_image_url || "";

      saveButton.disabled = true;
      saveButton.textContent = "Đang lưu...";
      errorMessage.textContent = "";

      try {
        // Nếu người dùng chọn ảnh mới thì tải ảnh lên trước
        if (selectedImage) {
          const formData = new FormData();
          formData.append("cover", selectedImage);

          const uploadResponse = await fetch(
            `https://spotify.f8team.dev/api/upload/playlist/${encodeURIComponent(playlistId)}/cover`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            },
          );

          const uploadResult = await uploadResponse.json().catch(() => ({}));

          if (!uploadResponse.ok) {
            throw new Error(
              uploadResult.message ||
                uploadResult.detail ||
                `Upload ảnh thất bại: ${uploadResponse.status}`,
            );
          }

          console.log("Kết quả upload ảnh:", uploadResult);
          console.log(
            "JSON upload ảnh:",
            JSON.stringify(uploadResult, null, 2),
          );

          const uploadedPath =
            uploadResult.file?.url ||
            uploadResult.image_url ||
            uploadResult.url ||
            uploadResult.cover_url ||
            uploadResult.file_url ||
            "";

          if (uploadedPath) {
            imageUrl = uploadedPath.startsWith("http")
              ? uploadedPath
              : `https://spotify.f8team.dev${uploadedPath}`;
          } else {
            throw new Error("Upload thành công nhưng không tìm thấy URL ảnh.");
          }
          // Cập nhật ảnh bìa trong trang chi tiết ngay sau khi upload
          const coverImage = detailContent.querySelector(
            ".playlist-detail-cover",
          );

          if (coverImage) {
            coverImage.src = imageUrl;
            coverImage.alt = newName;
          }
        }

        const requestBody = {
          name: newName,
          description: newDescription,
          is_public: !isPrivate,
          image_url: imageUrl,
        };
        console.log("URL ảnh gửi lên API cập nhật:", imageUrl);
        console.log("Request body:", requestBody);

        const response = await fetch(
          `https://spotify.f8team.dev/api/playlists/${encodeURIComponent(playlistId)}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          },
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.message ||
              result.detail ||
              result.error ||
              `API trả về lỗi ${response.status}`,
          );
        }

        playlist.name = newName;
        playlist.description = newDescription;
        playlist.is_public = !isPrivate;
        playlist.is_private = isPrivate;

        if (imageUrl) {
          playlist.image_url = imageUrl;
          playlist.image = imageUrl;
        }
        updatePlaylistInSidebar(playlist);

        const titleElement = detailContent.querySelector(
          ".playlist-detail-name",
        );

        if (titleElement) {
          titleElement.textContent = newName;
        }

        const visibility = detailContent.querySelector(".playlist-visibility");

        if (visibility) {
          visibility.textContent = isPrivate
            ? "Danh sách phát riêng tư"
            : "Danh sách phát công khai";
        }

        // Cập nhật ảnh bìa đang hiển thị nếu tìm thấy
        if (imageUrl) {
          const coverElement = detailContent.querySelector(
            ".playlist-detail-cover",
          );

          if (coverElement) {
            coverElement.src = imageUrl;
          }
        }

        console.log("Cập nhật playlist thành công:", result);
        closeModal();
      } catch (error) {
        console.error("Lỗi cập nhật playlist:", error);

        errorMessage.textContent =
          error.message || "Không thể cập nhật playlist.";
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Lưu";
      }

      const requestBody = {
        name: newName,
        description: newDescription,
        is_public: !isPrivate,
        image_url: imageUrl,
      };

      saveButton.disabled = true;
      saveButton.textContent = "Đang lưu...";
      errorMessage.textContent = "";

      try {
        const response = await fetch(
          `https://spotify.f8team.dev/api/playlists/${encodeURIComponent(playlistId)}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          },
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.message ||
              result.detail ||
              result.error ||
              `API trả về lỗi ${response.status}`,
          );
        }

        // Cập nhật dữ liệu sau khi server xác nhận thành công
        playlist.name = newName;
        playlist.description = newDescription;
        playlist.is_public = !isPrivate;
        playlist.is_private = isPrivate;
        playlist.image_url = imageUrl;
        playlist.image = imageUrl;

        const titleElement = detailContent.querySelector(
          ".playlist-detail-name",
        );

        if (titleElement) {
          titleElement.textContent = newName;
        }

        if (imageUrl) {
          const coverSelectors = [
            ".playlist-detail-cover",
            ".playlist-detail-image",
            ".playlist-cover img",
            ".playlist-detail-header img",
          ];

          let coverImage = null;

          for (const selector of coverSelectors) {
            coverImage = detailContent.querySelector(selector);

            if (coverImage) break;
          }

          if (coverImage) {
            coverImage.src = imageUrl;
            coverImage.alt = newName;
          }
        }

        const visibility = detailContent.querySelector(".playlist-visibility");

        if (visibility) {
          visibility.textContent = isPrivate
            ? "Danh sách phát riêng tư"
            : "Danh sách phát công khai";
        }

        console.log("Cập nhật playlist thành công:", result);
        closeModal();
      } catch (error) {
        console.error("Lỗi cập nhật playlist:", error);
        errorMessage.textContent =
          error.message || "Không thể cập nhật playlist.";
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Lưu";
      }
    });

    nameInput.focus();
    nameInput.select();
  });

  // Nút mời cộng tác
  $(".playlist-collaborator-button").addEventListener("click", () => {
    alert("Chức năng mời người cộng tác chưa được kết nối API.");
  });

  // Menu ba chấm
  $(".playlist-more-button").addEventListener("click", () => {
    alert("Menu tùy chọn playlist chưa được kết nối API.");
  });

  // Ẩn hoặc hiện danh sách bài hát
  $(".playlist-list-button").addEventListener("click", () => {
    trackSection.hidden = !trackSection.hidden;
  });

  // Hiển thị kết quả tìm kiếm
  function renderSearchResults(items) {
    searchResults.replaceChildren();

    const tracks = items.map(normalizeTrack).filter((track) => track.id);

    if (tracks.length === 0) {
      searchResults.textContent = "Không tìm thấy bài hát.";
      return;
    }

    tracks.forEach((track) => {
      const row = document.createElement("div");
      row.className = "playlist-search-result";

      const info = document.createElement("div");
      info.className = "playlist-track-info";

      if (track.image) {
        const image = document.createElement("img");
        image.className = "playlist-track-image";
        image.src = track.image;
        image.alt = "";
        image.loading = "lazy";
        info.appendChild(image);
      }

      const textInfo = document.createElement("div");

      const title = document.createElement("div");
      title.className = "playlist-track-title";
      title.textContent = track.title;

      const artist = document.createElement("div");
      artist.className = "playlist-track-artist";
      artist.textContent = track.artist;

      textInfo.append(title, artist);
      info.appendChild(textInfo);

      // Nút phát bài hát
      const playButton = document.createElement("button");
      playButton.type = "button";
      playButton.className = "playlist-search-play-button";
      playButton.innerHTML = '<i class="fa-solid fa-play"></i>';
      playButton.title = "Phát bài hát";

      playButton.addEventListener("click", () => {
        if (window.MusicPlayer) {
          window.MusicPlayer.play(track, [track], 0);
        }
      });

      // Nút thêm bài hát vào playlist
      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "playlist-add-track-button";
      addButton.textContent = "Thêm";

      addButton.addEventListener("click", async () => {
        addButton.disabled = true;
        addButton.textContent = "Đang thêm...";

        try {
          await playlistApiFetch(
            `/api/playlists/${encodeURIComponent(playlistId)}/tracks`,
            {
              method: "POST",
              body: JSON.stringify({
                track_id: track.id,
                position: 0,
              }),
            },
          );

          await loadPlaylistTracks();

          addButton.textContent = "Đã thêm";
        } catch (error) {
          console.error("Lỗi thêm bài hát:", error);
          alert(`Không thể thêm bài hát: ${error.message}`);

          addButton.disabled = false;
          addButton.textContent = "Thêm";
        }
      });

      row.append(info, playButton, addButton);
      searchResults.appendChild(row);
    });
  }

  // Tìm kiếm bài hát qua API
  searchInput.addEventListener("input", () => {
    console.log("Ô tìm kiếm đã nhận sự kiện input");
    clearTimeout(searchTimeout);

    const keyword = searchInput.value.trim();
    const requestId = ++searchRequestId;

    if (!keyword) {
      searchResults.replaceChildren();
      return;
    }

    searchResults.textContent = "Đang tìm kiếm...";

    searchTimeout = setTimeout(async () => {
      try {
        const data = await playlistApiFetch(
          `/api/search/tracks?q=${encodeURIComponent(keyword)}&limit=20`,
        );

        console.log("DỮ LIỆU TÌM KIẾM BÀI HÁT:", data);
        console.log("DANH SÁCH TRACK ĐÃ TÁCH:", extractTracks(data));

        // Bỏ qua kết quả cũ nếu người dùng đã nhập từ khóa khác
        if (requestId !== searchRequestId) return;

        renderSearchResults(extractTracks(data));
      } catch (error) {
        if (requestId !== searchRequestId) return;

        console.error("Lỗi tìm kiếm bài hát:", error);
        searchResults.textContent = `Lỗi tìm kiếm: ${error.message}`;
      }
    }, 300);
  });

  // Tự tải bài hát khi mở playlist
  loadPlaylistTracks();
}

// ========================================
// 17. KHỞI TẠO SIDEBAR
// ========================================

async function initSidebar() {
  if (!libraryList) {
    console.error("Không tìm thấy #library-list trong HTML.");
    return;
  }

  libraryList.textContent = "Đang tải thư viện...";

  try {
    // Một API lỗi không ngăn các API còn lại tải dữ liệu
    const results = await Promise.allSettled([
      loadPlaylists(),
      loadAlbums(),
      loadArtists(),
    ]);

    const labels = ["Playlists", "Albums", "Artists"];

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`Không tải được ${labels[index]}:`, result.reason);
      }
    });

    renderLibrary();
  } catch (error) {
    console.error("Không thể tải Sidebar:", error);

    libraryList.textContent = error.message;
  }
}

initSidebar();

// CẬP NHẬT BÊN PHÍA SIDEBAR KHI THAY ĐỔI THÔNG TIN TRONG CHI TIẾT

function updatePlaylistInSidebar(playlist) {
  const playlistId = String(playlist.id || playlist.playlist_id || "");

  // Tìm đúng playlist trong sidebar bằng data-id có sẵn
  const sidebarItem = [...document.querySelectorAll(".library-item")].find(
    (item) =>
      item.dataset.type === "Playlist" && item.dataset.id === playlistId,
  );

  // Đồng bộ dữ liệu trong mảng playlists
  const playlistData = playlists.find(
    (item) => String(item.id || item.playlist_id) === playlistId,
  );

  if (playlistData) {
    playlistData.name = playlist.name;

    if (playlist.image_url || playlist.image) {
      playlistData.image = playlist.image_url || playlist.image;
      playlistData.image_url = playlist.image_url || playlist.image;
    }

    playlistData.description = playlist.description;
    playlistData.is_public = playlist.is_public;
    playlistData.is_private = playlist.is_private;
  }

  // Nếu tìm thấy phần tử trên giao diện thì cập nhật ngay
  if (sidebarItem) {
    const nameElement = sidebarItem.querySelector(".library-item-name");

    const imageElement = sidebarItem.querySelector("img");

    if (nameElement) {
      nameElement.textContent = playlist.name;
    }

    if (imageElement && (playlist.image_url || playlist.image)) {
      imageElement.src = playlist.image_url || playlist.image;
      imageElement.alt = playlist.name;
      imageElement.dataset.fallbackUsed = "";
    }

    sidebarItem.title = `${playlist.name} • Playlist • ${playlist.owner || ""}`;
  }

  // Đồng bộ lại giao diện theo dữ liệu thư viện
  renderLibrary();
}
