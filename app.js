import qrcode from "./vendor/qrcode.js";
import { ROUNDS, FAQ } from "./steps.js";
import { CHECKS, check, tip, isPublicAddress, zec } from "./verify.js";
import { AMOUNT, MESSAGE } from "./config.js";
import { MAX_MEMO_BYTES, utf8Bytes, buildUri, isUnifiedAddress } from "./zip321.js";
import { postUrl, shareImage, saveReminder } from "./share.js";
import { typeText, scramble, after, stopAll, calm } from "./motion.js";

const $ = (id) => document.getElementById(id);
const main = $("main");
const POLL_MS = 20000;

function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    node.setAttribute(k, v === true ? "" : v);
  }
  node.append(...kids.flat(Infinity).filter((k) => k != null && k !== false));
  return node;
}

// **bold** and `code` only. Everything else is plain text.
function rich(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).filter(Boolean).map((part) => {
    if (part.startsWith("**")) return el("b", {}, part.slice(2, -2));
    if (part.startsWith("`")) return el("code", {}, part.slice(1, -1));
    return part;
  });
}

function externalLink(label, href, className) {
  return el("a", { href, class: className, target: "_blank", rel: "noopener noreferrer" }, label);
}

/* Saved progress, per round, in this browser. Never the letter. */

function fresh() {
  return { done: Array(6).fill(false), start: Array(6).fill(null), end: Array(6).fill(null), open: 0, seen: null, sealed: false, skipped: [] };
}
function load(n) {
  try {
    const s = JSON.parse(localStorage.getItem(`zender:${n}`));
    if (s && Array.isArray(s.done) && s.done.length === 6) return { ...fresh(), ...s };
  } catch {}
  return fresh();
}
function save() {
  try {
    localStorage.setItem(`zender:${net}`, JSON.stringify(state));
  } catch {}
}
function loadAddress(n) {
  try {
    return localStorage.getItem(`zender:addr:${n}`) || "";
  } catch {
    return "";
  }
}
function saveAddress() {
  try {
    localStorage.setItem(`zender:addr:${net}`, address);
  } catch {}
}

let net = null; // "test" | "main" | null on the home page
let state = fresh();
let address = "";
let note = "";
let shielded = "";
let qrOpen = false;
let height = null;
let pollTimer = null;
let tickTimer = null;
const lastCheck = {}; // step index → { text, bad }

// Routes: "/", "/testnet", "/mainnet". Old links land on the right round.
function route() {
  const p = location.pathname.replace(/\/+$/, "") || "/";
  if (p === "/testnet" || /^\/t(\/|$)/.test(p)) return "test";
  if (p === "/mainnet" || /^\/([1-6]|done)$/.test(p)) return "main";
  return null;
}

function render() {
  stopAll();
  clearTimeout(pollTimer);
  clearInterval(tickTimer);
  net = route();
  const canonical = net ? ROUNDS[net].path : "/";
  if (location.pathname !== canonical) history.replaceState(null, "", canonical);
  for (const [id, n] of [["tab-test", "test"], ["tab-main", "main"]]) {
    if (net === n) $(id).setAttribute("aria-current", "page");
    else $(id).removeAttribute("aria-current");
  }
  if (!net) return renderHome();
  state = load(net);
  address = loadAddress(net);
  qrOpen = false;
  height = null;
  renderRound();
}

/* Home */

