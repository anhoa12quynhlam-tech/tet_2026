const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let width,
  height,
  fireworksContainer = [];
const textCanvas = document.createElement("canvas");
const tCtx = textCanvas.getContext("2d", { willReadFrequently: true });

// Canvas riêng để lưu hình ảnh cây (vẽ 1 lần dùng mãi mãi)
const treeCache = document.createElement("canvas");
const treeCtx = treeCache.getContext("2d");

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  textCanvas.width = width;
  textCanvas.height = height;
  treeCache.width = width;
  treeCache.height = height;
  // Vẽ lại cây vào cache khi xoay màn hình
  renderTreesToCache();
}
window.addEventListener("resize", resize);

// 1. HÀM VẼ HOA (Cho cache)
function drawFlower(context, x, y, color) {
  context.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 * Math.PI) / 180;
    context.beginPath();
    context.arc(
      x + Math.cos(angle) * 2.5,
      y + Math.sin(angle) * 2.5,
      3,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.fillStyle = "#fff";
  context.beginPath();
  context.arc(x, y, 1.5, 0, Math.PI * 2);
  context.fill();
}

// 2. HÀM VẼ CÂY ĐỆ QUY (Chỉ chạy 1 lần)
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
    for (let i = 0; i < 3; i++) {
      drawFlower(
        context,
        Math.random() * 12 - 6,
        -len + (Math.random() * 12 - 6),
        color,
      );
    }
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
  if (len > 20 && Math.random() > 0.5) {
    // Nhánh phụ ngẫu nhiên cho đầy đặn
    drawFancyTree(
      context,
      0,
      -len / 2,
      len * 0.4,
      angle + 40,
      branchWidth * 0.5,
      color,
    );
  }
  context.restore();
}

function renderTreesToCache() {
  treeCtx.clearRect(0, 0, width, height);
  const treeLen = height * 0.12;
  // Vẽ cây đào trái, mai phải vào canvas đệm
  drawFancyTree(treeCtx, width * 0.18, height, treeLen, 0, 8, "#ffb7c5");
  drawFancyTree(treeCtx, width * 0.82, height, treeLen, 0, 8, "#FFD700");
}

// 3. LOGIC CHỮ (Tối ưu lấy điểm)
function getTextMatrix() {
  tCtx.clearRect(0, 0, width, height);
  const fontSize = Math.min(width / 6.5, 50);
  tCtx.font = `bold ${fontSize}px Arial`;
  tCtx.textAlign = "center";
  tCtx.fillStyle = "white";
  tCtx.fillText("HAPPY", width / 2, height / 2.5);
  tCtx.fillText("NEW YEAR", width / 2, height / 2.5 + fontSize + 15);
  const imageData = tCtx.getImageData(0, 0, width, height).data;
  const points = [];
  for (let y = 0; y < height; y += 5) {
    for (let x = 0; x < width; x += 5) {
      if (imageData[(y * width + x) * 4] > 128) points.push({ x, y });
    }
  }
  return points;
}
resize();
const textPoints = getTextMatrix();

// 4. PHÁO HOA & HẠT (Giữ nguyên logic mượt)
class Particle {
  constructor(x, y, color, target = null) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.alpha = 1;
    this.target = target;
    if (this.target) {
      this.vel = { x: (this.target.x - x) / 40, y: (this.target.y - y) / 40 };
      this.lifeSpan = 0.0005;
    } else {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      this.vel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
      this.lifeSpan = 0.02;
    }
  }
  update() {
    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        this.x += this.vel.x;
        this.y += this.vel.y;
      } else {
        this.x = this.target.x + (Math.random() - 0.5) * 0.5;
        this.y = this.target.y + (Math.random() - 0.5) * 0.5;
      }
    } else {
      this.vel.y += 0.08;
      this.x += this.vel.x;
      this.y += this.vel.y;
    }
    this.alpha -= this.lifeSpan;
  }
  draw() {
    if (this.alpha <= 0) return;
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Firework {
  constructor(isText = false) {
    this.x = Math.random() * (width * 0.6) + width * 0.2;
    this.y = height;
    this.targetY = isText ? height / 4 : Math.random() * (height / 2);
    this.isText = isText;
    this.exploded = false;
    this.particles = [];
    this.color = isText ? "#FFD700" : `hsl(${Math.random() * 360}, 100%, 70%)`;
  }
  update() {
    if (!this.exploded) {
      this.y -= 12;
      if (this.y <= this.targetY) {
        this.exploded = true;
        if (this.isText) {
          textPoints.forEach((p) =>
            this.particles.push(new Particle(this.x, this.y, this.color, p)),
          );
        } else {
          for (let i = 0; i < 30; i++)
            this.particles.push(new Particle(this.x, this.y, this.color));
        }
      }
    } else {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        this.particles[i].update();
        if (this.particles[i].alpha <= 0) this.particles.splice(i, 1);
      }
    }
  }
  draw() {
    if (!this.exploded) {
      ctx.fillStyle = "white";
      ctx.fillRect(this.x, this.y, 2, 5);
    } else {
      this.particles.forEach((p) => p.draw());
    }
  }
}

// 5. VÒNG LẶP CHÍNH (Siêu mượt)
function loop() {
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";

  // DÁN CÂY TỪ CACHE (Chỉ mất 0.01ms xử lý)
  ctx.drawImage(treeCache, 0, 0);

  if (Math.random() < 0.035) {
    const hasText = fireworksContainer.some(
      (f) => f.isText && f.particles.length > 0,
    );
    fireworksContainer.push(new Firework(!hasText && Math.random() < 0.15));
  }

  fireworksContainer.forEach((f, i) => {
    f.update();
    f.draw();
    if (f.exploded && f.particles.length === 0) fireworksContainer.splice(i, 1);
  });

  requestAnimationFrame(loop);
}

loop();
