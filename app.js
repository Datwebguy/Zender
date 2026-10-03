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

function makeRef() {
  const a = new Uint8Array(3);
  crypto.getRandomValues(a);
  const h = [...a].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `ZND-${h.slice(0, 4)}-${h.slice(4)}`;
}

function fresh() {
  return { ref: makeRef(), done: Array(6).fill(false), start: Array(6).fill(null), end: Array(6).fill(null), open: 0, seen: null, sealed: false, skipped: [] };
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
  const l2 = el("span", { class: "line" }, el("mark", { id: "hl" }));
  const copy = el("div", { class: "hero-copy" },
    el("p", { class: "kicker" }, "№ 001 · A letter to future you"),
    el("h1", {}, l1, l2),
    el("p", { class: "lede" }, "Write to yourself, one year from now. Post it through Zcash's shielded pool. It sits on a public chain for anyone to see, and only your wallet can open it."),
    el("div", { class: "cta" },
      el("a", { href: "/testnet", class: "btn ink", "data-nav": true }, "Practice free", arrow()),
      el("a", { href: "/mainnet", class: "btn line", "data-nav": true }, "Send it for real"),
    ),
    el("p", { class: "hand note-hand" }, "takes about 15 minutes ↗"),
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
        el("figcaption", {}, "What your wallet shows you"),
      ),
      el("figure", {},
        el("div", { class: "env-back" },
          el("span", { class: "flap" }),
          el("span", { class: "wax" }, el("img", { src: "/favicon.svg", alt: "", width: 34, height: 34 })),
          el("dl", { class: "redact" },
            [["From", 7], ["To", 6], ["Amount", 5], ["Letter", 9]].map(([k, n]) => el("div", {}, el("dt", {}, k), el("dd", {}))),
          ),
        ),
        el("figcaption", {}, "What the rest of the world sees"),
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
        ["Postage comes back to", "you"],
        ["Network fees", "≈ 0.0003 ZEC"],
        ["Readable by", "only you"],
        ["Seen by this site", "public t-address"],
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
    el("span", { class: "post-sub" }, test ? "Free test coins. Make every mistake for nothing." : "A dollar or two of real ZEC. It all comes back to you."),
    el("span", { class: "post-foot" }, el("span", {}, count ? `${count} of 6 postmarked` : test ? "≈ 15 min" : "≈ 20 min"), el("span", { class: "go" }, count ? "Continue" : test ? "Start practice" : "Start", arrow())),
  );
}