function renderHome() {
  document.title = "Zender · A letter to future you, sealed on Zcash";
  const l1 = el("span", { class: "line" });
  const l2 = el("span", { class: "line serif" });
  const hero = el("section", { class: "stage home" },
    el("img", { class: "stage-art", src: "/art/main.jpg", alt: "", "aria-hidden": "true", decoding: "async" }),
    el("div", { class: "stage-copy" },
      el("p", { class: "eyebrow" }, el("i", { class: "seal-dot" }), "A letter to future you, sealed on Zcash"),
      el("h1", {}, l1, l2),
      el("p", { class: "lede" }, "Write to yourself, one year from now. Send it through Zcash's shielded pool. It sits on a public chain, and only your wallet can open it."),
      el("div", { class: "cta" },
        el("a", { href: "/testnet", class: "btn primary lg", "data-nav": true }, "Practice free on testnet"),
        el("a", { href: "/mainnet", class: "btn ghost lg", "data-nav": true }, "Go straight to mainnet"),
      ),
    ),
  );

  const rounds = el("section", { class: "duo" },
    roundCard("test", "Practice round", "Free test ZEC in Zingo. Make every mistake for nothing.", "About 15 min"),
    roundCard("main", "The real thing", "A dollar or two of real ZEC in Zodl. It all comes back to you.", "About 20 min"),
  );

  const sees = el("section", { class: "compare" },
    el("p", { class: "eyebrow" }, "Why it's different"),
    el("h2", {}, "Same transaction. Two views."),
    el("div", { class: "compare-grid" },
      el("div", { class: "view mine" },
        el("p", { class: "plabel" }, "Your wallet sees"),
        el("p", { class: "letter-text" }, "Dear me, one year from now. Did you keep going? I hope you did."),
        el("p", { class: "meta" }, "0.0001 ZEC · from you · to you"),
      ),
      el("div", { class: "view theirs" },
        el("p", { class: "plabel" }, "The whole world sees"),
        el("p", { class: "prow" }, el("span", {}, "Sender"), el("b", {}, "hidden")),
        el("p", { class: "prow" }, el("span", {}, "Receiver"), el("b", {}, "hidden")),
        el("p", { class: "prow" }, el("span", {}, "Amount"), el("b", {}, "hidden")),
        el("p", { class: "prow" }, el("span", {}, "Letter"), el("b", {}, "sealed")),
      ),
    ),
  );

  const how = el("section", { class: "how3" },
    [["01", "Write", "A short letter to the person you'll be next year."], ["02", "Seal", "Send it to your own shielded address. The letter rides inside."], ["03", "Open", "Your wallet decrypts it. Nobody else ever can."]].map(([n, t, p]) =>
      el("div", {}, el("span", { class: "n" }, n), el("h3", {}, t), el("p", {}, p))),
  );

  main.replaceChildren(hero, rounds, sees, how);
  typeText(l1, "The blockchain is public.", { delay: 250, speed: 38 });
  typeText(l2, "Your letter isn't.", { delay: 1350, speed: 48 });
}

function roundCard(n, title, sub, time) {
  const r = ROUNDS[n];
  const count = load(n).done.filter(Boolean).length;
  return el("a", { href: r.path, class: `round ${n}`, "data-nav": true },
    el("img", { src: r.art, alt: "", "aria-hidden": "true", loading: "lazy", decoding: "async" }),
    el("span", { class: "round-in" },
      el("span", { class: "chip" }, el("i", {}), n === "test" ? "Testnet" : "Mainnet"),
      el("span", { class: "round-title" }, title),
      el("span", { class: "round-sub" }, sub),
      el("span", { class: "round-foot" }, el("span", {}, count ? `${count} of 6 sealed` : time), el("span", { class: "go" }, count ? "Continue →" : "Begin →")),
    ),
  );
}

/* A round */

