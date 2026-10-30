console.log("trending.js đã chạy!");

const TRENDING_API_URL = "https://spotify.f8team.dev";

async function playTrendingTrack(track, card, playButton) {
  if (!window.MusicPlayer) {
    console.error("MusicPlayer chưa được khởi tạo.");
    alert("Trình phát nhạc chưa sẵn sàng. Vui lòng tải lại trang.");
    return;
  }

  const trackId = track.track_id || track.id;

  if (!trackId) {
    alert("Không tìm thấy ID bài hát.");
    return;
  }

  playButton.disabled = true;
  card.setAttribute("aria-busy", "true");

  try {
    const response = await fetch(
      `${TRENDING_API_URL}/api/tracks/${encodeURIComponent(trackId)}`,
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message ||
          data.error?.message ||
          `Không tải được bài hát (${response.status}).`,
      );
    }

    const details =
      data.track || data.data?.track || data.data || data.result?.track || data;
    const audioUrl =
      details.track_audio_url ||
      details.audio_url ||
      details.additional_info?.track_audio_url ||
      details.additional_info?.audio_url;

    if (!audioUrl) {
      throw new Error("API chi tiết bài hát không trả về đường dẫn âm thanh.");
    }

    const playableTrack = {
      ...details,
      track_id: details.track_id || details.id || trackId,
      track_title:
        details.track_title ||
        details.title ||
        details.name ||
        track.title ||
        "Bài hát không tên",
      artist_name:
        details.artist_name ||
        details.additional_info?.artist_name ||
        details.subtitle ||
        track.additional_info?.artist_name ||
        track.subtitle ||
        "Nghệ sĩ không xác định",
      track_image_url:
        details.track_image_url ||
        details.image_url ||
        details.album_cover_image_url ||
        track.image_url ||
        "",
      track_duration:
        details.track_duration ??
        details.duration ??
        details.additional_info?.duration ??
        track.additional_info?.duration,
      track_audio_url: audioUrl,
    };

    await window.MusicPlayer.play(playableTrack, [playableTrack], 0);
  } catch (error) {
    console.error("Không thể phát bài hát thịnh hành:", error);
    alert(error.message || "Không thể phát bài hát.");
  } finally {
    playButton.disabled = false;
    card.removeAttribute("aria-busy");
  }
}

async function loadTrendingSongs() {
  const songList = document.querySelector("#trending-song-list");

  if (!songList) {
    console.error("Không tìm thấy #trending-song-list");
    return;
  }

  songList.textContent = "Đang tải bài hát...";

  try {
    const trendingResponse = await fetch(
      `${TRENDING_API_URL}/api/search/trending?limit=10`,
    );

    if (!trendingResponse.ok) {
      throw new Error("Không tải được từ khóa thịnh hành.");
    }

    const trendingData = await trendingResponse.json();
    const keywords = trendingData.trending_searches || [];

    const responses = await Promise.all(
      keywords.map(async (keyword) => {
        const params = new URLSearchParams({
          q: keyword,
          type: "track",
          limit: "5",
          offset: "0",
        });

        const response = await fetch(
          `${TRENDING_API_URL}/api/search?${params.toString()}`,
        );

        if (!response.ok) return [];

        const data = await response.json();
        return data.results?.tracks || [];
      }),
    );

    const uniqueTracks = new Map();

    responses.flat().forEach((track) => {
      if (track.id && !uniqueTracks.has(track.id)) {
        uniqueTracks.set(track.id, track);
      }
    });

    const tracks = [...uniqueTracks.values()];

    if (tracks.length === 0) {
      songList.textContent = "Chưa có bài hát để hiển thị.";
      return;
    }

    songList.replaceChildren();

    tracks.forEach((track) => {
      const card = document.createElement("div");
      card.className = "song-card";

      const imageBox = document.createElement("div");
      imageBox.className = "song-image";

      const image = document.createElement("img");
      image.alt = track.title || "Bài hát";
      image.loading = "lazy";

      if (track.image_url) {
        image.src = track.image_url;
      } else {
        image.classList.add("image-unavailable");
      }

      image.addEventListener("error", () => {
        image.removeAttribute("src");
        image.classList.add("image-unavailable");
      });

      const playButton = document.createElement("button");
      playButton.className = "play-btn";
      playButton.type = "button";
      playButton.title = `Play ${track.title || "bài hát"}`;
      playButton.setAttribute(
        "aria-label",
        `Phát ${track.title || "bài hát"}`,
      );

      const playIcon = document.createElement("i");
      playIcon.className = "fa-solid fa-play";
      playButton.appendChild(playIcon);

      imageBox.append(image, playButton);

      const title = document.createElement("h3");
      title.textContent = track.title || "Chưa có tên";

      const artist = document.createElement("p");
      artist.textContent =
        track.additional_info?.artist_name ||
        track.subtitle ||
        "Chưa rõ nghệ sĩ";

      card.append(imageBox, title, artist);

      playButton.addEventListener("click", (event) => {
        event.stopPropagation();
        playTrendingTrack(track, card, playButton);
      });

      card.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        playTrendingTrack(track, card, playButton);
      });

      songList.appendChild(card);
    });

    console.log(`Đã hiển thị ${tracks.length} bài hát.`);
  } catch (error) {
    console.error("Không tải được danh sách bài hát:", error);
    songList.textContent = "Không tải được bài hát. Hãy thử tải lại trang.";
  }
}

loadTrendingSongs();
