const searchInput = document.querySelector(".search-input");
const searchBox = document.querySelector(".search-box");
const searchDropdown = document.querySelector("#search-dropdown");
const searchStatus = document.querySelector("#search-status");
const searchResults = document.querySelector("#search-results");

const API_URL = "https://spotify.f8team.dev";

let debounceTimer;

function openSearchDropdown() {
  searchDropdown.hidden = false;
}

function closeSearchDropdown() {
  searchDropdown.hidden = true;
}

function showStatus(text) {
  searchStatus.textContent = text;
}

function clearResults() {
  searchResults.replaceChildren();
}

function renderSuggestions(suggestions) {
  clearResults();
  showStatus("Tìm kiếm thịnh hành");

  suggestions.forEach(function (suggestion) {
    const li = document.createElement("li");
    li.textContent = suggestion;

    li.addEventListener("click", function () {
      searchInput.value = suggestion;
      searchInput.dispatchEvent(new Event("input"));
    });

    searchResults.appendChild(li);
  });
}

async function loadTrendingSearches() {
  openSearchDropdown();
  showStatus("Đang tải gợi ý...");
  clearResults();

  try {
    const response = await fetch(`${API_URL}/api/search/trending?limit=10`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error("Không tải được tìm kiếm thịnh hành.");
    }

    renderSuggestions(data.trending_searches || []);
  } catch (error) {
    showStatus(error.message);
  }
}

function getTrackId(item) {
  const track = item?.track || item?.song || item || {};
  return track.track_id ?? track.id;
}

function extractTrackDetails(data) {
  return (
    data?.track ||
    data?.data?.track ||
    data?.data ||
    data?.result?.track ||
    data?.result ||
    data
  );
}

async function loadTrackDetails(item) {
  const trackId = getTrackId(item);

  if (!trackId) {
    throw new Error("Không tìm thấy ID bài hát để tải thông tin phát.");
  }

  const response = await fetch(
    `${API_URL}/api/tracks/${encodeURIComponent(trackId)}`,
  );
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error?.message ||
        `Không tải được bài hát (${response.status}).`,
    );
  }

  const track = extractTrackDetails(data);

  if (!track || typeof track !== "object") {
    throw new Error("API không trả về thông tin chi tiết bài hát.");
  }

  return { ...item, ...track };
}

function renderSearchResults(data) {
  clearResults();

  const results = data.results || {};
  const groups = [
    ["Bài hát", "tracks", results.tracks || []],
    ["Nghệ sĩ", "artists", results.artists || []],
    ["Album", "albums", results.albums || []],
    ["Playlist", "playlists", results.playlists || []],
  ];

  let foundResults = false;

  groups.forEach(function ([label, type, items]) {
    if (items.length === 0) return;

    foundResults = true;

    const heading = document.createElement("li");
    heading.textContent = label;
    heading.style.fontWeight = "bold";
    heading.style.cursor = "default";
    searchResults.appendChild(heading);

    items.forEach(function (item, index) {
      const li = document.createElement("li");
      li.textContent =
        item.name || item.title || item.display_name || "Không có tên";

      if (type === "tracks") {
        li.tabIndex = 0;
        li.setAttribute("role", "button");
        li.title = "Phát bài hát";

        const playTrack = async () => {
          if (!window.MusicPlayer) {
            showStatus("Trình phát nhạc chưa sẵn sàng.");
            console.error("MusicPlayer chưa được khởi tạo.");
            return;
          }

          li.setAttribute("aria-disabled", "true");
          showStatus("Đang tải thông tin bài hát...");

          try {
            const track = await loadTrackDetails(item);
            const trackData = track.track || track.song || track;
            const audioUrl =
              trackData.track_audio_url ||
              trackData.additional_info?.track_audio_url ||
              trackData.audio_url ||
              trackData.additional_info?.audio_url ||
              trackData.preview_url ||
              trackData.additional_info?.preview_url ||
              trackData.preview_audio_url ||
              trackData.additional_info?.preview_audio_url;

            if (!audioUrl) {
              throw new Error(
                "API chi tiết bài hát không trả về đường dẫn âm thanh.",
              );
            }

            const playableTrack = {
              ...trackData,
              track_id: trackData.track_id ?? trackData.id ?? getTrackId(item),
              track_title:
                trackData.track_title ||
                trackData.title ||
                trackData.name ||
                item.title ||
                item.name,
              artist_name:
                trackData.artist_name ||
                trackData.additional_info?.artist_name ||
                trackData.subtitle ||
                item.subtitle ||
                "",
              track_image_url:
                trackData.track_image_url ||
                trackData.image_url ||
                trackData.album_cover_image_url ||
                item.image_url ||
                "",
              track_duration:
                trackData.track_duration ??
                trackData.duration ??
                trackData.additional_info?.duration ??
                item.additional_info?.duration,
              track_audio_url: audioUrl,
            };

            await window.MusicPlayer.play(playableTrack, [playableTrack], 0);
            closeSearchDropdown();
          } catch (error) {
            console.error("Không thể phát bài hát từ tìm kiếm:", error);
            showStatus(error.message || "Không thể phát bài hát.");
          } finally {
            li.removeAttribute("aria-disabled");
          }
        };

        li.addEventListener("click", playTrack);
        li.addEventListener("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            playTrack();
          }
        });
      }

      searchResults.appendChild(li);
    });
  });

  showStatus(
    foundResults
      ? `Kết quả cho "${data.query || searchInput.value}"`
      : "Không tìm thấy kết quả.",
  );
}

async function searchUniversal(keyword) {
  openSearchDropdown();
  showStatus("Đang tìm kiếm...");
  clearResults();

  try {
    const params = new URLSearchParams({
      q: keyword,
      type: "all",
      limit: "20",
      offset: "0",
    });

    const response = await fetch(`${API_URL}/api/search?${params.toString()}`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error("Tìm kiếm thất bại.");
    }

    renderSearchResults(data);
  } catch (error) {
    showStatus(error.message);
  }
}

searchInput.addEventListener("focus", function () {
  if (searchInput.value.trim()) {
    searchUniversal(searchInput.value.trim());
  } else {
    loadTrendingSearches();
  }
});

searchInput.addEventListener("input", function () {
  clearTimeout(debounceTimer);

  const keyword = searchInput.value.trim();

  if (!keyword) {
    loadTrendingSearches();
    return;
  }

  debounceTimer = setTimeout(function () {
    searchUniversal(keyword);
  }, 300);
});

document.addEventListener("click", function (event) {
  if (
    !searchBox.contains(event.target) &&
    !searchDropdown.contains(event.target)
  ) {
    closeSearchDropdown();
  }
});
