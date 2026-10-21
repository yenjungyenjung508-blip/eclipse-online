
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("arena");
  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;
  const SAVE_KEY = "eclipseTrialSaveV1";

  
const freshState = () => ({
  level: 1,
  xp: 0,
  gold: 0,
  hp: 120,
  mp: 40,
  potions: 3,
  kills: 0,
  questClaimed: false,

  // 新增：裝備系統資料
  inventory: [],
  equippedWeapon: null,
  equippedArmor: null
});

  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
  } catch (_) {
    saved = null;
  }

  const state = Object.assign(freshState(), saved || {});
  const player = {
    x: W * 0.28, y: H * 0.53,
    r: 17, speed: 205,
    facingX: 1, facingY: 0,
    attack: 18, defense: 5,
    moving: false, dodgeUntil: 0,
    dodgeReady: 0, attackUntil: 0,
    attackReady: 0, skillReady: 0,
    skillUntil: 0, invulnerableUntil: 0
  };

  let enemies = [];
  let particles = [];
  let running = false;
  let lastTime = 0;
  let spawnTimer = 0;
  let defeated = 0;
  let gameOver = false;
  let victory = false;
  let toastTimer = 0;
  let lastAutosave = 0;
  const keys = new Set();
  const touchMove = new Set();

  function log(message) {
    const box = $("battleLog");
    const p = document.createElement("p");
    p.textContent = message;
    box.prepend(p);
    while (box.children.length > 16) box.lastElementChild.remove();
  }

  function toast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("visible");
    toastTimer = 1.7;
  }

  function saveGame(showMessage = true) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      $("saveStatus").textContent = "已儲存於這台裝置";
      if (showMessage) toast("冒險進度已儲存");
    } catch (_) {
      $("saveStatus").textContent = "無法存檔，請檢查瀏覽器設定";
    }
  }

  function updateHUD() {
    const hp = Math.max(0, Math.min(state.hp, maxHP()));
    const mp = Math.max(0, Math.min(state.mp, maxMP()));
    $("level").textContent = state.level;
    $("hpText").textContent = `${Math.ceil(hp)} / ${maxHP()}`;
    $("mpText").textContent = `${Math.ceil(mp)} / ${maxMP()}`;
    $("hpBar").style.width = `${hp / maxHP() * 100}%`;
    $("mpBar").style.width = `${mp / maxMP() * 100}%`;
    $("attackStat").textContent = player.attack;
    $("defenseStat").textContent = player.defense;
    $("xpText").textContent = `${state.xp} / ${xpNeeded()}`;
    $("goldText").textContent = state.gold;
    $("potionCount").textContent = state.potions;
    $("questBar").style.width = `${Math.min(100, state.kills / 5 * 100)}%`;
    $("questText").textContent = `擊敗魔物：${Math.min(state.kills, 5)} / 5`;
    $("skillCooldown").textContent =
      performance.now() < player.skillReady
        ? `${Math.ceil((player.skillReady - performance.now()) / 1000)} 秒`
        : "可使用";
    $("enemyCounter").textContent = `魔物：${enemies.length}`;
  }

  function maxHP() { return 120 + (state.level - 1) * 18; }
  function maxMP() { return 40 + (state.level - 1) * 6; }
  function xpNeeded() { return state.level * 100; }

  
  // ===== 永夜紀元：裝備系統 =====

  const equipmentCatalog = [
    {
      name: "生鏽長劍",
      type: "weapon",
      attack: 3,
      defense: 0,
      rarity: "普通",
      color: "#d5d5d5"
    },
    {
      name: "荒原騎士劍",
      type: "weapon",
      attack: 7,
      defense: 0,
      rarity: "稀有",
      color: "#65c7ff"
    },
    {
      name: "永夜斬魂劍",
      type: "weapon",
      attack: 13,
      defense: 0,
      rarity: "史詩",
      color: "#d18aff"
    },
    {
      name: "破損鐵甲",
      type: "armor",
      attack: 0,
      defense: 2,
      rarity: "普通",
      color: "#d5d5d5"
    },
    {
      name: "守夜者重甲",
      type: "armor",
      attack: 0,
      defense: 5,
      rarity: "稀有",
      color: "#65c7ff"
    },
    {
      name: "不朽誓約鎧甲",
      type: "armor",
      attack: 0,
      defense: 9,
      rarity: "史詩",
      color: "#d18aff"
    }
  ];

  function syncEquipmentStats() {
    const weapon = state.equippedWeapon;
    const armor = state.equippedArmor;

    player.attack =
      18 + (state.level - 1) * 4 +
      (weapon ? weapon.attack : 0);

    player.defense =
      5 + (state.level - 1) +
      (armor ? armor.defense : 0);
  }

  function rollEquipmentDrop(enemy) {
    // 普通魔物 18% 掉落率，稀有魔物 55%
    const chance = enemy.rare ? 0.55 : 0.18;

    if (Math.random() >= chance) {
      log("沒有發現裝備掉落。");
      return;
    }

    let pool = equipmentCatalog;

    // 稀有魔物有較高機會掉落史詩裝備
    const roll = Math.random();
    if (enemy.rare && roll < 0.35) {
      pool = equipmentCatalog.filter(item => item.rarity === "史詩");
    } else if (roll < 0.35) {
      pool = equipmentCatalog.filter(item => item.rarity !== "史詩");
    }

    const item = {
      ...pool[Math.floor(Math.random() * pool.length)],
      id: Date.now() + Math.random()
    };

    state.inventory.push(item);

    log(
      `獲得裝備：【${item.rarity}】${item.name}！` +
      `攻擊 +${item.attack}，防禦 +${item.defense}。`
    );

    toast(`裝備掉落：${item.name}`);
    renderEquipmentUI();
    saveGame(false);
  }

  function equipItem(id) {
    const index = state.inventory.findIndex(item => item.id === id);
    if (index < 0) return;

    const item = state.inventory[index];
    const slot = item.type === "weapon"
      ? "equippedWeapon"
      : "equippedArmor";

    // 把舊裝備放回背包
    if (state[slot]) {
      state.inventory.push(state[slot]);
    }

    state[slot] = item;
    state.inventory.splice(index, 1);

    syncEquipmentStats();
    updateHUD();
    renderEquipmentUI();
    saveGame(false);

    toast(`已裝備：${item.name}`);
    log(`裝備更新：${item.name}。`);
  }

  function unequipItem(slot) {
    const item = state[slot];
    if (!item) return;

    state.inventory.push(item);
    state[slot] = null;

    syncEquipmentStats();
    updateHUD();
    renderEquipmentUI();
    saveGame(false);

    toast(`已卸下：${item.name}`);
  }

  function createEquipmentUI() {
    if ($("equipmentPanel")) return;

    const style = document.createElement("style");
    style.textContent = `
      #equipmentPanel {
        margin: 18px 0;
        padding: 18px;
        color: #eee7f7;
        background: linear-gradient(145deg, #211b30, #12111b);
        border: 1px solid #655079;
        border-radius: 14px;
        font-family: sans-serif;
      }
      #equipmentPanel h3 {
        margin: 0 0 12px;
        color: #e6c98b;
      }
      #equipmentPanel .equipment-slots {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 14px;
      }
      #equipmentPanel .equipment-slot,
      #equipmentPanel .equipment-item {
        padding: 12px;
        background: #ffffff09;
        border: 1px solid #ffffff20;
        border-radius: 10px;
        min-width: 0;
      }
      #equipmentPanel .equipment-item {
        margin-top: 8px;
      }
      #equipmentPanel .equipment-name {
        color: #e6c98b;
        font-weight: 700;
        overflow-wrap: anywhere;
      }
      #equipmentPanel .equipment-stats {
        margin: 6px 0;
        color: #bfb5d1;
        font-size: 13px;
      }
      #equipmentPanel button {
        padding: 8px 12px;
        border: 1px solid #a68bc8;
        border-radius: 8px;
        background: #49345e;
        color: white;
        cursor: pointer;
        touch-action: manipulation;
      }
      #equipmentPanel .equipment-empty {
        color: #a69bb6;
        font-size: 13px;
      }
      #equipmentPanel .equipment-inventory {
        max-height: 260px;
        overflow-y: auto;
      }
      @media (max-width: 600px) {
        #equipmentPanel { padding: 12px; }
        #equipmentPanel .equipment-slots {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);

    const panel = document.createElement("section");
    panel.id = "equipmentPanel";
    panel.innerHTML = `
      <h3>⚔ 裝備與背包</h3>
      <div class="equipment-slots">
        <div class="equipment-slot">
          <strong>武器</strong>
          <div id="equippedWeaponView"></div>
        </div>
        <div class="equipment-slot">
          <strong>防具</strong>
          <div id="equippedArmorView"></div>
        </div>
      </div>
      <div>
        <strong>背包裝備</strong>
        <div id="equipmentInventory" class="equipment-inventory"></div>
      </div>
    `;

    const anchor = $("arena");
    if (anchor) {
      anchor.insertAdjacentElement("afterend", panel);
    } else {
      document.body.appendChild(panel);
    }

    renderEquipmentUI();
  }

  function renderEquipmentUI() {
    const panel = $("equipmentPanel");
    if (!panel) return;

    function slotHTML(item, slot) {
      if (!item) {
        return `<p class="equipment-empty">尚未裝備</p>`;
      }

      return `
        <div class="equipment-name">${item.name}</div>
        <div class="equipment-stats">
          ${item.rarity}｜攻擊 +${item.attack}｜防禦 +${item.defense}
        </div>
        <button data-unequip="${slot}">卸下裝備</button>
      `;
    }

    $("equippedWeaponView").innerHTML =
      slotHTML(state.equippedWeapon, "equippedWeapon");

    $("equippedArmorView").innerHTML =
      slotHTML(state.equippedArmor, "equippedArmor");

    const inventory = $("equipmentInventory");

    if (!state.inventory.length) {
      inventory.innerHTML =
        `<p class="equipment-empty">背包目前沒有裝備。擊敗魔物尋找戰利品！</p>`;
    } else {
      inventory.innerHTML = state.inventory.map((item, index) => `
        <div class="equipment-item">
          <div class="equipment-name">${item.name}</div>
          <div class="equipment-stats">
            ${item.rarity}｜${item.type === "weapon" ? "武器" : "防具"}
            ｜攻擊 +${item.attack}｜防禦 +${item.defense}
          </div>
          <button data-equip-index="${index}">裝備</button>
        </div>
      `).join("");
    }

    panel.querySelectorAll("[data-equip-index]").forEach(button => {
      button.onclick = () => {
        const index = Number(button.dataset.equipIndex);
        const item = state.inventory[index];
        if (item) equipItem(item.id);
      };
    });

    panel.querySelectorAll("[data-unequip]").forEach(button => {
      button.onclick = () => unequipItem(button.dataset.unequip);
    });
  }
  function createEnemy() {
    const scale = 1 + Math.max(0, state.level - 1) * 0.13;

    // 依機率決定魔物種類
    const roll = Math.random();
    let type;

    if (roll < 0.55) {
      type = {
        name: "暗影小鬼",
        r: 14,
        hp: 30,
        speed: 78,
        damage: 7,
        xp: 20,
        goldMin: 6,
        goldMax: 12,
        color: "#76509b",
        rare: false
      };
    } else if (roll < 0.88) {
      type = {
        name: "腐朽戰士",
        r: 19,
        hp: 65,
        speed: 42,
        damage: 12,
        xp: 35,
        goldMin: 12,
        goldMax: 22,
        color: "#777d88",
        rare: false
      };
    } else {
      type = {
        name: "永夜獵手",
        r: 21,
        hp: 90,
        speed: 65,
        damage: 16,
        xp: 55,
        goldMin: 25,
        goldMax: 40,
        color: "#c05cba",
        rare: true
      };
    }

    const x = W - 65;
    const y = 90 + Math.random() * (H - 180);
    const hp = Math.round(type.hp * scale);

    enemies.push({
      ...type,
      x,
      y,
      hp,
      maxHp: hp,
      speed: type.speed + state.level * 1.5,
      damage: Math.round(type.damage * scale),
      attackAt: 0,
      flashUntil: 0,
      dead: false,
      phase: Math.random() * 6
    });
  }

  function startGame() {
    if (gameOver || victory) {
  resetBattle(false);
  state.hp = Math.max(1, Math.round(maxHP() * 0.7));
  state.mp = maxMP();
  updateHUD();
}
    running = true;
    gameOver = false;
    victory = false;
    $("arenaMessage").classList.add("hidden");
    if (enemies.length === 0) {
      for (let i = 0; i < 3; i++) createEnemy();
    }
    log("你踏入荒原。魔物正在靠近！");
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function resetBattle(resetAll) {
    if (resetAll) {
      Object.assign(state, freshState());
      syncEquipmentStats();
      saveGame(false);
      updateHUD();
    }
    player.x = W * 0.28;
    player.y = H * 0.53;
    player.hp = undefined;
    player.invulnerableUntil = 0;
    enemies = [];
    particles = [];
    spawnTimer = 0;
    defeated = 0;
    gameOver = false;
    victory = false;
    running = false;
  }

  function startFresh() {
    if (!confirm("確定要清除目前進度並重新開始嗎？")) return;
    resetBattle(true);
    state.hp = maxHP();
    state.mp = maxMP();
    $("arenaMessage").innerHTML =
      "<strong>重新踏上旅程</strong><span>準備好後進入戰場。</span><button id='startButton' class='primary-button'>進入戰場</button>";
    $("startButton").addEventListener("click", startGame);
    $("arenaMessage").classList.remove("hidden");
    log("新的旅程開始了。");
    draw();
  }

  function showEnd(title, subtitle) {
    running = false;
    $("arenaMessage").innerHTML =
      `<strong>${title}</strong><span>${subtitle}</span><button id="startButton" class="primary-button">再次挑戰</button>`;
    $("startButton").addEventListener("click", startGame);
    $("arenaMessage").classList.remove("hidden");
  }

  function damagePlayer(amount) {
    const now = performance.now();
    if (now < player.invulnerableUntil) return;
    const real = Math.max(1, amount - player.defense);
    state.hp = Math.max(0, state.hp - real);
    player.invulnerableUntil = now + 450;
    burst(player.x, player.y, "#e66a75", 8);
    log(`你受到 ${real} 點傷害。`);
    updateHUD();

    if (state.hp <= 0) {
      gameOver = true;
      showEnd("騎士倒下了", "休整後再次挑戰，已取得的經驗與金幣會保留。");
      log("你已倒下。");
    }
  }

  function gainXP(amount) {
    state.xp += amount;
    while (state.xp >= xpNeeded()) {
      state.xp -= xpNeeded();
      state.level++;
      player.attack += 4;
      player.defense += 1;
      state.hp = maxHP();
      state.mp = maxMP();
      log(`升級！你現在是 LV.${state.level}。攻擊與防禦提升。`);
      toast(`等級提升！LV.${state.level}`);
    }
  }



function killEnemy(enemy) {
  if (enemy.dead) return;

  enemy.dead = true;
  state.kills++;

  var rewardXP = Number.isFinite(enemy.xp) ? enemy.xp : 25;
  var goldMin = Number.isFinite(enemy.goldMin) ? enemy.goldMin : 10;
  var goldMax = Number.isFinite(enemy.goldMax) ? enemy.goldMax : 20;

  var rewardGold = goldMin + Math.floor(
    Math.random() * (goldMax - goldMin + 1)
  );

  state.gold += rewardGold;
  gainXP(rewardXP);
rollEquipmentDrop(enemy);
  var effectColor = "#c9a4ff";

  if (enemy.rare) {
    effectColor = "#ff63e6";
  } else if (enemy.name === "腐朽戰士") {
    effectColor = "#aeb8c8";
  }

  burst(
    enemy.x,
    enemy.y,
    effectColor,
    enemy.rare ? 32 : 18
  );

  var enemyName = enemy.name || "荒原魔物";
  var rareText = enemy.rare ? "【稀有魔物】" : "";

  log(
    rareText + enemyName + "被擊敗！獲得 " +
    rewardXP + " EXP、" + rewardGold + " 金幣。"
  );

  if (enemy.rare) {
    toast(
      "稀有魔物擊敗！獲得 " +
      rewardXP + " EXP、" + rewardGold + " 金幣"
    );
  }

  if (state.kills >= 5 && !state.questClaimed) {
    state.questClaimed = true;
    state.gold += 50;
    gainXP(80);

    log("主線任務完成！額外獲得 80 EXP、50 金幣。");
    toast("任務完成：荒原清剿");
  }

  enemies = enemies.filter(function (e) {
    return !e.dead;
  });

  updateHUD();
  saveGame(false);
}
  function hitEnemy(enemy, damage, color) {
    enemy.hp -= damage;
    enemy.flashUntil = performance.now() + 150;
    burst(enemy.x, enemy.y, color, 7);
    if (enemy.hp <= 0) killEnemy(enemy);
  }

  function normalAttack() {
    if (!running || gameOver || victory) return;
    const now = performance.now();
    if (now < player.attackReady) return;
    player.attackReady = now + 390;
    player.attackUntil = now + 180;
    const reach = 72;
    const targets = enemies.filter(e => {
      const dx = e.x - player.x, dy = e.y - player.y;
      return Math.hypot(dx, dy) < reach + e.r &&
        dx * player.facingX + dy * player.facingY > -8;
    });
    if (!targets.length) {
      toast("攻擊未命中");
      return;
    }
    const target = targets.sort((a, b) =>
      Math.hypot(a.x - player.x, a.y - player.y) -
      Math.hypot(b.x - player.x, b.y - player.y))[0];
    hitEnemy(target, player.attack, "#f3d18a");
    log(`普通攻擊造成 ${player.attack} 點傷害。`);
    updateHUD();
  }

  function useSkill() {
    if (!running || gameOver || victory) return;
    const now = performance.now();
    if (now < player.skillReady) {
      toast("技能還在冷卻中");
      return;
    }
    if (state.mp < 12) {
      toast("魔力不足");
      return;
    }
    state.mp -= 12;
    player.skillReady = now + 5000;
    player.skillUntil = now + 350;
    const range = 145;
    const targets = enemies.filter(e =>
      Math.hypot(e.x - player.x, e.y - player.y) < range);
    targets.forEach(e => hitEnemy(e, Math.round(player.attack * 2.1), "#c6a0ff"));
    burst(player.x, player.y, "#a57bff", 28);
    log(`裂地斬發動！命中 ${targets.length} 隻魔物。`);
    if (!targets.length) toast("裂地斬！附近沒有命中的魔物");
    updateHUD();
  }

  function dodge() {
    if (!running || gameOver || victory) return;
    const now = performance.now();
    if (now < player.dodgeReady) {
      toast("閃避尚未恢復");
      return;
    }
    player.dodgeReady = now + 1000;
    player.dodgeUntil = now + 260;
    player.invulnerableUntil = now + 340;
    let dx = 0, dy = 0;
    if (keys.has("arrowup") || keys.has("w") || touchMove.has("up")) dy--;
    if (keys.has("arrowdown") || keys.has("s") || touchMove.has("down")) dy++;
    if (keys.has("arrowleft") || keys.has("a") || touchMove.has("left")) dx--;
    if (keys.has("arrowright") || keys.has("d") || touchMove.has("right")) dx++;
    if (!dx && !dy) {
      dx = player.facingX;
      dy = player.facingY;
    }
    const length = Math.hypot(dx, dy) || 1;
    player.x = clamp(player.x + dx / length * 88, 25, W - 25);
    player.y = clamp(player.y + dy / length * 88, 65, H - 25);
    burst(player.x, player.y, "#79d9e8", 10);
    toast("閃避！");
  }

  function usePotion() {
    if (!running || gameOver || victory) return;
    if (state.potions <= 0) {
      toast("生命藥水已用完");
      return;
    }
    if (state.hp >= maxHP()) {
      toast("生命值已滿");
      return;
    }
    state.potions--;
    state.hp = Math.min(maxHP(), state.hp + 45);
    log("使用生命藥水，恢復 45 點生命值。");
    updateHUD();
    saveGame(false);
  }

  function movePlayer(dt) {
    let dx = 0, dy = 0;
    if (keys.has("arrowup") || keys.has("w") || touchMove.has("up")) dy--;
    if (keys.has("arrowdown") || keys.has("s") || touchMove.has("down")) dy++;
    if (keys.has("arrowleft") || keys.has("a") || touchMove.has("left")) dx--;
    if (keys.has("arrowright") || keys.has("d") || touchMove.has("right")) dx++;
    player.moving = !!(dx || dy);
    if (!player.moving) return;
    const length = Math.hypot(dx, dy);
    dx /= length;
    dy /= length;
    player.facingX = dx;
    player.facingY = dy;
    const speed = performance.now() < player.dodgeUntil ? player.speed * 1.65 : player.speed;
    player.x = clamp(player.x + dx * speed * dt, 25, W - 25);
    player.y = clamp(player.y + dy * speed * dt, 65, H - 25);
  }

  function updateEnemies(dt, now) {
    for (const e of [...enemies]) {
      if (e.dead) continue;
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance > player.r + e.r + 5) {
        e.x += dx / distance * e.speed * dt;
        e.y += dy / distance * e.speed * dt;
      } else if (now > e.attackAt) {
        e.attackAt = now + 1050;
        damagePlayer(e.damage);
      }
      e.x = clamp(e.x, 24, W - 24);
      e.y = clamp(e.y, 60, H - 24);
      e.phase += dt * 3;
    }
  }

  function burst(x, y, color, amount) {
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 35 + Math.random() * 150;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * 0.4,
        maxLife: 0.65, color
      });
    }
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#211d30");
    sky.addColorStop(0.52, "#39303c");
    sky.addColorStop(1, "#15151e");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#a994c6";
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(735, 105, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // 遠方的殘破城牆
    ctx.fillStyle = "#252231";
    ctx.beginPath();
    ctx.moveTo(0, 255);
    for (let x = 0; x <= W; x += 80) {
      ctx.lineTo(x, 215 + Math.sin(x * 0.018) * 20);
      ctx.lineTo(x + 25, 265);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    const ground = ctx.createLinearGradient(0, 270, 0, H);
    ground.addColorStop(0, "#413440");
    ground.addColorStop(1, "#1b1a23");
    ctx.fillStyle = ground;
    ctx.fillRect(0, 270, W, H - 270);

    // 地面裂紋與石塊
    ctx.strokeStyle = "#796273";
    ctx.globalAlpha = 0.23;
    ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      const x = (i * 137 + 31) % W;
      const y = 295 + ((i * 67) % 230);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 15, y + 7);
      ctx.lineTo(x + 22, y + 19);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 邊界光
    const vignette = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 620);
    vignette.addColorStop(0, "transparent");
    vignette.addColorStop(1, "#090810a8");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  }

  function drawKnight() {
    const now = performance.now();
    const invulnerable = now < player.invulnerableUntil;
    if (invulnerable && Math.floor(now / 65) % 2 === 0) return;
    const x = player.x, y = player.y;
    const moving = player.moving ? Math.sin(now / 75) * 3 : 0;

    // 影子
    ctx.fillStyle = "#08070db0";
    ctx.beginPath();
    ctx.ellipse(x, y + 15, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 披風
    ctx.fillStyle = "#642c42";
    ctx.beginPath();
    ctx.moveTo(x - 11, y - 13);
    ctx.lineTo(x + 12, y - 13);
    ctx.lineTo(x + 16, y + 12);
    ctx.lineTo(x, y + 17);
    ctx.lineTo(x - 16, y + 12);
    ctx.closePath();
    ctx.fill();

    // 腿部
    ctx.fillStyle = "#333847";
    ctx.fillRect(x - 9, y + 4 + moving, 7, 13);
    ctx.fillRect(x + 2, y + 4 - moving, 7, 13);
    ctx.fillStyle = "#9b8b78";
    ctx.fillRect(x - 10, y + 14 + moving, 9, 4);
    ctx.fillRect(x + 1, y + 14 - moving, 10, 4);

    // 身體盔甲
    ctx.fillStyle = "#87909a";
    ctx.beginPath();
    ctx.moveTo(x - 13, y - 10);
    ctx.lineTo(x + 13, y - 10);
    ctx.lineTo(x + 10, y + 8);
    ctx.lineTo(x, y + 13);
    ctx.lineTo(x - 10, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#d9c9a6";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 肩甲
    ctx.fillStyle = "#c0b29b";
    ctx.fillRect(x - 16, y - 10, 9, 8);
    ctx.fillRect(x + 7, y - 10, 9, 8);

    // 頭盔
    ctx.fillStyle = "#c2c0bd";
    ctx.beginPath();
    ctx.arc(x, y - 16, 11, Math.PI, 0);
    ctx.lineTo(x + 9, y - 6);
    ctx.lineTo(x - 9, y - 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#302d3a";
    ctx.fillRect(x - 7, y - 15, 14, 4);
    ctx.fillStyle = "#f1c57a";
    ctx.fillRect(x - 4, y - 14, 8, 2);

    // 劍
    ctx.save();
    ctx.translate(x + player.facingX * 9, y - 2);
    ctx.rotate(Math.atan2(player.facingY, player.facingX) + Math.PI / 2);
    ctx.fillStyle = "#d8d9e1";
    ctx.fillRect(-2, -24, 4, 24);
    ctx.fillStyle = "#d8b56e";
    ctx.fillRect(-5, -5, 10, 3);
    ctx.fillStyle = "#694a35";
    ctx.fillRect(-2, -2, 4, 7);
    ctx.restore();

    if (now < player.attackUntil || now < player.skillUntil) {
      ctx.strokeStyle = now < player.skillUntil ? "#b68cff" : "#f5d18a";
      ctx.lineWidth = now < player.skillUntil ? 6 : 4;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      const angle = Math.atan2(player.facingY, player.facingX);
      ctx.arc(x, y, now < player.skillUntil ? 63 : 43,
        angle - 0.8, angle + 0.8);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // 玩家生命條
    ctx.fillStyle = "#110f18";
    ctx.fillRect(x - 22, y - 42, 44, 5);
    ctx.fillStyle = "#df606a";
    ctx.fillRect(x - 22, y - 42, 44 * (state.hp / maxHP()), 5);
  }

  
function drawEnemy(enemy) {
  ctx.save();

  // 魔物受傷時閃白光
  const hurt = enemy.hitFlash && enemy.hitFlash > 0;
  const color = hurt ? "#ffffff" : (enemy.color || "#76509b");

  // 魔物腳下的暗影
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.ellipse(enemy.x, enemy.y + enemy.r * 0.72, enemy.r * 1.2, enemy.r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 稀有魔物的紫紅色光環
  if (enemy.rare) {
    ctx.strokeStyle = "#ff63e6";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.7 + Math.sin(performance.now() / 180) * 0.25;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.r + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // 魔物本體
  ctx.fillStyle = color;
  ctx.beginPath();

  if (enemy.name === "暗影小鬼") {
    // 小鬼：尖耳朵、圓形身體
    ctx.moveTo(enemy.x - enemy.r * 0.65, enemy.y - enemy.r * 0.25);
    ctx.lineTo(enemy.x - enemy.r * 1.05, enemy.y - enemy.r * 1.15);
    ctx.lineTo(enemy.x - enemy.r * 0.12, enemy.y - enemy.r * 0.72);
    ctx.arc(enemy.x, enemy.y, enemy.r * 0.75, 0, Math.PI * 2);
    ctx.moveTo(enemy.x + enemy.r * 0.65, enemy.y - enemy.r * 0.25);
    ctx.lineTo(enemy.x + enemy.r * 1.05, enemy.y - enemy.r * 1.15);
    ctx.lineTo(enemy.x + enemy.r * 0.12, enemy.y - enemy.r * 0.72);
  } else if (enemy.name === "腐朽戰士") {
    // 戰士：厚重的菱角盔甲
    ctx.moveTo(enemy.x, enemy.y - enemy.r * 1.1);
    ctx.lineTo(enemy.x + enemy.r * 0.85, enemy.y - enemy.r * 0.45);
    ctx.lineTo(enemy.x + enemy.r * 0.72, enemy.y + enemy.r * 0.65);
    ctx.lineTo(enemy.x, enemy.y + enemy.r);
    ctx.lineTo(enemy.x - enemy.r * 0.72, enemy.y + enemy.r * 0.65);
    ctx.lineTo(enemy.x - enemy.r * 0.85, enemy.y - enemy.r * 0.45);
    ctx.closePath();
  } else {
    // 永夜獵手：稀有的星芒形魔物
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      const radius = i % 2 === 0 ? enemy.r * 1.15 : enemy.r * 0.62;
      const x = enemy.x + Math.cos(angle) * radius;
      const y = enemy.y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  ctx.fill();

  // 發光邊框
  ctx.strokeStyle = enemy.rare ? "#ff9cf0" : "#c4a8ff";
  ctx.lineWidth = enemy.rare ? 2.5 : 1.5;
  ctx.stroke();

  // 眼睛
  ctx.fillStyle = "#fff4cc";
  ctx.beginPath();
  ctx.arc(enemy.x - enemy.r * 0.28, enemy.y - enemy.r * 0.08, 2.2, 0, Math.PI * 2);
  ctx.arc(enemy.x + enemy.r * 0.28, enemy.y - enemy.r * 0.08, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // 魔物名稱
  ctx.font = enemy.rare ? "bold 13px sans-serif" : "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = enemy.rare ? "#ff9cf0" : "#f0e7ff";
  ctx.fillText(enemy.name || "魔物", enemy.x, enemy.y - enemy.r - 13);

  // 血條
  const barWidth = enemy.r * 2.3;
  const barHeight = 5;
  const barX = enemy.x - barWidth / 2;
  const barY = enemy.y - enemy.r - 8;
  const ratio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));

  ctx.fillStyle = "#321c2b";
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = enemy.rare ? "#ff4fcb" : "#e65c67";
  ctx.fillRect(barX, barY, barWidth * ratio, barHeight);

  ctx.restore();
}

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    drawBackground();
    for (const e of enemies) drawEnemy(e);
    drawKnight();
    drawParticles();
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 1000, 0.04);
    lastTime = now;

    
    movePlayer(dt);
    updateEnemies(dt, now);
    updateParticles(dt);

    // 魔力自然恢復：每秒恢復 3 點 MP
    state.mp = Math.min(maxMP(), state.mp + 3 * dt);

    spawnTimer += dt;
    if (enemies.length < 3 && state.kills < 5 && spawnTimer > 3.2) {
      createEnemy();
      spawnTimer = 0;
    }

    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) $("toast").classList.remove("visible");
    }

    if (now - lastAutosave > 12000) {
      saveGame(false);
      lastAutosave = now;
    }

    updateHUD();
    draw();

    if (state.kills >= 5 && state.questClaimed && enemies.length === 0) {
      victory = true;
      showEnd("試煉完成", "荒原已暫時恢復平靜。你已完成第一個主線任務！");
      saveGame(false);
      return;
    }

    requestAnimationFrame(loop);
  }

  // 鍵盤操作
  const preventKeys = new Set([
    "arrowup", "arrowdown", "arrowleft", "arrowright", " "
  ]);

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (preventKeys.has(key)) event.preventDefault();
    keys.add(key);
    if (event.repeat) return;

    if (key === "j" || key === " ") normalAttack();
    if (key === "k") useSkill();
    if (key === "shift") dodge();
    if (key === "h") usePotion();
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
  });

  window.addEventListener("blur", () => {
    keys.clear();
    touchMove.clear();
  });

  // 手機、iPad 觸控方向鍵
  document.querySelectorAll("[data-move]").forEach(button => {
    const direction = button.dataset.move;
    let activePointer = null;

    button.addEventListener("pointerdown", event => {
      event.preventDefault();

      activePointer = event.pointerId;
      touchMove.add(direction);

      if (button.setPointerCapture) {
        button.setPointerCapture(event.pointerId);
      }
    });

    const releaseMove = event => {
      if (
        activePointer !== null &&
        event.pointerId !== undefined &&
        event.pointerId !== activePointer
      ) {
        return;
      }

      touchMove.delete(direction);
      activePointer = null;
    };

    button.addEventListener("pointerup", releaseMove);
    button.addEventListener("pointercancel", releaseMove);
    button.addEventListener("lostpointercapture", releaseMove);
  });

  $("startButton").addEventListener("click", startGame);
  $("attackButton").addEventListener("click", normalAttack);
  $("skillButton").addEventListener("click", useSkill);
  $("dodgeButton").addEventListener("click", dodge);
  $("potionButton").addEventListener("click", usePotion);
  $("saveButton").addEventListener("click", () => saveGame(true));
  $("clearLog").addEventListener("click", () => {
    $("battleLog").replaceChildren();
    log("戰鬥紀錄已清除。");
  });
  $("resetButton").addEventListener("click", startFresh);


  // 整理角色存檔資料，保留真正的 0 HP 與 0 MP

  // 舊版本存檔相容處理
  if (!Array.isArray(state.inventory)) {
    state.inventory = [];
  }

  if (
    !state.equippedWeapon ||
    state.equippedWeapon.type !== "weapon"
  ) {
    state.equippedWeapon = null;
  }

  if (
    !state.equippedArmor ||
    state.equippedArmor.type !== "armor"
  ) {
    state.equippedArmor = null;
  }  
  state.level = Math.max(1, Number(state.level) || 1);
  state.xp = Math.max(0, Number(state.xp) || 0);
  state.gold = Math.max(0, Number(state.gold) || 0);
  state.kills = Math.max(0, Number(state.kills) || 0);
  state.potions = Math.max(0, Number(state.potions) || 0);

  const savedHP = Number(state.hp);
  const savedMP = Number(state.mp);

  state.hp = clamp(
    Number.isFinite(savedHP) ? savedHP : maxHP(),
    0,
    maxHP()
  );

  state.mp = clamp(
    Number.isFinite(savedMP) ? savedMP : maxMP(),
    0,
    maxMP()
  );

  // 計算等級與裝備提供的攻擊、防禦
syncEquipmentStats();

// 建立裝備面板
createEquipmentUI();

  updateHUD();
  draw();
  log("騎士已準備就緒。按「進入戰場」開始冒險。");
})();