function renderRound() {
  const r = ROUNDS[net];
  document.title = `${net === "test" ? "Testnet" : "Mainnet"} · Zender`;
  const hero = el("section", { class: "stage" },
    el("img", { class: "stage-art", src: r.art, alt: "", "aria-hidden": "true", decoding: "async" }),
    el("div", { class: "stage-copy" },
      el("p", { class: "eyebrow" }, el("span", { class: "chain", id: "chain" }, el("i", { class: "dot" }), el("span", {}, "Connecting…")), el("span", { class: "sep" }), r.tag),
      el("h1", {}, el("span", { class: "line" }, r.title[0]), el("span", { class: "line serif" }, r.title[1])),
      el("p", { class: "lede" }, r.sub),
    ),
  );

  // The rail: six linked blocks that fill as steps are sealed.
  const rail = el("nav", { class: "rail", "aria-label": "Your progress" },
    el("ol", { class: "blocks" }, r.steps.map((s, i) => {
      const b = el("button", { type: "button", class: "blk", id: `blk-${i + 1}`, "aria-label": `Step ${i + 1}: ${s.title}` }, String(i + 1));
      b.addEventListener("click", () => openCard(i, true));
      return el("li", {}, b);
    })),
    el("p", { class: "rail-meta" }, el("b", { id: "count" }), el("span", { id: "total" })),
  );

  const list = el("ol", { class: "steps", id: "cards" });
  r.steps.forEach((_, i) => list.append(el("li", { class: "step", id: `step-${i + 1}` })));

  const finish = el("section", { class: "letter-card", id: "finish" });
  const over = el("button", { type: "button", class: "link" }, "Start this round over");
  over.addEventListener("click", startOver);

  const other = el("a", { class: "round slim", href: r.other.href, "data-nav": true },
    el("img", { src: r.other.href === "/mainnet" ? "/art/main.jpg" : "/art/test.jpg", alt: "", "aria-hidden": "true", loading: "lazy" }),
    el("span", { class: "round-in" }, el("span", { class: "round-title" }, r.other.title), el("span", { class: "round-sub" }, r.other.text), el("span", { class: "round-foot" }, el("span", {}), el("span", { class: "go" }, `${r.other.label} →`))),
  );
  const faq = el("section", { class: "faq" },
    el("h2", {}, "Stuck?"),
    FAQ.filter((f) => net === "test" || !f.test).map((f) => el("details", {}, el("summary", {}, f.q), el("p", {}, f.a))),
  );

  main.replaceChildren(hero, el("div", { class: "round-body" }, rail, list, finish, el("p", { class: "center small" }, over, el("span", { class: "saved" }, " · progress saves in this browser")), el("div", { class: "tail" }, faq, other)));

  if (state.open >= 0 && !state.done[state.open] && !state.start[state.open]) state.start[state.open] = Date.now();
  save();
  renderCards();
  renderProgress();
  renderFinish(false);
  tickTimer = setInterval(tick, 1000);
  schedulePoll(400);
  liveChain();
}

async function liveChain() {
  const n = net;
  const line = $("chain");
  try {
    const h = await tip(n);
    if (n !== net) return;
    height = h;
    line.className = "chain on";
    line.lastChild.textContent = `${n === "test" ? "Testnet" : "Mainnet"} live · block ${h.toLocaleString("en-US")}`;
    if (state.open === 0) renderCard(0);
    renderFinish(false);
  } catch {
    if (n !== net) return;
    line.className = "chain off";
    line.lastChild.textContent = "Network unreachable, retrying";
  }
}

function startOver() {
  if (!confirm("Start this round again? Your progress here is cleared.")) return;
  try {
    localStorage.removeItem(`zender:${net}`);
    localStorage.removeItem(`zender:addr:${net}`);
  } catch {}
  note = "";
  shielded = "";
  render();
  window.scrollTo({ top: 0 });
}

function mmss(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const pad = (x) => String(x).padStart(2, "0");
  return h ? `${h}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

function elapsed(i) {
  if (!state.start[i]) return null;
  return (state.end[i] || Date.now()) - state.start[i];
}

function total() {
  return state.start.reduce((sum, _, i) => sum + (elapsed(i) || 0), 0);
}

function tick() {
  for (let i = 0; i < 6; i++) {
    const t = document.querySelector(`#step-${i + 1} .timer`);
    if (t) t.textContent = elapsed(i) == null ? "--:--" : mmss(elapsed(i));
  }
  const t = $("total");
  if (t) t.textContent = total() ? mmss(total()) : "00:00";
}

function renderProgress() {
  const count = state.done.filter(Boolean).length;
  $("count").textContent = `${count}/6 sealed`;
  for (let i = 0; i < 6; i++) {
    const b = $(`blk-${i + 1}`);
    b.className = `blk${state.done[i] ? " done" : ""}${state.open === i ? " now" : ""}`;
    b.replaceChildren(state.done[i] ? checkSvg() : String(i + 1));
  }
  tick();
}

function renderCards() {
  for (let i = 0; i < 6; i++) renderCard(i);
  tick();
}

