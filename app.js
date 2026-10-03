import qrcode from "./vendor/qrcode.js";
import { STEPS, TEST_STEPS } from "./steps.js";
import { CHECKS, check, isPublicAddress } from "./verify.js";
import { AMOUNT, MESSAGE } from "./config.js";
import { MAX_MEMO_BYTES, utf8Bytes, buildUri, isUnifiedAddress } from "./zip321.js";
import { postUrl, shareImage, saveReminder } from "./share.js";
import { typeText, enter, scramble, after, intro, stopAll } from "./motion.js";

const $ = (id) => document.getElementById(id);

// The note and address live only in these variables. They are never stored or sent.
let note = "";
let address = "";

// Last step shown, to slide the next one in from the right side.
let lastStep = 0;

// Step 4: whether the visitor asked for a QR to scan from a second screen.
let qrMode = false;

// What the media area shows: "video", "qr" or "link".
let view = "video";
let uri = null;

// Steps are 1 to 6; 7 is the finish screen at /done.
// Testnet practice lives under /t/, mainnet at the root.
const DONE = 7;
const ROUTE = /^(\/t)?\/([1-6]|done)\/?$/;

function net() {
  return location.pathname.startsWith("/t/") || location.pathname === "/" ? "test" : "main";
}

function steps() {
  return net() === "test" ? TEST_STEPS : STEPS;
}

function currentStep() {
  const m = location.pathname.match(ROUTE);
  if (!m) return null;
  return m[2] === "done" ? DONE : Number(m[2]);
}

function pathFor(n, network = net()) {
  const prefix = network === "test" ? "/t" : "";
  return prefix + (n === DONE ? "/done" : `/${n}`);
}

// Live chain checks, per network. Only the public transparent address is kept, in memory.
const proof = { main: { address: "", result: null }, test: { address: "", result: null } };
let pollTimer = null;
let checking = false;

function go(n) {
  if (n < 1 || n > DONE) return;
  const path = pathFor(n);
  if (location.pathname !== path) history.pushState(null, "", path);
  render();
}

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

function externalLink(label, href, className) {
  return el("a", { href, class: className, target: "_blank", rel: "noopener noreferrer" }, label);
}

function render() {
  let n = currentStep();
  if (!n) {
    n = 1;
    history.replaceState(null, "", pathFor(n));
  }
  const network = net();
  document.body.dataset.step = String(n);
  document.body.dataset.net = network;
  const close = document.querySelector(".close");
  close.hidden = n === 1;
  close.href = pathFor(1);
  $("net").textContent = network === "test" ? "Testnet" : "Mainnet";
  $("net").setAttribute("aria-label", network === "test" ? "Testnet practice. Switch to mainnet" : "Mainnet. Switch to testnet practice");
  $("foot").textContent = network === "test" ? "Testnet practice · free test ZEC · ZECATHON" : "Real ZEC · small amounts · ZECATHON";
  clearTimeout(pollTimer);
  stopAll();
  enter($("main"), n >= lastStep ? 1 : -1);
  lastStep = n;
  if (n === DONE) return renderDone();
  $("sealed").hidden = true;
  $("media").hidden = false;
  const step = steps()[n - 1];

  document.title = `${step.title} · Zender`;
  $("count").textContent = `Step ${n} of 6`;
  $("title").textContent = step.title;
  typeText($("sentence"), step.sentence, { delay: 120 });

  [...$("ticks").children].forEach((li, i) => {
    li.className = i + 1 < n ? "done" : i + 1 === n ? "current" : "";
    if (i + 1 === n) li.setAttribute("aria-current", "step");
    else li.removeAttribute("aria-current");
  });
  markVerified();

  const back = $("back");
  back.hidden = n === 1;
  back.href = pathFor(Math.max(1, n - 1));

  const next = $("next");
  next.classList.remove("quiet");
  next.textContent = step.done ? "Done" : "Next";
  next.href = pathFor(n + 1);

  uri = null;
  view = "video";
  loadVideo(step);
  renderExtras(step);
  showView();
  renderVerify(n, step);

  $("main").focus({ preventScroll: true });
}

// Adds a check mark to every step the chain has confirmed on this network.
function markVerified() {
  const result = proof[net()].result;
  [...$("ticks").children].forEach((li, i) => {
    const c = CHECKS[i + 1];
    li.classList.toggle("verified", Boolean(result && c && c.ok(result)));
  });
}

function renderVerify(n, step) {
  const chip = $("verify");
  chip.hidden = !step.verify;
  if (!step.verify) return;
  const p = proof[net()];
  const c = CHECKS[n];
  chip.classList.remove("ok", "wait");
  if (p.result && c.ok(p.result)) {
    chip.textContent = `✓ ${c.done}`;
    chip.classList.add("ok");
  } else if (checking) {
    chip.textContent = "Checking the chain…";
  } else if (p.result) {
    chip.textContent = "Not yet · checking again";
    chip.classList.add("wait");
  } else {
    chip.textContent = "Check on chain";
  }
}

