import qrcode from "./vendor/qrcode.js";
import { ROUNDS, FAQ } from "./steps.js";
import { CHECKS, check, tip, isPublicAddress, zec } from "./verify.js";
import { AMOUNT, MESSAGE, FAUCET_URL } from "./config.js";
import { MAX_MEMO_BYTES, utf8Bytes, buildUri, isUnifiedAddress } from "./zip321.js";
import { postUrl, postText, drawCard, shareImage, saveReminder } from "./share.js";
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

function makeRef() {
  const a = new Uint8Array(3);
  crypto.getRandomValues(a);
  const h = [...a].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `ZND-${h.slice(0, 4)}-${h.slice(4)}`;
}

function fresh() {
  return { ref: makeRef(), done: Array(6).fill(false), start: Array(6).fill(null), end: Array(6).fill(null), open: 0, seen: null, sealed: false, skipped: [] };
}
// Testnet steps were reordered for the shielded-only faucet, so its saved progress starts fresh.
function storeKey(n) {
  return n === "test" ? "zender:test:v2" : `zender:${n}`;
}

function load(n) {
  try {
    const s = JSON.parse(localStorage.getItem(storeKey(n)));
    if (s && Array.isArray(s.done) && s.done.length === 6) return { ...fresh(), ...s };
  } catch {}
  return fresh();
}
function save() {
  try {
    localStorage.setItem(storeKey(net), JSON.stringify(state));
  } catch {}
}
// Testnet's address key moves with its progress key, so an old address never comes back pre-filled.
function addrKey(n) {
  return n === "test" ? "zender:addr:test:v2" : `zender:addr:${n}`;
}
function loadAddress(n) {
  try {
    return localStorage.getItem(addrKey(n)) || "";
  } catch {
    return "";
  }
}
function saveAddress() {
  try {
    localStorage.setItem(addrKey(net), address);
  } catch {}
}

let net = null; // "test" | "main" | null on the home page
let state = fresh();
let address = "";
// Drafts live in memory only, one per round.
const drafts = { test: { note: "", shielded: "" }, main: { note: "", shielded: "" } };
let note = "";
let shielded = "";
let gen = 0; // bumps on every render, so late async answers can tell they're stale
let qrOpen = false;
let height = null;
let pollTimer = null;
let tickTimer = null;
let lastCheck = {}; // step index → { text, bad, at }

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
  clearTimeout(faucetTimer);
  clearInterval(tickTimer);
  gen += 1;
  lastCheck = {};
  if (net) Object.assign(drafts[net], { note, shielded });
  net = route();
  if (net) ({ note, shielded } = drafts[net]);
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
  const l2 = el("span", { class: "line" }, el("mark", { id: "hl" }));
  const copy = el("div", { class: "hero-copy" },
    el("p", { class: "kicker" }, "№ 001 · A letter to future you"),
    el("h1", {}, l1, l2),
    el("p", { class: "lede" }, "Write to yourself, one year from now. It lives on a public blockchain, and only your wallet can open it."),
    el("div", { class: "cta" },
      el("a", { href: "/testnet", class: "btn ink", "data-nav": true }, "Practice free", arrow()),
      el("a", { href: "/mainnet", class: "btn line", "data-nav": true }, "Send it for real"),
    ),
    el("p", { class: "hand note-hand" }, "about 15 minutes ↗"),
  );
  const hero = el("section", { class: "hero" }, el("div", { class: "hero-env" }, envelope({ big: true })), copy);

  const posts = el("section", { class: "posts" },
    el("h2", { class: "sec" }, "Choose your post"),
    el("div", { class: "posts-grid" }, postCard("test"), postCard("main")),
  );

  const views = el("section", { class: "views" },
    el("h2", { class: "sec" }, "Same letter. Two views."),
    el("div", { class: "views-grid" },
      el("figure", {},
        el("div", { class: "sheet-paper" }, el("p", { class: "hand big" }, "Dear me,"), el("p", { class: "hand" }, "one year from now. Did you keep going? I hope you did. Be kind to yourself."), el("p", { class: "hand sign" }, "– me, today")),
        el("figcaption", {}, "You see"),
      ),
      el("figure", {},
        el("div", { class: "env-back" },
          el("span", { class: "flap" }),
          el("span", { class: "wax" }, el("img", { src: "/favicon.svg", alt: "", width: 34, height: 34 })),
          el("dl", { class: "redact" },
            [["From", 7], ["To", 6], ["Amount", 5], ["Letter", 9]].map(([k, n]) => el("div", {}, el("dt", {}, k), el("dd", {}))),
          ),
        ),
        el("figcaption", {}, "Everyone else sees"),
      ),
    ),
  );

  const receipt = el("section", { class: "receipt-wrap" },
    el("div", { class: "receipt" },
      el("p", { class: "r-head" }, "ZENDER POST OFFICE"),
      el("p", { class: "r-sub" }, "receipt · keep for your records"),
      receiptRows([
        ["1 × Letter to future you", "sealed"],
        ["Postage", "0.0001 ZEC"],
        ["Returned to", "you"],
        ["Fees", "≈ 0.0003 ZEC"],
        ["Readable by", "only you"],
      ]),
      el("p", { class: "r-total" }, el("span", {}, "TOTAL"), el("span", {}, "a few cents")),
      el("p", { class: "r-foot" }, "thank you for writing ✉"),
    ),
  );

  main.replaceChildren(hero, posts, views, receipt);
  typeText(l1, "The blockchain is public.", { delay: 200, speed: 34 });
  typeText($("hl"), "Your letter isn't.", { delay: 1150, speed: 44 });
  after(2000, () => hero.classList.add("posted"));
}

