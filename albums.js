const ALBUMS_API_URL = "https://spotify.f8team.dev";
const DEFAULT_ALBUM_IMAGE =
  "https://placehold.co/300x300/282828/FFFFFF.png?text=Album";

function createPopularAlbumCard(album) {
  const card = document.createElement("article");
  card.className = "song-card";
  card.dataset.albumId = album.id;

  const imageBox = document.createElement("div");
  imageBox.className = "song-image";

  const image = document.createElement("img");
  image.src = album.cover_image_url
    ? album.cover_image_url.replace(/^http:\/\//i, "https://")
    : DEFAULT_ALBUM_IMAGE;
  image.alt = album.title || "Album";
  image.loading = "lazy";
  image.addEventListener("error", () => {
    if (image.dataset.fallbackUsed === "true") return;
    image.dataset.fallbackUsed = "true";
    image.src = DEFAULT_ALBUM_IMAGE;
  });

  imageBox.appendChild(image);

  const title = document.createElement("h3");
  title.textContent = album.title || "Album không tên";

  const artist = document.createElement("p");
  artist.textContent = album.artist_name || "Nghệ sĩ không xác định";

  card.append(imageBox, title, artist);
  return card;
}

async function loadPopularAlbums() {
  const albumList = document.querySelector("#popular-album-list");

  if (!albumList) {
    console.error("Không tìm thấy #popular-album-list.");
    return;
  }

  albumList.setAttribute("aria-busy", "true");
  albumList.replaceChildren();

  const loadingMessage = document.createElement("p");
  loadingMessage.className = "album-list-message";
  loadingMessage.textContent = "Đang tải album...";
  albumList.appendChild(loadingMessage);

  try {
    const response = await fetch(
      `${ALBUMS_API_URL}/api/albums/popular?limit=20&offset=0`,
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message ||
          data.error?.message ||
          `Không tải được album (${response.status}).`,
      );
    }

    if (!Array.isArray(data.albums)) {
      throw new Error("API không trả về danh sách albums hợp lệ.");
    }

    if (data.albums.length === 0) {
      loadingMessage.textContent = "Chưa có album để hiển thị.";
      return;
    }

    const fragment = document.createDocumentFragment();
    data.albums.forEach((album) => {
      fragment.appendChild(createPopularAlbumCard(album));
    });

    albumList.replaceChildren(fragment);
  } catch (error) {
    console.error("Không thể tải album phổ biến:", error);
    loadingMessage.textContent =
      error.message || "Không thể tải album. Hãy thử tải lại trang.";
  } finally {
    albumList.removeAttribute("aria-busy");
  }
}

loadPopularAlbums();