// The envelope on the home page. Pure markup; the stamp and postmark are ours.
function envelope({ big }) {
  return el("div", { class: `envelope${big ? " big" : ""}` },
    stamp("0.0001", "ZEC", "main"),
    postmark({ top: "ZCASH · SHIELDED", mid: ["SEALED", "2026"], bottom: "ONLY YOU READ", cls: "env-pm" }),
    el("div", { class: "addr" },
      el("p", { class: "hand" }, "To: me,"),
      el("p", { class: "hand" }, "one year from now"),
      el("p", { class: "hand" }, "wherever I am"),
    ),
    el("p", { class: "from" }, "FROM: ME, TODAY"),
    el("p", { class: "via" }, "VIA SHIELDED POOL"),
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
      ["Service", "Shielded, sealed"],
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
      el("p", { class: "office", id: "chain" }, el("i", { class: "dot" }), el("span", {}, "Calling the post office…")),
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
  const over = el("button", { type: "button", class: "link" }, "Start this round over");
  over.addEventListener("click", startOver);

  const faq = el("section", { class: "desk" },
    el("h2", { class: "sec" }, "Stuck at the counter?"),
    FAQ.filter((f) => net === "test" || !f.test).map((f) => el("details", {}, el("summary", {}, f.q), el("p", {}, f.a))),
  );
  const other = el("a", { class: `post ${net === "test" ? "main" : "test"} slim`, href: r.other.href, "data-nav": true },
    stamp(net === "test" ? "0.0001" : "FREE", net === "test" ? "ZEC" : "TEST", net === "test" ? "main" : "test"),
    el("span", { class: "post-title" }, r.other.title),
    el("span", { class: "post-sub" }, r.other.text),
    el("span", { class: "post-foot" }, el("span", {}), el("span", { class: "go" }, r.other.label, arrow())),
  );

  main.replaceChildren(head, el("div", { class: `desk-wrap ${net}` }, strip, list, finish,
    el("p", { class: "center small" }, over, el("span", {}, " · progress saves in this browser")),
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
    line.lastChild.textContent = `Post office open · ${n === "test" ? "testnet" : "mainnet"} block ${h.toLocaleString("en-US")}`;
    if (state.open === 0) renderCard(0);
    renderFinish(false);
  } catch {
    if (n !== net) return;
    line.className = "office off";
    line.lastChild.textContent = "Post office unreachable, will retry";
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
  $("count").textContent = count === 6 ? "Delivered" : `${count} of 6 postmarked`;
  for (let i = 0; i < 6; i++) {
    const b = $(`blk-${i + 1}`);
    b.className = `mini${state.done[i] ? " done" : ""}${state.open === i ? " now" : ""}`;
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
  return state.skipped && state.skipped.includes(i) ? "Done · skipped the check" : `${CHECKS[i + 1].done} · checked on chain`;
}

function fillBody(body, step, i) {
  body.append(el("p", { class: "lead" }, rich(step.lead)));
  if (step.list) body.append(el("ol", { class: "how" }, step.list.map((t) => el("li", {}, rich(t)))));
  if (step.note) body.append(el("p", { class: "note" }, rich(step.note)));
  if (step.links) body.append(el("div", { class: "row" }, step.links.map((l) => externalLink(l.label, l.href, "btn line small"))));
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
      "aria-label": `Your transparent address, starts with ${prefix}`,
      placeholder: `${prefix}…`,
    });
    input.value = address;
    const err = el("p", { class: "status bad", "aria-live": "polite" });
    const go = el("button", { type: "button", class: "btn ink" }, address ? "Watch this address" : "Start watching");
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

/* Finish: the letter folds into its envelope and gets a wax seal. */

function renderFinish(animate) {
  const box = $("finish");
  const all = state.done.every(Boolean);
  box.classList.toggle("locked", !all);
  const opens = new Date();
  opens.setFullYear(opens.getFullYear() + 1);
  const opensText = opens.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const block = (all && state.block) || height;

  const letter = el("div", { class: "sheet-paper" },
    el("p", { class: "hand big" }, all ? "Dear me," : "Dear me,"),
    el("p", { class: "hand" }, all ? note.trim() || "(your letter, safe in your wallet)" : "…finish all six steps and this letter gets sealed."),
  );
  const env = el("div", { class: "env-back" },
    el("span", { class: "flap" }),
    el("span", { class: "wax" }, el("img", { src: "/favicon.svg", alt: "", width: 34, height: 34 })),
    el("dl", { class: "redact" }, [["From", 7], ["To", 6], ["Amount", 5], ["Letter", 9]].map(([k, n]) => el("div", {}, el("dt", {}, k), el("dd", {})))),
    postmark({ top: net === "test" ? "ZCASH TESTNET" : "ZCASH MAINNET", mid: [block ? `#${block}` : "SEALED", all ? mmss(total()) : `${state.done.filter(Boolean).length}/6`], bottom: all ? `OPENS ${opens.getFullYear()}` : "AWAITING POSTAGE", cls: "fin-pm" }),
  );

  const head = all
    ? net === "test"
      ? [el("p", { class: "kicker" }, "Practice delivered"), el("h2", {}, "You've done it once."), el("p", { class: "lede" }, "That was free test ZEC. Now post the real one.")]
      : [el("p", { class: "kicker" }, "Sealed for a year"), el("h2", {}, `Opens ${opensText}.`), el("p", { class: "lede" }, "Only you can open it. Keep your recovery phrase and it stays yours.")]
    : [el("p", { class: "kicker" }, "The last stop"), el("h2", {}, "Your sealed letter"), el("p", { class: "lede" }, "Postmark all six steps and your letter goes into its envelope.")];

  const actions = el("div", { class: "actions" });
  if (!all) {
    actions.append(el("button", { type: "button", class: "btn ink", disabled: true }, `${state.done.filter(Boolean).length} of 6 · keep going`));
  } else if (net === "test") {
    actions.append(el("a", { href: "/mainnet", class: "btn ink", "data-nav": true }, "Now send it for real", arrow()));
  } else {
    const share = el("button", { type: "button", class: "btn line" }, "Share image");
    share.addEventListener("click", async () => {
      if ((await shareImage()) === "saved") {
        share.textContent = "Saved";
        setTimeout(() => (share.textContent = "Share image"), 1600);
      }
    });
    const remind = el("button", { type: "button", class: "btn line" }, "Remind me next year");
    remind.addEventListener("click", () => {
      saveReminder();
      remind.textContent = "Saved";
      setTimeout(() => (remind.textContent = "Remind me next year"), 1600);
    });
    actions.append(externalLink("Post on X", postUrl(), "btn ink"), share, remind);
  }
  box.replaceChildren(el("div", { class: "fin-head" }, head), el("div", { class: "fin-stage" }, letter, env), actions);
  box.classList.remove("sealed-now");
  if (all) {
    if (animate) after(500, () => box.classList.add("sealed-now"));
    else box.classList.add("sealed-now");
  }
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