async function runCheck() {
  const n = currentStep();
  const step = n && n < DONE ? steps()[n - 1] : null;
  if (!step || !step.verify) return;
  const network = net();
  const p = proof[network];
  clearTimeout(pollTimer);
  checking = true;
  renderVerify(n, step);
  try {
    p.result = await check(p.address, network);
    $("vmsg").textContent = "";
  } catch (e) {
    $("vmsg").textContent = e.message;
  }
  checking = false;
  // The visitor may have moved on while the check ran.
  if (currentStep() !== n || net() !== network) return;
  markVerified();
  renderVerify(n, step);
  if (p.result && CHECKS[n].ok(p.result)) {
    $("vsheet").hidden = true;
    const next = $("next");
    next.classList.remove("nudge");
    void next.offsetWidth;
    next.classList.add("nudge");
  } else {
    pollTimer = setTimeout(runCheck, 20000);
  }
}

function renderDone() {
  if (net() === "test") return renderPracticeDone();
  document.title = "Sealed for a year · Zender";
  $("count").textContent = "Finished";
  $("title").textContent = "Sealed for a year.";
  typeText($("sentence"), "Only you can open it. Keep your recovery phrase and it stays yours.", { delay: 120 });
  document.querySelectorAll("#sealed [data-final]").forEach((b, i) => scramble(b, b.dataset.final, 500 + i * 260));
  $("sealed").classList.remove("stamped");
  after(1500, () => $("sealed").classList.add("stamped"));
  [...$("ticks").children].forEach((li) => {
    li.className = "done";
    li.removeAttribute("aria-current");
  });

  const video = $("video");
  video.pause();
  $("media").hidden = true;
  $("sealed").hidden = false;
  $("mynote").textContent = note.trim() || "Your letter";

  const back = $("back");
  back.hidden = false;
  back.href = pathFor(6);
  const next = $("next");
  next.classList.add("quiet");
  next.textContent = "Start over";
  next.href = pathFor(1);

  const box = $("extras");
  box.replaceChildren();
  const row = el("div", { class: "row" });
  const post = externalLink("Post on X", postUrl(), "pill primary");
  const save = el("button", { type: "button", class: "pill secondary", id: "share-image" }, "Share image");
  const remind = el("button", { type: "button", class: "pill secondary", id: "remind" }, "Remind me");
  remind.addEventListener("click", () => {
    saveReminder();
    remind.textContent = "Saved";
    setTimeout(() => (remind.textContent = "Remind me"), 1600);
  });
  save.addEventListener("click", async () => {
    const result = await shareImage();
    if (result === "saved") {
      save.textContent = "Saved";
      setTimeout(() => (save.textContent = "Share image"), 1600);
    }
  });
  row.append(save, remind);
  box.append(post, row);
  $("main").focus({ preventScroll: true });
}

// The practice round on testnet: same sealed letter, then the way into the real thing.
function renderPracticeDone() {
  document.title = "Practice done · Zender";
  $("count").textContent = "Practice finished";
  $("title").textContent = "Practice done.";
  typeText($("sentence"), "That was free test ZEC. Now do it with real ZEC in Zodl.", { delay: 120 });
  document.querySelectorAll("#sealed [data-final]").forEach((b, i) => scramble(b, b.dataset.final, 500 + i * 260));
  $("sealed").classList.remove("stamped");
  after(1500, () => $("sealed").classList.add("stamped"));
  [...$("ticks").children].forEach((li) => {
    li.className = "done";
    li.removeAttribute("aria-current");
  });
  markVerified();
  $("video").pause();
  $("media").hidden = true;
  $("sealed").hidden = false;
  $("mynote").textContent = note.trim() || "Your practice letter";
  const back = $("back");
  back.hidden = false;
  back.href = pathFor(6);
  const next = $("next");
  next.classList.add("quiet");
  next.textContent = "Start over";
  next.href = pathFor(1);
  const box = $("extras");
  box.replaceChildren(el("a", { href: "/1", class: "pill primary", "data-nav": "" }, "Now do it for real"));
  $("main").focus({ preventScroll: true });
}

function loadVideo(step) {
  const video = $("video");
  video.dataset.missing = "";
  $("coming-text").textContent = step.video ? step.sentence : "";
  $("coming-tag").textContent = step.video ? "Video coming" : "Practice round";
  if (!step.video) {
    video.removeAttribute("src");
    video.dataset.missing = "1";
    return;
  }
  video.src = step.video;
  video.load();
  const playing = video.play();
  if (playing) playing.catch(() => {});
}

