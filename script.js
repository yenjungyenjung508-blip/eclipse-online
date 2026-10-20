
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const toast = $("#site-toast");
  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 3000);
  }

  /* 開場動畫 */

  const intro = $("#intro-screen");
  const introEnter = $("#intro-enter");
  const introSkip = $("#intro-skip");
  let introClosed = false;

  function closeIntro() {
    if (!intro || introClosed) return;
    introClosed = true;
    intro.classList.add("is-hidden");
    document.body.classList.remove("intro-active");
    window.setTimeout(() => {
      intro.hidden = true;
    }, 750);
  }

  if (intro) {
    document.body.classList.add("intro-active");
    if (introEnter) introEnter.addEventListener("click", closeIntro);
    if (introSkip) introSkip.addEventListener("click", closeIntro);
    window.setTimeout(closeIntro, 4500);
  }

  /* 手機導覽 */

  const menuToggle = $("#menu-toggle");
  const mainNav = $("#main-nav");

  function setMenuOpen(open) {
    if (!menuToggle || !mainNav) return;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "關閉選單" : "開啟選單");
    mainNav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  }

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
    });

    $$("#main-nav a").forEach(link => {
      link.addEventListener("click", () => setMenuOpen(false));
    });

    document.addEventListener("click", event => {
      if (
        mainNav.classList.contains("is-open") &&
        !mainNav.contains(event.target) &&
        !menuToggle.contains(event.target)
      ) setMenuOpen(false);
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 760) setMenuOpen(false);
    });
  }

  /* 職業資料 */

  const classes = {
    knight: {
      number: "01 / 03",
      name: "聖殿騎士",
      english: "TEMPLE KNIGHT",
      subtitle: "HOLY GUARDIAN",
      image: "assets/images/knight.jpg",
      description: "身披古老誓約的重裝戰士，以堅定意志守護同伴，在黑暗最深處築起不可撼動的防線。",
      role: "近戰・守護",
      type: "melee",
      badges: ["近戰", "防禦", "守護"],
      stats: { attack: 75, defense: 95, speed: 55, magic: 45 },
      skills: ["神聖壁壘", "守護誓約", "制裁重擊"]
    },
    assassin: {
      number: "02 / 03",
      name: "暗影刺客",
      english: "SHADOW ASSASSIN",
      subtitle: "BLADE OF SHADOWS",
      image: "assets/images/assassin.jpg",
      description: "行走於光影交界的迅捷獵手，以敏捷身法與精準攻擊掌握戰局，在敵人察覺之前決定勝負。",
      role: "近戰・敏捷",
      type: "melee",
      badges: ["近戰", "敏捷", "爆發"],
      stats: { attack: 92, defense: 48, speed: 98, magic: 42 },
      skills: ["瞬影突襲", "致命標記", "暗幕遁形"]
    },
    mage: {
      number: "03 / 03",
      name: "符文法師",
      english: "RUNE MAGE",
      subtitle: "KEEPER OF ARCANE",
      image: "assets/images/mage.jpg",
      description: "研習古代符文與失落秘術的施法者，能引導強大的魔法能量，以智慧與元素之力扭轉戰場。",
      role: "遠程・魔法",
      type: "ranged",
      badges: ["遠程", "魔法", "元素"],
      stats: { attack: 94, defense: 40, speed: 60, magic: 100 },
      skills: ["星隕術式", "永夜結界", "奧術共鳴"]
    }
  };

  const classOrder = Object.keys(classes);
  let currentClass = "knight";
  let activeClassFilter = "all";
  let classSearch = "";

  const classArt = $("#class-art");
  const favoriteButton = $("#favorite-class");

  function readFavorites() {
    try {
      const saved = JSON.parse(localStorage.getItem("eclipse-favorite-classes") || "[]");
      return Array.isArray(saved) ? saved.filter(key => classOrder.includes(key)) : [];
    } catch {
      return [];
    }
  }

  let favorites = readFavorites();

  function saveFavorites() {
    try {
      localStorage.setItem("eclipse-favorite-classes", JSON.stringify(favorites));
    } catch {
      showToast("瀏覽器未允許儲存收藏，重新整理後可能無法保留。");
    }
  }

  function updateFavoritesUI() {
    const isFavorite = favorites.includes(currentClass);
    if ($("#favorite-icon")) $("#favorite-icon").textContent = isFavorite ? "★" : "☆";
    if ($("#favorite-label")) $("#favorite-label").textContent = isFavorite ? "已收藏此職業" : "收藏此職業";
    if (favoriteButton) favoriteButton.setAttribute("aria-pressed", String(isFavorite));

    $$(".class-card").forEach(card => {
      const active = card.dataset.cardClass === currentClass;
      card.classList.toggle("is-active", active);
      card.setAttribute("aria-pressed", String(active));
      card.classList.toggle("is-favorite", favorites.includes(card.dataset.cardClass));
    });
  }

  function updateStats(stats) {
    ["attack", "defense", "speed", "magic"].forEach(key => {
      const bar = $(`#stat-${key}`);
      const value = $(`#value-${key}`);
      const number = Math.max(0, Math.min(100, Number(stats[key]) || 0));
      if (bar) bar.style.width = `${number}%`;
      if (bar) bar.setAttribute("aria-label", `${key}: ${number}`);
      if (value) value.textContent = String(number);
    });
  }

  function selectClass(key) {
    const data = classes[key];
    if (!data) return;
    currentClass = key;

    $$(".class-tab").forEach(button => {
      const active = button.dataset.class === key;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if ($("#class-number")) $("#class-number").textContent = data.number;
    if ($("#class-name")) $("#class-name").textContent = data.name;
    if ($("#class-english")) $("#class-english").textContent = data.english;
    if ($("#class-subtitle")) $("#class-subtitle").textContent = data.subtitle;
    if ($("#class-description")) $("#class-description").textContent = data.description;

    if (classArt) {
      classArt.classList.add("is-changing");
      classArt.onerror = () => {
        classArt.classList.remove("is-changing");
        showToast(`無法載入圖片：${data.image}，請檢查檔名與路徑。`);
      };
      classArt.onload = () => classArt.classList.remove("is-changing");

      // 先設定事件，再更換來源，避免快取圖片錯過載入事件。
      window.setTimeout(() => {
        classArt.src = data.image;
        classArt.alt = `${data.name}職業圖片`;
        if (classArt.complete && classArt.naturalWidth > 0) {
          classArt.classList.remove("is-changing");
        }
      }, 120);
    }

    const badges = $("#class-badges");
    if (badges) {
      badges.replaceChildren();
      data.badges.forEach(text => {
        const span = document.createElement("span");
        span.textContent = text;
        badges.appendChild(span);
      });
    }

    const skills = $("#class-skills");
    if (skills) {
      skills.replaceChildren();
      data.skills.forEach(text => {
        const span = document.createElement("span");
        span.textContent = text;
        skills.appendChild(span);
      });
    }

    updateStats(data.stats);
    updateFavoritesUI();
    applyClassFilters();
  }

  function moveClass(direction) {
    const index = classOrder.indexOf(currentClass);
    const next = (index + direction + classOrder.length) % classOrder.length;
    selectClass(classOrder[next]);
  }

  $$(".class-tab").forEach(button => {
    button.addEventListener("click", () => selectClass(button.dataset.class));
  });

  $$(".class-card").forEach(button => {
    button.addEventListener("click", () => selectClass(button.dataset.cardClass));
  });

  if ($("#class-prev")) $("#class-prev").addEventListener("click", () => moveClass(-1));
  if ($("#class-next")) $("#class-next").addEventListener("click", () => moveClass(1));

  if (favoriteButton) {
    favoriteButton.addEventListener("click", () => {
      if (favorites.includes(currentClass)) {
        favorites = favorites.filter(key => key !== currentClass);
        showToast("已取消收藏。");
      } else {
        favorites.push(currentClass);
        showToast(`已收藏「${classes[currentClass].name}」。`);
      }
      saveFavorites();
      updateFavoritesUI();
    });
  }

  function applyClassFilters() {
    const cards = $$(".class-card");
    let visibleCount = 0;

    cards.forEach(card => {
      const key = card.dataset.cardClass;
      const data = classes[key];
      const matchesType = activeClassFilter === "all" || data.type === activeClassFilter;
      const query = classSearch.trim().toLocaleLowerCase();
      const haystack = [data.name, data.english, data.description, data.role, ...data.badges, ...data.skills]
        .join(" ")
        .toLocaleLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const visible = matchesType && matchesSearch;

      card.hidden = !visible;
      if (visible) visibleCount++;
    });

    if ($("#class-empty")) $("#class-empty").hidden = visibleCount > 0;
  }

  $$("#classes [data-class-filter]").forEach(button => {
    button.addEventListener("click", () => {
      activeClassFilter = button.dataset.classFilter;
      $$("#classes [data-class-filter]").forEach(item => {
        item.classList.toggle("is-active", item === button);
      });
      applyClassFilters();
    });
  });

  const classSearchInput = $("#class-search");
  if (classSearchInput) {
    classSearchInput.addEventListener("input", () => {
      classSearch = classSearchInput.value;
      applyClassFilters();
    });
  }

  if ($("#class-reset")) {
    $("#class-reset").addEventListener("click", () => {
      activeClassFilter = "all";
      classSearch = "";
      if (classSearchInput) classSearchInput.value = "";
      $$("#classes [data-class-filter]").forEach(button => {
        button.classList.toggle("is-active", button.dataset.classFilter === "all");
      });
      applyClassFilters();
    });
  }

  selectClass("knight");

  /* 地圖區域 */

  const regions = {
    capital: {
      index: "REGION 01 / 04",
      name: "暮光王城",
      english: "THE DUSK CAPITAL",
      description: "曾經繁盛的王國中心，如今仍有守衛與旅人試圖在漫長黑夜中維持秩序。這裡是旅程的起點，也是尋找線索的重要據點。",
      type: "安全區域",
      level: "初階冒險者"
    },
    forest: {
      index: "REGION 02 / 04",
      name: "幽影森林",
      english: "THE SHADOW FOREST",
      description: "終年被濃霧籠罩的古老森林。扭曲的樹影間傳來奇異低語，失落的道路可能通往被遺忘的秘密。",
      type: "探索區域",
      level: "初階至中階"
    },
    ruins: {
      index: "REGION 03 / 04",
      name: "失落遺跡",
      english: "THE FORGOTTEN RUINS",
      description: "沉睡在歷史深處的古代遺址，斷裂的石柱與殘缺符文記錄著永夜以前的文明。",
      type: "遺跡區域",
      level: "中階冒險者"
    },
    abyss: {
      index: "REGION 04 / 04",
      name: "深淵邊境",
      english: "THE ABYSS FRONTIER",
      description: "光明難以抵達的危險邊境。傳聞黑暗力量從此處蔓延，唯有準備充分的冒險者才敢深入。",
      type: "高危險區域",
      level: "高階冒險者"
    }
  };

  function selectRegion(key) {
    const data = regions[key];
    if (!data) return;

    Object.entries({
      "#region-index": data.index,
      "#region-name": data.name,
      "#region-english": data.english,
      "#region-description": data.description,
      "#region-type": data.type,
      "#region-level": data.level
    }).forEach(([selector, value]) => {
      const element = $(selector);
      if (element) element.textContent = value;
    });

    $$("[data-region]").forEach(button => {
      const active = button.dataset.region === key;
      button.classList.toggle("is-active", active);
      if (button.matches(".region-option")) {
        button.setAttribute("aria-pressed", String(active));
      }
    });
  }

  $$("[data-region]").forEach(button => {
    button.addEventListener("click", () => selectRegion(button.dataset.region));
  });

  selectRegion("capital");

  /* 公告搜尋與分類 */

  let activeNewsFilter = "all";
  let newsSearch = "";

  function filterNews() {
    const cards = $$("#news-grid .news-card");
    let visibleCount = 0;

    cards.forEach(card => {
      const category = card.dataset.category;
      const query = newsSearch.trim().toLocaleLowerCase();
      const matchesCategory = activeNewsFilter === "all" || category === activeNewsFilter;
      const matchesSearch = !query || card.textContent.toLocaleLowerCase().includes(query);
      const visible = matchesCategory && matchesSearch;

      card.hidden = !visible;
      if (visible) visibleCount++;
    });

    if ($("#news-empty")) $("#news-empty").hidden = visibleCount > 0;
    if ($("#news-count")) {
      $("#news-count").textContent = `${String(visibleCount).padStart(2, "0")} RECORDS`;
    }
  }

  $$("#news [data-news-filter]").forEach(button => {
    button.addEventListener("click", () => {
      activeNewsFilter = button.dataset.newsFilter;
      $$("#news [data-news-filter]").forEach(item => {
        item.classList.toggle("is-active", item === button);
      });
      filterNews();
    });
  });

  if ($("#news-search")) {
    $("#news-search").addEventListener("input", event => {
      newsSearch = event.target.value;
      filterNews();
    });
  }

  filterNews();

  /* 捲動淡入 */

  const revealElements = $$(".reveal");

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -25px 0px" });

    revealElements.forEach(element => revealObserver.observe(element));
  } else {
    revealElements.forEach(element => element.classList.add("is-revealed"));
  }

  /* 返回頂部 */

  const backToTop = $("#back-to-top");

  function updateBackToTop() {
    if (backToTop) backToTop.classList.toggle("is-visible", window.scrollY > 420);
  }

  window.addEventListener("scroll", updateBackToTop, { passive: true });
  updateBackToTop();

  if (backToTop) {
    backToTop.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: document.body.classList.contains("reduce-motion") ? "auto" : "smooth"
      });
    });
  }

  /* 背景音樂 */

  const music = $("#bg-music");
  const musicToggle = $("#music-toggle");
  const musicLabel = $("#music-label");
  let musicAllowed = true;

  function updateMusicButton(playing) {
    if (musicToggle) musicToggle.setAttribute("aria-pressed", String(playing));
    if (musicLabel) musicLabel.textContent = playing ? "關閉音樂" : "播放音樂";
  }

  async function toggleMusic() {
    if (!music || !musicAllowed) {
      showToast("背景音樂目前已在設定中關閉。");
      return;
    }

    if (!music.paused) {
      music.pause();
      updateMusicButton(false);
      showToast("背景音樂已暫停。");
      return;
    }

    try {
      await music.play();
      updateMusicButton(true);
      showToast("背景音樂播放中。");
    } catch (error) {
      updateMusicButton(false);
      if (error && error.name === "NotSupportedError") {
        showToast("音樂格式不支援，請檢查 theme.mp3。");
      } else {
        showToast("無法播放音樂，請確認 assets/audio/theme.mp3 是否存在。");
      }
    }
  }

  if (musicToggle) musicToggle.addEventListener("click", toggleMusic);
  if (music) {
    music.addEventListener("play", () => updateMusicButton(true));
    music.addEventListener("pause", () => updateMusicButton(false));
    music.addEventListener("error", () => updateMusicButton(false));
  }

  /* 網站設定與瀏覽器本機儲存 */

  const settingsDialog = $("#settings-dialog");
  const settingsOpen = $("#settings-open");
  const settingsClose = $("#settings-close");
  const brightnessSetting = $("#brightness-setting");
  const motionSetting = $("#motion-setting");
  const musicSetting = $("#music-setting");
  const settingsReset = $("#settings-reset");
  const settingsSave = $("#settings-save");

  const defaultSettings = {
    brightness: 100,
    reduceMotion: false,
    musicAllowed: true
  };

  function readSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem("eclipse-site-settings") || "null");
      return stored && typeof stored === "object"
        ? { ...defaultSettings, ...stored }
        : { ...defaultSettings };
    } catch {
      return { ...defaultSettings };
    }
  }

  let settings = readSettings();

  function applySettings() {
    const brightness = Math.max(70, Math.min(120, Number(settings.brightness) || 100));
    document.documentElement.style.setProperty("--brightness", String(brightness / 100));
    document.body.classList.toggle("reduce-motion", Boolean(settings.reduceMotion));
    musicAllowed = Boolean(settings.musicAllowed);

    if (brightnessSetting) brightnessSetting.value = String(brightness);
    if (motionSetting) motionSetting.checked = Boolean(settings.reduceMotion);
    if (musicSetting) musicSetting.checked = musicAllowed;

    if (!musicAllowed && music && !music.paused) {
      music.pause();
      updateMusicButton(false);
    }
  }

  function saveSettings() {
    settings = {
      brightness: brightnessSetting ? Number(brightnessSetting.value) : 100,
      reduceMotion: motionSetting ? motionSetting.checked : false,
      musicAllowed: musicSetting ? musicSetting.checked : true
    };

    applySettings();

    try {
      localStorage.setItem("eclipse-site-settings", JSON.stringify(settings));
      showToast("網站設定已儲存於此瀏覽器。");
    } catch {
      showToast("設定已套用，但瀏覽器無法永久儲存。");
    }
  }

  function openSettings() {
    if (!settingsDialog) return;
    applySettings();

    if (typeof settingsDialog.showModal === "function") {
      if (!settingsDialog.open) settingsDialog.showModal();
    } else {
      showToast("此瀏覽器不支援設定對話框。");
    }
  }

  function closeSettings() {
    if (settingsDialog && settingsDialog.open) settingsDialog.close();
  }

  if (settingsOpen) settingsOpen.addEventListener("click", openSettings);
  if (settingsClose) settingsClose.addEventListener("click", closeSettings);
  if (settingsSave) settingsSave.addEventListener("click", () => {
    saveSettings();
    closeSettings();
  });

  if (settingsReset) {
    settingsReset.addEventListener("click", () => {
      settings = { ...defaultSettings };
      applySettings();
      showToast("已恢復預設設定，按「完成設定」儲存。");
    });
  }

  if (settingsDialog) {
    settingsDialog.addEventListener("click", event => {
      if (event.target === settingsDialog) closeSettings();
    });
  }

  applySettings();

  /* 頁尾年份 */

  const year = $("#current-year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* 鍵盤操作 */

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeIntro();
      setMenuOpen(false);
    }
  });

  console.info("ECLIPSE ONLINE：網站互動功能初始化完成。");
});
