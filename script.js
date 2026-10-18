
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  /* =========================
     共用提示訊息
  ========================= */

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

  /* =========================
     進場畫面
  ========================= */

  const intro = $("#intro-screen");
  const introEnter = $("#intro-enter");
  let introClosed = false;

  function closeIntro() {
    if (!intro || introClosed) return;

    introClosed = true;
    intro.classList.add("is-hidden");
    document.body.classList.remove("intro-active");

    window.setTimeout(() => {
      intro.hidden = true;
    }, 850);
  }

  if (intro && !intro.classList.contains("is-hidden")) {
    document.body.classList.add("intro-active");

    if (introEnter) {
      introEnter.addEventListener("click", closeIntro);
    }

    // 不要求訪客一定要按按鈕，避免進場畫面阻擋網站內容。
    window.setTimeout(closeIntro, 4500);
  }

  /* =========================
     手機導覽選單
  ========================= */

  const menuToggle = $("#menu-toggle");
  const mainNav = $("#main-nav");

  function setMenuOpen(open) {
    if (!menuToggle || !mainNav) return;

    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute(
      "aria-label",
      open ? "關閉導覽選單" : "開啟導覽選單"
    );

    mainNav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  }

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      setMenuOpen(!isOpen);
    });

    $$("#main-nav a").forEach((link) => {
      link.addEventListener("click", () => setMenuOpen(false));
    });

    document.addEventListener("click", (event) => {
      if (
        mainNav.classList.contains("is-open") &&
        !mainNav.contains(event.target) &&
        !menuToggle.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 760) {
        setMenuOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    });
  }

  /* =========================
     職業資料與切換
  ========================= */

  const classData = {
    knight: {
      number: "01",
      name: "聖殿騎士",
      english: "TEMPLE KNIGHT",
      subtitle: "HOLY GUARDIAN",
      image: "assets/images/knight.jpg",
      alt: "聖殿騎士職業圖片",
      description:
        "身披古老誓約的重裝戰士，以堅定意志守護同伴，在黑暗最深處築起不可撼動的防線。",
      stats: {
        attack: 75,
        defense: 95,
        speed: 55,
        magic: 45
      },
      skills: ["神聖壁壘", "守護誓約", "制裁重擊"]
    },

    assassin: {
      number: "02",
      name: "暗影刺客",
      english: "SHADOW ASSASSIN",
      subtitle: "BLADE OF SHADOWS",
      image: "assets/images/assassin.jpg",
      alt: "暗影刺客職業圖片",
      description:
        "行走於光影交界的迅捷獵手，以敏捷身法和精準攻擊掌握戰局，在敵人察覺之前決定勝負。",
      stats: {
        attack: 92,
        defense: 48,
        speed: 98,
        magic: 42
      },
      skills: ["瞬影突襲", "致命標記", "暗幕遁形"]
    },

    mage: {
      number: "03",
      name: "符文法師",
      english: "RUNE MAGE",
      subtitle: "KEEPER OF ARCANE",
      image: "assets/images/mage.jpg",
      alt: "符文法師職業圖片",
      description:
        "研習古代符文與失落秘術的施法者，能夠引導強大的魔法能量，以智慧與元素之力扭轉戰場。",
      stats: {
        attack: 94,
        defense: 40,
        speed: 60,
        magic: 100
      },
      skills: ["星隕術式", "永夜結界", "奧術共鳴"]
    }
  };

  const classOrder = ["knight", "assassin", "mage"];
  let currentClass = "knight";

  const classArt = $("#class-art");
  const classNumber = $("#class-number");
  const className = $("#class-name");
  const classEnglish = $("#class-english");
  const classSubtitle = $("#class-subtitle");
  const classDescription = $("#class-description");
  const classSkills = $("#class-skills");

  function updateClassStats(stats) {
    const statElements = {
      attack: $("#stat-attack"),
      defense: $("#stat-defense"),
      speed: $("#stat-speed"),
      magic: $("#stat-magic")
    };

    Object.entries(statElements).forEach(([key, element]) => {
      if (!element) return;

      const value = Math.max(0, Math.min(100, Number(stats[key]) || 0));
      element.style.width = `${value}%`;
      element.setAttribute("aria-label", `${key}: ${value}%`);
    });
  }

  function selectClass(classKey) {
    const data = classData[classKey];
    if (!data) return;

    currentClass = classKey;

    $$(".class-tab").forEach((button) => {
      const active = button.dataset.class === classKey;

      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (classNumber) classNumber.textContent = data.number;
    if (className) className.textContent = data.name;
    if (classEnglish) classEnglish.textContent = data.english;
    if (classSubtitle) classSubtitle.textContent = data.subtitle;
    if (classDescription) classDescription.textContent = data.description;

    if (classArt) {
      classArt.classList.add("is-changing");

      const updateImage = () => {
        classArt.src = data.image;
        classArt.alt = data.alt;
      };

      // 等待短暫淡出，再切換圖片。
      window.setTimeout(() => {
        updateImage();
        classArt.classList.remove("is-changing");
      }, 160);

      classArt.onerror = () => {
        classArt.classList.remove("is-changing");
        showToast(`無法載入職業圖片：${data.image}，請檢查檔案名稱與路徑。`);
      };

      classArt.onload = () => {
        classArt.classList.remove("is-changing");
      };
    }

    updateClassStats(data.stats);

    if (classSkills) {
      classSkills.replaceChildren();

      data.skills.forEach((skill) => {
        const tag = document.createElement("span");
        tag.textContent = skill;
        classSkills.appendChild(tag);
      });
    }
  }

  $$(".class-tab").forEach((button) => {
    button.addEventListener("click", () => {
      selectClass(button.dataset.class);
    });
  });

  const prevClass = $("#class-prev");
  const nextClass = $("#class-next");

  function moveClass(direction) {
    const currentIndex = classOrder.indexOf(currentClass);
    const nextIndex =
      (currentIndex + direction + classOrder.length) % classOrder.length;

    selectClass(classOrder[nextIndex]);
  }

  if (prevClass) {
    prevClass.addEventListener("click", () => moveClass(-1));
  }

  if (nextClass) {
    nextClass.addEventListener("click", () => moveClass(1));
  }

  // 初始化第一個職業。
  selectClass("knight");

  /* =========================
     世界地圖區域切換
  ========================= */

  const regionData = {
    capital: {
      index: "REGION 01 / 04",
      name: "暮光王城",
      english: "THE DUSK CAPITAL",
      description:
        "曾經繁盛的王國中心，如今仍有守衛與旅人試圖在漫長黑夜中維持秩序。這裡是旅程的起點，也是尋找線索的重要據點。",
      type: "安全區域",
      level: "初階冒險者"
    },

    forest: {
      index: "REGION 02 / 04",
      name: "幽影森林",
      english: "THE SHADOW FOREST",
      description:
        "終年被濃霧籠罩的古老森林。扭曲的樹影間傳來奇異低語，失落的道路可能通往被遺忘的秘密。",
      type: "探索區域",
      level: "初階至中階"
    },

    ruins: {
      index: "REGION 03 / 04",
      name: "失落遺跡",
      english: "THE FORGOTTEN RUINS",
      description:
        "沉睡在歷史深處的古代遺址，斷裂的石柱與殘缺符文記錄著永夜以前的文明。",
      type: "遺跡區域",
      level: "中階冒險者"
    },

    abyss: {
      index: "REGION 04 / 04",
      name: "深淵邊境",
      english: "THE ABYSS FRONTIER",
      description:
        "光明難以抵達的危險邊境。傳聞黑暗力量從此處蔓延，唯有準備充分的冒險者才敢深入。",
      type: "高危險區域",
      level: "高階冒險者"
    }
  };

  function selectRegion(regionKey) {
    const data = regionData[regionKey];
    if (!data) return;

    const fields = {
      "#region-index": data.index,
      "#region-name": data.name,
      "#region-english": data.english,
      "#region-description": data.description,
      "#region-type": data.type,
      "#region-level": data.level
    };

    Object.entries(fields).forEach(([selector, value]) => {
      const element = $(selector);
      if (element) element.textContent = value;
    });

    $$("[data-region]").forEach((button) => {
      const active = button.dataset.region === regionKey;

      if (
        button.classList.contains("map-pin") ||
        button.classList.contains("region-option")
      ) {
        button.classList.toggle("is-active", active);
      }

      if (button.classList.contains("region-option")) {
        button.setAttribute("aria-current", active ? "true" : "false");
      }
    });
  }

  $$("[data-region]").forEach((button) => {
    button.addEventListener("click", () => {
      selectRegion(button.dataset.region);
    });
  });

  selectRegion("capital");

  /* =========================
     滾動淡入動畫
  ========================= */

  const revealElements = $$(".reveal");

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -35px 0px"
      }
    );

    revealElements.forEach((element) => {
      revealObserver.observe(element);
    });
  } else {
    revealElements.forEach((element) => {
      element.classList.add("is-revealed");
    });
  }

  /* =========================
     返回頂部
  ========================= */

  const backToTop = $("#back-to-top");

  function updateBackToTop() {
    if (!backToTop) return;

    backToTop.classList.toggle("is-visible", window.scrollY > 450);
  }

  window.addEventListener("scroll", updateBackToTop, { passive: true });
  updateBackToTop();

  if (backToTop) {
    backToTop.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth"
      });
    });
  }

  /* =========================
     導覽列目前區段提示
  ========================= */

  const navLinks = $$(".main-nav a[href^='#']");
  const navSections = navLinks
    .map((link) => $(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && navSections.length) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          navLinks.forEach((link) => {
            const active = link.getAttribute("href") === `#${entry.target.id}`;
            link.classList.toggle("is-current", active);

            if (active) {
              link.setAttribute("aria-current", "location");
            } else {
              link.removeAttribute("aria-current");
            }
          });
        });
      },
      {
        rootMargin: "-25% 0px -60% 0px",
        threshold: 0
      }
    );

    navSections.forEach((section) => navObserver.observe(section));
  }

  /* =========================
     背景音樂
  ========================= */

  const music = $("#bg-music");
  const musicToggle = $("#music-toggle");
  const musicLabel = $("#music-label");

  function updateMusicButton(isPlaying) {
    if (musicToggle) {
      musicToggle.setAttribute("aria-pressed", String(isPlaying));
    }

    if (musicLabel) {
      musicLabel.textContent = isPlaying ? "關閉音樂" : "播放音樂";
    }
  }

  if (music && musicToggle) {
    musicToggle.addEventListener("click", async () => {
      if (!music.paused) {
        music.pause();
        updateMusicButton(false);
        showToast("背景音樂已暫停。");
        return;
      }

      try {
        // 播放動作由訪客點擊觸發，符合瀏覽器自動播放限制。
        await music.play();
        updateMusicButton(true);
        showToast("背景音樂播放中。");
      } catch (error) {
        updateMusicButton(false);

        if (error && error.name === "NotSupportedError") {
          showToast("音樂檔案格式不支援，請檢查 theme.mp3。");
        } else {
          showToast("無法播放音樂，請確認 assets/audio/theme.mp3 是否存在。");
        }
      }
    });

    music.addEventListener("play", () => updateMusicButton(true));
    music.addEventListener("pause", () => updateMusicButton(false));
    music.addEventListener("error", () => {
      updateMusicButton(false);
    });
  }

  /* =========================
     頁尾年份
  ========================= */

  const currentYear = $("#current-year");

  if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
  }

  /* =========================
     鍵盤操作
  ========================= */

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeIntro();
    }
  });

  console.info("ECLIPSE ONLINE：網站互動功能已初始化。");
});
