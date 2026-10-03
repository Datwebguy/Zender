// Share card and post-to-X link. The card is drawn in the browser; nothing is uploaded.

export const SITE_URL = "https://tryzender.vercel.app";
export const POST_TEXT = "I just sent myself a shielded Zcash note. Nobody else can read it.\n\nSix steps, one tap each:";

export function postUrl() {
  const params = new URLSearchParams({ text: `${POST_TEXT} ${SITE_URL}\n\n@zksnarks_ #ZECATHON` });
  return `https://x.com/intent/post?${params}`;
}

// 1200x630 card. Never includes the note or the address.
export function drawCard(canvas) {
  const W = 1200, H = 630;
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d");
  const font = (w, s) => `${w} ${s}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;

  c.fillStyle = "#000";
  c.fillRect(0, 0, W, H);
  const glow = c.createRadialGradient(930, 300, 20, 930, 300, 420);
  glow.addColorStop(0, "rgba(244,183,40,0.22)");
  glow.addColorStop(1, "rgba(244,183,40,0)");
  c.fillStyle = glow;
  c.fillRect(0, 0, W, H);

  c.fillStyle = "#fff";
  c.font = font(700, 34);
  c.fillText("Zender", 72, 92);

  ["Sent.", "Sealed.", "Only I can read it."].forEach((line, i) => {
    c.font = font(800, i === 2 ? 58 : 68);
    c.fillStyle = i === 2 ? "#f4b728" : "#fff";
    c.fillText(line, 72, 250 + i * 84);
  });

  c.fillStyle = "#a1a1aa";
  c.font = font(500, 28);
  c.fillText("My first shielded Zcash note, sent to myself.", 72, 520);

  // Sealed envelope with a wax seal.
  const x = 780, y = 170, w = 340, h = 230;
  c.fillStyle = "#18181b";
  roundRect(c, x, y, w, h, 22);
  c.fill();
  c.strokeStyle = "#3f3f46";
  c.lineWidth = 3;
  c.stroke();
  c.beginPath();
  c.moveTo(x + 8, y + 12);
  c.lineTo(x + w / 2, y + h * 0.58);
  c.lineTo(x + w - 8, y + 12);
  c.stroke();
  c.fillStyle = "#f4b728";
  c.beginPath();
  c.arc(x + w / 2, y + h * 0.58, 46, 0, Math.PI * 2);
  c.fill();
  // Lock glyph on the seal.
  c.fillStyle = "#1a1400";
  roundRect(c, x + w / 2 - 18, y + h * 0.58 - 4, 36, 28, 5);
  c.fill();
  c.strokeStyle = "#1a1400";
  c.lineWidth = 6;
  c.beginPath();
  c.arc(x + w / 2, y + h * 0.58 - 6, 12, Math.PI, 0);
  c.stroke();

  c.font = font(600, 24);
  c.fillStyle = "#71717a";
  ["Sender  hidden", "Amount  hidden", "Note  sealed"].forEach((t, i) => c.fillText(t, x + 20, y + h + 52 + i * 34));

  c.fillStyle = "#52525b";
  c.font = font(500, 22);
  c.fillText("tryzender.vercel.app  ·  ZECATHON", 72, 590);
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export function cardBlob() {
  const canvas = document.createElement("canvas");
  drawCard(canvas);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

// Share the image with the phone's share sheet (pick X there), or save it if that is not supported.
export async function shareImage() {
  const blob = await cardBlob();
  const file = new File([blob], "zender.png", { type: "image/png" });
  const text = `${POST_TEXT} ${SITE_URL} @zksnarks_ #ZECATHON`;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch {
      return "cancelled";
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
