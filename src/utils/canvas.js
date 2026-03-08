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
    ctx.fillStyle = THEME.borderSubtle;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = THEME.textMuted;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = THEME.textName;
    ctx.font = `bold 10px Poppins`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((initial ?? "?").toUpperCase(), x, y + 1);
    return;
  }

  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = THEME.borderSubtle;
  ctx.lineWidth = 1;
  ctx.stroke();
};

const fetchResizedImage = async (url, width, height) => {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const pngBuffer = await sharp(Buffer.from(arrayBuffer))
      .resize(width, height, { fit: "inside" })
      .png()
      .toBuffer();
    return await Canvas.loadImage(pngBuffer);
  } catch (err) {
    console.error("fetchResizedImage failed:", url, err.message);
    return null;
  }
};

// Wrap text into lines that fit within maxWidth, up to maxLines
const wrapText = (ctx, text, maxWidth, maxLines = 3) => {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      if (lines.length >= maxLines) {
        // Truncate last line with ellipsis
        lines[maxLines - 1] = truncateText(
          ctx,
          lines[maxLines - 1] + " " + word,
          maxWidth,
        );
        return lines;
      }
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const generateHighScoresImage = async (
  tableData,
  numRows = 20,
  vpsEntry = null,
) => {
  registerHighScoresFonts();

  const { tableName, authorName, versionNumber, scores, vpsId } = tableData;

  // Take top N scores (pipeline already sorted score desc)
  const topScores = (scores ?? []).slice(0, numRows);

  // Layout constants
  const W = 1920;
  const H = 1080;
  const COL_W = W / 3;
  const PAD = 40;
  const INNER_W = COL_W - PAD * 2;

  const AVATAR_R = 30;
  const ROW_H = (H - PAD * 2) / 10;

  // Fetch all avatars in parallel
  const avatarImages = new Map();
  const avatarPromises = topScores.map(async (s) => {
    const { id, avatar } = s.user ?? {};
    const url =
      id && avatar
        ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.webp?size=128`
        : null;
    avatarImages.set(s.userName, await fetchAvatar(url));
  });

  // Fetch VPS images in parallel — reduced b2s height to 250
  const vpsImagesPromise = (async () => {
    const [b2sImg, tableImg] = await Promise.all([
      fetchResizedImage(vpsEntry?.b2sImageUrl, INNER_W, 200),
      fetchResizedImage(vpsEntry?.tableImageUrl, INNER_W, 550),
    ]);
    return { b2sImg, tableImg };
  })();

  const [_, { b2sImg, tableImg }] = await Promise.all([
    Promise.all(avatarPromises),
    vpsImagesPromise,
  ]);

  // Truncate authors helper
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

  // ── Canvas ───────────────────────────────────────────────────────────────────
  const SCALE = 1;
  const canvas = Canvas.createCanvas(W * SCALE, H * SCALE);
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = THEME.bg;
  ctx.fillRect(0, 0, W, H);

  // Outer border
  drawRoundedRect(ctx, 10, 10, W - 20, H - 20, 20, null, THEME.border, 4);

  // ── Column 1: Metadata then Images ──────────────────────────────────────────
  let curY = PAD + 10;
  const col1X = PAD;

  const col1CenterX = COL_W / 2;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // Table Name (wrapped, up to 3 lines)
  ctx.font = "bold 42px Poppins";
  ctx.fillStyle = THEME.textTitle;
  const titleLines = wrapText(ctx, tableName, INNER_W, 3);
  for (const line of titleLines) {
    ctx.fillText(line, col1CenterX, curY);
    curY += 52;
  }
  curY += 4;

  // Version
  ctx.font = "bold 28px Poppins";
  ctx.fillStyle = THEME.orange;
  ctx.fillText(`v${versionNumber}`, col1CenterX, curY);
  curY += 40;

  // Authors
  const authorsFont = "normal 24px Poppins";
  const authorsLine = truncateAuthors(authorName, INNER_W * 0.75, authorsFont);
  if (authorsLine) {
    ctx.font = authorsFont;
    ctx.fillStyle = THEME.textName;
    ctx.fillText(authorsLine, col1CenterX, curY);
    curY += 35;
  }

  // VPS ID
  ctx.font = "normal 20px CourierPrime";
  ctx.fillStyle = THEME.textMuted;
  ctx.fillText(`VPS ID: ${vpsId}`, col1CenterX, curY);
  curY += 40;

  ctx.restore();

  // B2S Image — 85% column width (wider than table), centered
  if (b2sImg) {
    const b2sW = INNER_W * 0.65;
    const b2sH = (b2sImg.height * b2sW) / b2sImg.width;
    ctx.drawImage(b2sImg, col1X + (INNER_W - b2sW) / 2, curY, b2sW, b2sH);
    curY += b2sH + 20;
  }

  // Table Image — 65% column width (narrower than b2s), fills remaining space
  if (tableImg) {
    const tableW = INNER_W * 0.65;
    const maxTableH = H - curY - PAD;
    const ratio = Math.min(
      tableW / tableImg.width,
      maxTableH / tableImg.height,
    );
    const imgW = tableImg.width * ratio;
    const imgH = tableImg.height * ratio;
    ctx.drawImage(tableImg, col1X + (INNER_W - imgW) / 2, curY, imgW, imgH);
  }

  // ── Columns 2 & 3: Scores ───────────────────────────────────────────────────
  const drawScoreColumn = (startIndex, startX) => {
    const columnScores = topScores.slice(startIndex, startIndex + 10);
    const maxScore = Math.max(...topScores.map((s) => s.score ?? 0), 1);
    const colInnerW = COL_W - PAD - 20;

    columnScores.forEach((entry, i) => {
      const rowY = PAD + i * ROW_H;
      const midY = rowY + ROW_H / 2;
      const isEven = (startIndex + i) % 2 === 0;

      drawRoundedRect(
        ctx,
        startX,
        rowY + 5,
        colInnerW,
        ROW_H - 10,
        12,
        isEven ? THEME.bgRowEven : THEME.bgRowOdd,
      );

      // Placeholder row — no score, just a centered message
      if (entry.score === null) {
        ctx.font = "normal 26px Poppins";
        ctx.fillStyle = THEME.textMuted;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(entry.userName, startX + colInnerW / 2, midY);
        return;
      }

      const colRankW = 60;
      const colAvatarW = AVATAR_R * 2 + 20;
      const barStart = startX + colRankW + colAvatarW;
      const barW = colInnerW - colRankW - colAvatarW - 20;

      // Rank
      ctx.fillStyle = THEME.orange;
      ctx.font = "bold 28px Poppins";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${startIndex + i + 1}.`, startX + 15, midY);

      // Avatar
      const avatarImg = avatarImages.get(entry.userName) ?? null;
      drawAvatar(
        ctx,
        startX + colRankW + AVATAR_R,
        midY,
        AVATAR_R,
        avatarImg,
        entry.userName?.[0],
      );

      // Name
      const nameScoreY = midY - 12;
      ctx.font = "normal 24px Poppins";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = THEME.textName;
      ctx.fillText(
        truncateText(ctx, entry.userName, barW - 180),
        barStart,
        nameScoreY,
      );

      // Score
      ctx.font = "bold 28px CourierPrime";
      ctx.fillStyle = THEME.orange;
      ctx.textAlign = "right";
      ctx.fillText(fmtScore(entry.score ?? 0), barStart + barW, nameScoreY);

      // Progress bar
      const filledW = Math.max(
        Math.floor(barW * ((entry.score ?? 0) / maxScore)),
        0,
      );
      const barY = midY + 10;
      const barH = 6;
      drawRoundedRect(ctx, barStart, barY, barW, barH, 2, THEME.bgRowEven);
      if (filledW > 0) {
        drawRoundedRect(
          ctx,
          barStart,
          barY,
          filledW,
          barH,
          2,
          THEME.progressBar,
        );
      }

      // Posted Date
      if (entry.posted) {
        const date = new Date(entry.posted);
        const formattedDate = date.toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
          year: "numeric",
        });
        ctx.font = "normal 16px Poppins";
        ctx.fillStyle = THEME.textMuted;
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillText(formattedDate, barStart + barW, barY + barH + 2);
      }
    });
  };

  drawScoreColumn(0, COL_W + 10);
  drawScoreColumn(10, COL_W * 2 + 10);

  return canvas.toBuffer("image/png", { compressionLevel: 6 });
};

export default { generateHighScoresImage };