function receiptRows(rows) {
  return el("dl", { class: "r-rows" }, rows.map(([k, v]) => el("div", {}, el("dt", {}, k), el("dd", {}, v))));
}

function postCard(n) {
  const r = ROUNDS[n];
  const count = load(n).done.filter(Boolean).length;
  const test = n === "test";
  return el("a", { href: r.path, class: `post ${n}`, "data-nav": true },
    stamp(test ? "FREE" : "0.0001", test ? "TEST" : "ZEC", n),
    el("span", { class: "post-kicker" }, test ? "Testnet · Zingo" : "Mainnet · Zodl"),
    el("span", { class: "post-title" }, test ? "Practice post" : "Real post"),
    el("span", { class: "post-sub" }, test ? "Free coins. Mistakes cost nothing." : "A dollar or two. It comes back to you."),
    el("span", { class: "post-foot" }, el("span", {}, count ? `${count} of 6 postmarked` : test ? "≈ 15 min" : "≈ 20 min"), el("span", { class: "go" }, count ? "Continue" : test ? "Start practice" : "Start", arrow())),
  );
}

// The envelope on the home page. Pure markup; the stamp and postmark are ours.
function envelope({ big }) {
  return el("div", { class: `envelope${big ? " big" : ""}` },
    stamp("0.0001", "ZEC", "main"),
    postmark({ top: "ZCASH · PRIVATE", mid: ["SEALED", "2026"], bottom: "ONLY YOU READ", cls: "env-pm" }),
    el("div", { class: "addr" },
      el("p", { class: "hand" }, "To: me,"),
      el("p", { class: "hand" }, "one year from now"),
      el("p", { class: "hand" }, "wherever I am"),
    ),
    el("p", { class: "from" }, "FROM: ME, TODAY"),
    el("p", { class: "via" }, "PRIVATE MAIL"),
  );
}

/* A round */

