
const descriptions = {
  '騎士': '以古老誓約鑄成的鋼鐵意志，揮舞巨劍守護盟友，在戰場最前線撕開黑暗。',
  '刺客': '穿越陰影，以迅捷身法與致命雙刃擊倒敵人，在敵人察覺前結束戰鬥。',
  '法師': '解讀古老符文，操縱元素與禁忌秘法，以遠古力量扭轉戰局。'
};

const buttons = document.querySelectorAll('.classes button');
const description = document.querySelector('#class-description');

buttons.forEach(button => {
  button.addEventListener('click', () => {
    buttons.forEach(item => item.classList.remove('active'));
    button.classList.add('active');

    const className = button.dataset.class;
    description.textContent = `${className}：${descriptions[className]}`;
  });
});

