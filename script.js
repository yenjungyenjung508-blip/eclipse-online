const classData = {
  knight: {
    name: "聖殿騎士",
    english: "THE TEMPLAR",
    kicker: "CLASS I / FRONTLINE DEFENDER",
    description:
      "以古老誓約鑄成鋼鐵意志，揮舞巨劍守護盟友，在戰場最前線撕開黑暗。",
    artClass: "class-art-knight",
    watermark: "I",
    caption: "OATH OF THE LIGHT",
    stats: {
      attack: 80,
      defense: 100,
      mobility: 60
    },
    skills: [
      {
        icon: "⚔",
        name: "聖光斬擊",
        description: "凝聚神聖力量，對前方敵人造成強力傷害。"
      },
      {
        icon: "🛡",
        name: "不滅壁壘",
        description: "召喚守護屏障，短時間大幅提升防禦。"
      },
      {
        icon: "✧",
        name: "黎明誓約",
        description: "喚醒古老誓約，守護自身與附近的盟友。"
      }
    ]
  },

  assassin: {
    name: "暗影刺客",
    english: "THE SHADOW",
    kicker: "CLASS II / AGILE ASSASSIN",
    description:
      "穿越無聲的黑夜，以迅捷身法與致命雙刃擊倒敵人，在對手察覺之前結束戰鬥。",
    artClass: "class-art-assassin",
    watermark: "II",
    caption: "DANCE OF SHADOWS",
    stats: {
      attack: 100,
      defense: 40,
      mobility: 100
    },
    skills: [
      {
        icon: "✧",
        name: "瞬影突襲",
        description: "瞬間突進至敵人身旁，發動迅猛的致命攻擊。"
      },
      {
        icon: "☾",
        name: "夜幕潛行",
        description: "融入黑暗，大幅提升移動速度並隱匿身形。"
      },
      {
        icon: "⚔",
        name: "死亡蓮華",
        description: "以疾風般的連續斬擊，撕裂周圍的敵人。"
      }
    ]
  },

  mage: {
    name: "符文法師",
    english: "THE ARCANIST",
    kicker: "CLASS III / MASTER OF ARCANA",
    description:
      "解讀被遺忘的古老符文，操縱元素與禁忌秘法，以超越凡人的遠古力量扭轉戰局。",
    artClass: "class-art-mage",
    watermark: "III",
    caption: "SECRETS OF THE ARCANE",
    stats: {
      attack: 100,
      defense: 40,
      mobility: 60
    },
    skills: [
      {
        icon: "✦",
        name: "星辰爆裂",
        description: "凝聚星辰能量，引發大範圍的奧術爆炸。"
      },
      {
        icon: "❄",
        name: "冰封禁錮",
        description: "召喚寒冰符文，凍結敵人並限制其行動。"
      },
      {
        icon: "☄",
        name: "混沌隕星",
        description: "呼喚遠古隕星，對指定區域降下毀滅性打擊。"
      }
    ]
  }
};

const classButtons = document.querySelectorAll(".class-tab");
const classShowcase = document.querySelector("#class-showcase");
const classArt = document.querySelector("#class-art");
const className = document.querySelector("#class-name");
const classEnglish = document.querySelector("#class-english");
const classKicker = document.querySelector("#class-kicker");
const classDescription = document.querySelector("#class-description");
const artWatermark = document.querySelector("#art-watermark");
const artCaption = document.querySelector("#art-caption");
const skillsContainer = document.querySelector("#class-skills");

function renderSkills(skills) {
  skillsContainer.replaceChildren();

  skills.forEach((skill) => {
    const article = document.createElement("article");
    article.className = "skill-card";

    const icon = document.createElement("span");
    icon.className = "skill-icon";
    icon.textContent = skill.icon;

    const content = document.createElement("div");

    const title = document.createElement("h5");
    title.textContent = skill.name;

    const description = document.createElement("p");
    description.textContent = skill.description;

    content.append(title, description);
    article.append(icon, content);
    skillsContainer.appendChild(article);
  });
}

function updateStat(statName, value) {
  const bar = document.querySelector(`#${statName}-bar`);
  const label = document.querySelector(`#${statName}-value`);

  if (!bar || !label) return;

  bar.style.width = `${value}%`;

  const stars = Math.round(value / 20);
  label.textContent = "★".repeat(stars) + "☆".repeat(5 - stars);
}

function selectClass(classId) {
  const selectedClass = classData[classId];

  if (!selectedClass) return;

  classButtons.forEach((button) => {
    const isActive = button.dataset.class === classId;

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  classShowcase.dataset.currentClass = classId;

  className.textContent = selectedClass.name;
  classEnglish.textContent = selectedClass.english;
  classKicker.textContent = selectedClass.kicker;
  classDescription.textContent = selectedClass.description;
  artWatermark.textContent = selectedClass.watermark;
  artCaption.textContent = selectedClass.caption;

  classArt.classList.remove(
    "class-art-knight",
    "class-art-assassin",
    "class-art-mage"
  );

  classArt.classList.add(selectedClass.artClass);
  classArt.setAttribute(
    "aria-label",
    `${selectedClass.name}的奇幻角色主視覺`
  );

  updateStat("attack", selectedClass.stats.attack);
  updateStat("defense", selectedClass.stats.defense);
  updateStat("mobility", selectedClass.stats.mobility);

  renderSkills(selectedClass.skills);
}

classButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectClass(button.dataset.class);
  });
});

// 手機版導覽選單
const menuToggle = document.querySelector("#menu-toggle");
const mainNav = document.querySelector("#main-nav");

menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");

  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute(
    "aria-label",
    isOpen ? "關閉導覽選單" : "開啟導覽選單"
  );
});

mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "開啟導覽選單");
  });
});

// 自動更新頁尾年份
document.querySelector("#year").textContent = new Date().getFullYear();

// 頁面載入時初始化預設職業
selectClass("knight");