function openCard(i, scroll) {
  state.open = i;
  if (!state.done[i] && !state.start[i]) state.start[i] = Date.now();
  save();
  renderCards();
  schedulePoll(400);
  if (scroll) after(80, () => $(`step-${i + 1}`).scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" }));
}

function closeCard() {
  state.open = -1;
  save();
  renderCards();
  clearTimeout(pollTimer);
}

function complete(i) {
  const now = Date.now();
  state.done[i] = true;
  state.start[i] = state.start[i] || now;
  state.end[i] = state.end[i] || now;
  save();
  renderProgress();
  const next = state.done.findIndex((d) => !d);
  if (next === -1) {
    state.open = -1;
    state.sealed = true;
    state.block = height;
    save();
    renderCards();
    renderProgress();
    renderFinish(true);
    after(300, () => $("finish").scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" }));
  } else {
    openCard(next, true);
  }
}

function renderCard(i) {
  const step = ROUNDS[net].steps[i];
  const card = $(`step-${i + 1}`);
  if (!card) return;
  const done = state.done[i];
  const open = state.open === i;
  card.className = `step${done ? " done" : ""}${open ? " open" : ""}`;
  const head = el("button", { type: "button", class: "step-head", "aria-expanded": String(open), "aria-controls": `body-${i + 1}` },
    el("span", { class: "node", "aria-hidden": "true" }, done ? checkSvg() : String(i + 1)),
    el("span", { class: "step-title" }, el("b", {}, step.title), el("small", {}, done ? doneLabel(i) : step.sub)),
    el("span", { class: "timer", role: "timer", "aria-label": "Time on this step" }, elapsed(i) == null ? "--:--" : mmss(elapsed(i))),
  );
  head.addEventListener("click", () => (open ? closeCard() : openCard(i, false)));
  const body = el("div", { class: "step-body", id: `body-${i + 1}`, hidden: !open });
  if (open) fillBody(body, step, i);
  card.replaceChildren(head, body);
  if (i === 5 && $("blk-1")) renderProgress();
}

function doneLabel(i) {
  if (ROUNDS[net].steps[i].kind !== "verify") return "Done";
  return state.skipped && state.skipped.includes(i) ? "Done · skipped the check" : `${CHECKS[i + 1].done} · checked on chain`;
}

function fillBody(body, step, i) {
  body.append(el("p", { class: "lead" }, rich(step.lead)));
  if (step.list) body.append(el("ol", { class: "how" }, step.list.map((t) => el("li", {}, rich(t)))));
  if (step.note) body.append(el("p", { class: "note" }, rich(step.note)));
  if (step.links) body.append(el("div", { class: "row" }, step.links.map((l) => externalLink(l.label, l.href, "btn ghost small"))));
  if (step.more) body.append(el("p", { class: "note" }, step.more));
  if (step.tips) {
    const h = height ? height.toLocaleString("en-US") : "4.4 million";
    body.append(el("div", { class: "tips" }, step.tips.map((t) =>
      el("div", { class: "tip" }, el("b", {}, t.title), el("p", {}, rich(t.text.replace("{height}", h)))),
    )));
  }
  if (step.video) body.append(clip(step.video));
  if (step.kind === "letter") body.append(letterForm());
  if (step.kind === "verify") body.append(verifyBlock(step, i));
  if (step.kind === "confirm" || step.kind === "letter") {
    const b = el("button", { type: "button", class: "btn primary" }, state.done[i] ? "Done" : step.confirm);
    b.disabled = state.done[i];
    b.addEventListener("click", () => complete(i));
    body.append(el("div", { class: "row" }, b));
  }
}

function clip(src) {
  const wrap = el("div", { class: "clip" });
  const btn = el("button", { type: "button", class: "btn ghost small" }, playSvg(), " Watch how");
  btn.addEventListener("click", () => {
    const video = el("video", { src, playsinline: true, controls: true, preload: "auto" });
    video.muted = true;
    wrap.replaceChildren(video);
    const p = video.play();
    if (p) p.catch(() => {});
  });
  wrap.append(btn);
  return wrap;
}

/* Watching the chain */

function verifyBlock(step, i) {
  const wrap = el("div", { class: "verify" });
  const prefix = net === "test" ? "tm" : "t1";
  const wallet = net === "test" ? "Zingo" : "Zodl";
  const done = state.done[i];

  if (step.ask || !address) {
    const input = el("input", {
      type: "text",
      class: "field",
      spellcheck: "false",
      autocomplete: "off",
      autocapitalize: "none",
      autocorrect: "off",
      inputmode: "text",
      "aria-label": `Your transparent address, starts with ${prefix}`,
      placeholder: `${prefix}…`,
    });
    input.value = address;
    const err = el("p", { class: "status bad", "aria-live": "polite" });
    const go = el("button", { type: "button", class: "btn primary" }, address ? "Watch this address" : "Start watching");
    const use = () => {
      const v = input.value.trim();
      if (!isPublicAddress(v, net)) {
        err.textContent = v ? `That isn't a ${prefix} address. Copy the transparent one from ${wallet}.` : "";
        return;
      }
      err.textContent = "";
      address = v;
      saveAddress();
      delete lastCheck[i];
      runCheck(i);
      renderCard(i);
    };
    go.addEventListener("click", use);
    input.addEventListener("keydown", (e) => e.key === "Enter" && use());
    input.addEventListener("paste", () => setTimeout(use, 0));
    if (!done) {
      wrap.append(
        el("label", { class: "field-label" }, `Your transparent address (starts with `, el("code", {}, prefix), ")"),
        input, err, el("div", { class: "row" }, go),
      );
    }
  }

  const s = lastCheck[i];
  const box = el("div", { class: `watch${done ? " ok" : ""}${s && s.bad ? " bad" : ""}`, "aria-live": "polite" });
  if (done) {
    box.append(el("b", {}, `${CHECKS[i + 1].done}. Seen on chain.`));
  } else if (address) {
    box.append(
      el("b", {}, el("i", { class: "dot pulse" }), step.watching),
      el("p", {}, s ? s.text : step.watchingSub),
      el("p", { class: "addr" }, `${address.slice(0, 8)}…${address.slice(-6)}`),
    );
  } else {
    box.append(el("b", {}, "Waiting for your address"), el("p", {}, "Paste it above and this page starts watching."));
  }
  wrap.append(box);

  if (step.skip && !done) {
    const skip = el("button", { type: "button", class: "link" }, step.skip.label);
    skip.addEventListener("click", () => {
      // Swap lands shielded, so there is nothing public to see for steps 2 and 3.
      state.skipped = [1, 2];
      state.seen = 0;
      state.done[1] = true;
      state.end[1] = state.end[1] || Date.now();
      state.start[2] = state.start[2] || Date.now();
      complete(2);
    });
    wrap.append(el("p", { class: "center" }, skip));
  }
  wrap.append(el("p", { class: "fine" }, "Only this public address is checked, through a Zcash light server. Never your letter or keys."));
  return wrap;
}

async function runCheck(i) {
  clearTimeout(pollTimer);
  if (!address || state.done[i]) return;
  const n = net;
  try {
    const s = await check(address, n);
    if (n !== net || state.done[i]) return;
    if (i === 5 ? CHECKS[6].ok(s, state.seen ?? 2) : CHECKS[i + 1].ok(s)) {
      if (i === 2) state.seen = s.txCount;
      delete lastCheck[i];
      complete(i);
      return;
    }
    const unit = n === "test" ? "TAZ" : "ZEC";
    lastCheck[i] = { text: `Not yet. ${zec(s.balanceZat)} ${unit} here, ${s.txCount} ${s.txCount === 1 ? "transaction" : "transactions"} so far. Checking again shortly.` };
  } catch (e) {
    if (n !== net) return;
    lastCheck[i] = { text: e.message || "Couldn't check just now. Trying again shortly.", bad: true };
  }
  if (state.open === i) renderCard(i);
  schedulePoll(POLL_MS);
}

// While a verify card is open and the address is known, keep checking quietly.
function schedulePoll(ms) {
  clearTimeout(pollTimer);
  if (!net || state.open < 0) return;
  const i = state.open;
  if (ROUNDS[net].steps[i].kind !== "verify" || state.done[i] || !address) return;
  pollTimer = setTimeout(() => {
    if (document.hidden || state.open !== i) return schedulePoll(POLL_MS);
    runCheck(i);
  }, ms);
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && net) schedulePoll(400);
});