function renderRound() {
  const r = ROUNDS[net];
  const unit = net === "test" ? "TAZ" : "ZEC";
  document.title = `${net === "test" ? "Practice post" : "Real post"} · Zender`;

  const ticket = el("aside", { class: "ticket", "aria-label": "Tracking slip" },
    el("p", { class: "t-head" }, el("span", {}, "TRACKING"), el("b", {}, state.ref)),
    receiptRows([
      ["Service", "Private, sealed"],
      ["Network", net === "test" ? "Testnet" : "Mainnet"],
      ["Wallet", net === "test" ? "Zingo" : "Zodl"],
      ["Postage", `0.0001 ${unit}`],
    ]),
    el("p", { class: "t-status" }, el("span", { id: "count" }), el("span", { id: "total" })),
    el("div", { class: "barcode", "aria-hidden": "true" }),
  );
  const head = el("section", { class: "slip" },
    el("div", { class: "slip-copy" },
      el("p", { class: "kicker" }, r.tag),
      el("h1", {}, r.title),
      el("p", { class: "lede" }, r.sub),
      el("p", { class: "office", id: "chain" }, el("i", { class: "dot" }), el("span", {}, "Connecting…")),
    ),
    ticket,
  );

  // A strip of six stamps. Each one gets postmarked when its step is done.
  const strip = el("nav", { class: "strip", "aria-label": "Your progress" },
    el("ol", {}, r.steps.map((s, i) => {
      const b = el("button", { type: "button", class: "mini", id: `blk-${i + 1}`, "aria-label": `Step ${i + 1}: ${s.title}` }, el("span", {}, String(i + 1)));
      b.addEventListener("click", () => openCard(i, true));
      return el("li", {}, b);
    })),
  );

  const list = el("ol", { class: "ledger", id: "cards" });
  r.steps.forEach((_, i) => list.append(el("li", { class: "entry", id: `step-${i + 1}` })));

  const finish = el("section", { class: "finale", id: "finish" });
  // Two taps to start over, no browser pop-up.
  const over = el("button", { type: "button", class: "link" }, "Start over");
  let armed = null;
  over.addEventListener("click", () => {
    if (armed) return startOver();
    over.textContent = "Tap again to clear this round";
    over.classList.add("armed");
    armed = setTimeout(() => {
      armed = null;
      over.textContent = "Start over";
      over.classList.remove("armed");
    }, 4000);
  });

  const faq = el("section", { class: "desk" },
    el("h2", { class: "sec" }, "Lost in the post?"),
    FAQ.filter((f) => (net === "test" ? !f.main : !f.test)).map((f) => el("details", {}, el("summary", {}, f.q), el("p", {}, f.a))),
  );
  const other = el("a", { class: `post ${net === "test" ? "main" : "test"} slim`, href: r.other.href, "data-nav": true },
    stamp(net === "test" ? "0.0001" : "FREE", net === "test" ? "ZEC" : "TEST", net === "test" ? "main" : "test"),
    el("span", { class: "post-title" }, r.other.title),
    el("span", { class: "post-sub" }, r.other.text),
    el("span", { class: "post-foot" }, el("span", {}), el("span", { class: "go" }, r.other.label, arrow())),
  );

  main.replaceChildren(head, el("div", { class: `desk-wrap ${net}` }, strip, list, finish,
    el("p", { class: "center small" }, over),
    el("div", { class: "tail" }, faq, other)));

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
    line.className = "office on";
    line.lastChild.textContent = `${n === "test" ? "Testnet" : "Mainnet"} live`;
    if (state.sealed && state.done.every(Boolean) && !state.block) {
      state.block = h;
      save();
    }
    renderFinish(false);
  } catch {
    if (n !== net) return;
    line.className = "office off";
    line.lastChild.textContent = "Offline, retrying";
  }
}

