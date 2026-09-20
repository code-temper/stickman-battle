const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const screenTitle = document.getElementById('screen-title');
const screenDesc = document.getElementById('screen-desc');
const levelDisplay = document.getElementById('level-display');

const p1HealthEl = document.getElementById('p1-health');
const p1HpText = document.getElementById('p1-hp-text');
const enemyHealthEl = document.getElementById('enemy-health');
const enemyStatusTitle = document.getElementById('enemy-status-title');
const enemyHpText = document.getElementById('enemy-hp-text');
const activeWeaponNameEl = document.getElementById('active-weapon-name');
const weaponSelectBtns = document.querySelectorAll('.w-select-btn');

let gameRunning = false;
const gravity = 0.6;
const groundY = 310;

let currentLevel = 1;
const maxLevel = 20;

const WEAPONS = {
    FIST: { name: '双拳', dmg: 15, range: 45, cooldown: 12 },
    DAGGER: { name: '匕首', dmg: 25, range: 55, cooldown: 10 },
    PISTOL: { name: '手枪', dmg: 35, range: 350, cooldown: 20 },
    AK47: { name: 'AK47', dmg: 45, range: 420, cooldown: 8 },
    STAFF: { name: '长棍', dmg: 40, range: 75, cooldown: 25 },
    BLADE: { name: '大刀', dmg: 50, range: 85, cooldown: 30 },
    KAMEHAMEHA: { name: '龟派气功', dmg: 120, range: 600, cooldown: 70 }
};

// 角色类
class Fighter {
    constructor(x, color, isPlayer) {
        this.x = x;
        this.y = groundY;
        this.vx = 0;
        this.vy = 0;
        this.width = 25;
        this.height = 60;
        this.color = color;
        this.isPlayer = isPlayer;
        
        // 需求4：血量改为 500
        this.maxHp = 500;
        this.hp = 500;
        this.dmgBonus = isPlayer ? 0 : Math.floor(currentLevel * 3);
        
        this.isJumping = false;
        this.facing = isPlayer ? 1 : -1; // 1: 朝右, -1: 朝左
        
        this.currentWeaponKey = isPlayer ? 'FIST' : (currentLevel > 10 ? 'AK47' : 'PISTOL');
        this.weapon = WEAPONS[this.currentWeaponKey];
        this.attackCooldown = 0;
        this.isAttacking = false;
        this.attackAnimTimer = 0;
        this.animFrame = 0;
        this.aiTimer = 0;
    }

    update(targets, effectsList) {
        this.vy += gravity;
        this.y += this.vy;
        this.x += this.vx;

        if (this.y >= groundY) {
            this.y = groundY;
            this.vy = 0;
            this.isJumping = false;
        }

        if (this.x < 25) this.x = 25;
        if (this.x > canvas.width - 25) this.x = canvas.width - 25;

        // 动作流畅度：动画帧自增
        if (Math.abs(this.vx) > 0 || this.isJumping) {
            this.animFrame += 0.2;
        } else {
            this.animFrame = 0;
        }

        // 修复2：精准转身控制（根据移动方向或朝向目标锁定转身）
        if (this.vx > 0) this.facing = 1;
        else if (this.vx < 0) this.facing = -1;

        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.attackAnimTimer > 0) {
            this.attackAnimTimer--;
            if (this.attackAnimTimer === 0) this.isAttacking = false;
        }