/* The letter */

function addressProblem(value) {
  if (!value) return null;
  if (net === "test") {
    if (/^u1/i.test(value)) return "That's a mainnet address. Use your Zingo testnet address.";
    if (/^t/i.test(value)) return "Use your shielded address, not the transparent one.";
    if (!isUnifiedAddress(value, "utest")) return "Use your utest1 address from Zingo.";
    return "";
  }
  if (/^utest1/i.test(value)) return "That's a testnet address. Use your Zodl address.";
  if (/^t/i.test(value)) return "Use your shielded address, not the transparent one.";
  if (!isUnifiedAddress(value)) return "Use your u1 address from Zodl.";
  return "";
}

function letterForm() {
  const wrap = el("div", { class: "letter" });
  const field = el("textarea", {
    id: "note",
    rows: "4",
    autocomplete: "off",
    autocapitalize: "sentences",
    "aria-label": "Your letter to yourself, one year from now",
    placeholder: "Dear me, one year from now…",
  });
  field.value = note;
  const counter = el("span", { class: "counter", "aria-live": "polite" });
  const copy = el("button", { type: "button", class: "btn primary" }, "Copy letter");
  const toggle = el("button", { type: "button", class: "btn ghost" }, qrOpen ? "Hide QR" : "Show QR");
  const addr = el("input", {
    type: "text",
    class: "field",
    spellcheck: "false",
    autocomplete: "off",
    autocapitalize: "none",
    autocorrect: "off",
    "aria-label": "Your shielded address",
    placeholder: net === "test" ? "Your utest1… address" : "Your u1… address",
  });
  addr.value = shielded;
  const status = el("p", { class: "status bad", "aria-live": "polite" });
  const qr = el("div", { class: "qr" });
  const qrBox = el("div", { class: "qr-box", hidden: !qrOpen },
    el("p", { class: "note" }, "Optional. Scan this from your wallet's send screen to fill everything in."),
    addr, status, qr,
  );

  const update = () => {
    note = field.value;
    shielded = addr.value.trim();
    const bytes = utf8Bytes(note).length;
    const tooLong = bytes > MAX_MEMO_BYTES;
    counter.textContent = bytes ? `${bytes} / ${MAX_MEMO_BYTES}` : "";
    counter.classList.toggle("over", tooLong);
    copy.disabled = !note.trim() || tooLong;
    const problem = addressProblem(shielded);
    status.textContent = tooLong ? "Your letter is too long." : problem || "";
    let uri = null;
    if (!tooLong && problem === "" && note.trim()) {
      uri = buildUri({ address: shielded, amount: AMOUNT, memo: note, message: MESSAGE, hrp: net === "test" ? "utest" : "u" });
    }
    qr.replaceChildren(...(uri ? [qrSvg(uri)] : []));
  };
  field.addEventListener("input", update);
  addr.addEventListener("input", update);
  copy.addEventListener("click", async () => {
    const ok = await copyText(note);
    copy.textContent = ok ? "Copied" : "Copy failed";
    setTimeout(() => (copy.textContent = "Copy letter"), 1600);
  });
  toggle.addEventListener("click", () => {
    qrOpen = !qrOpen;
    qrBox.hidden = !qrOpen;
    toggle.textContent = qrOpen ? "Hide QR" : "Show QR";
    if (qrOpen) addr.focus();
  });
  wrap.append(el("div", { class: "note-wrap" }, field, counter), el("div", { class: "row" }, copy, toggle), qrBox);
  queueMicrotask(update);
  return wrap;
}

