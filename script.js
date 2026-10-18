"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // ==============================
  // 1. 魔幻進場動畫
  // ==============================
  const intro = document.getElementById("intro-screen");
  const introSkip = document.getElementById("intro-skip");
  const introLoading = document.getElementById("intro-loading");
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  document.body.classList.add("intro-active");

  let introTimer;

  function finishIntro() {
    if (!intro || intro.classList.contains("is-finished")) return;

    intro.classList.add("is-finished");
    document.body.classList.remove("intro-active");

    if (introTimer) {
      clearTimeout(introTimer);
    }

    window.setTimeout(() => {
      intro.remove();
    }, 900);
  }

  if (introLoading) {
    introLoading.textContent = "正在喚醒永夜之力……";
  }

  if (introSkip) {
    introSkip.addEventListener("click", finishIntro);
  }

  if (reducedMotion) {
    finishIntro();
  } else {
    introTimer = window.setTimeout(finishIntro, 2400);
  }

  // ==============================
  // 2. 手機導覽選單
  // ==============================
  const menuToggle = document.getElementById("menu-toggle");
  const mainNav = document.getElementById("main-nav");

  function closeMenu() {
    if (!menuToggle || !mainNav) return;

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "開啟導覽選單");
    mainNav.classList.remove("is-open");
  }

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const isOpen =
        menuToggle.getAttribute("aria-expanded") === "true";

      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      menuToggle.setAttribute(
        "aria-label",
        isOpen ? "開啟導覽選單" : "關閉導覽選單"
      );
      mainNav.classList.toggle("is-open", !isOpen);
    });

    mainNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    document.addEventListener("click", (event) => {
      if (
        mainNav.classList.contains("is-open") &&
        !mainNav.contains(event.target) &&
        !menuToggle.contains(event.target)
      ) {
        closeMenu();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 700) closeMenu();
    });
  }

  // ==============================
  // 3. 職業切換
  // 保留原本三張職業圖片路徑
  // ==============================
  const classes = {
    knight: {
      name: "神聖騎士",
      subtitle: "以誓約守護最後的光",
      number: "CLASS 01 / FRONTLINE",
      label: "ORDER OF LIGHT",
      image: "assets/images/knight.jpg",
      alt: "神聖騎士職業形象",
      description:
        "身披古老誓約的重裝戰士，以堅不可摧的防禦守護同伴，並以聖光之力制裁黑暗。",
      attack: 80,
      defense: 95,
      speed: 55,
      magic: 65,
      skills: ["聖光裁決", "神聖壁壘", "王者誓約"]
    },

    assassin: {
      name: "暗影刺客",
      subtitle: "在黑暗中決定勝負",
      number: "CLASS 02 / ASSASSIN",
      label: "VEIL OF SHADOW",
      image: "assets/images/assassin.jpg",
      alt: "暗影刺客職業形象",
      description:
        "穿梭於陰影之間的迅捷獵手，擅長突襲、連擊與精準打擊，在敵人察覺之前結束戰鬥。",
      attack: 90,
      defense: 55,
      speed: 100,
      magic: 45,
      skills: ["影襲", "幻影步", "致命標記"]
    },

    mage: {
      name: "秘法法師",
      subtitle: "以禁忌秘法改寫戰場",
      number: "CLASS 03 / SPELLCASTER",
      label: "ARCANE AWAKENING",
      image: "assets/images/mage.jpg",
      alt: "秘法法師職業形象",
      description:
        "研習古代秘法的施術者，能引導元素與奧術能量，以強大的魔法掌控戰場。",
      attack: 95,
      defense: 45,
      speed: 60,
      magic: 100,
      skills: ["星隕術", "秘法屏障", "虛空洪流"]
    }
  };

  const classTabs = document.querySelectorAll(".class-tab");
  const classArt = document.getElementById("class-art");

  function updateText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setStat(id, valueId, value) {
    const bar = document.getElementById(id);
    const number = document.getElementById(valueId);

    if (bar) {
      bar.style.width = `${value}%`;
    }

    if (number) {
      number.textContent = String(value);
    }
  }

  function selectClass(classId) {
    const selected = classes[classId];
    if (!selected) return;

    classTabs.forEach((tab) => {
      const active = tab.dataset.class === classId;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-pressed", String(active));
    });

    if (classArt) {
      classArt.style.opacity = "0";

      window.setTimeout(() => {
        classArt.src = selected.image;
        classArt.alt = selected.alt;
        classArt.style.opacity = "1";
      }, 140);
    }

    updateText("class-name", selected.name);
    updateText("class-subtitle", selected.subtitle);
    updateText("class-number", selected.number);
    updateText("class-art-label", selected.label);
    updateText("class-description", selected.description);

    setStat("stat-attack", "attack-value", selected.attack);
    setStat("stat-defense", "defense-value", selected.defense);
    setStat("stat-speed", "speed-value", selected.speed);
    setStat("stat-magic", "magic-value", selected.magic);

    const skillList = document.getElementById("skill-list");

    if (skillList) {
      skillList.replaceChildren();

      selected.skills.forEach((skill) => {
        const item = document.createElement("li");
        item.textContent = skill;
        skillList.appendChild(item);
      });
    }
  }

  classTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      selectClass(tab.dataset.class);
    });
  });

  // 圖片載入失敗時顯示提醒，不會自動換成錯誤的檔案
  if (classArt) {
    classArt.addEventListener("error", () => {
      console.warn(
        "職業圖片載入失敗，請確認檔案路徑與大小寫：",
        classArt.getAttribute("src")
      );
    });
  }

  // ==============================
  // 4. 世界地圖區域切換
  // ==============================
  const regions = {
    capital: {
      number: "REGION 01",
      name: "暮光王城",
      description:
        "古老王國的最後堡壘，殘存的聖火仍在高塔中閃耀。",
      status: "探索區域"
    },

    forest: {
      number: "REGION 02",
      name: "迷霧森林",
      description:
        "終年被濃霧籠罩的古老森林，沉睡的精靈遺跡隱藏其中。",
      status: "未知領域"
    },

    abyss: {
      number: "REGION 03",
      name: "深淵裂谷",
      description:
        "大地裂開後形成的禁忌之地，傳說深處封存著日蝕的真相。",
      status: "危險區域"
    }
  };

  const regionControls = document.querySelectorAll(
    "[data-region]"
  );

  function selectRegion(regionId) {
    const region = regions[regionId];
    if (!region) return;

    updateText("region-number", region.number);
    updateText("region-name", region.name);
    updateText("region-description", region.description);
    updateText("region-status", region.status);

    document.querySelectorAll(".map-pin").forEach((pin) => {
      pin.classList.toggle(
        "is-selected",
        pin.dataset.region === regionId
      );
    });

    document.querySelectorAll(".region-button").forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.region === regionId
      );
    });
  }

  regionControls.forEach((control) => {
    control.addEventListener("click", () => {
      selectRegion(control.dataset.region);
    });
  });

  // ==============================
  // 5. 滾動淡入動畫
  // ==============================
  const revealElements = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window && !reducedMotion) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
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
      element.classList.add("is-visible");
    });
  }

  // ==============================
  // 6. 頁首效果、返回頂部與視差
  // ==============================
  const header = document.querySelector(".site-header");
  const backToTop = document.getElementById("back-to-top");
  const heroBackdrop = document.getElementById("hero-backdrop");

  let ticking = false;

  function updateScrollEffects() {
    const scrollY = window.scrollY;

    if (header) {
      header.classList.toggle("is-scrolled", scrollY > 40);
    }

    if (backToTop) {
      backToTop.classList.toggle("is-visible", scrollY > 500);
    }

    // 只對首頁背景做輕微位移，不影響其他區塊
    if (
      heroBackdrop &&
      !reducedMotion &&
      window.innerWidth > 700 &&
      scrollY < window.innerHeight
    ) {
      heroBackdrop.style.transform =
        `translate3d(0, ${scrollY * 0.12}px, 0)`;
    }

    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollEffects);
        ticking = true;
      }
    },
    { passive: true }
  );

  updateScrollEffects();

  if (backToTop) {
    backToTop.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: reducedMotion ? "auto" : "smooth"
      });
    });
  }

  // ==============================
  // 7. 背景音樂開關
  // ==============================
  const music = document.getElementById("bg-music");
  const musicToggle = document.getElementById("music-toggle");
  const musicLabel = document.getElementById("music-label");

  function updateMusicButton(isPlaying) {
    if (!musicToggle) return;

    musicToggle.classList.toggle("is-playing", isPlaying);
    musicToggle.setAttribute("aria-pressed", String(isPlaying));
    musicToggle.setAttribute(
      "aria-label",
      isPlaying ? "關閉背景音樂" : "播放背景音樂"
    );

    if (musicLabel) {
      musicLabel.textContent = isPlaying ? "音樂播放中" : "音樂關閉";
    }
  }

  if (music && musicToggle) {
    musicToggle.addEventListener("click", async () => {
      if (!music.paused) {
        music.pause();
        updateMusicButton(false);
        return;
      }

      try {
        await music.play();
        updateMusicButton(true);
      } catch (error) {
        updateMusicButton(false);

        if (musicLabel) {
          musicLabel.textContent = "請加入音樂檔";
        }

        console.warn(
          "背景音樂無法播放。請確認 assets/audio/theme.mp3 存在且格式正確。",
          error
        );
      }
    });

    music.addEventListener("play", () => updateMusicButton(true));
    music.addEventListener("pause", () => updateMusicButton(false));
    music.addEventListener("ended", () => updateMusicButton(false));
  }

  console.log("ECLIPSE ONLINE 官網互動功能已載入。");
});
