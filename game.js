
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
    questClaimed: false
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

  function createEnemy() {
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side < 0 ? W - 65 : W - 65;
    const y = 90 + Math.random() * (H - 180);
    const scale = 1 + Math.max(0, state.level - 1) * 0.13;
    enemies.push({
      x, y, r: 17, hp: Math.round(42 * scale),
      maxHp: Math.round(42 * scale),
      speed: 48 + Math.random() * 16 + state.level * 2,
      damage: Math.round(9 * scale),
      attackAt: 0, flashUntil: 0,
      dead: false, phase: Math.random() * 6
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
      player.attack = 18;
      player.defense = 5;
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
    state.gold += 10 + Math.floor(Math.random() * 11);
    gainXP(25);
    burst(enemy.x, enemy.y, "#c9a4ff", 18);
    log("荒原魔物被擊敗！獲得 25 EXP 與金幣。");

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

  function drawEnemy(e) {
    const now = performance.now();
    const x = e.x, y = e.y + Math.sin(e.phase) * 2;
    ctx.fillStyle = "#07070db0";
    ctx.beginPath();
    ctx.ellipse(x, y + 12, 21, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = now < e.flashUntil ? "#fff" : "#55426c";
    ctx.beginPath();
    ctx.moveTo(x, y - 23);
    ctx.lineTo(x + 18, y - 8);
    ctx.lineTo(x + 14, y + 11);
    ctx.lineTo(x, y + 18);
    ctx.lineTo(x - 14, y + 11);
    ctx.lineTo(x - 18, y - 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ac81cb";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 角與眼睛
    ctx.fillStyle = "#b3a0d0";
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 14);
    ctx.lineTo(x - 18, y - 28);
    ctx.lineTo(x - 4, y - 19);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 10, y - 14);
    ctx.lineTo(x + 18, y - 28);
    ctx.lineTo(x + 4, y - 19);
    ctx.fill();
    ctx.fillStyle = "#ff6d87";
    ctx.fillRect(x - 8, y - 7, 5, 3);
    ctx.fillRect(x + 3, y - 7, 5, 3);

    ctx.fillStyle = "#15121b";
    ctx.fillRect(x - 22, y - 39, 44, 5);
    ctx.fillStyle = "#d65d75";
    ctx.fillRect(x - 22, y - 39, 44 * Math.max(0, e.hp / e.maxHp), 5);
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

  // 觸控移動按鈕
  document.querySelectorAll("[data-move]").forEach(button => {
    const direction = button.dataset.move;
    const down = (event) => {
      event.preventDefault();
      touchMove.add(direction);
    };
    const up = (event) => {
      event.preventDefault();
      touchMove.delete(direction);
    };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("pointerleave", up);
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

  player.attack = 18 + (state.level - 1) * 4;
  player.defense = 5 + (state.level - 1);

  updateHUD();
  draw();
  log("騎士已準備就緒。按「進入戰場」開始冒險。");
})();
