
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  // 本地設定儲存：若瀏覽器不支援儲存，其他功能仍可使用。
  const storage = {
    get(key, fallback = null) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, String(value));
      } catch {
        // 隱私模式或儲存空間受限時，忽略儲存錯誤。
      }
    }
  };

  // 進場畫面
  const intro = $("#intro-screen");
  const enterButton = $("#enter-world");

  function enterWorld() {
    if (!intro || intro.classList.contains("is-hidden")) return;
    intro.classList.add("is-hidden");
    storage.set("eclipse-intro-seen", "yes");
  }

  if (storage.get("eclipse-intro-seen") === "yes" && intro) {
    intro.classList.add("is-hidden");
  }
  enterButton?.addEventListener("click", enterWorld);

  // 若訪客尚未按下進入，點擊導覽連結時也允許進入。
  $$(".site-header a, .hero-actions a").forEach(link => {
    link.addEventListener("click", enterWorld);
  });

  // 手機選單
  const menuToggle = $("#menu-toggle");
  const mainNav = $("#main-nav");

  function closeMenu() {
    mainNav?.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
    menuToggle?.setAttribute("aria-label", "開啟導覽選單");
  }

  menuToggle?.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "關閉導覽選單" : "開啟導覽選單");
  });

  $$("#main-nav a").forEach(link => link.addEventListener("click", closeMenu));

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeMenu();
      closeSettings();
      closeNews();
    }
  });

  // 職業資料：圖片沿用既有路徑。
  const classes = {
    knight: {
      number: "CLASS 01",
      name: "聖誓騎士",
      role: "近戰防禦・守護者",
      description: "以堅定信念守護同伴，揮舞重劍迎戰黑暗。騎士擁有強大的防禦能力，是隊伍最可靠的前線。",
      image: "assets/images/knight.jpg",
      alt: "騎士職業形象",
      attack: 75, defense: 95, speed: 45, magic: 40,
      tags: ["重甲", "守護", "近戰"]
    },
    assassin: {
      number: "CLASS 02",
      name: "暗影刺客",
      role: "高速突襲・暗影獵手",
      description: "行走於光影交界，以敏捷身法尋找敵人的破綻。刺客擅長高速攻擊與突襲，在敵人察覺之前決定勝負。",
      image: "assets/images/assassin.jpg",
      alt: "刺客職業形象",
      attack: 90, defense: 45, speed: 98, magic: 35,
      tags: ["雙刃", "潛行", "高速"]
    },
    mage: {
      number: "CLASS 03",
      name: "星蝕法師",
      role: "遠距魔法・元素掌控",
      description: "研究星辰與古代禁忌的施法者，將魔力化為毀滅性的力量。法師擅長遠距離攻擊，但需要注意自身防禦。",
      image: "assets/images/mage.jpg",
      alt: "法師職業形象",
      attack: 88, defense: 35, speed: 55, magic: 100,
      tags: ["魔法", "遠程", "元素"]
    }
  };

  let currentClass = "knight";
  const favoriteButton = $("#favorite-class");
  const classArt = $("#class-art");

  function updateFavoriteButton() {
    const isFavorite = storage.get("eclipse-favorite-class") === currentClass;
    if (!favoriteButton) return;
    favoriteButton.classList.toggle("is-favorite", isFavorite);
    favoriteButton.setAttribute("aria-pressed", String(isFavorite));
    favoriteButton.textContent = isFavorite ? "★ 已收藏職業" : "☆ 收藏職業";
  }

  function showClass(key) {
    const item = classes[key];
    if (!item) return;
    currentClass = key;

    $$(".class-tab").forEach(tab => {
      const active = tab.dataset.class === key;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-pressed", String(active));
    });

    if (classArt) {
      classArt.style.opacity = "0.2";
      const preload = new Image();
      preload.onload = () => {
        if (currentClass !== key) return;
        classArt.src = item.image;
        classArt.alt = item.alt;
        classArt.style.opacity = "1";
      };
      preload.onerror = () => {
        classArt.style.opacity = "1";
        classArt.alt = item.alt + "（圖片載入失敗，請檢查圖片路徑）";
        console.warn("職業圖片無法載入：", item.image);
      };
      preload.src = item.image;

      // 圖片快取命中時 onload 仍會觸發；不改動原有圖片檔案。
    }

    $("#class-number").textContent = item.number;
    $("#class-name").textContent = item.name;
    $("#class-role").textContent = item.role;
    $("#class-description").textContent = item.description;

    ["attack", "defense", "speed", "magic"].forEach(stat => {
      $(`#stat-${stat}`).style.width = `${item[stat]}%`;
      $(`#${stat}-value`).textContent = item[stat];
    });

    $("#class-tags").replaceChildren(
      ...item.tags.map(tag => {
        const span = document.createElement("span");
        span.textContent = tag;
        return span;
      })
    );

    updateFavoriteButton();
  }

  $$(".class-tab").forEach(tab => {
    tab.addEventListener("click", () => showClass(tab.dataset.class));
  });

  favoriteButton?.addEventListener("click", () => {
    const previous = storage.get("eclipse-favorite-class");
    if (previous === currentClass) {
      try {
        localStorage.removeItem("eclipse-favorite-class");
      } catch {
        storage.set("eclipse-favorite-class", "");
      }
    } else {
      storage.set("eclipse-favorite-class", currentClass);
    }
    updateFavoriteButton();
  });

  $("#random-class")?.addEventListener("click", () => {
    const choices = Object.keys(classes).filter(key => key !== currentClass);
    showClass(choices[Math.floor(Math.random() * choices.length)]);
  });

  // 區域互動地圖
  const regions = {
    north: {
      code: "REGION 01 / NORTH",
      name: "寒霜高地",
      description: "永冬籠罩的北境，古老堡壘隱藏在冰雪與迷霧之中。傳聞有不滅的守望者徘徊於山脈深處。",
      level: "建議等級：10–25",
      danger: "★★★☆☆",
      tags: ["冰雪", "古堡", "遺跡"]
    },
    east: {
      code: "REGION 02 / EAST",
      name: "失落王城",
      description: "昔日王國的首都，如今只剩破碎的城牆與被時間遺忘的宮殿。古老王座仍等待著它真正的主人。",
      level: "建議等級：25–40",
      danger: "★★★★☆",
      tags: ["王城", "歷史", "秘寶"]
    },
    south: {
      code: "REGION 03 / SOUTH",
      name: "深淵森林",
      description: "濃霧終年不散的森林，樹木彷彿擁有自己的意志。深入其中的旅人，偶爾會聽見來自遠古的低語。",
      level: "建議等級：15–35",
      danger: "★★★★★",
      tags: ["森林", "魔物", "迷霧"]
    },
    west: {
      code: "REGION 04 / WEST",
      name: "灰燼荒原",
      description: "古代戰爭留下的焦土，黑色沙塵覆蓋了無數失落文明。荒原深處的裂隙，仍散發著不祥的光芒。",
      level: "建議等級：30–50",
      danger: "★★★★☆",
      tags: ["荒原", "戰場", "深淵"]
    }
  };

  $$(".map-point").forEach(button => {
    button.addEventListener("click", () => {
      const region = regions[button.dataset.region];
      if (!region) return;

      $$(".map-point").forEach(point => {
        const active = point === button;
        point.classList.toggle("active", active);
        point.setAttribute("aria-pressed", String(active));
      });

      $("#region-code").textContent = region.code;
      $("#region-name").textContent = region.name;
      $("#region-description").textContent = region.description;
      $("#region-level").textContent = region.level;
      $("#region-danger").textContent = region.danger;
      $("#region-tags").replaceChildren(
        ...region.tags.map(tag => {
          const span = document.createElement("span");
          span.textContent = tag;
          return span;
        })
      );
    });
  });

  // 公告分類與搜尋
  let activeFilter = "all";
  const searchInput = $("#news-search");
  const newsCards = $$(".news-card");
  const newsEmpty = $("#news-empty");

  function filterNews() {
    const query = (searchInput?.value || "").trim().toLocaleLowerCase();
    let visibleCount = 0;

    newsCards.forEach(card => {
      const categoryMatches = activeFilter === "all" || card.dataset.category === activeFilter;
      const text = `${card.dataset.search || ""} ${card.textContent}`.toLocaleLowerCase();
      const searchMatches = !query || text.includes(query);
      const visible = categoryMatches && searchMatches;

      card.hidden = !visible;
      if (visible) visibleCount++;
    });

    if (newsEmpty) newsEmpty.hidden = visibleCount !== 0;
  }

  $$(".filter-button").forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      $$(".filter-button").forEach(filter => {
        const active = filter === button;
        filter.classList.toggle("active", active);
        filter.setAttribute("aria-pressed", String(active));
      });
      filterNews();
    });
  });

  searchInput?.addEventListener("input", filterNews);

  // 公告詳情視窗
  const newsModal = $("#news-modal");
  const newsModalTitle = $("#news-modal-title");
  const newsModalContent = $("#news-modal-content");

  function openNews(title, content) {
    if (!newsModal) return;
    newsModalTitle.textContent = title;
    newsModalContent.textContent = content;
    newsModal.classList.add("open");
    newsModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $("[data-close-news]", newsModal)?.focus();
  }

  function closeNews() {
    if (!newsModal?.classList.contains("open")) return;
    newsModal.classList.remove("open");
    newsModal.setAttribute("aria-hidden", "true");
    restoreBodyScroll();
  }

  $$(".read-news").forEach(button => {
    button.addEventListener("click", () => {
      openNews(button.dataset.title || "公告詳情", button.dataset.content || "");
    });
  });

  $$("[data-close-news]").forEach(button => button.addEventListener("click", closeNews));

  // 設定面板
  const settingsPanel = $("#settings-panel");
  const music = $("#bg-music");
  const musicToggle = $("#music-toggle");
  const motionToggle = $("#motion-toggle");
  let musicEnabled = false;

  function openSettings() {
    if (!settingsPanel) return;
    settingsPanel.classList.add("open");
    settingsPanel.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $("#close-settings")?.focus();
  }

  function closeSettings() {
    if (!settingsPanel?.classList.contains("open")) return;
    settingsPanel.classList.remove("open");
    settingsPanel.setAttribute("aria-hidden", "true");
    restoreBodyScroll();
  }

  $("#open-settings")?.addEventListener("click", () => {
    closeMenu();
    openSettings();
  });

  $("#close-settings")?.addEventListener("click", closeSettings);
  $$("[data-close-settings]").forEach(button => button.addEventListener("click", closeSettings));

  function restoreBodyScroll() {
    const modalOpen = settingsPanel?.classList.contains("open") ||
      newsModal?.classList.contains("open");
    if (!modalOpen) document.body.style.overflow = "";
  }

  function updateMusicButton() {
    if (!musicToggle) return;
    musicToggle.textContent = musicEnabled ? "開啟中" : "關閉";
    musicToggle.setAttribute("aria-pressed", String(musicEnabled));
  }

  async function toggleMusic() {
    if (!music) return;

    if (musicEnabled) {
      music.pause();
      musicEnabled = false;
      updateMusicButton();
      return;
    }

    music.volume = 0.35;
    try {
      await music.play();
      musicEnabled = true;
    } catch (error) {
      musicEnabled = false;
      console.warn("背景音樂無法播放，請確認音檔路徑：assets/audio/theme.mp3", error);
      alert("目前無法播放音樂。請確認 assets/audio/theme.mp3 已上傳，而且檔案格式正確。");
    }
    updateMusicButton();
  }

  musicToggle?.addEventListener("click", toggleMusic);

  // 若音訊因瀏覽器或系統原因停止，更新按鈕狀態。
  music?.addEventListener("pause", () => {
    if (music.ended) return;
    musicEnabled = false;
    updateMusicButton();
  });

  function setReducedMotion(enabled) {
    document.body.classList.toggle("reduced-motion", enabled);
    motionToggle?.setAttribute("aria-pressed", String(enabled));
    if (motionToggle) motionToggle.textContent = enabled ? "開啟中" : "關閉";
    storage.set("eclipse-reduced-motion", enabled ? "yes" : "no");
  }

  motionToggle?.addEventListener("click", () => {
    setReducedMotion(!document.body.classList.contains("reduced-motion"));
  });

  $$("[data-text-size]").forEach(button => {
    button.addEventListener("click", () => {
      const size = button.dataset.textSize;
      const scales = { small: "0.9", normal: "1", large: "1.12" };
      document.documentElement.style.setProperty("--body-scale", scales[size] || "1");
      storage.set("eclipse-text-size", size);

      $$("[data-text-size]").forEach(item => {
        item.setAttribute("aria-pressed", String(item === button));
      });
    });
  });

  // 還原瀏覽器中的個人設定
  setReducedMotion(storage.get("eclipse-reduced-motion") === "yes");

  const savedTextSize = storage.get("eclipse-text-size", "normal");
  const textScales = { small: "0.9", normal: "1", large: "1.12" };
  document.documentElement.style.setProperty(
    "--body-scale",
    textScales[savedTextSize] || "1"
  );

  $$("[data-text-size]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.textSize === savedTextSize));
  });

  updateMusicButton();
  showClass("knight");

  // 區塊滾動淡入。瀏覽器不支援 IntersectionObserver 時直接顯示。
  const revealItems = $$(".reveal");

  if ("IntersectionObserver" in window &&
      !document.body.classList.contains("reduced-motion")) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add("is-visible"));
  }

  // 返回頂部
  const backToTop = $("#back-to-top");

  function updateScrollUI() {
    backToTop?.classList.toggle("visible", window.scrollY > 500);
  }

  window.addEventListener("scroll", updateScrollUI, { passive: true });

  backToTop?.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: document.body.classList.contains("reduced-motion") ? "auto" : "smooth"
    });
  });

  updateScrollUI();

  // 畫面變寬時收起手機選單
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) closeMenu();
  });

  // 點擊導覽後確保手機選單收起
  $$("#main-nav a").forEach(link => link.addEventListener("click", () => {
    closeMenu();
  }));
});
