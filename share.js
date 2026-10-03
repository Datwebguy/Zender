// Share card and post-to-X link. The card is drawn in the browser; nothing is uploaded.

export const SITE_URL = "https://tryzender.vercel.app";
// What gets posted. Never the letter, never an address.
export function postText({ net = "main", time = "", opens = "" } = {}) {
  if (net === "test") {
    return `I just sent my first shielded Zcash transaction: a letter to my future self, sealed on testnet${time ? ` in ${time}` : ""}. The real one is next.\n\nTry it free:`;
  }
  return `I sealed a letter to my future self on Zcash. It sits on a public blockchain, and only I can open it${opens ? `. Opens ${opens}` : ""}.\n\nWrite yours:`;
}

export function postUrl(info = {}) {
  const params = new URLSearchParams({ text: `${postText(info)} ${SITE_URL}` });
  return `https://x.com/intent/post?${params}`;
}

// Kept for older callers.
export const POST_TEXT = postText();

const CARD = "#fbf8f1", INK = "#1c1a17", GOLD = "#f4b728", BLUE = "#9fb8e6", PM = "rgba(45,79,147,0.85)", HAND = "#1f2d57", MUTED = "#776f62";

// 1200x630 postcard. info: { net, block, time, opens }. Never the letter or an address.
export async function drawCard(canvas, info = {}) {
  const net = info.net === "test" ? "test" : "main";
  const W = 1200, H = 630;
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d");
  if (document.fonts && document.fonts.load) {
    await Promise.all([
      document.fonts.load('800 80px "Fraunces"'),
      document.fonts.load('700 20px "Courier Prime"'),
      document.fonts.load('500 40px "Caveat"'),
    ]).catch(() => {});
  }
  const serif = (w, s) => `${w} ${s}px "Fraunces", Georgia, serif`;
  const type = (s) => `700 ${s}px "Courier Prime", "Courier New", monospace`;
  const hand = (s) => `500 ${s}px "Caveat", "Segoe Print", cursive`;

  // Desk, then the postcard with an airmail edge.
  c.fillStyle = CARD;
  c.fillRect(0, 0, W, H);
  c.save();
  c.beginPath();
  c.rect(0, 0, W, H);
  c.clip();
  for (let x = 0; x < W + H; x += 60) {
    c.fillStyle = GOLD;
    para(c, x, 20);
    c.fillStyle = INK;
    para(c, x + 30, 20);
  }
  c.restore();
  c.fillStyle = CARD;
  c.fillRect(18, 18, W - 36, H - 36);
  c.strokeStyle = "rgba(28,26,23,0.12)";
  c.lineWidth = 1.5;
  c.strokeRect(18, 18, W - 36, H - 36);

  // Left: the words.
  c.fillStyle = MUTED;
  c.font = type(20);
  c.fillText(net === "test" ? "PRACTICE POST · ZCASH TESTNET" : "REAL POST · ZCASH MAINNET", 70, 92);
  c.fillStyle = INK;
  c.font = serif(800, 66);
  ["I sealed a letter", "to future me."].forEach((t, i) => c.fillText(t, 66, 172 + i * 72));
  // Gold highlighter under the second line.
  c.globalCompositeOperation = "multiply";
  c.fillStyle = "rgba(244,183,40,0.85)";
  c.fillRect(62, 222, c.measureText("to future me.").width + 10, 30);
  c.globalCompositeOperation = "source-over";

  c.fillStyle = HAND;
  c.font = hand(46);
  c.save();
  c.translate(70, 340);
  c.rotate(-0.02);
  c.fillText(net === "test" ? "Practice run, done." : "Only I can read it.", 0, 0);
  c.fillText(info.opens ? `Opens ${info.opens}.` : "It opens in a year.", 0, 56);
  c.restore();

  c.strokeStyle = "rgba(31,45,87,0.35)";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(70, 418);
  c.lineTo(560, 410);
  c.stroke();

  c.fillStyle = INK;
  c.font = type(22);
  const facts = ["PRIVATE MAIL · ZCASH", info.time ? `6 STEPS · ${info.time}` : "6 STEPS"];
  facts.forEach((t, i) => c.fillText(t, 70, 476 + i * 34));

  c.fillStyle = MUTED;
  c.font = type(20);
  c.fillText("tryzender.vercel.app", 70, 572);

  // Divider like a real postcard.
  c.strokeStyle = "#ddd2bf";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(690, 70);
  c.lineTo(690, H - 70);
  c.stroke();

  // Right: stamp, postmark, the address lines.
  stamp(c, 958, 62, 170, 206, net);
  postmark(c, 870, 210, net, info);

  c.fillStyle = HAND;
  c.font = hand(44);
  ["To: me,", "one year from now"].forEach((t, i) => c.fillText(t, 740, 410 + i * 56));
  c.strokeStyle = "#c9d6ec";
  c.lineWidth = 2;
  [424, 480, 536].forEach((y) => {
    c.beginPath();
    c.moveTo(740, y);
    c.lineTo(1130, y);
    c.stroke();
  });

  // Our stamp logo in the corner.
  c.fillStyle = MUTED;
  c.font = serif(800, 30);
  c.fillText("Zender", 1010, 574);
}

