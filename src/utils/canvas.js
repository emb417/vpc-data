import * as Canvas from "canvas";
import sharp from "sharp";

// ── Font registration ─────────────────────────────────────────────────────────
const registeredFonts = new Set();

const registerFontOnce = (fontPath, fontFamily, weight = "normal") => {
  const key = `${fontPath}::${weight}`;
  if (fontPath && !registeredFonts.has(key)) {
    Canvas.registerFont(fontPath, { family: fontFamily, weight });
    registeredFonts.add(key);
  }
};

// ── High scores renderer ──────────────────────────────────────────────────────
const THEME = {
  bg: "#0c0a09",
  bgRowEven: "#1c1917",
  bgRowOdd: "#292524",
  border: "#431407",
  borderSubtle: "#44403c",
  orange: "#fdba74",
  textTitle: "#e7e5e4",
  textName: "#d6d3d1",
  textMuted: "#78716c",
  progressBar: "#a8a29e",
};

const FONTS = {
  POPPINS_BOLD: "/app/resources/fonts/Poppins-Bold.ttf",
  POPPINS_REGULAR: "/app/resources/fonts/Poppins-Regular.ttf",
  MONO_REGULAR: "/app/resources/fonts/CourierPrime-Regular.ttf",
};

const registerHighScoresFonts = () => {
  registerFontOnce(FONTS.POPPINS_BOLD, "Poppins", "bold");
  registerFontOnce(FONTS.POPPINS_REGULAR, "Poppins", "normal");
  registerFontOnce(FONTS.MONO_REGULAR, "CourierPrime", "normal");
};

const fmtScore = (n) => n.toLocaleString("en-US");

const drawRoundedRect = (ctx, x, y, w, h, r, fill, stroke, strokeWidth = 1) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
};

const truncateText = (ctx, text, maxWidth) => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (ctx.measureText(t + "…").width > maxWidth && t.length > 1)
    t = t.slice(0, -1);
  return t + "…";
};

// Fetch a Discord avatar image, returns null on any failure
const fetchAvatar = async (url) => {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const pngBuffer = await sharp(Buffer.from(arrayBuffer)).png().toBuffer();
    return await Canvas.loadImage(pngBuffer);
  } catch (err) {
    console.error("fetchAvatar failed:", url, err.message);
    return null;
  }
};

// Draw a circular avatar — real image if provided, initials fallback otherwise
const drawAvatar = (ctx, x, y, r, image, initial) => {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  if (image) {
    ctx.drawImage(image, x - r, y - r, r * 2, r * 2);
  } else {
    // Initials fallback
    ctx.fillStyle = THEME.borderSubtle;
    ctx.fill();
    ctx.restore();
    // Border
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = THEME.textMuted;
    ctx.lineWidth = 1;
    ctx.stroke();
    // Initial letter
    ctx.fillStyle = THEME.textName;
    ctx.font = `bold 10px Poppins`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((initial ?? "?").toUpperCase(), x, y + 1);
    return;
  }

  ctx.restore();
  // Circular border on top of image
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = THEME.borderSubtle;
  ctx.lineWidth = 1;
  ctx.stroke();
};

// ── generateHighScoresImage ───────────────────────────────────────────────────
//
// Accepts data already fetched from MongoDB (output of getScoresByVpsId).
// The router is responsible for the DB lookup; this function just renders.
//
// tableData shape (first element from pipeline result):
//   {
//     tableName:     string,
//     authorName:    string,   // comma-separated authors
//     versionNumber: string,
//     scores: [{ userName, score, user: { id, avatar } }]
//   }
//
// avatarImages: Map<userName, Canvas.Image | null>  (pre-fetched by router)

