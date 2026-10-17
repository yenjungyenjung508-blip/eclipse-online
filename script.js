

const classData = {
  knight: {
    name: '聖殿騎士',
    role: '近戰防禦・團隊守護',
    description:
      '以鋼鐵意志與古老聖印守護盟友，在黑暗吞噬世界之前，成為最後一道防線。',
    art: 'knight-art',
    skills: [
      '聖光壁壘｜抵擋敵方攻勢',
      '裁決重擊｜施展強力近戰攻擊',
      '守護誓約｜強化守護者的戰鬥意志'
    ]
  },

  assassin: {
    name: '暗影刺客',
    role: '高速突襲・爆發傷害',
    description:
      '隱匿於月影與迷霧之間，以雙刃撕裂敵人的防線，在對手察覺之前決定勝負。',
    art: 'assassin-art',
    skills: [
      '暗影突襲｜迅速接近目標',
      '幻影雙刃｜連續發動快速攻擊',
      '消逝之霧｜短暫隱入陰影'
    ]
  },

  mage: {
    name: '符文法師',
    role: '遠程法術・元素控制',
    description:
      '解讀失落文明留下的古老符文，將元素化為力量，以神秘法術改寫戰場局勢。',
    art: 'mage-art',
    skills: [
      '星火術式｜釋放遠程魔法',
      '冰霜封印｜凍結並限制敵人',
      '奧術風暴｜引爆強大的符文能量'
    ]
  }
};

const buttons = document.querySelectorAll('.class-option');
const className = document.querySelector('#class-name');
const classRole = document.querySelector('#class-role');
const classDescription = document.querySelector('#class-description');
const classSkills = document.querySelector('#class-skills');
const classArt = document.querySelector('#class-art');

function selectClass(key) {
  const data = classData[key];

  if (!data) return;

  buttons.forEach(button => {
    const selected = button.dataset.class === key;

    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });

  className.textContent = data.name;
  classRole.textContent = data.role;
  classDescription.textContent = data.description;

  classSkills.replaceChildren();

  data.skills.forEach(skill => {
    const item = document.createElement('li');
    item.textContent = skill;
    classSkills.appendChild(item);
  });

  classArt.classList.remove(
    'knight-art',
    'assassin-art',
    'mage-art'
  );

  classArt.classList.add(data.art);
  classArt.setAttribute('aria-label', `${data.name}角色主視覺`);
}

buttons.forEach(button => {
  button.addEventListener('click', () => {
    selectClass(button.dataset.class);
  });
});

selectClass('knight');