// One airmail stripe, drawn across the whole card; the inner card covers the middle.
function para(c, x, w) {
  c.beginPath();
  c.moveTo(x, 0);
  c.lineTo(x + w, 0);
  c.lineTo(x + w - 630, 630);
  c.lineTo(x - 630, 630);
  c.closePath();
  c.fill();
}

function stamp(c, x, y, w, h, net) {
  c.save();
  c.translate(x + w / 2, y + h / 2);
  c.rotate(0.06);
  c.translate(-w / 2, -h / 2);
  c.shadowColor = "rgba(60,40,10,0.25)";
  c.shadowBlur = 8;
  c.shadowOffsetY = 3;
  c.fillStyle = "#fff";
  c.fillRect(0, 0, w, h);
  c.shadowColor = "transparent";
  // Perforations.
  c.fillStyle = CARD;
  const r = 6, gap = 17;
  for (let i = gap / 2; i < w; i += gap) [0, h].forEach((yy) => circle(c, i, yy, r));
  for (let i = gap / 2; i < h; i += gap) [0, w].forEach((xx) => circle(c, xx, i, r));
  c.fillStyle = net === "test" ? BLUE : GOLD;
  c.fillRect(14, 14, w - 28, h - 28);
  c.strokeStyle = INK;
  c.lineWidth = 3;
  c.strokeRect(14, 14, w - 28, h - 28);
  c.fillStyle = INK;
  c.textAlign = "center";
  c.font = `900 84px "Fraunces", Georgia, serif`;
  c.fillText("Z", w / 2, 112);
  c.font = `700 24px "Courier Prime", monospace`;
  c.fillText(net === "test" ? "FREE" : "0.0001", w / 2, 150);
  c.font = `700 18px "Courier Prime", monospace`;
  c.fillText(net === "test" ? "TEST" : "ZEC", w / 2, 174);
  c.textAlign = "left";
  c.restore();
}

function postmark(c, cx, cy, net, info) {
  c.save();
  c.translate(cx, cy);
  c.rotate(-0.24);
  c.strokeStyle = PM;
  c.fillStyle = PM;
  c.lineWidth = 5;
  c.beginPath();
  c.arc(0, 0, 104, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 2.5;
  c.beginPath();
  c.arc(0, 0, 70, 0, Math.PI * 2);
  c.stroke();
  arcText(c, net === "test" ? "ZCASH · TESTNET" : "ZCASH · MAINNET", 80, true);
  arcText(c, "ONLY I READ IT", 96, false);
  c.textAlign = "center";
  c.font = `700 28px "Courier Prime", monospace`;
  c.fillText("SEALED", 0, info.time ? -2 : 10);
  if (info.time) {
    c.font = `700 22px "Courier Prime", monospace`;
    c.fillText(info.time, 0, 28);
  }
  c.textAlign = "left";
  // Cancellation waves.
  c.lineWidth = 4.5;
  c.lineCap = "round";
  for (let k = 0; k < 4; k++) {
    c.beginPath();
    let x = 112, y = -46 + k * 28;
    c.moveTo(x, y);
    for (let j = 0; j < 7; j++) {
      c.quadraticCurveTo(x + 14, y + (j % 2 ? 13 : -13), x + 28, y);
      x += 28;
    }
    c.stroke();
  }
  c.restore();
}

// Text around a circle: on top reading left to right, or along the bottom.
function arcText(c, text, r, top) {
  c.font = `700 21px "Courier Prime", monospace`;
  const step = 0.19;
  const start = -((text.length - 1) * step) / 2;
  [...text].forEach((ch, i) => {
    const a = start + i * step;
    c.save();
    if (top) {
      c.rotate(a);
      c.translate(0, -r);
    } else {
      c.rotate(-a);
      c.translate(0, r);
    }
    c.textAlign = "center";
    c.fillText(ch, 0, top ? 0 : 0);
    c.restore();
  });
}

function circle(c, x, y, r) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

export async function cardBlob(info) {
  const canvas = document.createElement("canvas");
  await drawCard(canvas, info);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

// Share the image with the phone's share sheet (pick X there), or save it if that is not supported.
export async function shareImage(info = {}, { download = false } = {}) {
  const blob = await cardBlob(info);
  const file = new File([blob], "zender.png", { type: "image/png" });
  const text = `${postText(info)} ${SITE_URL}`;
  if (!download && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (e) {
      if (e && e.name === "AbortError") return "cancelled";
      // Sharing was refused (e.g. the tap expired while drawing): save the card instead.
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "zender.png";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return "saved";
}

// A calendar reminder for one year from today. It never contains the letter.
export function saveReminder() {
  const now = new Date();
  const open = new Date(now);
  open.setFullYear(now.getFullYear() + 1);
  const end = new Date(open);
  end.setDate(open.getDate() + 1);
  const day = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const sealed = now.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zender//Letter//EN",
    "BEGIN:VEVENT",
    `UID:${stamp}-${Math.random().toString(36).slice(2)}@zender`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day(open)}`,
    `DTEND;VALUE=DATE:${day(end)}`,
    "SUMMARY:Open your Zcash letter",
    `DESCRIPTION:You sealed a letter to yourself on ${sealed}. Open Zodl and tap that transaction to read it.`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "open-your-zcash-letter.ics";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