function startOver() {
  try {
    localStorage.removeItem(storeKey(net));
    localStorage.removeItem(addrKey(net));
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
  document.querySelectorAll(".ago[data-at]").forEach((n) => {
    if (n.dataset.at) n.textContent = agoText(Number(n.dataset.at));
  });
  for (let i = 0; i < 6; i++) {
    const t = document.querySelector(`#step-${i + 1} .timer`);
    if (t) t.textContent = elapsed(i) == null ? "--:--" : mmss(elapsed(i));
  }
  const t = $("total");
  if (t) t.textContent = total() ? mmss(total()) : "00:00";
}

function renderProgress() {
  const count = state.done.filter(Boolean).length;
  $("count").textContent = count === 6 ? "Delivered" : `${count} of 6 done`;
  for (let i = 0; i < 6; i++) {
    const b = $(`blk-${i + 1}`);
    b.className = `mini${state.done[i] ? " done" : ""}${state.open === i ? " now" : ""}`;
    b.setAttribute("aria-label", `Step ${i + 1}: ${ROUNDS[net].steps[i].title}${state.done[i] ? ", done" : ""}`);
    if (state.open === i) b.setAttribute("aria-current", "step");
    else b.removeAttribute("aria-current");
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
    state.sealedAt = state.sealedAt || now;
    state.block = state.block || height;
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
  card.className = `entry${done ? " done" : ""}${open ? " open" : ""}`;
  const head = el("button", { type: "button", class: "entry-head", "aria-expanded": String(open), "aria-controls": `body-${i + 1}` },
    done
      ? el("span", { class: "no pm-no" }, postmark({ top: net === "test" ? "TESTNET" : "MAINNET", mid: ["DONE"], bottom: `STEP ${i + 1}`, cls: "entry-pm", waves: false }))
      : el("span", { class: "no" }, String(i + 1).padStart(2, "0")),
    el("span", { class: "entry-title" }, el("b", {}, step.title), el("small", {}, done ? doneLabel(i) : step.sub)),
    el("span", { class: "timer", role: "timer", "aria-label": "Time on this step" }, elapsed(i) == null ? "--:--" : mmss(elapsed(i))),
  );
  head.addEventListener("click", () => (open ? closeCard() : openCard(i, false)));
  const kids = [head];
  const body = el("div", { class: "card", id: `body-${i + 1}`, hidden: !open });
  if (open) fillBody(body, step, i);
  kids.push(body);
  card.replaceChildren(...kids);
  if (i === 5 && $("blk-1")) renderProgress();
}

function doneLabel(i) {
  if (ROUNDS[net].steps[i].kind !== "verify") return "Done";
  return state.skipped && state.skipped.includes(i) ? "Done" : `${CHECKS[ROUNDS[net].steps[i].check].done} ✓`;
}

function fillBody(body, step, i) {
  body.append(el("p", { class: "lead" }, rich(step.lead)));
  if (step.list) body.append(el("ol", { class: "how" }, step.list.map((t) => el("li", {}, rich(t)))));
  if (step.note) body.append(el("p", { class: "note" }, rich(step.note)));
  if (step.links) body.append(el("div", { class: "row" }, step.links.map((l) => externalLink(l.label, l.href, "btn line small"))));
  if (step.more) body.append(el("p", { class: "note" }, step.more));
  if (step.tips) {
    body.append(el("div", { class: "tips" }, step.tips.map((t) =>
      el("div", { class: "tip" }, el("b", {}, t.title), el("p", {}, rich(t.text))),
    )));
  }
  if (step.shots) {
    body.append(el("div", { class: "shots" }, step.shots.map((p) =>
      el("figure", {}, el("img", { src: p.src, alt: p.cap, loading: "lazy", width: 360, height: 800 }), el("figcaption", {}, p.cap)))));
  }
  if (step.video) body.append(clip(step.video));
  if (step.kind === "letter") body.append(letterForm());
  if (step.kind === "verify") body.append(verifyBlock(step, i));
  if (step.kind === "faucet") body.append(faucetBlock(i));
  if (step.kind === "confirm" || step.kind === "letter" || step.kind === "faucet") {
    const b = el("button", { type: "button", class: "btn ink" }, state.done[i] ? "Done" : step.confirm);
    b.disabled = state.done[i];
    b.addEventListener("click", () => complete(i));
    body.append(el("div", { class: "row" }, b));
  }
}

function clip(src) {
  const wrap = el("div", { class: "clip" });
  const btn = el("button", { type: "button", class: "btn line small" }, playSvg(), " Watch how");
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
      "aria-label": `Your public address, starts with ${prefix}`,
      placeholder: `${prefix}…`,
    });
    input.value = address;
    const err = el("p", { class: "status bad", "aria-live": "polite" });
    const go = el("button", { type: "button", class: "btn ink" }, "Watch this address");
    const use = () => {
      const v = input.value.trim();
      if (!isPublicAddress(v, net)) {
        err.textContent = v ? `That's not it. Copy the address that starts with ${prefix} in ${wallet}.` : "";
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
        el("label", { class: "field-label" }, "Your public address (", el("code", {}, `${prefix}…`), ")"),
        input, err, el("div", { class: "row" }, go),
      );
    }
  }

  const s = lastCheck[i];
  const box = el("div", { class: `watch${done ? " ok" : ""}${s && s.bad ? " bad" : ""}`, "aria-live": "polite" });
  if (done) {
    box.append(el("b", {}, `${CHECKS[step.check].done} ✓`));
  } else if (address) {
    const now = el("button", { type: "button", class: "btn line small" }, "Check now");
    now.addEventListener("click", async () => {
      now.disabled = true;
      now.textContent = "Checking…";
      await runCheck(i);
    });
    const change = el("button", { type: "button", class: "link" }, "Change address");
    change.addEventListener("click", () => {
      address = "";
      saveAddress();
      delete lastCheck[i];
      clearTimeout(pollTimer);
      renderCard(i);
    });
    box.append(
      el("b", {}, el("i", { class: "dot pulse" }), step.watching),
      el("p", {}, s ? s.text : step.watchingSub),
      el("p", { class: "watch-addr" }, `${address.slice(0, 6)}…${address.slice(-4)} · `, el("span", { class: "ago", "data-at": s ? String(s.at) : "" }, s ? agoText(s.at) : "checking…")),
      el("div", { class: "watch-row" }, now, change),
    );
  } else {
    box.append(el("b", {}, "Paste your address above"), el("p", {}, "Then we watch it for you."));
  }
  wrap.append(box);

  if (step.skip && !done) {
    const skip = el("button", { type: "button", class: "link" }, step.skip.label);
    skip.addEventListener("click", () => {
      // Swap lands shielded, so there is nothing public to see for steps 2 and 3.
      state.skipped = state.done[2] ? [1] : [1, 2];
      if (!state.done[2]) state.seen = null;
      state.done[1] = true;
      state.end[1] = state.end[1] || Date.now();
      state.start[2] = state.start[2] || Date.now();
      complete(2);
    });
    wrap.append(el("p", { class: "center" }, skip));
  }
  wrap.append(el("p", { class: "fine" }, "We only read this public address. Never your letter or keys."));
  return wrap;
}

// The transaction count each check compares against, for this exact address.
function baseline(kind, addr) {
  const mark = kind === "shield" ? state.arrived : state.seen;
  return mark && typeof mark === "object" && mark.addr === addr ? mark.tx : undefined;
}

