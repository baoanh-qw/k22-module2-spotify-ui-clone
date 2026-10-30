console.log("artists.js đã chạy!");

const ARTISTS_API_URL = "https://spotify.f8team.dev";

// Các từ khóa dùng để tìm nhiều nghệ sĩ.
// API hiện tại chưa xác nhận có endpoint riêng lấy nghệ sĩ nổi tiếng.
const ARTIST_SEARCH_KEYWORDS = [
  "a",
  "e",
  "i",
  "o",
  "u",
  "Đen",
  "Sơn Tùng",
  "Hieuthuhai",
  "Mỹ Tâm",
  "Vũ",
];

// Số card tối đa hiển thị ban đầu
const MAX_ARTISTS = 20;

// Gọi API tìm kiếm nghệ sĩ
async function searchArtists(keyword) {
  const params = new URLSearchParams({
    q: keyword,
    type: "artist",
    limit: "20",
    offset: "0",
  });

  const response = await fetch(
    `${ARTISTS_API_URL}/api/search?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`API lỗi ${response.status}: ${keyword}`);
  }

  const data = await response.json();
  return data.results?.artists || [];
}

// Tạo một card nghệ sĩ
function createArtistCard(artist) {
  // GIỮ NGUYÊN CLASS CSS CŨ CỦA BẠN
  const card = document.createElement("div");
  card.className = "artists-card";
  card.dataset.id = artist.id || "";

  const imageBox = document.createElement("div");
  imageBox.className = "artists-image";

  const image = document.createElement("img");
  image.alt = artist.title || "Nghệ sĩ";
  image.loading = "lazy";

  if (artist.image_url) {
    image.src = artist.image_url;
  } else {
    image.classList.add("image-unavailable");
  }

  image.addEventListener("error", () => {
    image.removeAttribute("src");
    image.classList.add("image-unavailable");
  });

  // Giữ nút Play và hiệu ứng hover từ CSS hiện tại
  const playButton = document.createElement("button");
  playButton.className = "play-btn";
  playButton.type = "button";
  playButton.title = `Play ${artist.title || "nghệ sĩ"}`;
  playButton.setAttribute("aria-label", `Play ${artist.title || "nghệ sĩ"}`);

  const playIcon = document.createElement("i");
  playIcon.className = "fa-solid fa-play";
  playButton.appendChild(playIcon);

  // Chưa có chức năng phát nhạc thì không giả vờ đã phát
  playButton.addEventListener("click", (event) => {
    event.stopPropagation();
    console.log("Đã chọn nút Play nghệ sĩ:", artist.title);
    console.log("Dữ liệu nghệ sĩ:", artist);
  });

  imageBox.append(image, playButton);

  const name = document.createElement("h3");
  name.textContent = artist.title || "Nghệ sĩ chưa rõ tên";

  const description = document.createElement("p");
  description.textContent = artist.subtitle || "Artist";

  card.append(imageBox, name, description);

  // Nhấn card để xem dữ liệu trong Console
  card.addEventListener("click", () => {
    console.log("Đã chọn nghệ sĩ:", artist);
  });

  return card;
}

// Tải và hiển thị nhiều nghệ sĩ
async function loadPopularArtists() {
  // Ưu tiên ID nếu bạn đã thêm vào HTML,
  // nếu chưa có ID thì dùng class cũ .artist-list.
  const artistList =
    document.querySelector("#popular-artist-list") ||
    document.querySelector(".artist-list");

  if (!artistList) {
    console.error("Không tìm thấy vùng chứa .artist-list");
    return;
  }

  artistList.setAttribute("aria-busy", "true");

  try {
    // Tìm nhiều từ khóa song song.
    // Một từ khóa lỗi không làm hỏng toàn bộ danh sách.
    const results = await Promise.allSettled(
      ARTIST_SEARCH_KEYWORDS.map((keyword) => searchArtists(keyword)),
    );

    // Gộp dữ liệu và loại bỏ nghệ sĩ trùng ID
    const uniqueArtists = new Map();

    results.forEach((result) => {
      if (result.status !== "fulfilled") {
        console.warn("Một lượt tìm nghệ sĩ thất bại:", result.reason);
        return;
      }

      result.value.forEach((artist) => {
        if (!artist.id || !artist.title) return;

        const existingArtist = uniqueArtists.get(artist.id);

        // Ưu tiên bản ghi có ảnh nếu cùng một nghệ sĩ
        if (
          !existingArtist ||
          (!existingArtist.image_url && artist.image_url)
        ) {
          uniqueArtists.set(artist.id, artist);
        }
      });
    });

    const artists = [...uniqueArtists.values()].slice(0, MAX_ARTISTS);

    if (artists.length === 0) {
      console.error("API không trả về nghệ sĩ nào.");
      return;
    }

    // Chỉ thay card nghệ sĩ sau khi đã tải dữ liệu
    const fragment = document.createDocumentFragment();

    artists.forEach((artist) => {
      fragment.appendChild(createArtistCard(artist));
    });

    artistList.replaceChildren(fragment);

    console.log(`Đã hiển thị ${artists.length} nghệ sĩ từ API.`);
  } catch (error) {
    console.error("Không tải được nghệ sĩ:", error);
  } finally {
    artistList.removeAttribute("aria-busy");
  }
}

loadPopularArtists();
