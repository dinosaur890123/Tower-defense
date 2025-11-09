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
    const buildMenuContainer = document.getElementById('build-menu-container');
    const upgradeMenuContainer = document.getElementById('upgrade-menu-container');
    const towerStatsDisplay = document.getElementById('tower-stats-display');
    const towerStatsButton = document.getElementById('sell-tower-button');
    const upgradeTowerButton = document.getElementById('upgrade-tower-button')
    const sellTowerButton = document.getElementById('sell-tower-button')
    const deselectTowerButton = document.getElementById('deselect-tower-button');
    const meteorStrikeButton = document.getElementById('meteor-strike-button');
    const globalFreezeButton = document.getElementById('global-freeze-button');
    const meteorOverlay = meteorStrikeButton.querySelector('.cooldown-overlay');
    const meteorCooldownText = meteorStrikeButton.querySelector('.cooldown-text');
    const freezeOverlay = globalFreezeButton.querySelector('.cooldown-overlay');
    const freezeCooldownText = globalFreezeButton.querySelector('.cooldown-text');
    const buildButtons = [buildTurretButton, buildFrostButton, buildBombButton];
    const TILE_SIZE = 40;
    const MAP_COLS = canvas.width / TILE_SIZE;
    const MAP_ROWS = canvas.height / TILE_SIZE;
    const TURRET_COST = 50;
    const FROST_COST = 75;
    const BOMB_COST = 120;
    const INTEREST_RATE = 0.10;
    const MAX_INTEREST = 50;
    const path = [
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
        ['brute', 'brute', 'brute', 'runner', 'runner', 'runner', 'runner', 'runner', 'runner']
        ['brute', 'brute', 'bomb', 'brute', 'brute', 'brute', 'brute']
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
    const SPELL_COSTS = {
        meteor: {maxCooldown: 120 * 60, radius:  TILE_SIZE * 3, damage: 300},
        freeze: {maxCooldown: 180 * 60, duration: 5 * 60}
    };
    let spells = {
        meteor: {unlocked: false, cooldown: 0},
        freeze: {unlocked: false, cooldown: 0}
    };
    
    class Enemy {
        constructor(health, speed, goldValue = 5, baseDamage = 10, color = 'red', size = TILE_SIZE * 0.6) {
            this.x = path[0].x * TILE_SIZE + TILE_SIZE / 2;
            this.y = path[0].y * TILE_SIZE + TILE_SIZE / 2;
            this.health = health;
            this.maxHealth = health;
            this.speed = speed;
            this.pathIndex = 0;
            this.width = TILE_SIZE * 0.6;
            this.height = TILE_SIZE * 0.6;
            this.goldValue = 5;
            this.baseDamage = 10;
            this.speedModifier = 1;
            this.slowTimer = 0;
        }
        applySlow(duration) {
            this.slowTimer = Math.max(this.slowTimer, duration);
        }
        move() {
            if (this.slowTimer > 0) {
                this.slowTimer--;
                this.speedModifier = 0.5;
            } else {
                this.speedModifier = 1;
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
            if (distance < this.speed) {
                this.pathIndex++;
                this.x = targetX;
                this.y = targetY;
            } else {
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
            }
        }
        draw() {
            ctx.fillStyle = this.slowTimer > 0 ? 'deepskyblue' : 'red';
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
            ctx.fillStyle = 'rgba(31, 29, 29, 1)';
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 8, this.width, 5);
            ctx.fillStyle = 'lime';
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 8, this.width * (this.health / this.maxHealth), 5);
        }
        takeDamage(amount) {
            this.health -= amount;
            if (this.health <= 0) {
                gold += this.goldValue;
                updateUI();
            }
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
    class Projectile {
        constructor(x, y, target, speed, damage, color, slowDuration = 0) {
            this.x = x;
            this.y = y;
            this.target = target;
            this.speed = speed;
            this.damage = damage;
            this.color = color;
            this.slowDuration = slowDuration;
            this.size = 5;
        }
        move() {
            if (!this.target || this.target.health <= 0) {
                return false;
            }
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.speed) {
                this.target.takeDamage(this.damage);
                if (this.slowDuration > 0) {
                    this.target.applySlow(this.slowDuration);
                }
                return false;
            } else {
                this.x += (dx / dist) * this.damage;
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
                    const dx= enemy.x - this.targetX;
                    const dy = enemy.y - this.targetY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < this.splashRadius) {
                        enemy.takeDamage(this.damage);
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
        constructor(x, y) {
            this.x = (Math.floor(x / TILE_SIZE) + 0.5) * TILE_SIZE;
            this.y = (Math.floor(y / TILE_SIZE) + 0.5) * TILE_SIZE;
            this.fireCooldown = 0;
            this.target = null;
            this.level = 1;
            this.maxLevel = 3;
            this.totalCost = 0;
            this.upgradeCost = 0;
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
        findTarget() {
            if (this.target && this.target.health > 0 && this.isInRange(this.target)) {
                return;
            }
            this.target = null;
            let closestDist = Infinity;
            for (const enemy of enemies) {
                const dist = this.getDistance(enemy);
                if (dist < this.range && dist < closestDist) {
                    closestDist = dist;
                    this.target = enemy;
                }
            }
        }
        drawRange() {
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
            ctx.fillStyle = 'white';
            ctx.font = '12px Calibri';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.level, this.x, this.y);
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
            super(x, y);
            this.range = TILE_SIZE * 3;
            this.damage = 20;
            this.fireRate = 35;
            this.color = 'cyan';
            this.rangeColor = 'rgba(0, 255, 255, 0.3)';
            this.totalCost = TURRET_COST;
            this.upgradeCost = 80;
        }
        upgrade() {
            if (this.level >= this.maxLevel) return false;
            this.level++;
            this.totalCost += this.upgradeCost;
            this.damage = Math.floor(this.damage * 1.8);
            this.range += TILE_SIZE * 0.25;
            this.fireRate = Math.floor(this.fireRate * 0.85);
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
                    7, this.damage, this.color
                ));
            }
        }
    }
    class FrostTurret extends BaseTower {
        constructor(x, y) {
            super(x, y);
            this.range = TILE_SIZE * 2.5;
            this.damage = 3;
            this.fireRate = 65;
            this.slowDuration = 120;
            this.color = 'blue';
            this.rangeColor = 'rgba(0, 0, 255, 0.3)';
            this.totalCost = FROST_COST;
            this.upgradeCost = 100;
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
                    this.x, this.y, this.target, 6, this.damage, this.color, this.slowDuration
                ));
            }
        }
    }
    class BombTurret extends BaseTower {
        constructor(x, y) {
            super(x, y);
            this.range = TILE_SIZE * 4;
            this.damage = 60;
            this.fireRate = 100;
            this.splashRadius = TILE_SIZE * 1.5;
            this.color = 'orange';
            this.rangeColor = 'rgba(255, 165, 0, 0.3)';
            this.totalCost = BOMB_COST;
            this.upgradeCost = 150;
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawMap();
        if (waveInProgress) {
            if (enemiesToSpawn.length > 0 && waveSpawnTimer <= 0) {
                const enemyType = enemiesToSpawn.shift();
                let enemy;
                switch (enemyType) {
                    case 'runner':
                        enemy = new RunnerEnemy();
                        break;
                    case 'brute':
                        enemy = new BruteEnemy();
                        break;
                    case 'basic':
                        const health = 50 + wave * 10;
                        const speed = 1 + wave * 0.1;
                        enemy = new Enemy(health, speed, 5, 10, 'red', TILE_SIZE * 0.6);
                        break;
                }
                enemies.push(enemy);
                waveSpawnTimer = 30;
            }
            if (waveSpawnTimer > 0) {
                waveSpawnTimer--;
            }
            if (enemiesToSpawn.length === 0 && enemies.length === 0) {
                waveInProgress = false;
                startWaveButton.disabled = false;
                startWaveButton.textContent = 'Start next wave!';
                const interestEarned = Math.min(Math.floor(gold * INTEREST_RATE), MAX_INTEREST);
                if (interestEarned > 0) {
                    gold+= interestEarned;
                    showGlobalMessage(`+${interestEarned}G Interest!`, 'interest');
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
            }
        }
        for (const tower of towers) {
            tower.draw();
            tower.attack();
        }
        if (selectedTower) {
            selectedTower.drawSelection();
        }
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            p.draw();
            if (!p.move()) {
                projectiles.splice(i, 1);
            }
        }
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            enemy.move();
            enemy.draw();
            if (enemy.health <= 0) {
                enemies.splice(i, 1);
            }
        }
        for (let i = explosions.length - 1; i >= 0; i--) {
            const exp = explosions[i];
            exp.timer--;
            ctx.fillStyle = exp.color;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, exp.radius * (1 - exp.timer / 10), 0, Math.PI * 2);
            ctx.fill();
            if (exp.timer <= 0) {
                explosions.splice(i, 1);
            }
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
        updateSpells();
        
        if (baseHealth <= 0) {
            baseHealth = 0;
            updateUI();
            gameOver();
            return;
        }
        requestAnimationFrame(gameLoop);
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
    function getTowerStats(towerType) {
        switch (towerType) {
            case 'basic': return {range: TILE_SIZE * 3, color: 'rgba(0, 255, 255, 0.5)', cost: TURRET_COST};
            case 'frost': return {range: TILE_SIZE * 2.5, color: 'rgba(0, 0, 255, 0.5)', cost: FROST_COST};
            case 'bomb':  return {range: TILE_SIZE * 4, color: 'rgba(255, 165, 0, 0.5)', cost: BOMB_COST};
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
        ctx.strokeStyle = isValid ? 'rgba(0, 255, 255, 0.5)' : 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, TILE_SIZE * 3, 0, Math.PI * 2);
        ctx.stroke();
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
        let composition = waveCompositions[wave];
        if (!composition) {
            composition = ['brute', 'brute', 'brute', 'brute', 'brute'];
            for(let i=0; i < wave * 2; i++) {
                composition.push('runner');
            }
        }
        enemiesToSpawn = [...composition];
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
        let statsHTML = `
        <strong>Type:</strong> ${selectedTower.constructor.name}<br>
        <strong>Level:</strong> ${selectedTower.level} / ${selectedTower.maxLevel}<br>
        <strong>Damage:</strong> ${selectedTower.damage || 'N/A'}<br>
        <strong>Range:</strong> ${(selectedTower.range / TILE_SIZE).toFixed(1)} tiles<br>
        <strong>Fire Rate:</strong> ${(60 / selectedTower.fireRate).toFixed(1)}/sec
        `;
        towerStatsDisplay.innerHTML = statsHTML;
        sellTowerButton.textContent = `Sell (${selectedTower.getSellValue()}G)`;
        if (selectedTower.level >= selectedTower.maxLevel) {
            upgradeTowerButton.disabled = true;
            upgradeTowerButton.textContent = 'Max Level';
        } else {
            upgradeTowerButton.disabled = false;
            upgradeTowerButton.textContent = `Upgrade (${selectedTower.upgradeCost}G)`;
        }
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
                enemy.takeDamage(SPELL_COSTS.meteor.damage);
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

    buildTurretButton.addEventListener('click', () => toggleBuildMode('basic'));
    buildFrostButton.addEventListener('click', () => toggleBuildMode('frost'));
    buildBombButton.addEventListener('click', () => toggleBuildMode('bomb'));
    canvas.addEventListener('click', handleCanvasClick);
    startWaveButton.addEventListener('click', startWave);
    upgradeTowerButton.addEventListener('click', upgradeSelectedTower);
    sellTowerButton.addEventListener('click', sellSelectedTower);
    meteorStrikeButton.addEventListener('click', activateMeteor);
    globalFreezeButton.addEventListener('click', castGlobalFreeze);
    deselectTowerButton.addEventListener('click', showBuildUI);
    updateUI();
    showBuildUI();
    gameLoop();
});