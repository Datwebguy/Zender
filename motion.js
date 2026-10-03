// Motion: typing text, step entrances, the scramble-to-sealed effect and the opening scene.
// Everything here is decoration. With reduced motion on, it all shows at once.

export const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const timers = new Set();
function later(fn, ms) {
  const id = setTimeout(() => {
    timers.delete(id);
    fn();
  }, ms);
  timers.add(id);
  return id;
}

// Stop any typing or scrambling still running from the previous screen.
export function stopAll() {
  timers.forEach(clearTimeout);
  timers.clear();
}

// Types `text` into `node`. Screen readers get the full text at once.
export function typeText(node, text, { delay = 0, speed = 18 } = {}) {
  node.replaceChildren();
  if (calm) {
    node.textContent = text;
    return;
  }
  const full = document.createElement("span");
  full.className = "sr-only";
  full.textContent = text;
  const shown = document.createElement("span");
  shown.setAttribute("aria-hidden", "true");
  shown.className = "typing";
  node.append(full, shown);
  let i = 0;
  const tick = () => {
    i += 1;
    shown.textContent = text.slice(0, i);
    if (i < text.length) later(tick, speed);
    else shown.classList.remove("typing");
  };
  later(tick, delay);
}

// Restarts the entrance animation on the step body. `dir` is 1 forward, -1 back.
export function enter(main, dir) {
  main.classList.remove("enter", "from-left", "from-right");
  if (calm) return;
  void main.offsetWidth;
  main.classList.add("enter", dir < 0 ? "from-left" : "from-right");
}

const NOISE = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

// Shows random characters that settle into `text`, like something being encrypted.
export function scramble(node, text, delay = 0) {
  if (calm) {
    node.textContent = text;
    return;
  }
  node.textContent = text.replace(/./g, " ");
  let frame = 0;
  const frames = 14;
  const run = () => {
    frame += 1;
    const settled = Math.floor((frame / frames) * text.length);
    node.textContent = [...text]
      .map((ch, i) => (i < settled ? ch : NOISE[(Math.random() * NOISE.length) | 0]))
      .join("");
    if (frame < frames) later(run, 45);
    else node.textContent = text;
  };
  later(run, delay);
}

// Fires `fn` after `ms`, unless the screen changes first.
export function after(ms, fn) {
  if (calm) return fn();
  later(fn, ms);
}

// Opening scene, once per phone. Resolves when the visitor taps.
export function intro(root) {
  let seen = false;
  try {
    seen = localStorage.getItem("zender:intro") === "1";
  } catch {}
  if (seen || calm) return;

  root.hidden = false;
  const l1 = root.querySelector("[data-line='1']");
  const l2 = root.querySelector("[data-line='2']");
  typeText(l1, "The blockchain is public.", { delay: 500, speed: 45 });
  typeText(l2, "Your letter isn't.", { delay: 1800, speed: 55 });
  later(() => root.classList.add("stamped"), 2900);
  later(() => root.classList.add("ready"), 3300);

  const close = () => {
    try {
      localStorage.setItem("zender:intro", "1");
    } catch {}
    root.classList.add("leaving");
    setTimeout(() => {
      root.hidden = true;
    }, 400);
  };
  root.addEventListener("click", close, { once: true });
}