const generateHighScoresImage = async (tableData, numRows = 20) => {
  registerHighScoresFonts();

  const { tableName, authorName, versionNumber, scores } = tableData;

  // Take top N scores (pipeline already sorted score desc)
  const topScores = (scores ?? []).slice(0, numRows);

  // Fetch all avatars in parallel — construct URL from user.id + user.avatar hash
  const avatarImages = new Map();
  await Promise.all(
    topScores.map(async (s) => {
      const { id, avatar } = s.user ?? {};
      const url =
        id && avatar
          ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.webp?size=128`
          : null;
      avatarImages.set(s.userName, await fetchAvatar(url));
    }),
  );

  // Truncate authors to fit on one line using pixel measurement
  const truncateAuthors = (str, maxWidth, font) => {
    if (!str) return null;
    const tmpCtx = Canvas.createCanvas(10, 10).getContext("2d");
    tmpCtx.font = font;
    const names = str.split(",").map((n) => n.trim());
    let result = names[0];
    for (let i = 1; i < names.length; i++) {
      const next = `${result}, ${names[i]}`;
      const suffix = `, +${names.length - i} more`;
      if (tmpCtx.measureText(next).width > maxWidth) {
        return `${result}${suffix}`;
      }
      result = next;
    }
    return result;
  };

  // ── Layout ──────────────────────────────────────────────────────────────────
  const W = 350;
  const PAD_X = 12;
  const PAD_TOP = 12;
  const PAD_BOT = 14;
  const AVATAR_R = 13;
  const ROW_H = 46;
  const HEADER_PAD = 20;
  const HEADER_LINE_H = 20;
  const TITLE_MAX_W = W - PAD_X * 4;

  // Helper: wrap text into lines that fit within maxWidth
  const wrapText = (text, font, maxWidth) => {
    const tmpCtx = Canvas.createCanvas(10, 10).getContext("2d");
    tmpCtx.font = font;
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (tmpCtx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  // Header: title wraps if needed, authors on last line
  const authorsFont = "normal 11px Poppins";
  const authorsLine = truncateAuthors(authorName, W - PAD_X * 6, authorsFont);
  const titleFont = "bold 18px Poppins";
  const titleText = `${tableName}  v${versionNumber}`;
  const titleLines = wrapText(titleText, titleFont, TITLE_MAX_W);

  const headerItems = [
    ...titleLines.map((line) => ({
      text: line,
      font: titleFont,
      color: THEME.textTitle,
    })),
    ...(authorsLine
      ? [{ text: authorsLine, font: authorsFont, color: THEME.textMuted }]
      : []),
  ];

  const headerH = headerItems.length * HEADER_LINE_H + HEADER_PAD;
  const contentW = W - PAD_X * 2;

  // Column widths
  const colRankW = 28;
  const colAvatarW = AVATAR_R * 2 + 10; // avatar diameter + gap
  const colScoreW = 100;
  const colNameW = contentW - colRankW - colAvatarW - colScoreW;

  const colRank = PAD_X;
  const colAvatar = colRank + colRankW;
  const colName = colAvatar + colAvatarW;
  const colScore = colName + colNameW;

  const totalH = PAD_TOP + headerH + topScores.length * ROW_H + PAD_BOT;

  // ── Canvas (2x for crisp rendering) ─────────────────────────────────────────
  const SCALE = 2;
  const canvas = Canvas.createCanvas(W * SCALE, totalH * SCALE);
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = THEME.bg;
  ctx.fillRect(0, 0, W, totalH);

  // Outer border
  drawRoundedRect(ctx, 1, 1, W - 2, totalH - 2, 10, null, THEME.border, 2);

  // ── Header ──────────────────────────────────────────────────────────────────
  let curY = PAD_TOP + HEADER_PAD;

  for (const item of headerItems) {
    ctx.font = item.font;
    ctx.fillStyle = item.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(item.text, W / 2, curY);
    curY += HEADER_LINE_H;
  }

  curY = PAD_TOP + headerH;

  // ── Rows ────────────────────────────────────────────────────────────────────
  const maxScore = Math.max(...topScores.map((s) => s.score ?? 0), 1);

  topScores.forEach((entry, i) => {
    const rowY = curY + i * ROW_H;
    const midY = rowY + ROW_H / 2;
    const isEven = i % 2 === 0;

    // Row background
    drawRoundedRect(
      ctx,
      PAD_X,
      rowY + 2,
      contentW,
      ROW_H - 3,
      8,
      isEven ? THEME.bgRowEven : THEME.bgRowOdd,
    );

    // ── Rank ─────────────────────────────────────────────────────────────────
    ctx.fillStyle = THEME.orange;
    ctx.font = "bold 15px Poppins";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(i + 1 + ".", colRank + 4, midY);

    // ── Avatar ────────────────────────────────────────────────────────────────
    const avatarImg = avatarImages.get(entry.userName) ?? null;
    drawAvatar(
      ctx,
      colAvatar + AVATAR_R,
      midY,
      AVATAR_R,
      avatarImg,
      entry.userName?.[0],
    );

    // ── Name + Score on same line ─────────────────────────────────────────────
    const nameScoreY = midY - 6;
    const barStart = colName + 4;
    const barEnd = W - PAD_X - 8;
    const barW = barEnd - barStart;

    ctx.font = "normal 14px Poppins";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = THEME.textName;
    ctx.fillText(
      truncateText(ctx, entry.userName, barW - 115),
      barStart,
      nameScoreY,
    );

    ctx.font = "bold 15px CourierPrime";
    ctx.fillStyle = THEME.orange;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(fmtScore(entry.score ?? 0), barEnd, nameScoreY);

    // ── Progress bar (full width, extends under score) ────────────────────────
    const filledW = Math.max(
      Math.floor(barW * ((entry.score ?? 0) / maxScore)),
      0,
    );
    drawRoundedRect(ctx, barStart, midY + 7, barW, 3, 1, THEME.bgRowEven);
    if (filledW > 0) {
      drawRoundedRect(
        ctx,
        barStart,
        midY + 7,
        filledW,
        3,
        1,
        THEME.progressBar,
      );
    }
  });

  return canvas.toBuffer("image/png", { compressionLevel: 6 });
};

export default { generateHighScoresImage };
