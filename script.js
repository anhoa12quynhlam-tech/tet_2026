const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let width,
  height,
  fireworksContainer = [];
const treeCache = document.createElement("canvas");
const treeCtx = treeCache.getContext("2d");
const tCanvas = document.createElement("canvas");
const tCtx = tCanvas.getContext("2d", { willReadFrequently: true });

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  treeCache.width = width;
  treeCache.height = height;
  tCanvas.width = width;
  tCanvas.height = height;
  renderTreesToCache();
}
window.addEventListener("resize", resize);

// --- 1. VẼ CÂY (CACHE) ---
function drawFlower(context, x, y, color) {
  context.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 * Math.PI) / 180;
    context.beginPath();
    context.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 3.5, 0, Math.PI * 2);
    context.fill();
  }
}

function drawFancyTree(context, x, y, len, angle, branchWidth, color) {
  context.save();
  context.strokeStyle = "#2d1b0d";
  context.lineWidth = branchWidth;
  context.translate(x, y);
  context.rotate((angle * Math.PI) / 180);
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(0, -len);
  context.stroke();

  if (len < 10) {
    for (let i = 0; i < 4; i++)
      drawFlower(
        context,
        Math.random() * 15 - 7.5,
        -len + (Math.random() * 15 - 7.5),
        color,
      );
    context.restore();
    return;
  }

  drawFancyTree(
    context,
    0,
    -len,
    len * 0.75,
    angle + 25,
    branchWidth * 0.7,
    color,
  );
  drawFancyTree(
    context,
    0,
    -len,
    len * 0.75,
    angle - 25,
    branchWidth * 0.7,
    color,
  );
  if (len > 30)
    drawFancyTree(
      context,
      0,
      -len / 2,
      len * 0.4,
      angle + 45,
      branchWidth * 0.5,
      color,
    );
  context.restore();
}

function renderTreesToCache() {
  treeCtx.clearRect(0, 0, width, height);
  const treeLen = height * 0.13;
  drawFancyTree(treeCtx, width * 0.18, height, treeLen, 0, 9, "#ffb7c5");
  drawFancyTree(treeCtx, width * 0.82, height, treeLen, 0, 9, "#FFD700");
}

// --- 2. LOGIC CHỮ ---
function getTextPoints() {
  tCtx.clearRect(0, 0, width, height);
  const fontSize = Math.min(width / 6, 50);
  tCtx.font = `bold ${fontSize}px Arial`;
  tCtx.textAlign = "center";
  tCtx.fillStyle = "white";
  tCtx.fillText("HAPPY", width / 2, height / 2.5);
  tCtx.fillText("NEW YEAR", width / 2, height / 2.5 + fontSize + 15);
  const data = tCtx.getImageData(0, 0, width, height).data;
  const pts = [];
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      if (data[(y * width + x) * 4] > 128) pts.push({ x, y });
    }
  }
  return pts;
}

// --- 3. PHÁO HOA ĐA TẦNG ---
class Particle {
  constructor(x, y, color, target = null, isSecondGen = false) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.alpha = 1;
    this.target = target;
    this.isSecondGen = isSecondGen;

    const angle = Math.random() * Math.PI * 2;
    const speed = isSecondGen ? Math.random() * 2 + 1 : Math.random() * 6 + 2;
    this.vel = target
      ? { x: (target.x - x) / 40, y: (target.y - y) / 40 }
      : { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
    this.friction = 0.95;
    this.gravity = 0.1;
  }
  update() {
    if (this.target) {
      if (Math.abs(this.target.x - this.x) > 1) {
        this.x += this.vel.x;
        this.y += this.vel.y;
      }
      this.alpha -= 0.0005;
    } else {
      this.vel.x *= this.friction;
      this.vel.y *= this.friction;
      this.vel.y += this.gravity;
      this.x += this.vel.x;
      this.y += this.vel.y;
      this.alpha -= 0.015;
    }
  }
  draw() {
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.isSecondGen ? 0.8 : 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Firework {
  constructor(isText = false) {
    this.x = Math.random() * (width * 0.8) + width * 0.1;
    this.y = height;
    this.targetY = isText ? height / 4 : Math.random() * (height / 2);
    this.isText = isText;
    this.exploded = false;
    this.particles = [];
    this.color = isText ? "#FFD700" : `hsl(${Math.random() * 360}, 100%, 60%)`;
  }
  update() {
    if (!this.exploded) {
      this.y -= 10;
      if (this.y <= this.targetY) {
        this.exploded = true;
        if (this.isText) {
          getTextPoints().forEach((p) =>
            this.particles.push(new Particle(this.x, this.y, this.color, p)),
          );
        } else {
          // Nổ cấp 1: 80 hạt
          for (let i = 0; i < 80; i++)
            this.particles.push(new Particle(this.x, this.y, this.color));
        }
      }
    } else {
      this.particles.forEach((p, i) => {
        p.update();
        // Nổ cấp 2: Một số hạt sẽ nổ thêm nhánh nhỏ khi đang bay
        if (
          !this.isText &&
          !p.isSecondGen &&
          Math.random() < 0.005 &&
          p.alpha > 0.8
        ) {
          for (let j = 0; j < 5; j++)
            this.particles.push(new Particle(p.x, p.y, p.color, null, true));
        }
        if (p.alpha <= 0) this.particles.splice(i, 1);
      });
    }
  }
  draw() {
    if (!this.exploded) {
      ctx.fillStyle = "white";
      ctx.fillRect(this.x, this.y, 2, 6);
    } else {
      this.particles.forEach((p) => p.draw());
    }
  }
}

// --- 4. FULLSCREEN & LOOP ---
const fsBtn = document.getElementById("fullscreen-btn");
fsBtn.addEventListener("click", () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
});

resize();
function loop() {
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";

  ctx.drawImage(treeCache, 0, 0);

  if (Math.random() < 0.05) {
    const hasText = fireworksContainer.some(
      (f) => f.isText && f.particles.length > 0,
    );
    fireworksContainer.push(new Firework(!hasText && Math.random() < 0.1));
  }

  fireworksContainer.forEach((f, i) => {
    f.update();
    f.draw();
    if (f.exploded && f.particles.length === 0) fireworksContainer.splice(i, 1);
  });
  requestAnimationFrame(loop);
}
loop();
