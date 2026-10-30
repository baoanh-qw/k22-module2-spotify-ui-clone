const MusicPlayer = (() => {
  const audio = new Audio();

  let tracks = [];
  let currentIndex = -1;
  let isShuffle = false;
  let repeatMode = 0; // 0: tắt, 1: lặp bài, 2: lặp danh sách

  const $ = (selector) => document.querySelector(selector);

  const cover = $(".sp-cover");
  const title = $(".sp-title");
  const artist = $(".sp-artist");
  const playButton = $(".sp-play");
  const seek = $(".sp-seek");
  const currentTime = $(".sp-current-time");
  const duration = $(".sp-duration");
  const volume = $(".sp-volume");
  const shuffleButton = $(".sp-shuffle");
  const repeatButton = $(".sp-repeat");

  // Định dạng giây thành phút:giây
  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${minutes}:${String(secs).padStart(2, "0")}`;
  }

  // Lấy thông tin bài hát theo đúng cấu trúc API
  function getTrackInfo(track) {
    const data = track?.track || track?.song || track || {};

    return {
      id: data.track_id ?? data.id,
      title:
        data.track_title || data.title || data.name || "Không rõ tên bài hát",

      artist:
        data.artist_name ||
        data.additional_info?.artist_name ||
        data.subtitle ||
        data.artist?.name ||
        data.artist ||
        "Không rõ nghệ sĩ",

      image:
        data.track_image_url ||
        data.album_cover_image_url ||
        data.cover_image_url ||
        data.image_url ||
        "",

      audioUrl:
        data.track_audio_url ||
        data.additional_info?.track_audio_url ||
        data.audio_url ||
        data.additional_info?.audio_url ||
        data.preview_url ||
        data.additional_info?.preview_url ||
        data.preview_audio_url ||
        data.additional_info?.preview_audio_url ||
        "",
      duration:
        Number(data.track_duration ?? data.duration_seconds ?? data.duration) ||
        0,
    };
  }

  // Cập nhật biểu tượng Play/Pause
  function updatePlayButton() {
    const playing = !audio.paused;

    // Nút Play/Pause ở thanh phát nhạc phía dưới
    if (playButton) {
      playButton.innerHTML = playing
        ? '<i class="fa-solid fa-pause"></i>'
        : '<i class="fa-solid fa-play"></i>';

      playButton.setAttribute(
        "aria-label",
        playing ? "Pause" : "Play",
      );
    }

    document.querySelectorAll(".playlist-play-button").forEach((button) => {
      syncPlaylistButton(button, playing);
    });

    // Đồng bộ các nút Play/Pause trong playlist
    document.querySelectorAll(".playlist-detail-play").forEach((button) => {
      const isCurrentTrack =
        button.dataset.trackId ===
        String(
          tracks[currentIndex]?.track_id ?? tracks[currentIndex]?.id ?? "",
        );

      button.innerHTML =
        playing && isCurrentTrack
          ? '<i class="fa-solid fa-pause"></i>'
          : '<i class="fa-solid fa-play"></i>';
    });
  }

  function syncPlaylistButton(button, playing = !audio.paused) {
    if (!button) return;

    button.innerHTML = playing
      ? `<svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 4h4v16H6zM14 4h4v16h-4z"/>
        </svg>`
      : `<svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3.5c-.6-.35-1.35.08-1.35.78v15.44c0 .7.75 1.13 1.35.78l12.2-7.72a.92.92 0 0 0 0-1.56L7 3.5Z"/>
        </svg>`;
    button.classList.toggle("is-playing", playing);
    button.title = playing ? "Tạm dừng playlist" : "Phát playlist";
    button.setAttribute(
      "aria-label",
      playing ? "Tạm dừng playlist" : "Phát playlist",
    );
  }

  // Cập nhật thời gian và thanh tiến trình
  function updateProgress() {
    if (currentTime) {
      currentTime.textContent = formatTime(audio.currentTime);
    }

    if (duration) {
      duration.textContent = formatTime(
        Number.isFinite(audio.duration) ? audio.duration : 0,
      );
    }

    if (seek) {
      const total = audio.duration;

      seek.value =
        Number.isFinite(total) && total > 0
          ? (audio.currentTime / total) * 100
          : 0;
    }
  }

  // Cập nhật thông tin bài hát trên footer
  function updateTrackDisplay(track) {
    const info = getTrackInfo(track);
    console.log("ĐANG CHỌN BÀI:", track);
    console.log("URL AUDIO:", info.audioUrl);

    if (title) title.textContent = info.title;
    if (artist) artist.textContent = info.artist;

    if (cover) {
      cover.onerror = null;
      cover.src = info.image;
      cover.alt = `Ảnh bìa ${info.title}`;

      cover.onerror = () => {
        cover.removeAttribute("src");
      };
    }

    if (duration) {
      duration.textContent = formatTime(info.duration);
    }

    if (currentTime) currentTime.textContent = "0:00";
    if (seek) seek.value = 0;
  }

  // Phát bài hát theo vị trí trong danh sách
  async function playTrack(index) {
    if (index < 0 || index >= tracks.length) return;

    currentIndex = index;

    const track = tracks[currentIndex];
    const info = getTrackInfo(track);

    updateTrackDisplay(track);

    if (!info.audioUrl) {
      audio.pause();
      audio.removeAttribute("src");
      updatePlayButton();

      console.warn("Không tìm thấy track_audio_url:", track);

      alert("Bài hát chưa có đường dẫn âm thanh hợp lệ.");
      return;
    }

    audio.src = info.audioUrl;
    audio.load();

    try {
      await audio.play();
    } catch (error) {
      console.error("Không phát được bài hát:", error);
      updatePlayButton();
    }
  }

  // Nhận danh sách bài hát từ bên ngoài
  async function play(track, playlistTracks = [track], index = 0) {
    if (!track) return;

    tracks = Array.isArray(playlistTracks) ? playlistTracks : [track];

    if (tracks.length === 0) {
      tracks = [track];
    }

    await playTrack(index);
  }

  // Phát hoặc tạm dừng
  async function togglePlay() {
    if (!audio.src) {
      if (tracks.length > 0 && currentIndex >= 0) {
        await playTrack(currentIndex);
      } else {
        alert("Hãy chọn một bài hát trong danh sách trước.");
      }

      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
      } catch (error) {
        console.error("Không thể tiếp tục phát:", error);
      }
    } else {
      audio.pause();
    }

    updatePlayButton();
  }

  // Chuyển bài tiếp theo
  async function next() {
    if (tracks.length === 0) return;

    if (isShuffle && tracks.length > 1) {
      let nextIndex;

      do {
        nextIndex = Math.floor(Math.random() * tracks.length);
      } while (nextIndex === currentIndex);

      await playTrack(nextIndex);
      return;
    }

    if (currentIndex < tracks.length - 1) {
      await playTrack(currentIndex + 1);
    } else if (repeatMode === 2) {
      await playTrack(0);
    } else {
      audio.pause();
      audio.currentTime = 0;
      updatePlayButton();
      updateProgress();
    }
  }

  // Quay lại bài trước
  async function previous() {
    if (tracks.length === 0) return;

    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const previousIndex =
      currentIndex > 0 ? currentIndex - 1 : tracks.length - 1;

    await playTrack(previousIndex);
  }

  // Bật/tắt phát ngẫu nhiên
  function toggleShuffle() {
    isShuffle = !isShuffle;

    if (shuffleButton) {
      shuffleButton.style.color = isShuffle ? "#1ed760" : "";
      shuffleButton.setAttribute(
        "aria-label",
        isShuffle ? "Turn off Shuffle" : "Shuffle",
      );
    }
  }

  // Chuyển chế độ lặp
  function toggleRepeat() {
    repeatMode = (repeatMode + 1) % 3;

    if (!repeatButton) return;

    repeatButton.style.color = repeatMode > 0 ? "#1ed760" : "";
    const repeatLabels = [
      "No repeat",
      "Repeat current track",
      "Repeat playlist",
    ];
    repeatButton.setAttribute("aria-label", repeatLabels[repeatMode]);

    repeatButton.innerHTML =
      repeatMode === 1
        ? '<i class="fa-solid fa-repeat"></i><sup>1</sup>'
        : '<i class="fa-solid fa-repeat"></i>';
  }

  // Khi bài hát kết thúc
  audio.addEventListener("ended", async () => {
    if (repeatMode === 1) {
      audio.currentTime = 0;

      try {
        await audio.play();
      } catch (error) {
        console.error(error);
      }

      return;
    }

    if (isShuffle || currentIndex < tracks.length - 1 || repeatMode === 2) {
      await next();
    } else {
      updatePlayButton();
    }
  });

  // Sự kiện âm thanh
  audio.addEventListener("play", updatePlayButton);
  audio.addEventListener("pause", updatePlayButton);
  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("loadedmetadata", updateProgress);
  audio.addEventListener("durationchange", updateProgress);

  // Các nút điều khiển
  playButton?.addEventListener("click", togglePlay);
  $(".sp-prev")?.addEventListener("click", previous);
  $(".sp-next")?.addEventListener("click", next);

  shuffleButton?.addEventListener("click", toggleShuffle);
  repeatButton?.addEventListener("click", toggleRepeat);

  // Tua bài hát
  seek?.addEventListener("input", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (Number(seek.value) / 100) * audio.duration;
    }
  });

  // Điều chỉnh âm lượng
  if (volume) {
    audio.volume = Number(volume.value);

    volume.addEventListener("input", () => {
      audio.volume = Number(volume.value);
    });
  }

  // Nút Add to Library: chưa nối API
  $(".sp-add")?.addEventListener("click", () => {
    alert("Chức năng thêm bài hát vào thư viện chưa được kết nối.");
  });

  return {
    play,
    next,
    previous,
    togglePlay,
    syncPlaylistButton,
  };
})();

// Cho phép sidebar.js gọi trình phát nhạc
window.MusicPlayer = MusicPlayer;