function qrSvg(text) {
  const q = qrcode(0, "L");
  q.addData(text, "Byte");
  q.make();
  const count = q.getModuleCount();
  const quiet = 4;
  const size = count + quiet * 2;
  let d = "";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (q.isDark(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    }
  }
  const svg = svgEl("svg", { viewBox: `0 0 ${size} ${size}`, role: "img", "aria-label": "Payment QR code", "shape-rendering": "crispEdges" });
  svg.append(svgEl("rect", { width: size, height: size, fill: "#fff" }), svgEl("path", { d, fill: "#000" }));
  return svg;
}

async function copyText(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = el("textarea", { readonly: true, class: "offscreen" });
    area.value = text;
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    area.remove();
    return ok;
  }
}

/* Finish: the letter itself, sealed. */

function renderFinish(animate) {
  const box = $("finish");
  const all = state.done.every(Boolean);
  box.classList.toggle("locked", !all);
  const rows = [["Sender", "hidden"], ["Receiver", "hidden"], ["Amount", "hidden"], ["Letter", "sealed"]].map(([k, v]) => {
    const b = el("b", {}, all ? v : "······");
    if (all && animate) scramble(b, v, 300);
    return el("p", { class: "prow" }, el("span", {}, k), b);
  });
  const paper = el("div", { class: "paper" },
    el("span", { class: "wax", "aria-hidden": "true" }, sealSvg(46)),
    el("p", { class: "plabel" }, all ? "Sealed" : "Your letter"),
    el("p", { class: "letter-text" }, all ? note.trim() || "Only you can read what's inside." : "Finish all six steps and your letter gets its seal here."),
    el("div", { class: "stamp" },
      el("span", {}, net === "test" ? "Zcash testnet" : "Zcash mainnet"),
      el("span", {}, (all && state.block) || height ? `block ${((all && state.block) || height).toLocaleString("en-US")}` : "shielded pool"),
      el("span", {}, all ? mmss(total()) : `${state.done.filter(Boolean).length}/6`),
    ),
  );
  const world = el("div", { class: "view theirs" }, el("p", { class: "plabel" }, "The whole world sees"), rows);

  const head = all
    ? net === "test"
      ? [el("p", { class: "eyebrow" }, "Practice complete"), el("h2", {}, "You've done it once. ", el("span", { class: "serif" }, "Now for real."))]
      : [el("p", { class: "eyebrow" }, "Sealed for a year"), el("h2", {}, "Only you can open it. ", el("span", { class: "serif" }, "Keep your phrase safe."))]
    : [el("p", { class: "eyebrow" }, "The finish"), el("h2", {}, "Your sealed letter")];

  const actions = el("div", { class: "actions" });
  if (!all) {
    actions.append(el("button", { type: "button", class: "btn primary", disabled: true }, "Finish all six steps to seal it"));
  } else if (net === "test") {
    actions.append(el("a", { href: "/mainnet", class: "btn primary", "data-nav": true }, "Now do it on mainnet"));
  } else {
    const share = el("button", { type: "button", class: "btn ghost" }, "Share image");
    share.addEventListener("click", async () => {
      if ((await shareImage()) === "saved") {
        share.textContent = "Saved";
        setTimeout(() => (share.textContent = "Share image"), 1600);
      }
    });
    const remind = el("button", { type: "button", class: "btn ghost" }, "Remind me next year");
    remind.addEventListener("click", () => {
      saveReminder();
      remind.textContent = "Saved";
      setTimeout(() => (remind.textContent = "Remind me next year"), 1600);
    });
    actions.append(externalLink("Post on X", postUrl(), "btn primary"), share, remind);
  }
  box.replaceChildren(el("div", { class: "lc-head" }, head), el("div", { class: "lc-grid" }, paper, world), actions);
  box.classList.remove("stamped");
  if (all) {
    if (animate) after(700, () => box.classList.add("stamped"));
    else box.classList.add("stamped");
  }
}