async function runCheck(i) {
  clearTimeout(pollTimer);
  if (!address || state.done[i]) return;
  const g = gen, addr = address, n = net;
  try {
    const s = await check(addr, n);
    if (g !== gen || addr !== address || state.done[i]) return;
    const kind = ROUNDS[n].steps[i].check;
    if (CHECKS[kind].ok(s, baseline(kind, addr))) {
      if (kind === "arrive") state.arrived = { addr, tx: s.txCount };
      if (kind === "shield") state.seen = { addr, tx: s.txCount };
      delete lastCheck[i];
      complete(i);
      return;
    }
    lastCheck[i] = { text: notYet(i, s, n), at: Date.now() };
  } catch (e) {
    if (g !== gen) return;
    lastCheck[i] = { text: e.message || "Couldn't check just now. Trying again.", bad: true, at: Date.now() };
  }
  if (state.open === i) refreshWatch(i);
  schedulePoll(POLL_MS);
}

// Update the waiting box in place while someone is typing, so their text and keyboard stay put.
function refreshWatch(i) {
  const card = $(`step-${i + 1}`);
  const active = document.activeElement;
  if (card && active && card.contains(active) && /^(INPUT|TEXTAREA)$/.test(active.tagName)) {
    const s = lastCheck[i];
    const box = card.querySelector(".watch");
    const p = box && box.querySelector("p");
    if (s && p) p.textContent = s.text;
    const ago = box && box.querySelector(".ago");
    if (s && ago) ago.dataset.at = String(s.at);
    return;
  }
  renderCard(i);
}

// Plain words for what the chain shows so far, per step.
function notYet(i, s, n) {
  const unit = n === "test" ? "TAZ" : "ZEC";
  const wallet = n === "test" ? "Zingo" : "Zodl";
  const amount = `${zec(s.balanceZat)} ${unit}`;
  const kind = ROUNDS[n].steps[i].check;
  if (kind === "arrive") {
    return n === "test" ? "Nothing yet. Send it from Zingo, then give it a minute." : "Nothing yet. Withdrawals can take a few minutes.";
  }
  if (kind === "shield") {
    return s.balanceZat > 0 ? `${amount} still public. Tap Shield in ${wallet}.` : "Almost there. Waiting for your shield.";
  }
  return `Nothing new yet. Send a little to this address in ${wallet}.`;
}

