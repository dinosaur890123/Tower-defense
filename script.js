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
    const TILE_SIZE = 40;
    const MAP_COLS = canvas.width / TILE_SIZE;
    const MAP_ROWS = canvas.height / TILE_SIZE;
    const TURRET_COST = 50;
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
    let baseHealth = 100;
    let gold = 100;
    let wave = 0;
    let enemies = [];
    let tower = [];
    let buildingTower = false;
    let waveInprogress = false;
    let waveEnemies = 0;
    let waveSpawnTimer = 0;
    
    class Enemy {
        constructor(health, speed) {
            this.x = path[0].x * TILE_SIZE + TILE_SIZE / 2;
            this.y = path[0].y * TILE_SIZE + TILE_SIZE / 2;
            this.health = health;
            this.maxHealth = health;
            this.speed = speed;
            this.pathIndex = 0;
            this.width = TILE_SIZE * 0.6;
            this.goldValue = 5;
            this.baseDamage = 10;
        }
        move() {
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
            if (distance < this.speed) {
                this.pathIndex++;
                this.x = targetX;
            } else {
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
            }
        }
        draw() {
            ctx.fillStyle = 'red';
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
    class Turret {
        constructor(x, y) {
            this.x = (Math.floor(x / TILE_SIZE) + 0.5) * TILE_SIZE;
            this.y = (Math.floor(y / TILE_SIZE) + 0.5) * TILE_SIZE;
            this.range = TILE_SIZE * 3;
            this.damage = 10;
            this.fireRate = 60;
            this.fireCooldown = 0;
            this.target = null;
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
        getDistance(enemy) {
            const dx = this.x - enemy.x;
            const dy = this.y - enemy.y;
            return Math.sqrt(dx * dx + dy * dy);
        }
        isInRange(enemy) {
            return this.getDistance(enemy) < this.range;
        }
        attack() {
            if (this.fireCooldown > 0) {
                this.fireCooldown--;
                return;
            }
            this.findTarget();
            if (this.target) {
                this.fireCooldown = this.fireRate;
                this.target.takeDamage(this.damage);
                ctx.beginPath();
                ctx.strokeStyle = 'cyan';
                ctx.lineWidth = 2;
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.target.x, this.target.y);
                ctx.stroke();
            }
        }
        draw() {
            ctx.fillStyle = 'cyan';
            ctx.beginPath();
            ctx.arc(this.x, this.y, TILE_SIZE / 3, 0, Math.PI * 2);
            ctx.fill();
            if (buildingTower || this.showRange) {
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }
    function gameLoop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawMap();
        if (waveInprogress) {
            if (waveEnemies > 0 && waveSpawnTimer <= 0) {
                const health = 50 + wave * 10;
                const speed = 1 + wave * 0.1;
                enemies.push(new Enemy(health, speed));
                waveEnemies--;
                waveSpawnTimer = 30;
            }
            if (waveSpawnTimer > 0) {
                waveSpawnTimer--;
            }
            if (waveEnemies === 0 && enemies.length === 0) {
                waveInProgress = false;
                startWaveButton.disabled = false;
                startWaveButton.textContent = 'Start next wave!';
                gold += 50 + wave * 10;
                updateUI();
            }
        }
    }

})