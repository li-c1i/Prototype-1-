const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");

const percentText = document.getElementById("percent");
const progressFill = document.getElementById("progressFill");
const message = document.getElementById("message");
const status = document.getElementById("status");
const tapCountText = document.getElementById("tapCount");
const fuelLabel = document.getElementById("fuelLabel");
const tapZone = document.getElementById("tapZone");
const almostOverlay = document.getElementById("almostOverlay");

let width = 0;
let height = 0;
let pixelRatio = 1;
let progress = 12;
let taps = 0;
let travel = 0;
let almostShown = false;
let lastTapTime = 0;

function resizeCanvas() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function drawLine(x1, y1, x2, y2, color, lineWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawSun(x, y, radius, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 36; i++) {
    const angle = (Math.PI * 2 * i) / 36;
    drawLine(
      x + Math.cos(angle) * radius * 1.12,
      y + Math.sin(angle) * radius * 1.12,
      x + Math.cos(angle) * radius * 1.48,
      y + Math.sin(angle) * radius * 1.48,
      "rgba(255,61,53,.8)",
      Math.max(0.6, radius * 0.025)
    );
  }
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#ff3d35";
  ctx.fill();
  ctx.restore();
}

function drawFrame(cx, cy, frameWidth, frameHeight, alpha) {
  const left = cx - frameWidth / 2;
  const right = cx + frameWidth / 2;
  const top = cy - frameHeight / 2;
  const bottom = cy + frameHeight / 2;

  const points = [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom]
  ];

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point[0], point[1]);
    } else {
      ctx.lineTo(point[0], point[1]);
    }
  });

  ctx.closePath();
  ctx.fillStyle = "rgba(166,205,255,.025)";
  ctx.fill();
  ctx.strokeStyle = "rgba(224,240,255,.85)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

function drawScene() {
  const centerX = width / 2;
  const horizon = height * 0.47;
  const movement = travel % 1;

  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#77a9ee");
  background.addColorStop(0.48, "#b8d5ff");
  background.addColorStop(1, "#07132c");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(
    centerX, horizon, 0, centerX, horizon, Math.max(width, height) * 0.62
  );
  glow.addColorStop(0, "rgba(255,255,255,.68)");
  glow.addColorStop(0.32, "rgba(173,211,255,.17)");
  glow.addColorStop(1, "rgba(7,19,44,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Perspective road lines converge toward one vanishing point.
  for (let i = -9; i <= 9; i++) {
    const bottomX = centerX + i * width * 0.105;
    drawLine(centerX, horizon, bottomX, height * 1.08, "rgba(229,241,255,.32)");
  }

  // The road moves forward every time the viewer taps.
  for (let i = 1; i <= 18; i++) {
    const raw = (i / 18 + movement) % 1;
    const depth = raw * raw;
    const y = horizon + (height * 0.62) * depth;
    const span = width * 0.78 * raw;
    drawLine(centerX - span, y, centerX + span, y,
      `rgba(226,240,255,${0.08 + raw * 0.22})`);
  }

  // Endless mirror frames, growing out of the vanishing point.
  for (let i = 0; i < 22; i++) {
    const depth = (i / 22 + movement) % 1;
    const scale = 0.018 + depth * depth * 1.38;
    const frameWidth = Math.min(width * 0.94, width * scale);
    const frameHeight = Math.min(height * 1.3, height * scale * 1.12);
    drawFrame(
      centerX,
      horizon + height * 0.1 * depth,
      frameWidth,
      frameHeight,
      0.14 + depth * 0.72
    );
  }

  // Repeating red suns: the closer you get, the more there seem to be.
  for (let i = 9; i >= 0; i--) {
    const depth = i / 9;
    const y = horizon + height * 0.32 * depth * depth;
    const radius = (width * 0.007 + width * 0.016 * depth) *
      (1 + Math.sin(performance.now() * 0.0018) * 0.025);
    drawSun(centerX, y, radius, 0.2 + depth * 0.7);
  }

  // Circular reflections along the corridor.
  for (let i = 0; i < 11; i++) {
    const depth = (i / 11 + movement * 0.7) % 1;
    const radius = 8 + depth * Math.min(width, height) * 0.22;
    ctx.beginPath();
    ctx.ellipse(
      centerX, horizon + depth * height * 0.43,
      radius, radius * (0.12 + depth * 0.42), 0, 0, Math.PI * 2
    );
    ctx.strokeStyle = `rgba(255,255,255,${0.18 * (1 - depth)})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  requestAnimationFrame(drawScene);
}

function updateProgress() {
  const displayProgress = Math.min(progress, 99.9);
  percentText.textContent = displayProgress.toFixed(1) + "%";
  progressFill.style.width = displayProgress + "%";
  tapCountText.textContent = "TAPS " + String(taps).padStart(3, "0");

  if (progress >= 99) {
    message.textContent = "ALMOST THERE";
    status.textContent = "JUST A LITTLE MORE";
    if (!almostShown) {
      almostShown = true;
      almostOverlay.classList.add("show");
      almostOverlay.setAttribute("aria-hidden", "false");
      setTimeout(() => {
        almostOverlay.classList.remove("show");
        almostOverlay.setAttribute("aria-hidden", "true");
      }, 1700);
    }
  } else if (progress >= 55) {
    message.textContent = "KEEP GOING";
    status.textContent = "PROGRESS SAVED";
  } else {
    message.textContent = "YOUR FUTURE";
    status.textContent = "KEEP GOING";
  }
}

function tapToMove() {
  taps++;
  lastTapTime = performance.now();

  // Every tap gives a tiny burst of progress, then progress becomes painfully slow.
  let gain = 1.05;
  if (progress > 70) gain = 0.22;
  if (progress > 90) gain = 0.055;
  if (progress > 98) gain = 0.012;

  progress = Math.min(99.9, progress + gain);
  travel += 0.055 + gain * 0.018;

  fuelLabel.textContent = progress >= 99 ? "KEEP BELIEVING" : "TAP TO MOVE";
  updateProgress();

  tapZone.animate(
    [{ transform: "translateX(-50%) scale(1)" }, { transform: "translateX(-50%) scale(.88)" }, { transform: "translateX(-50%) scale(1)" }],
    { duration: 150, easing: "ease-out" }
  );
}

tapZone.addEventListener("click", tapToMove);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "Enter") {
    event.preventDefault();
    tapToMove();
  }
});

drawScene();
updateProgress();