function agoText(at) {
  const sec = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (sec < 5) return "checked just now";
  if (sec < 60) return `checked ${sec}s ago`;
  return `checked ${Math.floor(sec / 60)}m ago`;
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

/* Our faucet button. Test ZEC comes from fauzec.com through Zender's /api/faucet. */

let faucetTimer = null;
let faucetAddr = ""; // memory only
let faucetInfo = null; // fetched once per visit
const FAUCET_MAX_POLLS = 120; // about 10 minutes

function faucetBlock(i) {
  const wrap = el("div", { class: "faucet" });
  const claim = state.faucet || null;
  const done = state.done[i];
  const ready = el("p", { class: "fine" });
  const showInfo = (f) => {
    ready.textContent = f && f.ready ? `Faucet ready · ${Math.floor((f.availableZat || 0) / 1e8).toLocaleString("en-US")} test ZEC left` : f ? "The faucet is busy. Try again soon." : "";
  };
  if (faucetInfo) showInfo(faucetInfo);
  else fetch("/api/faucet").then((r) => r.json()).then((f) => showInfo((faucetInfo = f))).catch(() => {});

  if (!claim || claim.error) {
    const input = el("input", {
      type: "text",
      class: "field",
      spellcheck: "false",
      autocomplete: "off",
      autocapitalize: "none",
      autocorrect: "off",
      "aria-label": "Your private testnet address, starts with utest1",
      placeholder: "utest1…",
    });
    input.value = faucetAddr;
    const err = el("p", { class: "status bad", "aria-live": "polite" }, (claim && claim.error) || "");
    const go = el("button", { type: "button", class: "btn ink" }, "Send me test ZEC");
    let busy = false;
    const send = async () => {
      if (busy) return;
      const addr = input.value.trim();
      if (!/^(utest1|ztestsapling1)/i.test(addr)) {
        err.textContent = /^tm/i.test(addr)
          ? "That's your public address. Use the one that starts with utest1."
          : /^u1/i.test(addr)
            ? "That's a mainnet address. Switch Zingo to testnet first."
            : "Paste the address that starts with utest1.";
        return;
      }
      busy = true;
      faucetAddr = addr;
      go.disabled = true;
      go.textContent = "Sending…";
      err.textContent = "";
      const g = gen, s = state;
      let next;
      try {
        const r = await fetch("/api/faucet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: addr }) });
        const d = await r.json().catch(() => ({}));
        next = d.id && !d.error ? { id: d.id, state: d.state, txid: d.txid, polls: 0 } : { error: d.error || "The faucet couldn't send right now." };
      } catch {
        next = { error: "Couldn't reach the faucet. Try again in a moment." };
      }
      // Never let a later error replace a claim that's already on its way.
      if (!(s.faucet && s.faucet.id && next.error)) s.faucet = next;
      try {
        localStorage.setItem(storeKey("test"), JSON.stringify(s));
      } catch {}
      busy = false;
      if (g !== gen) return;
      renderCard(i);
      pollFaucet(i);
    };
    go.addEventListener("click", send);
    input.addEventListener("keydown", (e) => e.key === "Enter" && send());
    wrap.append(el("label", { class: "field-label" }, "Your private address (", el("code", {}, "utest1…"), ")"), input, err, el("div", { class: "row" }, go));
  } else {
    const words = {
      pending: ["Sending…", "Give it a moment."],
      broadcasting: ["On its way", "Lands in about a minute."],
      confirmed: ["Sent ✓", "Pull down in Zingo to see it."],
    }[claim.state] || ["Sending…", ""];
    const box = el("div", { class: `watch${claim.state === "confirmed" ? " ok" : ""}`, "aria-live": "polite" },
      el("b", {}, claim.state === "confirmed" ? "" : el("i", { class: "dot pulse" }), words[0]),
      el("p", {}, words[1]),
    );
    if (claim.txid && /^[0-9a-f]{64}$/.test(claim.txid)) {
      box.append(el("p", { class: "watch-addr" }, externalLink("View transaction", `https://zexplorer.app/testnet/tx/${claim.txid}`, "")));
    }
    wrap.append(box);
    if (!done) {
      const again = el("button", { type: "button", class: "link" }, "Use a different address");
      again.addEventListener("click", () => {
        state.faucet = null;
        save();
        clearTimeout(faucetTimer);
        renderCard(i);
      });
      wrap.append(el("p", {}, again));
    }
  }
  wrap.append(ready);
  if (!done) wrap.append(el("p", { class: "fine" }, "Button not working? ", externalLink("Use the faucet site", FAUCET_URL, ""), "."));
  if (claim && claim.id && !claim.error && claim.state !== "confirmed") pollFaucet(i);
  return wrap;
}

function pollFaucet(i) {
  clearTimeout(faucetTimer);
  const claim = state.faucet;
  if (net !== "test" || state.open !== i || state.done[i] || !claim || !claim.id || claim.state === "confirmed") return;
  const g = gen;
  faucetTimer = setTimeout(async () => {
    if (g !== gen) return;
    if (document.hidden) return pollFaucet(i);
    let d = null;
    try {
      const r = await fetch(`/api/faucet?id=${encodeURIComponent(claim.id)}`);
      d = await r.json().catch(() => ({}));
      if (r.status === 404) d = { state: "failed", error: "The faucet lost that request. Try again." };
    } catch {}
    if (g !== gen || !state.faucet || state.faucet.id !== claim.id) return;
    const polls = (state.faucet.polls || 0) + 1;
    if (d && d.state === "failed") state.faucet = { error: d.error || "The faucet couldn't send it. Try again." };
    else if (polls > FAUCET_MAX_POLLS) state.faucet = { error: "That took too long. Check Zingo, or try again." };
    else state.faucet = { ...state.faucet, polls, state: (d && d.state) || state.faucet.state, txid: (d && d.txid) || state.faucet.txid };
    save();
    if (state.open === i) renderCard(i);
    pollFaucet(i);
  }, 5000);
}

/* The letter */

function addressProblem(value) {
  if (!value) return null;
  if (net === "test") {
    if (/^u1/i.test(value)) return "That's a mainnet address. Use your Zingo testnet address.";
    if (/^t/i.test(value)) return "Use your private address (utest1…).";
    if (!isUnifiedAddress(value, "utest")) return "Use your utest1 address from Zingo.";
    return "";
  }
  if (/^utest1/i.test(value)) return "That's a testnet address. Use your Zodl address.";
  if (/^t/i.test(value)) return "Use your private address (u1…).";
  if (!isUnifiedAddress(value)) return "Use your u1 address from Zodl.";
  return "";
}

function letterForm() {
  const wrap = el("div", { class: "letter" });
  const field = el("textarea", {
    id: "note",
    rows: "4",
    spellcheck: "false",
    autocorrect: "off",
    autocomplete: "off",
    autocapitalize: "sentences",
    "aria-label": "Your letter to yourself, one year from now",
    placeholder: "Dear me, one year from now…",
  });
  field.value = note;
  const counter = el("span", { class: "counter", "aria-live": "polite" });
  const copy = el("button", { type: "button", class: "btn ink" }, "Copy letter");
  const toggle = el("button", { type: "button", class: "btn line" }, qrOpen ? "Hide QR" : "Show QR");
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
    el("p", { class: "note" }, "Optional: scan from your wallet's send screen."),
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

/* Finish: the letter folds into its envelope and gets a wax seal. */

function renderFinish(animate) {
  const box = $("finish");
  const all = state.done.every(Boolean);
  box.classList.toggle("locked", !all);
  const opens = new Date(state.sealedAt || Date.now());
  opens.setFullYear(opens.getFullYear() + 1);
  const opensText = opens.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const block = (all && state.block) || height;

  // Only add "Dear me," when the letter doesn't already open with a greeting.
  const greets = all && /^\s*(dear|hi|hey|hello)\b/i.test(note);
  const letter = el("div", { class: "sheet-paper" },
    greets ? null : el("p", { class: "hand big" }, "Dear me,"),
    el("p", { class: "hand" }, all ? note.trim() || "(safe in your wallet)" : "…"),
  );
  const env = el("div", { class: "env-back" },
    el("span", { class: "flap" }),
    el("span", { class: "wax" }, el("img", { src: "/favicon.svg", alt: "", width: 34, height: 34 })),
    el("dl", { class: "redact" }, [["From", 7], ["To", 6], ["Amount", 5], ["Letter", 9]].map(([k, n]) => el("div", {}, el("dt", {}, k), el("dd", {})))),
    postmark({ top: net === "test" ? "ZCASH TESTNET" : "ZCASH MAINNET", mid: [block ? `#${block}` : "SEALED", all ? mmss(total()) : `${state.done.filter(Boolean).length}/6`], bottom: all ? `OPENS ${opens.getFullYear()}` : "AWAITING POSTAGE", cls: "fin-pm" }),
  );

  const head = all
    ? net === "test"
      ? [el("p", { class: "kicker" }, "Practice delivered"), el("h2", {}, "You've done it once."), el("p", { class: "lede" }, "Now send the real one.")]
      : [el("p", { class: "kicker" }, "Sealed for a year"), el("h2", {}, `Opens ${opensText}.`), el("p", { class: "lede" }, "Only you can open it. Keep your recovery phrase safe.")]
    : [el("p", { class: "kicker" }, "The last stop"), el("h2", {}, "Your sealed letter"), el("p", { class: "lede" }, "Finish the six steps to seal it.")];

  const actions = el("div", { class: "actions" });
  let shareBox = null;
  if (!all) {
    actions.append(el("button", { type: "button", class: "btn ink", disabled: true }, `${state.done.filter(Boolean).length} of 6 · keep going`));
  } else {
    if (net === "test") actions.append(el("a", { href: "/mainnet", class: "btn ink", "data-nav": true }, "Now send it for real", arrow()));
    else {
      const remind = el("button", { type: "button", class: "btn line" }, "Remind me next year");
      remind.addEventListener("click", () => {
        saveReminder();
        remind.textContent = "Saved";
        setTimeout(() => (remind.textContent = "Remind me next year"), 1600);
      });
      actions.append(remind);
    }
    // The share card never carries the block: with the time, it could point to your public address.
    shareBox = sharePanel({ net, time: mmss(total()), opens: net === "main" ? opensText : "" });
  }
  box.replaceChildren(...[el("div", { class: "fin-head" }, head), el("div", { class: "fin-stage" }, letter, env), shareBox, actions].filter(Boolean));
  box.classList.remove("sealed-now");
  if (all) {
    if (animate) after(500, () => box.classList.add("sealed-now"));
    else box.classList.add("sealed-now");
  }
}

// Share: a postcard drawn on the phone, a post for X, and the card itself.
function sharePanel(info) {
  const preview = el("img", { class: "postcard", alt: "Your Zender postcard. Never your letter.", width: 1200, height: 630 });
  const canvas = document.createElement("canvas");
  drawCard(canvas, info).then(() => (preview.src = canvas.toDataURL("image/png"))).catch(() => preview.remove());

  const flash = (btn, text, back) => {
    btn.textContent = text;
    setTimeout(() => (btn.textContent = back), 1600);
  };
  const share = el("button", { type: "button", class: "btn line" }, "Share image");
  share.addEventListener("click", async () => {
    const r = await shareImage(info);
    if (r === "saved") flash(share, "Saved", "Share image");
  });
  const save = el("button", { type: "button", class: "btn line" }, "Download card");
  save.addEventListener("click", async () => {
    await shareImage(info, { download: true });
    flash(save, "Saved", "Download card");
  });
  const draft = el("p", { class: "draft" }, postText(info), el("br", {}), el("span", { class: "draft-link" }, "tryzender.vercel.app"));

  return el("section", { class: "share", "aria-label": "Share on X" },
    el("p", { class: "kicker" }, "Share it"),
    el("div", { class: "share-grid" },
      el("figure", { class: "postcard-wrap" }, preview),
      el("div", { class: "share-side" },
        el("p", { class: "label" }, "Your post"),
        draft,
        el("div", { class: "row" }, externalLink("Post on X", postUrl(info), "btn ink"), share, save),
        el("p", { class: "fine" }, "To add the picture: tap Share image and pick X, or download it. Your letter is never in it."),
      ),
    ),
  );
}


/* Stamps, postmarks, icons */

function svgEl(tag, attrs) {
  const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

function stamp(value, unit, n) {
  return el("span", { class: `stamp ${n}`, "aria-hidden": "true" },
    el("span", { class: "stamp-face" }, el("span", { class: "stamp-z" }, "Z"), el("span", { class: "stamp-v" }, value), el("span", { class: "stamp-u" }, unit)),
  );
}

let pmId = 0;
// A round rubber postmark with wavy cancellation lines.
function postmark({ top, mid, bottom, cls, waves = true }) {
  const id = `pm${++pmId}`;
  const svg = svgEl("svg", { viewBox: waves ? "0 0 210 120" : "0 0 120 120", class: `postmark ${cls || ""}`, "aria-hidden": "true" });
  const defs = svgEl("defs", {});
  defs.append(svgEl("path", { id: `${id}t`, d: "M 18 60 A 42 42 0 0 1 102 60" }), svgEl("path", { id: `${id}b`, d: "M 13 60 A 47 47 0 0 0 107 60" }));
  svg.append(defs, svgEl("circle", { cx: 60, cy: 60, r: 55, fill: "none", "stroke-width": 3 }), svgEl("circle", { cx: 60, cy: 60, r: 37, fill: "none", "stroke-width": 1.5 }));
  const arc = (ref, text, dy) => {
    const t = svgEl("text", { class: "pm-arc", dy });
    const tp = svgEl("textPath", { href: `#${ref}`, startOffset: "50%", "text-anchor": "middle" });
    tp.textContent = text;
    t.append(tp);
    return t;
  };
  svg.append(arc(`${id}t`, top, 0), arc(`${id}b`, bottom, 8));
  mid.forEach((line, k) => {
    const t = svgEl("text", { x: 60, y: mid.length === 1 ? 65 : 56 + k * 16, "text-anchor": "middle", class: k === 0 ? "pm-mid" : "pm-sub" });
    t.textContent = line;
    svg.append(t);
  });
  for (let k = 0; waves && k < 4; k++) {
    let d = `M 116 ${36 + k * 15}`;
    for (let x = 0; x < 6; x++) d += ` q 7.5 ${x % 2 ? 7 : -7} 15 0`;
    svg.append(svgEl("path", { d, fill: "none", "stroke-width": 2.4, "stroke-linecap": "round" }));
  }
  return svg;
}

function arrow() {
  const s = svgEl("svg", { viewBox: "0 0 24 24", width: 16, height: 16, "aria-hidden": "true" });
  s.append(svgEl("path", { d: "M5 12h13M13 6l6 6-6 6", fill: "none", stroke: "currentColor", "stroke-width": 2.2, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  return s;
}
function playSvg() {
  const s = svgEl("svg", { viewBox: "0 0 24 24", width: 14, height: 14, "aria-hidden": "true" });
  s.append(svgEl("path", { d: "M8 5.5v13l11-6.5z", fill: "currentColor" }));
  return s;
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

// Light / dark. The choice is remembered; until then we follow the phone.
function setThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", document.documentElement.dataset.theme === "dark" ? "#15130f" : "#f3ecdf");
}
$("theme").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("zender:theme", next);
  } catch {}
  setThemeColor();
  if (net && state.done.every(Boolean)) renderFinish(false);
});
if (window.matchMedia) {
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    let saved = null;
    try {
      saved = localStorage.getItem("zender:theme");
    } catch {}
    if (!saved) {
      document.documentElement.dataset.theme = e.matches ? "dark" : "light";
      setThemeColor();
    }
  });
}
setThemeColor();

const sheet = $("sheet");
$("cheat").addEventListener("click", () => {
  sheet.hidden = false;
  sheet.querySelector("[data-close]").focus();
});
function closeSheet() {
  if (sheet.hidden) return;
  sheet.hidden = true;
  $("cheat").focus();
}
sheet.addEventListener("click", (e) => {
  if (e.target === sheet || e.target.closest("[data-close]")) closeSheet();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSheet();
});

render();