/* Icons */

function svgEl(tag, attrs) {
  const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}
function checkSvg() {
  const s = svgEl("svg", { viewBox: "0 0 24 24", width: 16, height: 16, "aria-hidden": "true" });
  s.append(svgEl("path", { d: "M5 12.5l4.5 4.5L19 7.5", fill: "none", stroke: "currentColor", "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  return s;
}
function playSvg() {
  const s = svgEl("svg", { viewBox: "0 0 24 24", width: 14, height: 14, "aria-hidden": "true" });
  s.append(svgEl("path", { d: "M8 5.5v13l11-6.5z", fill: "currentColor" }));
  return s;
}
function sealSvg(size) {
  const img = el("img", { src: "/favicon.svg", width: size, height: size, alt: "" });
  return img;
}

/* Wiring */

document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-nav]");
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  const href = a.getAttribute("href");
  if (href !== location.pathname) history.pushState(null, "", href);
  render();
  window.scrollTo({ top: 0 });
  main.focus({ preventScroll: true });
});
window.addEventListener("popstate", render);

const sheet = $("sheet");
$("cheat").addEventListener("click", () => {
  sheet.hidden = false;
  sheet.querySelector("[data-close]").focus();
});
sheet.addEventListener("click", (e) => {
  if (e.target === sheet || e.target.closest("[data-close]")) sheet.hidden = true;
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") sheet.hidden = true;
});

render();