        // AI 敌人逻辑
        if (!this.isPlayer && targets.length > 0) {
            let target = targets[0];
            let dist = target.x - this.x;
            this.facing = dist > 0 ? 1 : -1; // AI 面向玩家

            this.aiTimer++;
            if (Math.abs(dist) > 70) {
                this.vx = this.facing * (2.2 + currentLevel * 0.04);
                if (this.aiTimer % 80 === 0 && !this.isJumping) {
                    this.vy = -12;
                    this.isJumping = true;
                }
            } else {
                this.vx = 0;
                if (this.attackCooldown === 0) {
                    this.attack(target, effectsList);
                }
            }
        }
    }

    draw() {
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const headRadius = 9;
        const headX = this.x;
        const headY = this.y - this.height + headRadius;

        // 1. 头部
        ctx.beginPath();
        ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
        ctx.stroke();

        // 2. 躯干
        const bodyTopY = headY + headRadius;
        const bodyBottomY = this.y - 16;
        ctx.beginPath();
        ctx.moveTo(headX, bodyTopY);
        ctx.lineTo(headX, bodyBottomY);
        ctx.stroke();

        // 3. 修复1：流畅的四肢摆动动画
        let swing = Math.sin(this.animFrame) * 14;
        ctx.beginPath();
        // 左腿
        ctx.moveTo(headX, bodyBottomY);
        ctx.lineTo(headX - 10 + swing, this.y);
        // 右腿
        ctx.moveTo(headX, bodyBottomY);
        ctx.lineTo(headX + 10 - swing, this.y);
        ctx.stroke();

        // 4. 双臂与攻击姿态
        let armAngle = this.isAttacking ? (this.facing * Math.PI / 2.5) : 0;
        let handX = headX + (20 + (this.isAttacking ? 12 : 0)) * this.facing;
        let handY = bodyTopY + 12 + armAngle;

        ctx.beginPath();
        ctx.moveTo(headX, bodyTopY + 8);
        ctx.lineTo(handX, handY);
        ctx.stroke();

        // 修复3：绘制每种武器对应的手持武器模型
        this.drawWeapon(handX, handY);

        ctx.restore();
    }

    // 修复3：详细的武器绘制函数
    drawWeapon(wx, wy) {
        ctx.save();
        ctx.lineWidth = 2;
        
        switch (this.currentWeaponKey) {
            case 'DAGGER':
                ctx.strokeStyle = '#38bdf8';
                ctx.beginPath();
                ctx.moveTo(wx, wy);
                ctx.lineTo(wx + 16 * this.facing, wy - 4);
                ctx.stroke();
                // 匕首护手
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(wx + 2 * this.facing, wy - 3, 3, 6);
                break;
            case 'PISTOL':
                ctx.fillStyle = '#64748b';
                ctx.fillRect(wx, wy - 2, 14 * this.facing, 6);
                ctx.fillStyle = '#334155';
                ctx.fillRect(wx + 4 * this.facing, wy + 4, 4, 6);
                break;
            case 'AK47':
                ctx.fillStyle = '#b45309'; // 枪托木纹
                ctx.fillRect(wx - 4 * this.facing, wy, 8 * this.facing, 5);
                ctx.fillStyle = '#334155'; // 枪身
                ctx.fillRect(wx + 4 * this.facing, wy - 2, 22 * this.facing, 6);
                ctx.fillStyle = '#1e293b'; // 弹夹
                ctx.fillRect(wx + 10 * this.facing, wy + 4, 4, 8);
                break;
            case 'STAFF':
                ctx.strokeStyle = '#a855f7';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(wx - 8 * this.facing, wy - 20);
                ctx.lineTo(wx + 8 * this.facing, wy + 20);
                ctx.stroke();
                break;
            case 'BLADE':
                ctx.strokeStyle = '#ec4899';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(wx, wy);
                ctx.lineTo(wx + 28 * this.facing, wy - 18);
                ctx.stroke();
                // 大刀宽背
                ctx.fillStyle = '#f472b6';
                ctx.fillRect(wx + 5 * this.facing, wy - 8, 14 * this.facing, 4);
                break;
            case 'KAMEHAMEHA':
                // 气功蓄力蓝色能量球光晕
                ctx.shadowBlur = 12;
                ctx.shadowColor = '#38bdf8';
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(wx + 6 * this.facing, wy, 10, 0, Math.PI * 2);
                ctx.fill();
                break;
            default: // FIST 双拳微光
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.beginPath();
                ctx.arc(wx, wy, 4, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        ctx.restore();
    }

    attack(target, effectsList) {
        if (this.attackCooldown > 0) return;

        this.isAttacking = true;
        this.attackAnimTimer = 10;
        this.attackCooldown = this.weapon.cooldown;

        const distance = Math.abs(this.x - target.x);
        let finalDmg = this.weapon.dmg + (this.isPlayer ? 0 : this.dmgBonus);

        if (['PISTOL', 'AK47', 'KAMEHAMEHA'].includes(this.currentWeaponKey)) {
            effectsList.push(new Effect(this.x + 20 * this.facing, this.y - 30, this.currentWeaponKey.toLowerCase(), this.facing, finalDmg));
        } else {
            effectsList.push(new Effect(this.x + 25 * this.facing, this.y - 30, 'melee', this.facing, finalDmg));
            if (distance <= this.weapon.range && Math.abs(this.y - target.y) < 45) {
                target.takeDamage(finalDmg);
            }
        }
    }

    switchWeapon(weaponKey) {
        if (WEAPONS[weaponKey]) {
            this.currentWeaponKey = weaponKey;
            this.weapon = WEAPONS[weaponKey];
            activeWeaponNameEl.textContent = `${this.weapon.name} (DMG: ${this.weapon.dmg})`;
            
            weaponSelectBtns.forEach(btn => {
                if(btn.dataset.w === weaponKey) btn.classList.add('active');
                else btn.classList.remove('active');
            });
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
    }
}

// 光影与子弹特效类
class Effect {
    constructor(x, y, type, facing, dmg) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.facing = facing;
        this.dmg = dmg;
        this.life = 25;
        if (type === 'pistol') this.vx = 16 * facing;
        if (type === 'ak47') this.vx = 20 * facing;
        if (type === 'kamehameha') { this.vx = 10 * facing; this.life = 45; }
    }

    update(targets) {
        this.life--;
        if (['pistol', 'ak47', 'kamehameha'].includes(this.type)) {
            this.x += this.vx;
            targets.forEach(t => {
                if (Math.abs(this.x - t.x) < 25 && Math.abs(this.y - t.y) < 45) {
                    t.takeDamage(this.dmg);
                    this.life = 0;
                }
            });
        }
    }

    draw() {
        ctx.save();
        if (this.type === 'pistol') {
            ctx.fillStyle = '#facc15';
            ctx.fillRect(this.x, this.y, 10, 3);
        } else if (this.type === 'ak47') {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(this.x, this.y, 14, 4);
        } else if (this.type === 'kamehameha') {
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#38bdf8';
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 14, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 16, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// 游戏全局实例与初始化
let player = new Fighter(150, '#f8fafc', true);
let enemies = [];
let effects = [];
const keys = {};

function initLevelEnemies() {
    enemies = [];
    let enemyCount = Math.min(3, 1 + Math.floor((currentLevel - 1) / 5));
    for (let i = 0; i < enemyCount; i++) {
        let enemyColors = ['#ef4444', '#a855f7', '#3b82f6'];
        let en = new Fighter(750 - i * 50, enemyColors[i % enemyColors.length], false);
        if (currentLevel >= 4) en.switchWeapon('STAFF');
        if (currentLevel >= 9) en.switchWeapon('AK47');
        if (currentLevel >= 14) en.switchWeapon('KAMEHAMEHA');
        enemies.push(en);
    }
}

// 键盘控制
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (!gameRunning) return;
    if (e.key === 'j' || e.key === 'J') player.attack(enemies[0] || player, effects);
    if ((e.key === 'w' || e.key === 'W') && !player.isJumping) { player.vy = -13; player.isJumping = true; }
    if (e.key >= '1' && e.key <= '7') {
        const keysList = ['FIST', 'DAGGER', 'PISTOL', 'AK47', 'STAFF', 'BLADE', 'KAMEHAMEHA'];
        player.switchWeapon(keysList[parseInt(e.key) - 1]);
    }
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// 触控按钮绑定
function bindTouchButton(id, startCallback, endCallback) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); if (startCallback) startCallback(); });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); if (endCallback) endCallback(); });
    btn.addEventListener('mousedown', () => { if (startCallback) startCallback(); });
    btn.addEventListener('mouseup', () => { if (endCallback) endCallback(); });
}

