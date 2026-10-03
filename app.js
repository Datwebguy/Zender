import qrcode from "./vendor/qrcode.js";
import { STEPS } from "./steps.js";
import { AMOUNT, MESSAGE } from "./config.js";
import { MAX_MEMO_BYTES, utf8Bytes, buildUri, isTestnetUnified } from "./zip321.js";

const $ = (id) => document.getElementById(id);

// The note and address live only in these variables. They are never stored or sent.
let note = "";
let address = "";

function stepFromPath() {
  const m = location.pathname.match(/^\/([1-6])\/?$/);
  return m ? Number(m[1]) : null;
}

function go(n, replace = false) {
  const path = `/${n}`;
  if (location.pathname !== path) history[replace ? "replaceState" : "pushState"](null, "", path);
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
  let n = stepFromPath();
  if (!n) {
    history.replaceState(null, "", "/1");
    n = 1;
  }
  const step = STEPS[n - 1];

  document.title = `${step.title} · Zender`;
  $("count").textContent = `Step ${n} of 6`;
  $("title").textContent = step.title;
  $("sentence").textContent = step.sentence;

  [...$("ticks").children].forEach((li, i) => {
    li.className = i + 1 < n ? "done" : i + 1 === n ? "current" : "";
    if (i + 1 === n) li.setAttribute("aria-current", "step");
    else li.removeAttribute("aria-current");
  });

  const back = $("back");
  back.hidden = n === 1;
  back.href = `/${Math.max(1, n - 1)}`;

  const next = $("next");
  next.textContent = step.done ? "Done" : "Next";
  next.href = step.done ? "/1" : `/${n + 1}`;

  document.body.dataset.step = String(n);
  loadVideo(step);
  renderExtras(step);

  window.scrollTo(0, 0);
  $("main").focus({ preventScroll: true });
}

function loadVideo(step) {
  const video = $("video");
  const coming = $("coming");
  $("replay").hidden = true;
  coming.hidden = true;
  video.hidden = false;
  $("coming-text").textContent = step.sentence;
  video.src = step.video;
  video.load();
  const playing = video.play();
  if (playing) playing.catch(() => {});
}

function showComing() {
  $("video").hidden = true;
  $("replay").hidden = true;
  $("coming").hidden = false;
}

function replay() {
  const video = $("video");
  $("replay").hidden = true;
  video.currentTime = 0;
  const playing = video.play();
  if (playing) playing.catch(() => {});
}

function renderExtras(step) {
  const box = $("extras");
  box.replaceChildren();

  if (step.button) {
    box.append(externalLink(step.button.label, step.button.href, "pill secondary"));
  }
  if (step.note) box.append(el("p", { class: "hint" }, step.note));
  if (step.links) {
    const row = el("p", { class: "stores" });
    step.links.forEach((l, i) => {
      if (i) row.append(" · ");
      row.append(externalLink(l.label, l.href));
    });
    box.append(row);
  }
  if (step.form) box.append(noteForm());
  if (step.showNote && note.trim()) {
    const card = el("div", { class: "card" });
    card.append(el("p", { class: "label" }, "Your note"), el("p", { class: "echo" }, note));
    box.append(card);
  }
}

function addressProblem(value) {
  if (!value) return "Paste your testnet unified address from Zodl to make the QR.";
  if (/^u1/i.test(value)) return "That is a mainnet address. Switch Zodl to testnet and copy the address that starts with utest1.";
  if (!isTestnetUnified(value)) return "That is not a testnet unified address. Copy the address that starts with utest1 from Zodl.";
  return "";
}

function noteForm() {
  const wrap = el("div", { class: "send" });
  const addrLabel = el("label", { for: "address", class: "label" }, "Your testnet unified address");
  const addrField = el("input", {
    id: "address",
    type: "text",
    spellcheck: "false",
    autocomplete: "off",
    autocapitalize: "none",
    autocorrect: "off",
    placeholder: "utest1…",
  });
  addrField.value = address;
  const addrHint = el("p", { class: "hint" }, "In Zodl, open Receive and copy your shielded address. You send to yourself.");
  const label = el("label", { for: "note", class: "label" }, "Your note");
  const field = el("textarea", {
    id: "note",
    rows: "3",
    spellcheck: "false",
    autocomplete: "off",
    autocapitalize: "sentences",
    placeholder: "Write a note. Only you will be able to read it.",
  });
  field.value = note;
  const counter = el("p", { class: "counter", id: "counter", "aria-live": "polite" });
  const amount = el("p", { class: "hint" }, `Amount ${AMOUNT} testnet ZEC. Zodl sets the fee.`);
  const qr = el("div", { class: "qr", id: "qr" });
  const copy = el("button", { type: "button", class: "pill secondary", id: "copy" }, "Copy link");
  const status = el("p", { class: "hint", id: "copy-status", "aria-live": "polite" });
  const details = el("details", { class: "link" });
  const linkText = el("code", { id: "uri" });
  details.append(el("summary", {}, "Show link"), linkText);

  wrap.append(addrLabel, addrField, addrHint, label, field, counter, amount, qr, copy, status, details);

  const update = () => {
    note = field.value;
    address = addrField.value.trim();
    const problem = addressProblem(address);
    addrField.classList.toggle("invalid", Boolean(address) && Boolean(problem));
    const bytes = utf8Bytes(note).length;
    counter.textContent = `${bytes} / ${MAX_MEMO_BYTES}`;
    counter.classList.toggle("over", bytes > MAX_MEMO_BYTES);
    status.textContent = "";

    let uri = null;
    let message = "";
    if (problem) message = problem;
    else if (!note.trim()) message = "Type a note to make the QR.";
    else if (bytes > MAX_MEMO_BYTES) message = `Too long. Cut it to ${MAX_MEMO_BYTES} bytes.`;
    else uri = buildUri({ address, amount: AMOUNT, memo: note, message: MESSAGE });

    qr.replaceChildren(uri ? qrSvg(uri) : el("p", { class: "qr-empty" }, message));
    copy.disabled = !uri;
    copy.dataset.uri = uri || "";
    linkText.textContent = uri || "";
    details.hidden = !uri;
  };

  field.addEventListener("input", update);
  addrField.addEventListener("input", update);
  copy.addEventListener("click", async () => {
    const ok = await copyText(copy.dataset.uri);
    status.textContent = ok ? "Link copied." : "Could not copy. Open Show link and copy it by hand.";
  });
  update();
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

document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-nav]");
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  const m = a.getAttribute("href").match(/^\/([1-6])$/);
  if (!m) return;
  e.preventDefault();
  if (a.id === "next" && a.textContent === "Done") note = "";
  if (a.classList.contains("close")) note = "";
  go(Number(m[1]));
});

window.addEventListener("popstate", render);

const video = $("video");
video.addEventListener("error", showComing);
video.addEventListener("ended", () => {
  $("replay").hidden = false;
});
video.addEventListener("play", () => {
  $("replay").hidden = true;
});
video.addEventListener("click", () => {
  if (video.ended) replay();
});
$("replay").addEventListener("click", replay);

render();
