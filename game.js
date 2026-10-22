(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", init, { once: true });

  function init() {
    const $ = (id) => document.getElementById(id);
    const canvas = $("arena");
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) {
      showFatal("找不到遊戲畫布 #arena，請確認 game.html 已完整替換。");
      return;
    }

    const W = canvas.width;
    const H = canvas.height;
    const SAVE_KEY = "eclipseTrialSaveV1";

    const freshState = () => ({
      level: 1, xp: 0, gold: 0, hp: 120, mp: 40,
      potions: 3, kills: 0, questClaimed: false,
      bossDefeated: false, bossSpawned: false,
      inventory: [], equippedWeapon: null, equippedArmor: null
    });

    function loadState() {
      try {
        const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
        return Object.assign(freshState(), saved || {});
      } catch (error) {
        console.warn("讀取存檔失敗，使用新角色。", error);
        return freshState();
      }
    }

    const state = loadState();
    if (!Array.isArray(state.inventory)) state.inventory = [];
    if (!Array.isArray(state.inventory)) state.inventory = [];
    if (!state.equippedWeapon || state.equippedWeapon.type !== "weapon") {
      state.equippedWeapon = null;
    }
    if (!state.equippedArmor || state.equippedArmor.type !== "armor") {
      state.equippedArmor = null;
    }

    state.level = Math.max(1, Number(state.level) || 1);
    state.xp = Math.max(0, Number(state.xp) || 0);
    state.gold = Math.max(0, Number(state.gold) || 0);
    state.kills = Math.max(0, Number(state.kills) || 0);
    state.potions = Math.max(0, Number(state.potions) || 0);
    state.questClaimed = Boolean(state.questClaimed);
    state.bossDefeated = Boolean(state.bossDefeated);
    state.bossSpawned = Boolean(state.bossSpawned);

    const maxHP = () => 120 + (state.level - 1) * 18;
    const maxMP = () => 40 + (state.level - 1) * 6;
    const xpNeeded = () => state.level * 100;
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    const player = {
      x: W * 0.28, y: H * 0.53, r: 17, speed: 205,
      facingX: 1, facingY: 0, attack: 18, defense: 5,
      moving: false, dodgeUntil: 0, dodgeReady: 0,
      attackUntil: 0, attackReady: 0, skillReady: 0,
      skillUntil: 0, invulnerableUntil: 0
    };

    let enemies = [];
    let particles = [];
    let running = false;
    let gameOver = false;
    let victory = false;
    let lastTime = 0;
    let spawnTimer = 0;
    let toastTimer = 0;
    let lastAutosave = 0;
    let animationId = 0;
    const keys = new Set();
    const touchMove = new Set();

    const equipmentCatalog = [
      { name: "生鏽長劍", type: "weapon", attack: 3, defense: 0, rarity: "普通" },
      { name: "荒原騎士劍", type: "weapon", attack: 7, defense: 0, rarity: "稀有" },
      { name: "永夜斬魂劍", type: "weapon", attack: 13, defense: 0, rarity: "史詩" },
      { name: "破損鐵甲", type: "armor", attack: 0, defense: 2, rarity: "普通" },
      { name: "守夜者重甲", type: "armor", attack: 0, defense: 5, rarity: "稀有" },
      { name: "不朽誓約鎧甲", type: "armor", attack: 0, defense: 9, rarity: "史詩" }
    ];

    function showFatal(message) {
      const box = $("arenaMessage");
      if (box) {
        box.classList.remove("hidden");
        box.innerHTML = "";
        const title = document.createElement("strong");
        title.textContent = "遊戲初始化失敗";
        const detail = document.createElement("span");
        detail.textContent = message;
        box.append(title, detail);
      }
      console.error("[永夜紀元]", message);
    }

    function log(message) {
      const box = $("battleLog");
      if (!box) return;
      const item = document.createElement("li");
      item.textContent = message;
      box.prepend(item);
      while (box.children.length > 16) box.lastElementChild.remove();
    }

    function toast(message) {
      const box = $("toast");
      if (!box) return;
      box.textContent = message;
      box.classList.add("visible");
      toastTimer = 1.8;
    }

    function saveGame(showMessage = true) {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
        if ($("saveStatus")) $("saveStatus").textContent = "已儲存於這台裝置";
        if (showMessage) toast("冒險進度已儲存");
      } catch (error) {
        if ($("saveStatus")) $("saveStatus").textContent = "無法存檔，請檢查瀏覽器設定";
        console.error("儲存失敗：", error);
      }
    }

    function syncEquipmentStats() {
      player.attack = 18 + (state.level - 1) * 4 +
        (state.equippedWeapon?.attack || 0);
      player.defense = 5 + (state.level - 1) +
        (state.equippedArmor?.defense || 0);
    }

    function updateHUD() {
      const hp = clamp(state.hp, 0, maxHP());
      const mp = clamp(state.mp, 0, maxMP());
      const setText = (id, value) => { if ($(id)) $(id).textContent = value; };

      setText("level", state.level);
      setText("hpText", `${Math.ceil(hp)} / ${maxHP()}`);
      setText("mpText", `${Math.ceil(mp)} / ${maxMP()}`);
      if ($("hpBar")) $("hpBar").style.width = `${hp / maxHP() * 100}%`;
      if ($("mpBar")) $("mpBar").style.width = `${mp / maxMP() * 100}%`;
      setText("attackStat", player.attack);
      setText("defenseStat", player.defense);
      setText("xpText", `${state.xp} / ${xpNeeded()}`);
      setText("goldText", state.gold);
      setText("potionCount", state.potions);
      setText("questText", `擊敗魔物：${Math.min(state.kills, 5)} / 5`);
      if ($("questBar")) $("questBar").style.width = `${Math.min(100, state.kills / 5 * 100)}%`;
      setText("enemyCounter", `魔物：${enemies.length}`);
      setText("skillCooldown", performance.now() < player.skillReady
        ? `${Math.ceil((player.skillReady - performance.now()) / 1000)} 秒`
        : "可使用");
    }

    function burst(x, y, color, amount = 12) {
      for (let i = 0; i < amount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 35 + Math.random() * 150;
        particles.push({
          x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 0.3 + Math.random() * 0.35, maxLife: 0.65, color
        });
      }
    }

    function createEnemy() {
      const roll = Math.random();
      let type;
      if (roll < 0.55) {
        type = { name: "暗影小鬼", r: 14, hp: 30, speed: 78, damage: 7,
          xp: 20, goldMin: 6, goldMax: 12, color: "#9468b9", rare: false };
      } else if (roll < 0.88) {
        type = { name: "腐朽戰士", r: 19, hp: 65, speed: 42, damage: 12,
          xp: 35, goldMin: 12, goldMax: 22, color: "#858d9c", rare: false };
      } else {
        type = { name: "永夜獵手", r: 21, hp: 90, speed: 65, damage: 16,
          xp: 55, goldMin: 25, goldMax: 40, color: "#d064cb", rare: true };
      }
      const scale = 1 + (state.level - 1) * 0.13;
      const hp = Math.round(type.hp * scale);
      enemies.push({
        ...type, x: W - 65, y: 75 + Math.random() * (H - 150),
        hp, maxHp: hp, speed: type.speed + state.level * 1.5,
        damage: Math.round(type.damage * scale), attackAt: 0,
        flashUntil: 0, dead: false, phase: Math.random() * 6
      });
    }

    function createBoss() {
      if (state.bossDefeated || enemies.some(e => e.isBoss)) return;
      const hp = 950 + (state.level - 1) * 180;
      enemies.push({
        name: "永夜深淵領主", isBoss: true, rare: true, r: 32,
        x: W - 95, y: H * 0.5, hp, maxHp: hp,
        speed: 34 + state.level * 1.2, damage: 19 + Math.floor(state.level * 1.5),
        xp: 250, goldMin: 100, goldMax: 160, color: "#e34291",
        attackAt: 0, specialAt: performance.now() + 3500,
        flashUntil: 0, dead: false, phase: 0
      });
      state.bossSpawned = true;
      log("警告！永夜深淵領主降臨荒原！");
      toast("Boss 降臨：永夜深淵領主");
      saveGame(false);
    }

    function gainXP(amount) {
      state.xp += amount;
      while (state.xp >= xpNeeded()) {
        state.xp -= xpNeeded();
        state.level++;
        syncEquipmentStats();
        state.hp = maxHP();
        state.mp = maxMP();
        log(`升級！你現在是 LV.${state.level}。攻擊與防禦提升。`);
        toast(`等級提升！LV.${state.level}`);
      }
    }

    function renderEquipment() {
      const slotHTML = (item, slot) => item
        ? `<div class="equipment-name">${item.name}</div>
           <div class="muted">${item.rarity}｜攻擊 +${item.attack}｜防禦 +${item.defense}</div>
           <button type="button" data-unequip="${slot}">卸下裝備</button>`
        : `<p class="muted">尚未裝備</p>`;

      if ($("equippedWeaponView")) {
        $("equippedWeaponView").innerHTML = slotHTML(state.equippedWeapon, "equippedWeapon");
      }
      if ($("equippedArmorView")) {
        $("equippedArmorView").innerHTML = slotHTML(state.equippedArmor, "equippedArmor");
      }

      const inventory = $("equipmentInventory");
      if (!inventory) return;
      if (!state.inventory.length) {
        inventory.innerHTML = '<p class="muted">背包目前沒有裝備。擊敗魔物尋找戰利品！</p>';
      } else {
        inventory.innerHTML = state.inventory.map((item, index) =>
          `<div class="equipment-item">
            <div class="equipment-name">${item.name}</div>
            <div class="muted">${item.rarity}｜${item.type === "weapon" ? "武器" : "防具"}｜攻擊 +${item.attack}｜防禦 +${item.defense}</div>
            <button type="button" data-equip-index="${index}">裝備</button>
          </div>`
        ).join("");
      }
    }

    function equipItem(index) {
      const item = state.inventory[index];
      if (!item) return;
      const slot = item.type === "weapon" ? "equippedWeapon" : "equippedArmor";
      if (state[slot]) state.inventory.push(state[slot]);
      state[slot] = item;
      state.inventory.splice(index, 1);
      syncEquipmentStats();
      renderEquipment();
      updateHUD();
      saveGame(false);
      toast(`已裝備：${item.name}`);
    }

    function unequipItem(slot) {
      if (!state[slot]) return;
      state.inventory.push(state[slot]);
      state[slot] = null;
      syncEquipmentStats();
      renderEquipment();
      updateHUD();
      saveGame(false);
    }

    function dropEquipment(enemy) {
      if (Math.random() >= (enemy.rare ? 0.55 : 0.18)) {
        log("沒有發現裝備掉落。");
        return;
      }
      let pool = equipmentCatalog;
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
      log(`獲得裝備：【${item.rarity}】${item.name}！`);
      renderEquipment();
      saveGame(false);
    }

    function killEnemy(enemy) {
      if (enemy.dead) return;
      enemy.dead = true;
      state.kills++;
      const xp = enemy.xp || 25;
      const gold = (enemy.goldMin || 10) +
        Math.floor(Math.random() * ((enemy.goldMax || 20) - (enemy.goldMin || 10) + 1));
      state.gold += gold;
      gainXP(xp);

      if (enemy.isBoss) {
        state.bossDefeated = true;
        state.bossSpawned = true;
        state.gold += 300;
        gainXP(500);
        state.inventory.push({
          name: "深淵裁決者", type: "weapon", attack: 22, defense: 0,
          rarity: "傳說", id: Date.now() + Math.random()
        });
        log("深淵領主已被擊敗！額外獲得 500 EXP、300 金幣！");
        log("傳說裝備掉落：【深淵裁決者】攻擊 +22！");
        renderEquipment();
      } else {
        dropEquipment(enemy);
      }

      burst(enemy.x, enemy.y, enemy.rare ? "#ff63e6" : "#c9a4ff", enemy.rare ? 30 : 18);
      log(`${enemy.name}被擊敗！獲得 ${xp} EXP、${gold} 金幣。`);

      if (state.kills >= 5 && !state.questClaimed) {
        state.questClaimed = true;
        state.gold += 50;
        gainXP(80);
        log("主線任務完成！額外獲得 80 EXP、50 金幣。");
        toast("任務完成：荒原清剿");
      }

      enemies = enemies.filter(e => !e.dead);
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
      const targets = enemies.filter(e => {
        const dx = e.x - player.x, dy = e.y - player.y;
        return Math.hypot(dx, dy) < 72 + e.r &&
          dx * player.facingX + dy * player.facingY > -8;
      });
      if (!targets.length) {
        toast("攻擊未命中，靠近魔物再試試");
        return;
      }
      targets.sort((a, b) =>
        Math.hypot(a.x - player.x, a.y - player.y) -
        Math.hypot(b.x - player.x, b.y - player.y));
      hitEnemy(targets[0], player.attack, "#f3d18a");
      log(`普通攻擊造成 ${player.attack} 點傷害。`);
      updateHUD();
    }

    function useSkill() {
      if (!running || gameOver || victory) return;
      const now = performance.now();
      if (now < player.skillReady) return toast("技能還在冷卻中");
      if (state.mp < 12) return toast("魔力不足");
      state.mp -= 12;
      player.skillReady = now + 5000;
      player.skillUntil = now + 350;
      const targets = enemies.filter(e => Math.hypot(e.x - player.x, e.y - player.y) < 145);
      [...targets].forEach(e => hitEnemy(e, Math.round(player.attack * 2.1), "#c6a0ff"));
      burst(player.x, player.y, "#a57bff", 28);
      log(`裂地斬發動！命中 ${targets.length} 隻魔物。`);
      updateHUD();
    }

    function dodge() {
      if (!running || gameOver || victory) return;
      const now = performance.now();
      if (now < player.dodgeReady) return toast("閃避尚未恢復");
      player.dodgeReady = now + 1000;
      player.dodgeUntil = now + 260;
      player.invulnerableUntil = now + 450;
      let dx = 0, dy = 0;
      if (keys.has("arrowup") || keys.has("w") || touchMove.has("up")) dy--;
      if (keys.has("arrowdown") || keys.has("s") || touchMove.has("down")) dy++;
      if (keys.has("arrowleft") || keys.has("a") || touchMove.has("left")) dx--;
      if (keys.has("arrowright") || keys.has("d") || touchMove.has("right")) dx++;
      if (!dx && !dy) { dx = player.facingX; dy = player.facingY; }
      const len = Math.hypot(dx, dy) || 1;
      player.x = clamp(player.x + dx / len * 88, 25, W - 25);
      player.y = clamp(player.y + dy / len * 88, 55, H - 25);
      burst(player.x, player.y, "#79d9e8", 10);
      toast("閃避！");
    }

    function usePotion() {
      if (!running || gameOver || victory) return;
      if (state.potions <= 0) return toast("生命藥水已用完");
      if (state.hp >= maxHP()) return toast("生命值已滿");
      state.potions--;
      state.hp = Math.min(maxHP(), state.hp + 45);
      log("使用生命藥水，恢復 45 點生命值。");
      updateHUD();
      saveGame(false);
    }

    function damagePlayer(amount) {
      const now = performance.now();
      if (now < player.invulnerableUntil || gameOver) return;
      const real = Math.max(1, amount - player.defense);
      state.hp = Math.max(0, state.hp - real);
      player.invulnerableUntil = now + 450;
      burst(player.x, player.y, "#e66a75", 8);
      log(`你受到 ${real} 點傷害。`);
      updateHUD();
      if (state.hp <= 0) {
        gameOver = true;
        running = false;
        showEnd("騎士倒下了", "已取得的經驗與金幣會保留，再次挑戰可繼續冒險。");
        saveGame(false);
      }
    }

    function showEnd(title, subtitle) {
      const box = $("arenaMessage");
      if (!box) return;
      box.replaceChildren();
      const heading = document.createElement("strong");
      heading.textContent = title;
      const detail = document.createElement("span");
      detail.textContent = subtitle;
      const button = document.createElement("button");
      button.className = "primary-button";
      button.type = "button";
      button.textContent = "再次挑戰";
      button.addEventListener("click", startGame);
      box.append(heading, detail, button);
      box.classList.remove("hidden");
    }

    function startGame() {
      try {
        if (running) return;
        if (gameOver || victory) {
          enemies = [];
          particles = [];
          gameOver = false;
          victory = false;
          player.x = W * 0.28;
          player.y = H * 0.53;
          state.hp = Math.max(1, Math.round(maxHP() * 0.7));
          state.mp = maxMP();
        }
        running = true;
        if ($("arenaMessage")) $("arenaMessage").classList.add("hidden");
        if (!enemies.length && state.kills < 5) {
          for (let i = 0; i < 3; i++) createEnemy();
        }
        log("你踏入荒原。魔物正在靠近！");
        updateHUD();
        lastTime = performance.now();
        cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(loop);
      } catch (error) {
        running = false;
        showFatal(`開始戰鬥時發生錯誤：${error.message}`);
        console.error(error);
      }
    }

    function resetGame() {
      if (!window.confirm("確定要清除目前角色進度，重新開始嗎？")) return;
      Object.assign(state, freshState());
      enemies = [];
      particles = [];
      running = false;
      gameOver = false;
      victory = false;
      player.x = W * 0.28;
      player.y = H * 0.53;
      player.attackReady = 0;
      player.skillReady = 0;
      player.dodgeReady = 0;
      syncEquipmentStats();
      state.hp = maxHP();
      state.mp = maxMP();
      saveGame(false);
      renderEquipment();
      updateHUD();
      draw();
      showEnd("重新踏上旅程", "準備好後進入戰場。");
      log("新的旅程開始了。");
    }

    function movePlayer(dt) {
      let dx = 0, dy = 0;
      if (keys.has("arrowup") || keys.has("w") || touchMove.has("up")) dy--;
      if (keys.has("arrowdown") || keys.has("s") || touchMove.has("down")) dy++;
      if (keys.has("arrowleft") || keys.has("a") || touchMove.has("left")) dx--;
      if (keys.has("arrowright") || keys.has("d") || touchMove.has("right")) dx++;
      player.moving = Boolean(dx || dy);
      if (!player.moving) return;
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
      player.facingX = dx; player.facingY = dy;
      const speed = performance.now() < player.dodgeUntil ? player.speed * 1.65 : player.speed;
      player.x = clamp(player.x + dx * speed * dt, 25, W - 25);
      player.y = clamp(player.y + dy * speed * dt, 55, H - 25);
    }

    function updateEnemies(dt, now) {
      for (const e of [...enemies]) {
        if (e.dead) continue;
        const dx = player.x - e.x, dy = player.y - e.y;
        const distance = Math.hypot(dx, dy) || 1;
        const enraged = e.isBoss && e.hp <= e.maxHp * 0.5;
        const speed = e.speed * (enraged ? 1.75 : 1);

        if (distance > player.r + e.r + 5) {
          e.x += dx / distance * speed * dt;
          e.y += dy / distance * speed * dt;
        } else if (now > e.attackAt) {
          e.attackAt = now + (e.isBoss ? (enraged ? 600 : 900) : 1050);
          damagePlayer(Math.round(e.damage * (enraged ? 1.4 : 1)));
        }

        if (e.isBoss && now >= e.specialAt) {
          e.specialAt = now + (enraged ? 3000 : 4500);
          burst(e.x, e.y, "#ff3d96", 30);
          log(enraged ? "深淵領主狂暴震擊！" : "深淵領主釋放深淵震擊！");
          if (distance < (enraged ? 165 : 125)) damagePlayer(enraged ? 28 : 18);
          else toast("成功躲開 Boss 的範圍攻擊！");
        }
        e.x = clamp(e.x, 24, W - 24);
        e.y = clamp(e.y, 55, H - 24);
        e.phase += dt * 3;
      }
    }

    function updateParticles(dt) {
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.97; p.vy *= 0.97; p.life -= dt;
      }
      particles = particles.filter(p => p.life > 0);
    }

    function drawBackground() {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#211d30");
      sky.addColorStop(0.52, "#39303c");
      sky.addColorStop(1, "#15151e");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "#b7a0d0";
      ctx.globalAlpha = 0.25;
      ctx.beginPath(); ctx.arc(735, 105, 52, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#252231";
      ctx.beginPath();
      ctx.moveTo(0, 255);
      for (let x = 0; x <= W; x += 80) {
        ctx.lineTo(x, 215 + Math.sin(x * 0.018) * 20);
        ctx.lineTo(x + 25, 265);
      }
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();

      const ground = ctx.createLinearGradient(0, 270, 0, H);
      ground.addColorStop(0, "#413440");
      ground.addColorStop(1, "#1b1a23");
      ctx.fillStyle = ground;
      ctx.fillRect(0, 270, W, H - 270);

      ctx.strokeStyle = "#796273";
      ctx.globalAlpha = 0.23;
      for (let i = 0; i < 18; i++) {
        const x = (i * 137 + 31) % W;
        const y = 295 + ((i * 67) % 160);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 15, y + 7);
        ctx.lineTo(x + 22, y + 19); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function drawKnight() {
      const now = performance.now();
      if (now < player.invulnerableUntil && Math.floor(now / 65) % 2 === 0) return;
      const x = player.x, y = player.y;
      const bob = player.moving ? Math.sin(now / 75) * 3 : 0;

      ctx.fillStyle = "#08070d99";
      ctx.beginPath(); ctx.ellipse(x, y + 15, 22, 9, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = "#642c42";
      ctx.beginPath(); ctx.moveTo(x - 11, y - 13); ctx.lineTo(x + 12, y - 13);
      ctx.lineTo(x + 16, y + 12); ctx.lineTo(x, y + 17);
      ctx.lineTo(x - 16, y + 12); ctx.closePath(); ctx.fill();

      ctx.fillStyle = "#333847";
      ctx.fillRect(x - 9, y + 4 + bob, 7, 13);
      ctx.fillRect(x + 2, y + 4 - bob, 7, 13);

      ctx.fillStyle = "#87909a";
      ctx.beginPath(); ctx.moveTo(x - 13, y - 10); ctx.lineTo(x + 13, y - 10);
      ctx.lineTo(x + 10, y + 8); ctx.lineTo(x, y + 13);
      ctx.lineTo(x - 10, y + 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#d9c9a6"; ctx.lineWidth = 2; ctx.stroke();

      ctx.fillStyle = "#c2c0bd";
      ctx.beginPath(); ctx.arc(x, y - 16, 11, Math.PI, 0);
      ctx.lineTo(x + 9, y - 6); ctx.lineTo(x - 9, y - 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#302d3a"; ctx.fillRect(x - 7, y - 15, 14, 4);
      ctx.fillStyle = "#f1c57a"; ctx.fillRect(x - 4, y - 14, 8, 2);

      ctx.save();
      ctx.translate(x + player.facingX * 9, y - 2);
      ctx.rotate(Math.atan2(player.facingY, player.facingX) + Math.PI / 2);
      ctx.fillStyle = "#d8d9e1"; ctx.fillRect(-2, -24, 4, 24);
      ctx.fillStyle = "#d8b56e"; ctx.fillRect(-5, -5, 10, 3);
      ctx.restore();

      if (now < player.attackUntil || now < player.skillUntil) {
        ctx.strokeStyle = now < player.skillUntil ? "#b68cff" : "#f5d18a";
        ctx.lineWidth = now < player.skillUntil ? 6 : 4;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(x, y, now < player.skillUntil ? 63 : 43,
          Math.atan2(player.facingY, player.facingX) - 0.8,
          Math.atan2(player.facingY, player.facingX) + 0.8);
        ctx.stroke(); ctx.globalAlpha = 1;
      }

      ctx.fillStyle = "#110f18"; ctx.fillRect(x - 22, y - 42, 44, 5);
      ctx.fillStyle = "#df606a"; ctx.fillRect(x - 22, y - 42, 44 * (state.hp / maxHP()), 5);
    }

    function drawEnemy(e) {
      ctx.save();
      const now = performance.now();
      ctx.fillStyle = "#00000066";
      ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.7, e.r * 1.2, e.r * 0.4, 0, 0, Math.PI * 2); ctx.fill();

      if (e.rare) {
        ctx.strokeStyle = "#ff63e6"; ctx.lineWidth = 3;
        ctx.globalAlpha = 0.7 + Math.sin(now / 180) * 0.25;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 7, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = now < e.flashUntil ? "#ffffff" : e.color;
      ctx.beginPath();
      if (e.isBoss) {
        for (let i = 0; i < 12; i++) {
          const a = -Math.PI / 2 + i * Math.PI / 6;
          const r = i % 2 ? e.r * 0.72 : e.r * 1.1;
          const px = e.x + Math.cos(a) * r, py = e.y + Math.sin(a) * r;
          if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.strokeStyle = e.rare ? "#ff9cf0" : "#c4a8ff"; ctx.lineWidth = 2; ctx.stroke();

      ctx.fillStyle = "#fff4cc";
      ctx.beginPath();
      ctx.arc(e.x - e.r * 0.28, e.y - e.r * 0.08, 2.2, 0, Math.PI * 2);
      ctx.arc(e.x + e.r * 0.28, e.y - e.r * 0.08, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = e.isBoss ? "bold 15px sans-serif" : "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = e.rare ? "#ff9cf0" : "#f0e7ff";
      ctx.fillText(e.name, e.x, e.y - e.r - 14);

      const bw = e.isBoss ? 92 : e.r * 2.3;
      ctx.fillStyle = "#321c2b"; ctx.fillRect(e.x - bw / 2, e.y - e.r - 8, bw, 5);
      ctx.fillStyle = e.rare ? "#ff4fcb" : "#e65c67";
      ctx.fillRect(e.x - bw / 2, e.y - e.r - 8, bw * clamp(e.hp / e.maxHp, 0, 1), 5);
      ctx.restore();
    }

    function drawParticles() {
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function draw() {
      drawBackground();
      enemies.forEach(drawEnemy);
      drawKnight();
      drawParticles();
      if (!running && !gameOver && !victory) {
        ctx.fillStyle = "#ffffffaa";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("WASD／方向鍵移動　J 攻擊　K 技能　Shift 閃避　H 藥水", 16, H - 16);
      }
    }

    function loop(timestamp) {
      if (!running) return;
      const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.035);
      lastTime = timestamp;

      movePlayer(dt);
      updateEnemies(dt, timestamp);
      updateParticles(dt);

      if (enemies.length === 0 && state.kills >= 5 && !state.bossDefeated) {
        spawnTimer += dt;
        if (spawnTimer > 1.2) {
          spawnTimer = 0;
          createBoss();
        }
      } else if (enemies.length < 3 && state.kills < 5) {
        spawnTimer += dt;
        if (spawnTimer > 1.6) {
          spawnTimer = 0;
          createEnemy();
        }
      }

      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0 && $("toast")) $("toast").classList.remove("visible");
      }
      if (timestamp - lastAutosave > 12000) {
        saveGame(false);
        lastAutosave = timestamp;
      }

      updateHUD();
      draw();

      if (state.bossDefeated && enemies.length === 0 && !victory) {
        victory = true;
        running = false;
        showEnd("第一章完成", "你擊敗了永夜深淵領主，荒原的黑暗暫時退去！");
        saveGame(false);
        return;
      }

      animationId = requestAnimationFrame(loop);
    }

    function bind(id, handler) {
      const element = $(id);
      if (!element) {
        console.warn(`[永夜紀元] 找不到 #${id}，已略過該按鈕。`);
        return;
      }
      element.addEventListener("click", (event) => {
        event.preventDefault();
        try {
          handler();
        } catch (error) {
          console.error(`[永夜紀元] #${id} 操作失敗：`, error);
          toast("操作失敗，請重新整理遊戲頁面。");
        }
      });
    }

    bind("startButton", startGame);
    bind("attackButton", normalAttack);
    bind("skillButton", useSkill);
    bind("dodgeButton", dodge);
    bind("potionButton", usePotion);
    bind("saveButton", () => saveGame(true));
    bind("clearLog", () => {
      if ($("battleLog")) $("battleLog").replaceChildren();
      log("戰鬥紀錄已清除。");
    });
    bind("resetButton", resetGame);

    const equipmentInventory = $("equipmentInventory");
    if (equipmentInventory) {
      equipmentInventory.addEventListener("click", (event) => {
        const button = event.target.closest("[data-equip-index]");
        if (button) equipItem(Number(button.dataset.equipIndex));
      });
    }
    document.querySelectorAll(".equipment-slots").forEach(panel => {
      panel.addEventListener("click", (event) => {
        const button = event.target.closest("[data-unequip]");
        if (button) unequipItem(button.dataset.unequip);
      });
    });

    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
        event.preventDefault();
      }
      keys.add(key);
      if (event.repeat) return;
      if (key === "j" || key === " ") normalAttack();
      if (key === "k") useSkill();
      if (key === "shift") dodge();
      if (key === "h") usePotion();
    });
    window.addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));
    window.addEventListener("blur", () => {
      keys.clear();
      touchMove.clear();
    });

    document.querySelectorAll("[data-move]").forEach(button => {
      const direction = button.dataset.move;
      let activePointer = null;
      button.addEventListener("pointerdown", event => {
        event.preventDefault();
        activePointer = event.pointerId;
        touchMove.add(direction);
        if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
      });
      const release = event => {
        if (activePointer !== null && event.pointerId !== undefined &&
            event.pointerId !== activePointer) return;
        touchMove.delete(direction);
        activePointer = null;
      };
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("lostpointercapture", release);
    });

    syncEquipmentStats();
    state.hp = clamp(Number(state.hp) || maxHP(), 0, maxHP());
    state.mp = clamp(Number(state.mp) || maxMP(), 0, maxMP());
    renderEquipment();
    updateHUD();
    draw();
    log("騎士已準備就緒。按「進入戰場」開始冒險。");
    console.info("[永夜紀元] 遊戲初始化完成。");
  }
})();