bindTouchButton('btn-left', () => { keys['a'] = true; }, () => { keys['a'] = false; });
bindTouchButton('btn-right', () => { keys['d'] = true; }, () => { keys['d'] = false; });
bindTouchButton('btn-jump', () => { if (!player.isJumping) { player.vy = -13; player.isJumping = true; } });
bindTouchButton('btn-attack', () => { if (enemies.length > 0) player.attack(enemies[0], effects); });

weaponSelectBtns.forEach(btn => {
    btn.addEventListener('click', () => { player.switchWeapon(btn.dataset.w); });
});

function handlePlayerInput() {
    player.vx = 0;
    if (keys['a'] || keys['A'] || keys['ArrowLeft']) player.vx = -5;
    if (keys['d'] || keys['D'] || keys['ArrowRight']) player.vx = 5;
}

function updateUI() {
    p1HealthEl.style.width = `${(player.hp / player.maxHp) * 100}%`;
    p1HpText.textContent = `${player.hp}/${player.maxHp}`;
    levelDisplay.textContent = `第 ${currentLevel} / ${maxLevel} 关`;

    if (enemies.length > 0) {
        let primaryEnemy = enemies[0];
        enemyStatusTitle.textContent = `敌方残存: ${enemies.length}`;
        enemyHealthEl.style.width = `${(primaryEnemy.hp / primaryEnemy.maxHp) * 100}%`;
        enemyHpText.textContent = `HP: ${primaryEnemy.hp}/${primaryEnemy.maxHp}`;
    }
}

function gameLoop() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制地面
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();

    handlePlayerInput();
    player.update(enemies, effects);

    enemies.forEach((en, index) => {
        en.update([player], effects);
        if (en.hp <= 0) {
            enemies.splice(index, 1);
        }
    });

    effects.forEach((eff, index) => {
        let targets = eff.facing > 0 ? enemies : [player];
        eff.update(targets);
        eff.draw();
        if (eff.life <= 0) effects.splice(index, 1);
    });

    player.draw();
    enemies.forEach(en => en.draw());

    updateUI();

    if (player.hp <= 0) {
        endGame(false, "你被击败了！");
    } else if (enemies.length === 0) {
        if (currentLevel >= maxLevel) {
            endGame(true, "🏆 恭喜通关全部20关！");
        } else {
            currentLevel++;
            endGame(false, `第 ${currentLevel - 1} 关胜利！`, "进入下一关");
        }
    } else {
        requestAnimationFrame(gameLoop);
    }
}

function startGame() {
    player = new Fighter(150, '#f8fafc', true);
    effects = [];
    initLevelEnemies();
    player.switchWeapon('FIST');
    
    startScreen.style.display = 'none';
    gameRunning = true;
    gameLoop();
}

function endGame(isVictory, titleText, btnText = "重新开始") {
    gameRunning = false;
    startScreen.style.display = 'flex';
    screenTitle.textContent = titleText;
    screenDesc.textContent = isVictory ? "你是真正的火柴人格斗之王！" : `当前进度：第 ${currentLevel} 关`;
    startBtn.textContent = btnText;
}

startBtn.addEventListener('click', () => {
    if (screenTitle.textContent.includes("通关")) {
        currentLevel = 1;
    }
    startGame();
});