// Shows one thing in the media area: the video (or its placeholder), the QR, or the link text.
function showView() {
  const video = $("video");
  const missing = video.dataset.missing === "1";
  video.hidden = view !== "video" || missing;
  $("coming").hidden = view !== "video" || !missing;
  $("qr").hidden = view !== "qr";
  $("linkview").hidden = view !== "link";
  $("replay").hidden = view !== "video" || missing || !video.ended;


  if (view !== "video") video.pause();
}

function replay() {
  const video = $("video");
  video.currentTime = 0;
  const playing = video.play();
  if (playing) playing.catch(() => {});
  showView();
}

function renderExtras(step) {
  const box = $("extras");
  box.replaceChildren();

  if (step.button) {
    box.append(externalLink(step.button.label, step.button.href, "pill secondary"));
  }
  if (step.links) {
    const row = el("div", { class: "row links" });
    step.links.forEach((l) => row.append(externalLink(l.label, l.href, "pill secondary")));
    box.append(row);
  }
  if (step.more) box.append(el("p", { class: "more" }, step.more));
  if (step.form) box.append(noteForm());
}

// Only real problems get a message. An empty field just waits.
function addressProblem(value) {
  if (!value) return null;
  if (net() === "test") {
    if (/^u1/i.test(value)) return "That is a mainnet address. Use your Zingo testnet address.";
    if (/^t/i.test(value)) return "Use your shielded address, not transparent.";
    if (!isUnifiedAddress(value, "utest")) return "Use your utest1 address from Zingo.";
    return "";
  }
  if (/^utest1/i.test(value)) return "That is a testnet address. Use your Zodl address.";
  if (/^t/i.test(value)) return "Use your shielded address, not transparent.";
  if (!isUnifiedAddress(value)) return "Use your shielded address from Zodl.";
  return "";
}

function noteForm() {
  const wrap = el("div", { class: "send" });

  const noteRow = el("div", { class: "note-row" });
  const field = el("textarea", {
    id: "note",
    rows: "2",
    spellcheck: "false",
    autocomplete: "off",
    autocapitalize: "sentences",
    "aria-label": "Your letter to yourself, one year from now",
    placeholder: "Dear me, one year from now…",
  });
  field.value = note;
  const counter = el("span", { class: "counter", id: "counter", "aria-live": "polite" });
  noteRow.append(field, counter);

  const how = el("p", { class: "how" }, net() === "test"
    ? `In Zingo: Send → your own utest1 address → ${AMOUNT} → paste in Memo.`
    : `In Zodl: Send → your own u1 address → ${AMOUNT} → paste in Message.`);

  // Second screen only: the address turns the letter into a QR that Zodl's camera can scan.
  const addrField = el("input", {
    id: "address",
    type: "text",
    spellcheck: "false",
    autocomplete: "off",
    autocapitalize: "none",
    autocorrect: "off",
    "aria-label": "Your Zodl shielded address",
    placeholder: net() === "test" ? "Your shielded address (utest1…)" : "Your shielded address (u1…)",
  });
  addrField.value = address;
  addrField.hidden = !qrMode;

  const status = el("p", { class: "hint", id: "status", "aria-live": "polite" });

  const buttons = el("div", { class: "row" });
  const copy = el("button", { type: "button", class: "pill primary", id: "copy" }, "Copy letter");
  const show = el("button", { type: "button", class: "pill secondary", id: "show" }, qrMode ? "Hide QR" : "Show QR");
  buttons.append(copy, show);

  wrap.append(noteRow, how, addrField, status, buttons);

  const update = () => {
    note = field.value;
    address = addrField.value.trim();
    const bytes = utf8Bytes(note).length;
    counter.textContent = bytes ? `${bytes} / ${MAX_MEMO_BYTES}` : "";
    counter.classList.toggle("over", bytes > MAX_MEMO_BYTES);
    const tooLong = bytes > MAX_MEMO_BYTES;
    copy.disabled = !note.trim() || tooLong;

    const problem = qrMode ? addressProblem(address) : null;
    addrField.classList.toggle("invalid", Boolean(problem));

    const before = uri;
    uri = null;
    let message = "";
    if (tooLong) message = "Letter is too long.";
    else if (problem) message = problem;
    else if (qrMode && problem === "" && note.trim()) uri = buildUri({ address, amount: AMOUNT, memo: note, message: MESSAGE, hrp: net() === "test" ? "utest" : "u" });
    status.textContent = message;

    $("uri").textContent = uri || "";
    $("qr").replaceChildren(...(uri ? [qrSvg(uri)] : []));

    if (uri && !before) view = "qr";
    if (!uri) view = "video";
    showView();
  };

  field.addEventListener("input", update);
  addrField.addEventListener("input", update);
  copy.addEventListener("click", async () => {
    const ok = await copyText(note);
    copy.textContent = ok ? "Copied" : "Copy failed";
    setTimeout(() => (copy.textContent = "Copy letter"), 1600);
  });
  show.addEventListener("click", () => {
    qrMode = !qrMode;
    addrField.hidden = !qrMode;
    show.textContent = qrMode ? "Hide QR" : "Show QR";
    if (qrMode) addrField.focus();
    update();
  });
  queueMicrotask(update);
  return wrap;
}

