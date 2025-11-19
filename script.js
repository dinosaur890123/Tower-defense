document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error("Could not find game canvas.");
        return;
    }
    const ctx = canvas.getContext('2d');
    const baseHealthDisplay = document.getElementById('base-health-display');
    const goldDisplay = document.getElementById('gold-display');
    const waveDisplay = document.getElementById('wave-display');
    const buildTurretButton = document.getElementById('build-turret-button');
    const startWaveButton = document.getElementById('start-wave-button');
    const messageBox = document.getElementById('message-box');
    const buildFrostButton = document.getElementById('build-frost-button');
    const buildBombButton = document.getElementById('build-bomb-button');
    const buildMenuContainer = document.getElementById('ui-panel');
    const upgradeMenuContainer = document.getElementById('upgrade-menu-container');
    const towerStatsDisplay = document.getElementById('tower-stats-display');
    const upgradeTowerButton = document.getElementById('upgrade-tower-button')
    const sellTowerButton = document.getElementById('sell-tower-button')
    const deselectTowerButton = document.getElementById('deselect-tower-button');
    const meteorStrikeButton = document.getElementById('meteor-strike-button');
    const globalFreezeButton = document.getElementById('global-freeze-button');
    const meteorOverlay = meteorStrikeButton.querySelector('.cooldown-overlay');
    const meteorCooldownText = meteorStrikeButton.querySelector('.cooldown-text');
    const freezeOverlay = globalFreezeButton.querySelector('.cooldown-overlay');
    const freezeCooldownText = globalFreezeButton.querySelector('.cooldown-text');
    const mapSelectionScreen = document.getElementById('map-selection-screen');
    const mapEasyButton = document.getElementById('map-easy-button');
    const mapMediumButton = document.getElementById('map-medium-button');
    const mapHardButton = document.getElementById('map-hard-button');
    const statsBar = document.getElementById('stats-bar');
    const mainContent = document.getElementById('main-content');
    const targetFirstButton = document.getElementById('target-first-button');
    const targetLastButton = document.getElementById('target-last-button');
    const targetClosestButton = document.getElementById('target-closest-button');
    const targetStrongestButton = document.getElementById('target-strongest-button')
    const targetWeakestButton = document.getElementById('target-weakest-button');
    const targetFastestButton = document.getElementById('target-fastest-button');
    const buildMineButton = document.getElementById('build-mine-button');
    const endlessToggle = document.getElementById('endless-toggle');
    const pauseButton = document.getElementById('pause-button');
    const speedButton = document.getElementById('speed-button');
    const pathOptions = document.getElementById('path-options');
    const targetButtons = {
        first: targetFirstButton,
        last: targetLastButton,
        closest: targetClosestButton,
        strongest: targetStrongestButton,
        weakest: targetWeakestButton,
        fastest: targetFastestButton,
    };
    const buildButtons = [buildTurretButton, buildFrostButton, buildBombButton, buildMineButton];
    const TILE_SIZE = 40;
    const MAP_COLS = canvas.width / TILE_SIZE;
    const MAP_ROWS = canvas.height / TILE_SIZE;
    const TURRET_COST = 50;
    const FROST_COST = 75;
    const BOMB_COST = 120;
    const MINE_COST = 200;
    const INTEREST_RATE = 0.10;
    const MAX_INTEREST = 50;
    const maps = {
        easy: {
            path: [
                {x: 0, y: 5}, {x: 4, y: 5}, {x: 4, y: 8}, {x: 8, y: 8}, {x: 8, y: 5}, {x: 12, y: 5}, {x: 12, y: 8}, {x: 16, y: 8}, {x: 16, y: 12}, {x: 19, y: 12}
            ],
            startHealth: 120,
            startGold: 120
        },
        medium: {
            path: [
                {x: 0, y: 5}, {x: 3, y: 5}, {x: 3, y: 2}, {x: 7, y: 2}, {x: 7, y: 8}, {x: 12, y: 8}, {x: 12, y: 5}, {x: 16, y: 5}, {x: 16, y: 12}, {x: 19, y: 12}
            ],
            startHealth: 100,
            startGold: 100
        },
        hard: {
            path: [
                {x: 0, y: 2}, {x: 17, y: 2}, {x: 17, y: 5}, {x: 2, y: 5}, {x: 2, y: 8}, {x: 17, y: 8}, {x: 17, y: 11}, {x: 0, y: 11}, {x: 0, y: 14}, {x: 19, y: 14}
            ],
            startHealth: 80,
            startGold: 80
        }
    };
    let path = [
        {x: 0, y: 5},
        {x: 3, y: 5},
        {x: 3, y: 2},
        {x: 7, y: 2},
        {x: 7, y: 8},
        {x: 12, y: 8},
        {x: 12, y: 5},
        {x: 16, y: 5},
        {x: 16, y: 12},
        {x: 19, y: 12}
    ];
    const waveCompositions = [
        [],
        ['basic', 'basic', 'basic', 'basic', 'basic', 'basic', 'basic', 'basic'],
        ['basic', 'basic', 'basic', 'basic', 'runner', 'basic', 'basic', 'runner', 'basic', 'basic'],
        ['basic', 'runner', 'basic', 'runner', 'basic', 'runner', 'basic', 'runner', 'basic', 'runner'],
        ['brute', 'basic', 'basic', 'basic', 'runner', 'runner', 'runner', 'brute', 'basic', 'basic'],
        ['brute', 'brute', 'brute', 'runner', 'runner', 'runner', 'runner', 'runner', 'runner'],
        ['brute', 'brute', 'drone', 'brute', 'brute', 'brute', 'brute']
    ];
    let baseHealth = 100;
    let gold = 100;
    let wave = 0;
    let enemies = [];
    let towers = [];
    let buildingTower = null;
    let waveInProgress = false;
    let enemiesToSpawn = [];
    let waveSpawnTimer = 0;
    let selectedTower = null;
    let explosions = [];
    let projectiles = [];
    let spellMode = null;
    let endlessMode = false;
    let paused = false;
    let timeScale = 1;
    const SPELL_COSTS = {
        meteor: {maxCooldown: 120 * 60, radius:  TILE_SIZE * 3, damage: 300},
        freeze: {maxCooldown: 180 * 60, duration: 5 * 60}
    };
    const PROMOTE_COSTS = {mg: 300, sniper: 350};
    let spells = {
        meteor: {unlocked: false, cooldown: 0},
        freeze: {unlocked: false, cooldown: 0}
    };
    
    class Enemy {
        constructor(health, speed, goldValue = 5, baseDamage = 10, color = 'red', size = TILE_SIZE * 0.6, opts = {}) {
            this.x = path[0].x * TILE_SIZE + TILE_SIZE / 2;
            this.y = path[0].y * TILE_SIZE + TILE_SIZE / 2;
            this.health = health;
            this.maxHealth = health;
            this.speed = speed;
            this.pathIndex = 0;
            this.width = size;
            this.height = size;
            this.baseDamage = baseDamage;
            this.goldValue = goldValue;
            this.color = color;
            this.speedModifier = 1;
            this.slowTimer = 0;
            this.isFlying = false;

            this.isCamo = opts.isCamo ?? false;
            this.armor = opts.armor ?? 0;
            this.fortified = opts.fortified ?? false;
            if (this.fortified) {
                this.maxHealth = Math.floor(this.maxHealth * 1.5);
                this.health = this.maxHealth;
            }
            this.regrowRate = opts.regrowRate ?? 0;
            this.outOfCombatTimer = 0;
        }
        applySlow(duration) {
            this.slowTimer = Math.max(this.slowTimer, duration);
        }
        takeDamage(amount, damageType = 'generic') {
            this.outOfCombatTimer = 120;
            let armorVal = this.armor;
            if (armorVal > 0) {
                if (damageType === 'magic') {
                    armorVal = Math.max(0, Math.floor(armorVal * 0.5));
                } else if (damageType === 'explosive') {
                    armorVal = Math.floor(armorVal * 1.1);
                }
            }
            const effective = Math.max(1, Math.floor(amount - armorVal));
            this.health -= effective;
            if (this.health <= 0) {
                gold += this.goldValue;
                updateUI();
            }
        }
        move() {
            if (this.slowTimer > 0) {
                this.slowTimer--;
                this.speedModifier = 0.5;
            } else {
                this.speedModifier = 1;
            }
            if (this.outOfCombatTimer > 0) {
                this.outOfCombatTimer--;
            } else if (this.regrowRate > 0 && this.health > 0 && this.health < this.maxHealth) {
                this.health = Math.min(this.maxHealth, this.health + this.regrowRate);
            }
            if (this.pathIndex >= path.length - 1) {
                baseHealth -= this.baseDamage;
                this.health = 0;
                updateUI();
                return;
            }
            const targetPoint = path[this.pathIndex + 1];
            const targetX = targetPoint.x * TILE_SIZE + TILE_SIZE / 2;
            const targetY = targetPoint.y * TILE_SIZE + TILE_SIZE / 2;
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const currentSpeed = this.speed * this.speedModifier;
            if (distance < currentSpeed) {
                this.pathIndex++;
                this.x = targetX;
                this.y = targetY;
            } else {
                this.x += (dx / distance) * currentSpeed;
                this.y += (dy / distance) * currentSpeed;
            }
        }
        draw() {
            if (this.isCamo) {
                ctx.save();
                ctx.globalAlpha = 0.6;
            }
            ctx.fillStyle = this.slowTimer > 0 ? 'deepskyblue' : 'red';
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
            if (this.isCamo) {
                ctx.restore();
                ctx.fillStyle = '#3ac0a6';
                ctx.beginPath();
                ctx.moveTo(this.x, this.y - this.height / 2 - 6);
                ctx.lineTo(this.x - 5, this.y - this.height / 2 - 1);
                ctx.lineTo(this.x + 5, this.y - this.height / 2 - 1);
                ctx.closePath();
                ctx.fill();
            }
            ctx.fillStyle = 'rgba(31, 29, 29, 1)';
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 8, this.width, 5);
            ctx.fillStyle = 'lime';
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 8, this.width * (this.health / this.maxHealth), 5);
        }
    }
    class RunnerEnemy extends Enemy {
        constructor() {
            super(75, 2.5, 3, 5, 'yellow', TILE_SIZE * 0.4); 
        }
    }
    class BruteEnemy extends Enemy {
        constructor() {
            super(400, 0.8, 15, 25, '#ff6347', TILE_SIZE * 0.8);
        }
    }
    class DroneEnemy extends Enemy {
        constructor() {
            super(60, 1.2, 8, 10, '#a8a3a3ff');
            this.isFlying = true;
            this.propellerAngle = 0;
        }
        move() {
            if (this.slowTimer > 0) {
                this.speedModifier = 0.5;
                this.slowTimer--;
            } else {
                this.speedModifier = 1;
            }
            const targetPoint = path[path.length - 1];
            const targetX = targetPoint.x * TILE_SIZE + TILE_SIZE / 2;
            const targetY = targetPoint.y * TILE_SIZE + TILE_SIZE / 2;
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const currentSpeed = this.speed * this.speedModifier;
            if (distance < currentSpeed) {
                baseHealth -= this.baseDamage;
                this.health = 0;
                updateUI();
                if (baseHealth <= 0) {
                    gameOver();
                }
            } else {
                this.x += (dx / distance) * currentSpeed;
                this.y += (dy / distance) * currentSpeed;
            }
        }
        draw() {
            this.propellerAngle += 0.5;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.propellerAngle);
            ctx.fillStyle = '#797575ff';
            ctx.fillRect(-this.width * 0.7, -2, this.width * 1.4, 4);
            ctx.rotate(Math.PI / 2);
            ctx.fillRect(-this.width * 0.7, -2, this.width * 1.4, 4);
            ctx.restore();
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.stroke();
            ctx.fillStyle = 'black';
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 8, this.width, 5);
            ctx.fillStyle = 'lime';
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 8, this.width * (this.health / this.maxHealth), 5);
        }
    }
    class ShieldedEnemy extends Enemy {
        constructor(wave) {
            const baseHP = 140 + wave * 20;
            super(baseHP, 0.9 + wave * 0.03, 8, 12, '#7b8ba3', TILE_SIZE * 0.65, {armor: 6 + Math.floor(wave * 0.3)});
            this.armor = 6 + Math.floor(wave * 0.3);
        }
        takeDamage(amount, damageType = 'generic') {
            super.takeDamage(amount, damageType);
        }
    }
    class RegenEnemy extends Enemy {
        constructor(wave) {
            const baseHP = 110 + wave * 18;
            super(baseHP, 1.1 + wave * 0.04, 7, 10, '#3fa36b', TILE_SIZE * 0.6);
            this.regen = 0.25 + wave * 0.02;
        }
        move() {
            super.move();
            if (this.health > 0 && this.health < this.maxHealth) {
                this.health = Math.min(this.maxHealth, this.health + this.regen);
            }
        }
    }
    class SwarmEnemy extends Enemy {
        constructor(wave) {
            const baseHP = 24 + Math.floor(wave * 2);
            super(baseHP, 2.2 + wave * 0.06, 1, 4, '#cbcb39ff', TILE_SIZE * 0.35);
        }
    }
    class BossEnemy extends Enemy {
        constructor(wave) {
            const hp = 2500 + wave * 220;
            super(hp, 0.65 + wave * 0.02, 100, 60, '#b43434', TILE_SIZE);
            this.isBoss = true;
            this.spawnPhase = 0;
        }
        move() {
            super.move();
            if (this.health <= 0) return;
            const pct = this.health / this.maxHealth;
            if (this.spawnPhase === 0 && pct <= 0.66) {
                this.spawnAdds();
                this.spawnPhase = 1;
            } else if (this.spawnPhase === 1 && pct <= 0.33) {
                this.spawnAdds(true);
                this.spawnPhase = 2; 
            }
        }
        spawnAdds(harder = false) {
            const adds = [];
            if (harder) {
                adds.push(new BruteEnemy(), new ShieldedEnemy(wave), new DroneEnemy());
            } else {
                adds.push(new RunnerEnemy(), new RunnerEnemy(), new RegenEnemy(wave));
            }
            for (const a of adds) {
                a.x = this.x + (Math.random() * 40 - 20);
                a.y = this.y + (Math.random() * 40 - 20);
                enemies.push(a);
            }
            explosions.push({x: this.x, y: this.y, radius: TILE_SIZE * 1.2, timer: 10, color: 'rgba(255, 120, 80, 0.6)'});
        }
        draw() {
            ctx.fillStyle = this.slowTimer > 0 ? '#cf5a5a' : this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#3a2222';
            ctx.stroke();
            ctx.fillStyle = 'black';
            ctx.fillRect(this.x - this.width / 1.2, this.y - this.height / 2 - 12, this.width * 1.2, 7);
            ctx.fillStyle = '#efbe2cff';
            ctx.fillRect(this.x - this.width / 1.2, this.y - this.height / 2 - 12, (this.width * 1.2) * (this.health / this.maxHealth), 7);
        }
    }
    class Projectile {
        constructor(x, y, target, speed, damage, color, slowDuration = 0, damageType = 'physical', pierce = 1) {
            this.x = x;
            this.y = y;
            this.target = target;
            this.speed = speed;
            this.damage = damage;
            this.color = color;
            this.slowDuration = slowDuration;
            this.size = 5;
            this.damageType = damageType;
            this.pierce = pierce;
            this.chainRadius = 28;
        }
        move() {
            if (!this.target || this.target.health <= 0) {
                return false;
            }
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.speed) {
                this.target.takeDamage(this.damage, this.damageType);
                if (this.slowDuration > 0) {
                    this.target.applySlow(this.slowDuration);
                }
                this.pierce--;
                if (this.pierce > 0) {
                    const impactX = this.target.x;
                    const impactY = this.target.y;
                    let next = null;
                    let best = Infinity;
                    for (const e of enemies) {
                        if (e === this.target || e.health <= 0) continue;
                        const d = Math.hypot(e.x - impactX, e.y - impactY);
                        if (d <= this.chainRadius && d < best) {
                            next = e;
                            best = d;
                        }
                    }
                    if (next) {
                        this.x = impactX;
                        this.y = impactY;
                        this.target = next;
                        return true;
                    }
                    return false;
                }
                return false;
            } else {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
                return true;
            }
        }
        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    class BombProjectile {
        constructor(x, y, target, speed, damage, splashRadius, color) {
            this.x = x;
            this.y = y;
            this.target = target;
            this.startX = x;
            this.startY = y;
            this.targetX = target.x;
            this.targetY = target.y;
            this.speed = speed;
            this.damage = damage;
            this.splashRadius = splashRadius;
            this.color = color;
            this.distTotal = Math.sqrt(Math.pow(this.targetX - this.x, 2) + Math.pow(this.targetY - this.y, 2));
            this.distTraveled = 0;
            this.angle = Math.atan2(this.targetY - this.y, this.targetX - this.x);
        }
        move() {
            if (this.distTraveled >= this.distTotal) {
                explosions.push({
                    x: this.targetX,
                    y: this.targetY,
                    radius: this.splashRadius,
                    timer: 10,
                    color: 'rgba(255, 165, 0, 0.5)'
                });
                for (const enemy of enemies) {
                    if (enemy.isFlying) continue;
                    const dx= enemy.x - this.targetX;
                    const dy = enemy.y - this.targetY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < this.splashRadius) {
                        enemy.takeDamage(this.damage, 'explosive');
                    }
                }
                return false;
            }
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            this.distTraveled += this.speed;
            return true;
        }
        draw() {
            const halfDist = this.distTotal / 2;
            const currentHeight = (this.distTraveled - halfDist) * (this.distTraveled - halfDist);
            const maxHeight = halfDist * halfDist;
            const arc = (maxHeight - currentHeight) / (maxHeight / 20);

            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y - arc, TILE_SIZE / 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, TILE_SIZE / 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    class BaseTower {
        constructor(x, y, opts = {}) {
            this.x = (Math.floor(x / TILE_SIZE) + 0.5) * TILE_SIZE;
            this.y = (Math.floor(y / TILE_SIZE) + 0.5) * TILE_SIZE;
            this.fireCooldown = 0;
            this.target = null;
            this.level = 1;
            this.maxLevel = 3;
            this.range = opts.range ?? TILE_SIZE * 3;
            this.color = opts.color ?? 'grey';
            this.upgradeCost = opts.upgradeCost ?? 100;
            this.totalCost = opts.initialCost ?? 0;
            this.canHitFlying = opts.canHitFlying ?? true;
            this.canHitGround = opts.canHitGround ?? true;
            this.rangeColor = opts.rangeColor;
            this.targeting = 'first';
            this.canDetectCamo = opts.canDetectCamo ?? false;
            this.damageType = opts.damageType ?? 'physical';
            this.pierce = opts.pierce ?? 1;
        }
        getSellValue() {
            return Math.floor(this.totalCost * 0.75);
        }
        getDistance(enemy) {
            const dx = this.x - enemy.x;
            const dy = this.y - enemy.y;
            return Math.sqrt(dx * dx + dy * dy);
        }
        isInRange(enemy) {
            return this.getDistance(enemy) < this.range;
        }
        canHit(enemy) {
            if (enemy.isFlying && !this.canHitFlying) return false;
            if (!enemy.isFlying && !this.canHitGround) return false;
            if (enemy.isCamo && !this.canDetectCamo) return false;
            return true;
        }
        findTarget() {
            if (this.target && this.target.health > 0 && this.isInRange(this.target) && this.canHit(this.target)) {
                return;
            }
            const endPoint = path[path.length - 1];
            const endX = endPoint.x * TILE_SIZE + TILE_SIZE / 2;
            const endY = endPoint.y * TILE_SIZE + TILE_SIZE / 2;
            const distToEnd = (e) => Math.hypot(endX - e.x, endY - e.y);
            const distToTower = (e) => Math.hypot(this.x - e.x, this.y - e.y);
            const candidates = [];
            for (const enemy of enemies) {
                if (enemy.health <= 0) continue;
                if (!this.canHit(enemy)) continue;
                if (!this.isInRange(enemy)) continue;
                candidates.push(enemy);
            }
            if (candidates.length === 0) {
                this.target = null;
                return;
            }
            let comparator;
            switch (this.targeting) {
                case 'first':
                    comparator = (a, b) => distToEnd(a) - distToEnd(b);
                    break;
                case 'last':
                    comparator = (a, b) => distToEnd(b) - distToEnd(a);
                    break;
                case 'closest':
                    comparator = (a, b) => distToTower(a) - distToTower(b);
                    break;
                case 'strongest':
                    comparator = (a, b) => b.health - a.health || distToTower(a) - distToTower(b);
                    break;
                case 'weakest':
                    comparator = (a, b) => a.health - b.health || distToTower(a) - distToTower(b);
                    break;
                case 'fastest':
                    comparator = (a, b) => b.speed - a.speed || distToTower(a) - distToTower(b);
                    break;
                default:
                    comparator = (a, b) => distToEnd(a) - distToEnd(b);
            }
            candidates.sort(comparator);
            this.target = candidates[0] || null;
        }
        drawRange() {
            if (this.range <= 0) return;
            ctx.strokeStyle = this.rangeColor || 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.stroke();
        }
        draw() {
            ctx.fillStyle = this.color || 'grey';
            ctx.beginPath();
            ctx.arc(this.x, this.y, TILE_SIZE / 3 + (this.level * 1.5), 0, Math.PI * 2);
            ctx.fill();
            if (this.specialization) {
                ctx.fillStyle = 'white';
                ctx.font = 'bold 10px Calibri';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this.specialization, this.x, this.y);
            } else {
                ctx.fillStyle = 'white';
                ctx.font = '12px Calibri';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this.level, this.x, this.y);
            }
            if (selectedTower === this) {
                this.drawRange();
            }
        }
        drawSelection() {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, TILE_SIZE / 2 + 3, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    class BasicTurret extends BaseTower {
        constructor(x, y) {
            super(x, y, {
                range: TILE_SIZE * 3,
                color: 'cyan',
                upgradeCost: 100,
                initialCost: TURRET_COST,
                canHitFlying: true,
                canHitGround: true,
                canDetectCamo: false,
                damageType: 'physical',
                pierce: 1
            });
            this.damage = 18;
            this.fireRate = 25;
        }
        upgrade() {
            if (this.level >= this.maxLevel) return false;
            this.level++;
            this.totalCost += this.upgradeCost;
            this.damage = Math.floor(this.damage * 1.8);
            this.range += TILE_SIZE * 0.25;
            this.fireRate = Math.floor(this.fireRate * 0.85);
            if (this.level === 2) {
                this.canDetectCamo = true;
                this.upgradeCost = 250;
            }
            if (this.level === 3) this.pierce += 1;
            this.upgradeCost = Math.floor(this.upgradeCost * 2);
            return true;
        }
        attack() {
            if (this.fireCooldown > 0) {
                this.fireCooldown--;
                return;
            }
            this.findTarget();
            if (this.target) {
                this.fireCooldown = this.fireRate;
                projectiles.push(new Projectile(
                    this.x, this.y, this.target, 
                    7, this.damage, this.color, 0, this.damageType, this.pierce
                ));
            }
        }
    }
    class MachineGunTurret extends BaseTower {
        constructor(x, y, fromTower) {
            super(x, y, {
                range: fromTower.range,
                color: '#38ecff',
                upgradeCost: 400,
                initialCost: fromTower.totalCost,
                canHitFlying: true,
                canHitGround: true,
                canDetectCamo: true,
                damageType: 'physical',
                pierce: 1
            });
            this.damage = 12;
            this.fireRate = 8;
            this.level = fromTower.level;
            this.maxLevel = 4;
            this.specialization = 'MG';
        }
        upgrade() {
            if (this.level >= this.maxLevel) return false;
            this.level++;
            this.totalCost += this.upgradeCost;
            this.damage += 4;
            this.fireRate = Math.max(4, this.fireRate - 1);
            this.upgradeCost = Math.floor(this.upgradeCost * 1.8);
            return true;
        }
        attack() {
            if (this.fireCooldown > 0) {
                this.fireCooldown--;
                return;
            }
            this.findTarget();
            if (this.target) {
                this.fireCooldown = this.fireRate;
                projectiles.push(new Projectile(
                    this.x, this.y, this.target, 8, this.damage, this.color, 0, this.damageType, this.pierce
                ));
            }
        }
    }
    class SniperTurret extends BaseTower {
        constructor(x, y, fromTower) {
            super (x, y, {
                range: fromTower.range + TILE_SIZE * 2,
                color: '#05b3b3ff',
                upgradeCost: 450,
                initialCost: fromTower.totalCost,
                canHitFlying: true,
                canHitGround: true,
                canDetectCamo: true,
                damageType: 'physical',
                pierce: 2
            });
            this.damage = 120;
            this.fireRate = 90;
            this.level = fromTower.level;
            this.maxLevel = 4;
            this.specialization = 'SN';
        }
        upgrade() {
            if (this.level >= this.maxLevel) return false;
            this.level++;
            this.totalCost += this.upgradeCost;
            this.damage = Math.floor(this.damage * 1.8);
            this.range += TILE_SIZE;
            this.upgradeCost = Math.floor(this.upgradeCost * 1.8);
            return true;
        }
        attack() {
            if (this.fireCooldown > 0) {
                this.fireCooldown--;
                return;
            }
            this.findTarget();
            if (this.target) {
                this.fireCooldown = this.fireRate;
                projectiles.push(new Projectile(
                    this.x, this.y, this.target, 20, this.damage, this.color, 0, this.damageType, this.pierce
                ));
            }
        }
    }
    class FrostTurret extends BaseTower {
        constructor(x, y) {
            super(x, y, {
                range: TILE_SIZE * 2.5,
                color: 'rgb(0, 150, 255)',
                upgradeCost: 110,
                initialCost: FROST_COST,
                canHitFlying: true,
                canHitGround: true,
                canDetectCamo: true,
                damageType: 'magic',
                pierce: 1
            });
            this.damage = 5;
            this.slowDuration = 60;
            this.fireRate = 40;
        }
        upgrade() {
            if (this.level >= this.maxLevel) return false;
            this.level++;
            this.totalCost += this.upgradeCost;
            this.damage += 2;
            this.range += TILE_SIZE * 0.25;
            this.slowDuration = Math.floor(this.slowDuration * 1.25);
            this.upgradeCost = Math.floor(this.upgradeCost * 1.8);
            return true;
        }
        attack() {
            if (this.fireCooldown > 0) {
                this.fireCooldown--;
                return;
            }
            this.findTarget();
            if (this.target) {
                this.fireCooldown = this.fireRate;
                projectiles.push(new Projectile(
                    this.x, this.y, this.target, 6, this.damage, this.color, this.slowDuration, this.damageType, this.pierce
                ));
            }
        }
    }
    class GoldMine extends BaseTower {
        constructor(x, y) {
            super(x, y, {
                range: 0,
                color: '#FFD700',
                upgradeCost: 150,
                initialCost: MINE_COST,
                canHitFlying: false,
                canHitGround: false,
                canDetectCamo: false,
                damageType: 'explosive',
                pierce: 1
            });
            this.generateAmount = 15;
            this.generateInterval = 5 * 60;
            this.fireCooldown = this.generateInterval;
            this.maxLevel = 4;
        }
        upgrade() {
            if (this.level >= this.maxLevel) return false;
            this.level++;
            this.totalCost += this.upgradeCost;
            this.generateAmount = Math.floor(this.generateAmount * 1.5);
            this.generateInterval = Math.max(60, Math.floor(this.generateInterval * 0.85));
            this.upgradeCost = Math.floor(this.upgradeCost * 1.8);
            return true;
        }
        attack() {
            if (this.fireCooldown > 0) {
                this.fireCooldown--;
                return;
            }
            gold += this.generateAmount;
            showFloatingGold(this.x, this.y, `+${this.generateAmount}`);
            updateUI();
            this.fireCooldown = this.generateInterval;
        }
        draw() {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - TILE_SIZE / 3, this.y - TILE_SIZE / 3, TILE_SIZE * 2/3, TILE_SIZE * 2/3);
            ctx.fillStyle = '#8B7500';
            ctx.fillRect(this.x - TILE_SIZE / 4, this.y - TILE_SIZE / 6, TILE_SIZE / 2, TILE_SIZE / 3);
            ctx.fillStyle = 'white';
            ctx.font = '12px Calibri';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.level, this.x, this.y - TILE_SIZE / 2.4);
            if (selectedTower === this) this.drawRange();
        }
    }
    const floaters = [];
    function showFloatingGold(x, y, text) {
        floaters.push({x, y: y - 10, text, alpha: 1, vy: -0.5});
    }
    class BombTurret extends BaseTower {
        constructor(x, y) {
            super(x, y, {
                range: TILE_SIZE * 3.5,
                color: 'rgb(30, 30, 30)',
                upgradeCost: 150,
                initialCost: BOMB_COST,
                canHitFlying: false,
                canHitGround: true
            });
            this.damage = 50;
            this.splashRadius = TILE_SIZE * 1.5;
            this.fireRate = 80;
        }
        upgrade() {
            if (this.level >= this.maxLevel) return false;
            this.level++;
            this.totalCost += this.upgradeCost;
            this.damage = Math.floor(this.damage * 1.5);
            this.fireRate = Math.floor(this.fireRate * 0.9);
            this.splashRadius += TILE_SIZE;
            this.upgradeCost = Math.floor(this.upgradeCost * 2);
            return true;
        }
        attack() {
            if (this.fireCooldown > 0) {
                this.fireCooldown--;
                return;
            }
            this.findTarget();
            if (this.target) {
                this.fireCooldown = this.fireRate;
                projectiles.push(new BombProjectile(
                    this.x, this.y, this.target, 4, this.damage, this.splashRadius, this.color
                ));
            }
        }
    }
    function gameLoop() {
        if (!paused) {
            for (let s = 0; s < timeScale; s++) {
                updateStep();
                if (baseHealth <= 0) break;
            }
            drawAll();
        if (baseHealth <= 0) return;
        requestAnimationFrame(gameLoop);
        }
    }
    function applyEnemyModifiers(enemy, w, type) {
        if (!enemy || enemy.health <= 0) return;
        if (enemy.isBoss) return;
        const camoChance = Math.min(0.6, 0.08 + 0.02 * w);
        if (!enemy.isCamo && w >= 5 && Math.random() < camoChance && type !== 'shield') {
            enemy.isCamo = true;
        }
        const armorChance = Math.min(0.5, 0.05 + 0.02 * w);
        if (Math.random() < armorChance) {
            enemy.armor = (enemy.armor || 0) + 2 + Math.floor(w * 0.1);                       
        }
        const fortifiedChance = Math.min(0.35, 0.04 + 0.015 * w);
        if (!enemy.fortified && Math.random() < fortifiedChance && type !== 'drone') {
            enemy.fortified = true;
            enemy.maxHealth = Math.floor(enemy.maxHealth * 1.5);
            enemy.health = Math.min(enemy.maxHealth, Math.floor(enemy.health * 1.5));
        }
        const regrowChance = Math.min(0.4, 0.03 + 0.015 * w);
        if (enemy.regrowRate === 0 && Math.random() < regrowChance) {
            enemy.regrowRate = 0.2 + 0.02 * w;
        }
    }
    function drawMeteorPreview() {
        const r = SPELL_COSTS.meteor.radius;
        ctx.strokeStyle = 'rgba(255, 120, 80, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, r, 0, Math.PI * 2);
        ctx.stroke();
    }
    function drawMap() {
        ctx.strokeStyle = '#40406cff';
        ctx.lineWidth = 1;
        for (let r = 0; r < MAP_ROWS; r++) {
            for (let c = 0; c < MAP_COLS; c++) {
                ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
        ctx.strokeStyle = '#7474f4ff';
        ctx.lineWidth = TILE_SIZE;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(path[0].x * TILE_SIZE + TILE_SIZE / 2, path[0].y * TILE_SIZE + TILE_SIZE / 2);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x * TILE_SIZE + TILE_SIZE / 2, path[i].y * TILE_SIZE + TILE_SIZE / 2);
        }
        ctx.stroke();
    }
    function updateUI() {
        baseHealthDisplay.textContent = baseHealth;
        goldDisplay.textContent = gold;
        waveDisplay.textContent = wave;
    }
    function getWaveComposition(w) {
        if (w <= 0) return [];
        if (w % 5 === 0) {
            const comp = [];
            const basics = 4 + Math.floor(w * 0.2);
            for (let i = 0; i < basics; i++) comp.push('basic');
            if (w >= 6) comp.push('shield', 'regen');
            if (w >= 8) comp.push('drone');
            comp.push('boss');
            return comp;
        }
        if (waveCompositions[w]) return [...waveCompositions[w]];
        const comp = [];
        const basics = 8 + Math.floor(w * 0.6);
        for (let i = 0; i < basics; i++) comp.push('basic');
        if (w >= 3) for (let i = 0; i < 2 + Math.floor(w * 0.3); i++) comp.push('runner');
        if (w >= 4) for (let i = 0; i < 1 + Math.floor(w * 0.25); i++) comp.push('brute');
        if (w >= 5) for (let i = 0; i < 1 + Math.floor(w * 0.2); i++) comp.push('drone');
        if (w >= 6) for (let i = 0; i < 1 + Math.floor(w * 0.2); i++) comp.push('shield');
        if (w >= 8) for (let i = 0; i < 1 + Math.floor(w * 0.15); i++) comp.push('regen');
        if (w >= 10) for (let i = 0; i < 3 + Math.floor(w * 0.4); i++) comp.push('swarm');
        for (let i = comp.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [comp[i], comp[j]] = [comp[j], comp[i]];
        }
        return comp;
    }
    function getTowerStats(towerType) {
        switch (towerType) {
            case 'basic': return {range: TILE_SIZE * 3, color: 'rgba(0, 255, 255, 0.5)', cost: TURRET_COST};
            case 'frost': return {range: TILE_SIZE * 2.5, color: 'rgba(0, 0, 255, 0.5)', cost: FROST_COST};
            case 'bomb':  return {range: TILE_SIZE * 3.5, color: 'rgba(255, 165, 0, 0.5)', cost: BOMB_COST};
            case 'mine':  return {range: 0, color: 'rgba(255, 215, 0, 0.5)', cost: MINE_COST};
            default: return null;
        }
    }
    function toggleBuildMode(towerType) {
        cancelSpellMode();
        buildButtons.forEach(button => button.classList.remove('selected'));

        if (buildingTower === towerType) {
            buildingTower = null;
            showGlobalMessage("");
        } else {
            if (selectedTower) {
                showBuildUI();
            }
            buildingTower = towerType;
            if (towerType === 'basic') buildTurretButton.classList.add('selected');
            if (towerType === 'frost') buildFrostButton.classList.add('selected');
            if (towerType === 'bomb') buildBombButton.classList.add('selected');
            if (towerType === 'mine') buildMineButton.classList.add('selected');
            showGlobalMessage("Click on a valid tile to build.");
        }
    }
    let mousePos = {x:0, y:0};
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mousePos.x = e.clientX - rect.left;
        mousePos.y = e.clientY - rect.top;
    });
    function drawTowerPreview() {
        const stats = getTowerStats(buildingTower);
        if (!stats) return;
        const tileX = Math.floor(mousePos.x / TILE_SIZE);
        const tileY = Math.floor(mousePos.y / TILE_SIZE);
        const x = (tileX + 0.5) * TILE_SIZE;
        const y = (tileY + 0.5) * TILE_SIZE;
        const isValid = isValidPlacement(tileX, tileY);
        ctx.fillStyle = isValid ? 'rgba(0, 255, 255, 0.5)' : 'rgba(255, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(x, y, TILE_SIZE / 3, 0, Math.PI * 2);
        ctx.fill();
        if (stats.range > 0) {
            ctx.strokeStyle = stats.color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, stats.range, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (!isValid) {
            ctx.fillStyle = 'rgba(255,0,0,0.35)';
            ctx.beginPath();
            ctx.arc(x, y, TILE_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    function getNextLevelPreview(tower) {
        if (tower.level >= tower.maxLevel) return null;
        const next = {level: tower.level + 1};
        if (tower instanceof BasicTurret) {
            next.damage = Math.floor(tower.damage * 1.8);
            next.range = (tower.range + TILE_SIZE * 0.25);
            next.fireRate = Math.floor(tower.fireRate * 0.85);
            next.camo = (tower.level + 1) >= 2 ? true : tower.canDetectCamo;
            next.pierce = (tower.level + 1) === 3 ? tower.pierce + 1 : tower.pierce;
        } else if (tower instanceof FrostTurret) {
            next.damage = tower.damage + 2;
            next.range = tower.range + TILE_SIZE * 0.25;
            next.fireRate = tower.fireRate;
            next.slowDuration = Math.floor(tower.slowDuration * 1.25);
            next.camo = true;
            next.pierce = tower.pierce;
        } else if (tower instanceof BombTurret) {
            next.damage = Math.floor(tower.damage * 1.5);
            next.fireRate = Math.floor(tower.fireRate * 0.9);
            next.splashRadius = tower.splashRadius + TILE_SIZE;
        } else if (tower instanceof GoldMine) {
            next.generateAmount = Math.floor(tower.generateAmount * 1.5);
            next.generateInterval = Math.max(60, Math.floor(tower.generateInterval * 0.85));
        } else if (tower instanceof MachineGunTurret) {
            next.damage = tower.damage + 4;
            next.range = tower.range;
            next.fireRate = Math.max(4, tower.fireRate - 1);
            next.pierce = tower.pierce;
        } else if (tower instanceof SniperTurret) {
            next.damage = Math.floor(tower.damage * 1.8);
            next.range = tower.range + TILE_SIZE;
            next.fireRate = tower.fireRate;
            next.pierce = tower.pierce;
        }
        return next;
    }
    function isValidPlacement(tileX, tileY) {
        if (tileX < 0 || tileX >= MAP_COLS || tileY < 0 || tileY >= MAP_ROWS) {
            return false;
        }
        for (const p of path) {
            if (p.x === tileX && p.y === tileY) return false;
        }
        for (const t of towers) {
            if (Math.floor(t.x / TILE_SIZE) === tileX && Math.floor(t.y / TILE_SIZE) === tileY) return false;
        }
        return true;
    }
    function placeTower(e) {
	    if (!buildingTower) return;
	    const tileX = Math.floor(mousePos.x / TILE_SIZE);
	    const tileY = Math.floor(mousePos.y / TILE_SIZE);
	    const x = (tileX + 0.5) * TILE_SIZE;
	    const y = (tileY + 0.5) * TILE_SIZE;

        if (isValidPlacement(tileX, tileY)) {
            let towerPlaced = false;
            let cost = 0;
            if (buildingTower === 'basic') cost = TURRET_COST;
            else if (buildingTower === 'frost') cost = FROST_COST;
            else if (buildingTower === 'bomb') cost = BOMB_COST;
            else if (buildingTower === 'mine') cost = MINE_COST;

            if (gold >= cost) {
                gold -= cost;
                if (buildingTower === 'basic') {
                    towers.push(new BasicTurret(x, y));
                    towerPlaced = true;
                } else if (buildingTower === 'frost') {
                    towers.push(new FrostTurret(x, y));
                    towerPlaced = true;
                } else if (buildingTower === 'bomb') {
                    towers.push(new BombTurret(x, y));
                    towerPlaced = true;
                } else if (buildingTower === 'mine') {
                    towers.push(new GoldMine(x, y));
                    towerPlaced = true;
                }
            } else {
                showGlobalMessage("Not enough gold!");
            }

            if (towerPlaced) {
                updateUI();
                buildingTower = null;
                buildButtons.forEach(button => button.classList.remove('selected'));
                showGlobalMessage("");
            }
        } else {
            showGlobalMessage("Cannot build there");
        }
    }
    function startWave() {
        if (waveInProgress) return;
        cancelSpellMode();
        waveInProgress = true;
        wave++;
        enemiesToSpawn = getWaveComposition(wave);
        waveSpawnTimer = 0;
        updateUI();
        startWaveButton.disabled = true;
        startWaveButton.textContent = 'Wave in progress...';
    }
    let messageTimer;
    function showGlobalMessage(msg, type = 'default') {
        messageBox.textContent = msg;
        messageBox.classList.remove('interest-message');
        if (type === 'interest') {
            messageBox.classList.add('interest-message');
        }
        clearTimeout(messageTimer);
        if (msg) {
            messageTimer = setTimeout(() => {
                messageBox.textContent = "";
                messageBox.classList.remove('interest-message');
            }, 3000);
        }
    }
    function gameOver() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'red';
        ctx.font = '80px Calibri';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        startWaveButton.disabled = true;
        buildButtons.forEach(button => button.disabled = true);
        meteorStrikeButton.disabled = true;
        globalFreezeButton.disabled = true;
    }
    function handleCanvasClick(e) {
        if (spellMode === 'meteor') {
            castMeteor(mousePos.x, mousePos.y);
            return;
        }
        if (buildingTower) {
            placeTower(e);
        } else {
            selectTowerAt(mousePos.x, mousePos.y);
        }
    }
    function selectTowerAt(x, y) {
        cancelSpellMode();
        let towerClicked = null;
        for (const tower of towers) {
            const dx = tower.x - x;
            const dy = tower.y - y;
            if (Math.sqrt(dx*dx + dy*dy) < TILE_SIZE / 2) {
                towerClicked = tower;
                break;
            }
        }
        if (towerClicked) {
            selectedTower = towerClicked;
            showUpgradeUI();
        } else {
            if (selectedTower) {
                showBuildUI();
            }
        }
    }
    function showUpgradeUI() {
        if (!selectedTower) return;
        buildMenuContainer.classList.add('hidden');
        upgradeMenuContainer.classList.remove('hidden');
        const t = selectedTower;
        const isMine = (selectedTower instanceof GoldMine);
        const canSpecialize = (t instanceof BasicTurret) && t.level >= 3 && !t.specialization;
        let statsHTML = `
        <strong>Type:</strong> ${selectedTower.constructor.name}<br>
        <strong>Level:</strong> ${selectedTower.level} / ${selectedTower.maxLevel}<br>`;
        if (isMine) {
            statsHTML += `
        <strong>Income:</strong> ${selectedTower.generateAmount}G / ${(selectedTower.generateInterval/60).toFixed(1)}s<br>`;
        } else {
            statsHTML += `
        <strong>Damage:</strong> ${selectedTower.damage || 'N/A'}<br>
        <strong>Range:</strong> ${(selectedTower.range / TILE_SIZE).toFixed(1)} tiles<br>
        <strong>Fire Rate:</strong> ${(60 / selectedTower.fireRate).toFixed(1)}/sec<br>
        <strong>Damage Type:</strong> ${t.damageType}<br>
        <strong>Pierce:</strong> ${t.pierce}<br>
        <strong>Camo Detection:</strong> ${t.canDetectCamo ? 'Yes' : 'No'}<br>
        <strong>Can Hit Flying:</strong> ${t.canHitFlying ? 'Yes' : 'No'}<br>
        <strong>Can Hit Ground:</strong> ${t.canHitGround ? 'Yes' : 'No'}<br>
        <strong>Targeting:</strong>  ${selectedTower.targeting.charAt(0).toUpperCase() + selectedTower.targeting.slice(1)}<br>`;
        const preview = getNextLevelPreview(t);
        if (preview) {
            statsHTML += `<hr style="border:0;border-top:1px solid #5b5757ff;margin:6px 0;">
            <strong>Next Level (${preview.level}) Preview:</strong><br>`;
            if (t instanceof BasicTurret) {
                statsHTML += `Damage: ${t.damage} -> ${preview.damage}<br>
                Range: ${(t.range/TILE_SIZE).toFixed(1)} -> ${(preview.range/TILE_SIZE).toFixed(1)} tiles<br>
                Fire Rate: ${(60/t.fireRate).toFixed(1)} -> ${(60/preview.fireRate).toFixed(1)}/sec<br>
                Camo Detection: ${t.canDetectCamo ? 'Yes' : 'No'} -> ${preview.camo ? 'Yes' : 'No'}<br>
                Pierce: ${t.pierce} -> ${preview.pierce}<br>`;
            } else if (t instanceof FrostTurret) {
                statsHTML += `Damage: ${t.damage} -> ${preview.damage}<br>
                Range: ${(t.range/TILE_SIZE).toFixed(1)} -> ${(preview.range/TILE_SIZE).toFixed(1)} tiles<br>
                Slow Duration: ${(t.slowDuration/60).toFixed(1)}s -> ${(preview.slowDuration/60).toFixed(1)}s<br>`;
            } else if (t instanceof BombTurret) {
                statsHTML += `Damage: ${t.damage} -> ${preview.damage}<br>
                Fire Rate: ${(60/t.fireRate).toFixed(1)} -> ${(60/preview.fireRate).toFixed(1)}/sec<br>
                Splash Radius: ${(t.splashRadius/TILE_SIZE).toFixed(1)} -> ${(preview.splashRadius/TILE_SIZE).toFixed(1)} tiles<br>`;
            } else if (t instanceof GoldMine) {
                statsHTML += `Income: ${t.generateAmount} -> ${preview.generateAmount} gold<br>
                Interval: ${(t.generateInterval/60).toFixed(1)}s -> ${(preview.generateInterval/60).toFixed(1)}s<br>`;
            } else if (t instanceof MachineGunTurret) {
                statsHTML += `Damage: ${t.damage} -> ${preview.damage}<br>
                Fire Rate: ${(60/t.fireRate).toFixed(1)} -> ${(60/preview.fireRate).toFixed(1)}/sec<br>`;
            } else if (t instanceof SniperTurret) {
                statsHTML += `Damage: ${t.damage} -> ${preview.damage}<br>
                Range: ${(t.range/TILE_SIZE).toFixed(1)} -> ${(preview.range/TILE_SIZE).toFixed(1)} tiles<br>`;
            }
            }
        }
        towerStatsDisplay.innerHTML = statsHTML;
        sellTowerButton.textContent = `Sell (${selectedTower.getSellValue()}G)`;
        if (t.level >= t.maxLevel) {
            upgradeTowerButton.disabled = true;
            upgradeTowerButton.textContent = 'Max Level';
        } else {
            upgradeTowerButton.disabled = false;
            upgradeTowerButton.textContent = `Upgrade (${selectedTower.upgradeCost}G)`;
        }
        document.getElementById('targeting-section').style.display = isMine ? 'none' : 'flex';
        if (!isMine) updateTargetingUI();
        if (canSpecialize) {
            upgradeTowerButton.disabled = true;
            upgradeTowerButton.textContent = 'Choose an Upgrade Path below';
            renderPathOptions();
            pathOptions.classList.remove('hidden');
        } else {
            pathOptions.classList.add('hidden');
            if (t.level >= t.maxLevel) {
                upgradeTowerButton.disabled = true;
                upgradeTowerButton.textContent = 'Max level';
            } else {
                upgradeTowerButton.disabled = false;
            }
        }
    }
    function renderPathOptions() {
        if (!pathOptions || !selectedTower || !(selectedTower instanceof BasicTurret)) return;
        const t = selectedTower;
        const mgDps = (60 / 8 * 12).toFixed(0);
        const snDps = (60 / 90 * 120).toFixed(0);
        const mgRangeTiles = (t.range / TILE_SIZE).toFixed(1);
        const snRangeTiles = ((t.range + TILE_SIZE * 2) / TILE_SIZE).toFixed(1);
        const previews = document.getElementById('path-previews');
        if (!previews) return;
        previews.innerHTML = `
            <button id="promote-mg-button" class="path-button" title="Very fast, lower damage" style="flex:1; min-width:220px;">
                <strong>Machine Gun</strong> (${PROMOTE_COSTS.mg}G)<br>
                Range: ${mgRangeTiles} tiles<br>
                Fire Rate: ${(60/8).toFixed(1)}/sec, Dmg: 12<br>
                Est. DPS: ${mgDps}
            </button>
            <button id="promote-sniper-button" class="path-button" title="Very slow, high damage, long-range" style="flex:1; min-width:220px;">
                <strong>Sniper</strong> (${PROMOTE_COSTS.sniper}G)<br>
                Range: ${snRangeTiles} tiles<br>
                Fire Rate: ${(60/90).toFixed(1)}/sec, Dmg: 120<br>
                Est. DPS: ${snDps}
            </button>
        `;
        const mgButton = document.getElementById('promote-mg-button');
        const snButton = document.getElementById('promote-sniper-button');
        mgButton?.addEventListener('click', () => promoteBasicTo('mg'));
        snButton?.addEventListener('click', () => promoteBasicTo('sniper'));
    }
    function promoteBasicTo(path) {
        if (!selectedTower || !(selectedTower instanceof BasicTurret) || selectedTower.level < 3) return;
        const cost = path === 'mg' ? PROMOTE_COSTS.mg : PROMOTE_COSTS.sniper;
        if (gold < cost) {
            showGlobalMessage("Not enough gold to specialize");
            return;
        }
        const from = selectedTower;
        gold -= cost;
        let newTower = null;
        if (path === 'mg') {
            newTower = new MachineGunTurret(from.x, from.y, from);
        } else {
            newTower = new SniperTurret(from.x, from.y, from);
        }
        newTower.targeting = from.targeting;
        newTower.totalCost += cost;
        const idx = towers.indexOf(from);
        if (idx >= 0) {
            towers[idx] = newTower;
        }
        selectedTower = newTower;
        updateUI();
        showGlobalMessage(`Promoted to ${path === 'mg' ? 'Machine Gun' : 'Sniper'}!`);
        showUpgradeUI();
    }
    function updateTargetingUI() {
        Object.values(targetButtons).forEach(button => button && button.classList.remove('selected'));
        if (!selectedTower) return;
        const button = targetButtons[selectedTower.targeting];
        if (button) button.classList.add('selected');
    }
    function setSelectedTowerTargeting(mode) {
        if (!selectedTower) return;
        selectedTower.targeting = mode;
        updateTargetingUI();
        showUpgradeUI();
    }
    function showBuildUI() {
    selectedTower = null;
    if (buildMenuContainer) buildMenuContainer.classList.remove('hidden');
    if (upgradeMenuContainer) upgradeMenuContainer.classList.add('hidden');
    cancelSpellMode();
    }
    function upgradeSelectedTower() {
        if (!selectedTower) return;
        if (gold >= selectedTower.upgradeCost) {
            gold -= selectedTower.upgradeCost;
            if (selectedTower.upgrade()) {
                showGlobalMessage("Tower upgraded");
            }
            updateUI();
            showUpgradeUI();
        } else {
            showGlobalMessage("Not enough gold to upgrade");
        }
    }
    function sellSelectedTower() {
        if (!selectedTower) return;
        gold += selectedTower.getSellValue();
        towers = towers.filter(t => t !== selectedTower);
        showGlobalMessage("Tower Sold!");
        updateUI();
        showBuildUI();
    }
    function updateStep() {
        if (waveInProgress) {
            if (enemiesToSpawn.length > 0 && waveSpawnTimer <= 0) {
                const enemyType = enemiesToSpawn.shift();
                let enemy;
                switch (enemyType) {
                    case 'runner': enemy = new RunnerEnemy(); break;
                    case 'brute': enemy = new BruteEnemy(); break;
                    case 'drone': enemy = new RegenEnemy(wave); break;
                    case 'swarm': enemy = new SwarmEnemy(wave); break;
                    case 'boss': enemy = new BossEnemy(wave); break;
                    case 'shield': enemy = new ShieldedEnemy(wave); break;
                    case 'basic': {
                        const health = 50 + wave * 10;
                        const speed = 1 + wave * 0.1;
                        enemy = new Enemy(health, speed, 5, 10, 'red', TILE_SIZE * 0.6);
                        break;
                    }
                }
                if (enemy) {
                    applyEnemyModifiers(enemy, wave, enemyType);
                    enemies.push(enemy);
                }
                waveSpawnTimer = 30;
            }
            if (waveSpawnTimer > 0) waveSpawnTimer--;
            if (enemiesToSpawn.length === 0 && enemies.length === 0) {
                waveInProgress = false;
            startWaveButton.disabled = false;
            startWaveButton.textContent = 'Start next wave!';
            const interestEarned = Math.min(Math.floor(gold * INTEREST_RATE), MAX_INTEREST);
            if (interestEarned > 0) {
                gold += interestEarned;
                showGlobalMessage(`+${interestEarned}gold Interest!`, 'interest');
            }
            gold += 50 + wave * 10;
            updateUI();
            if (wave === 3 && !spells.meteor.unlocked) {
                spells.meteor.unlocked = true;
                showGlobalMessage("Meteor strike unlocked!");
            }
            if (wave === 7 && !spells.freeze.unlocked) {
                spells.freeze.unlocked = true;
                showGlobalMessage("Global freeze unlocked!");
            }
            if (endlessMode && baseHealth > 0) {
                startWaveButton.textContent = 'Endless: next wave...';
                setTimeout(() => {
                    if (!waveInProgress && baseHealth > 0) startWave();
                }, 1500);
            }
            }
        }
        for (const tower of towers) {
            tower.attack();
        }
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            if (!p.move()) {
                projectiles.splice(i, 1);
            }
        }
        for (let i = explosions.length - 1; i >= 0; i--) {
            explosions[i].timer--;
            if (explosions[i].timer <= 0) explosions.splice(i, 1);
        }
        for (let i = floaters.length - 1; i >= 0; i--) {
            const f = floaters[i];
            f.y += f.vy;
            f.alpha -= 0.02;
            if (f.alpha <= 0) floaters.splice(i, 1);
        }
        updateSpells();
        if (baseHealth <= 0) {
            baseHealth = 0;
            updateUI();
            gameOver();
        }
    }
    function drawAll() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawMap();
        for (const tower of towers) {
            tower.draw();
        }
        if (selectedTower) {
            selectedTower.drawSelection();
        }
        for (let i = 0; i < projectiles.length; i++) {
            projectiles[i].draw();
        }
        for (let i = 0; i < enemies.length; i++) {
            enemies[i].draw();
        }
        for (let i = 0; i < explosions.length; i++) {
            const exp = explosions[i];
            ctx.fillStyle = exp.color;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, exp.radius * (1 - exp.timer / 10), 0, Math.PI * 2);
            ctx.fill();
        }
        for (let i = 0; i < floaters.length; i++) {
            const f = floaters[i];
            ctx.globalAlpha = Math.max(0, f.alpha);
            ctx.fillStyle = '#FFD700';
            ctx.font = '14px Calibri';
            ctx.textAlign = 'center';
            ctx.fillText(f.text, f.x, f.y);
            ctx.globalAlpha = 1;
        }
        if (buildingTower) {
            if (selectedTower) {
                showBuildUI();
            }
            drawTowerPreview();
        }
        if (spellMode === 'meteor') {
            drawMeteorPreview();
        }
        if (paused) {
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffeb3b';
            ctx.font = '52px Calibri';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        }
    }
    function updateSpells() {
        if (spells.meteor.unlocked) {
            meteorStrikeButton.classList.remove('hidden');
            if (spells.meteor.cooldown > 0) {
                spells.meteor.cooldown--;
                meteorStrikeButton.disabled = true;
                meteorStrikeButton.classList.add('on-cooldown');
                meteorOverlay.style.height = `${(spells.meteor.cooldown / SPELL_COSTS.meteor.maxCooldown) * 100}%`;
                meteorCooldownText.textContent = `${Math.ceil(spells.meteor.cooldown / 60)}`;
                meteorCooldownText.style.display = 'block';
            } else {
                meteorStrikeButton.disabled = false;
                meteorStrikeButton.classList.remove('on-cooldown');
                meteorOverlay.style.height = '0%';
                meteorCooldownText.style.display = 'none';
            }
        }
        if (spells.freeze.unlocked) {
            globalFreezeButton.classList.remove('hidden')
            if (spells.freeze.cooldown > 0) {
                spells.freeze.cooldown--;
                globalFreezeButton.disabled = true;
                globalFreezeButton.classList.add('on-cooldown');
                freezeOverlay.style.height = `${(spells.freeze.cooldown / SPELL_COSTS.freeze.maxCooldown) * 100}%`;
                freezeCooldownText.textContent = `${Math.ceil(spells.freeze.cooldown / 60)}`;
                freezeCooldownText.style.display = 'block';
            } else {
                globalFreezeButton.disabled = false;
                globalFreezeButton.classList.remove('on-cooldown');
                freezeOverlay.style.height = '0%';
                freezeCooldownText.style.display = 'none';
            }
        }
    }
    function activateMeteor() {
        if (spells.meteor.cooldown > 0) return;
        spellMode = 'meteor';
        canvas.classList.add('meteor-target');
        if (selectedTower) showBuildUI();
        if (buildingTower) toggleBuildMode(null);
        showGlobalMessage("Click to target meteor strike");
    }
    function castMeteor(x, y) {
        if (spellMode !== 'meteor') return;
        spells.meteor.cooldown = SPELL_COSTS.meteor.maxCooldown;
        explosions.push({
            x: x,
            y: y,
            radius: SPELL_COSTS.meteor.radius,
            timer: 20,
            color: 'rgba(255, 80, 0, 0.7)'
        });
        for (const enemy of enemies) {
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < SPELL_COSTS.meteor.radius) {
                enemy.takeDamage(SPELL_COSTS.meteor.damage, 'fire');
            }
        }
        cancelSpellMode();
    }
    function castGlobalFreeze() {
        if (spells.freeze.cooldown > 0) return;
        spells.freeze.cooldown = SPELL_COSTS.freeze.maxCooldown;
        for (const enemy of enemies) {
            enemy.applySlow(SPELL_COSTS.freeze.duration);
        }
        showGlobalMessage("Global freeze cast!");
        cancelSpellMode();
    }
    function cancelSpellMode() {
        spellMode = null;
        canvas.classList.remove('meteor-target');
        showGlobalMessage("");
    }
    function initGame(difficulty) {
        const mapData = maps[difficulty];
        path = mapData.path;
        baseHealth = mapData.startHealth;
        gold = mapData.startGold;
        wave = 0;
        enemies = [];
        towers = [];
        projectiles = [];
        explosions = [];
        waveInProgress = false;
        selectedTower = null;
        buildingTower = null;
        spellMode = null;
        spells.meteor = {unlocked: false, cooldown: 0};
        spells.freeze = {unlocked: false, cooldown: 0};
        mapSelectionScreen.classList.add('hidden');
        statsBar.classList.remove('hidden');
        mainContent.classList.remove('hidden');
        updateUI();
        gameLoop();
    }
    buildTurretButton.addEventListener('click', () => toggleBuildMode('basic'));
    buildFrostButton.addEventListener('click', () => toggleBuildMode('frost'));
    buildBombButton.addEventListener('click', () => toggleBuildMode('bomb'));
    buildMineButton.addEventListener('click', () => toggleBuildMode('mine'));
    canvas.addEventListener('click', handleCanvasClick);
    startWaveButton.addEventListener('click', startWave);
    upgradeTowerButton.addEventListener('click', upgradeSelectedTower);
    sellTowerButton.addEventListener('click', sellSelectedTower);
    meteorStrikeButton.addEventListener('click', activateMeteor);
    globalFreezeButton.addEventListener('click', castGlobalFreeze);
    deselectTowerButton.addEventListener('click', showBuildUI);
    mapEasyButton.addEventListener('click', () => initGame('easy'));
    mapMediumButton.addEventListener('click', () => initGame('medium'));
    mapHardButton.addEventListener('click', () => initGame('hard'));
    targetFirstButton.addEventListener('click', () => setSelectedTowerTargeting('first'));
    targetLastButton.addEventListener('click', () => setSelectedTowerTargeting('last'));
    targetClosestButton.addEventListener('click', () => setSelectedTowerTargeting('closest'));
    targetStrongestButton.addEventListener('click', () => setSelectedTowerTargeting('strongest'));
    targetWeakestButton.addEventListener('click', () => setSelectedTowerTargeting('weakest'));
    targetFastestButton.addEventListener('click', () => setSelectedTowerTargeting('fastest'));
    pauseButton.addEventListener('click', () => {
        paused = !paused;
        pauseButton.textContent = paused ? 'Resume' : 'Pause';
    });
    speedButton.addEventListener('click', () => {
        timeScale = timeScale === 1 ? 2 : timeScale === 2 ? 3 : 1;
        speedButton.textContent = `Speed: ${timeScale}x`;
    });
    endlessToggle.addEventListener('change', () => {
        endlessMode = endlessToggle.checked;
        showGlobalMessage(endlessMode ? "Endless mode enabled" : "Endless mode disabled");
        if (endlessMode && !waveInProgress) {
            startWaveButton.textContent = 'Endless: next wave...';
        }
    });
    showBuildUI();
});