function qrSvg(text) {
  const qr = qrcode(0, "L");
  qr.addData(text, "Byte");
  qr.make();
  const count = qr.getModuleCount();
  const quiet = 4;
  const size = count + quiet * 2;
  let d = "";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    }
  }
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Payment QR code");
  svg.setAttribute("shape-rendering", "crispEdges");
  const bg = document.createElementNS(ns, "rect");
  bg.setAttribute("width", size);
  bg.setAttribute("height", size);
  bg.setAttribute("fill", "#fff");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "#000");
  svg.append(bg, path);
  return svg;
}

async function copyText(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = el("textarea", { readonly: "", class: "offscreen" });
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

function finish() {
  note = "";
  address = "";
  qrMode = false;
  go(1);
}

// Switches between testnet practice and mainnet, keeping the step.
function switchNet() {
  const n = currentStep() || 1;
  const other = net() === "test" ? "main" : "test";
  note = "";
  address = "";
  qrMode = false;
  history.pushState(null, "", pathFor(n, other));
  render();
}

// Links inside the site move between steps without a page load.
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-nav]");
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  const href = a.getAttribute("href");
  const m = href.match(ROUTE);
  if (!m) return;
  e.preventDefault();
  if ((a.id === "next" && a.textContent === "Start over") || a.classList.contains("close")) return finish();
  if (location.pathname !== href) history.pushState(null, "", href);
  render();
});

// Tap the right side of the screen for next, the left side for back.
// Buttons, links and fields keep their own tap.
const app = document.querySelector(".app");
app.addEventListener("click", (e) => {
  if (e.defaultPrevented) return;
  if (e.target.closest("a, button, input, textarea, label, .actions, .top, .linkview, .sealed")) return;
  if (String(window.getSelection() || "")) return;
  const n = currentStep() || 1;
  const rect = app.getBoundingClientRect();
  if (e.clientX > rect.left + rect.width / 2) {
    if (n < DONE) go(n + 1);
  } else if (n > 1) {
    go(n - 1);
  }
});

window.addEventListener("popstate", render);

const video = $("video");
video.addEventListener("error", () => {
  video.dataset.missing = "1";
  showView();
});
video.addEventListener("ended", () => {
  showView();
  const next = $("next");
  next.classList.remove("nudge");
  void next.offsetWidth;
  next.classList.add("nudge");
});
video.addEventListener("play", showView);
$("replay").addEventListener("click", replay);

// Envelopes and postcards: the ideas the steps teach, in plain words, one tap away.
const sheet = $("sheet");
$("cheat").addEventListener("click", () => {
  sheet.hidden = false;
  sheet.querySelector("button").focus();
});
sheet.addEventListener("click", (e) => {
  if (e.target === sheet || e.target.closest("[data-close]")) sheet.hidden = true;
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") sheet.hidden = true;
});

// Check on chain: ask once for the public transparent address, then check and keep checking.
const vsheet = $("vsheet");
$("verify").addEventListener("click", () => {
  if (proof[net()].address) return runCheck();
  const test = net() === "test";
  $("vwhere").textContent = test ? "In Zingo, open Receive and copy your transparent address (tm…)." : "In Zodl, open Receive and copy your Zcash Transparent Address (t1…).";
  $("vaddr").placeholder = test ? "tm…" : "t1…";
  $("vaddr").value = "";
  $("vmsg").textContent = "";
  vsheet.hidden = false;
  $("vaddr").focus();
});
$("vgo").addEventListener("click", () => {
  const value = $("vaddr").value.trim();
  if (!isPublicAddress(value, net())) {
    $("vmsg").textContent = net() === "test" ? "That is not a testnet transparent address. It starts with tm." : "That is not a t1 address. Copy the transparent one from Zodl.";
    return;
  }
  proof[net()].address = value;
  runCheck();
});
vsheet.addEventListener("click", (e) => {
  if (e.target === vsheet || e.target.closest("[data-close]")) vsheet.hidden = true;
});
$("net").addEventListener("click", switchNet);

render();
intro($("intro"), render);
$("wordmark").addEventListener("click", () => intro($("intro"), render));
