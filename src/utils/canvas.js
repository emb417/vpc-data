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
  POPPINS_ITALIC: "/app/resources/fonts/Poppins-Italic.ttf",
  MONO_REGULAR: "/app/resources/fonts/CourierPrime-Regular.ttf",
};

const registerHighScoresFonts = () => {
  registerFontOnce(FONTS.POPPINS_BOLD, "Poppins", "bold");
  registerFontOnce(FONTS.POPPINS_REGULAR, "Poppins", "normal");
  registerFontOnce(FONTS.POPPINS_ITALIC, "PoppinsItalic", "normal");
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

const wrapText = (ctx, text, maxWidth, maxLines = 3) => {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      if (lines.length >= maxLines) {
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

// ── Shared portrait score renderer ───────────────────────────────────────────
// scores: array of { username, score, userAvatarUrl }
// headerHeight: pixels to reserve above rows (0 for no header)
// drawHeader: optional async fn(ctx, PAD, INNER_W) that draws above the rows
const renderPortraitScores = async (scores, drawHeader = null) => {
  registerHighScoresFonts();

  const topScores = scores.slice(0, 20);
  const rowCount = Math.max(topScores.length, 1);

  const COL_W = 640;
  const PAD = 24;
  const ROW_H = 56;
  const AVATAR_R = 18;
  const INNER_W = COL_W - PAD * 2;

  // Measure header height by doing a dry run if provided
  let headerHeight = 0;
  if (drawHeader) {
    const tmpCanvas = Canvas.createCanvas(COL_W, 2000);
    const tmpCtx = tmpCanvas.getContext("2d");
    headerHeight = await drawHeader(tmpCtx, PAD, INNER_W, true);
  }

  const H = PAD + headerHeight + rowCount * ROW_H + PAD;

  // Fetch avatars in parallel
  const avatarImages = new Map();
  await Promise.all(
    topScores.map(async (s) => {
      avatarImages.set(s.username, await fetchAvatar(s.userAvatarUrl ?? null));
    }),
  );

  const canvas = Canvas.createCanvas(COL_W, H);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = THEME.bg;
  ctx.fillRect(0, 0, COL_W, H);
  drawRoundedRect(ctx, 10, 10, COL_W - 20, H - 20, 20, null, THEME.border, 4);

  // Draw header if provided
  if (drawHeader) {
    await drawHeader(ctx, PAD, INNER_W, false);
  }

  const maxScore = Math.max(...topScores.map((s) => s.score ?? 0), 1);

  topScores.forEach((entry, i) => {
    const rowY = PAD + headerHeight + i * ROW_H;
    const midY = rowY + ROW_H / 2;
    const isEven = i % 2 === 0;

    drawRoundedRect(
      ctx,
      PAD,
      rowY + 2,
      INNER_W,
      ROW_H - 4,
      10,
      isEven ? THEME.bgRowEven : THEME.bgRowOdd,
    );

    if (entry.score === null || entry.score === undefined) {
      ctx.font = "normal 18px Poppins";
      ctx.fillStyle = THEME.textMuted;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(entry.username ?? "—", PAD + INNER_W / 2, midY);
      return;
    }

    const colRankW = 56;
    const colAvatarW = AVATAR_R * 2 + 12;
    const barStart = PAD + colRankW + colAvatarW;
    const barW = INNER_W - colRankW - colAvatarW - 12;

    // Rank
    ctx.fillStyle = THEME.orange;
    ctx.font = "bold 30px CourierPrime";
    ctx.letterSpacing = "-1px";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${i + 1}`, PAD + colRankW / 2, midY + 3);
    ctx.letterSpacing = "0px";

    // Avatar
    const avatarImg = avatarImages.get(entry.username) ?? null;
    drawAvatar(
      ctx,
      PAD + colRankW + AVATAR_R,
      midY,
      AVATAR_R,
      avatarImg,
      entry.username?.[0],
    );

    // Name
    ctx.font = "normal 30px Poppins";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = THEME.textName;
    ctx.fillText(
      truncateText(ctx, entry.username ?? "—", barW - 160),
      barStart,
      midY - 2,
    );

    // Score
    ctx.font = "bold 30px CourierPrime";
    ctx.fillStyle = THEME.orange;
    ctx.textAlign = "right";
    ctx.fillText(fmtScore(entry.score), barStart + barW, midY - 2);

    // Progress bar
    const filledW = Math.max(Math.floor(barW * (entry.score / maxScore)), 0);
    const barY = midY + 16;
    const barH = 4;
    drawRoundedRect(ctx, barStart, barY, barW, barH, 2, THEME.bgRowEven);
    if (filledW > 0) {
      drawRoundedRect(ctx, barStart, barY, filledW, barH, 2, THEME.progressBar);
    }
  });

  return canvas.toBuffer("image/png", { compressionLevel: 6 });
};

// ── High scores image (landscape or portrait) ─────────────────────────────────
const generateHighScoresImage = async (
  tableData,
  numRows = 20,
  vpsEntry = null,
  layout = "landscape",
) => {
  registerHighScoresFonts();

  const {
    tableName,
    authorName,
    versionNumber,
    manufacturer,
    year,
    scores,
    vpsId,
  } = tableData;
  const topScores = (scores ?? []).slice(0, numRows);

  if (layout === "portrait") {
    // Normalize to portrait score shape
    const normalized = topScores.map((s) => ({
      username: s.userName,
      score: s.score,
      userAvatarUrl: s.user?.avatar?.startsWith("http")
        ? s.user.avatar
        : s.user?.id && s.user?.avatar
          ? `https://cdn.discordapp.com/avatars/${s.user.id}/${s.user.avatar}.webp?size=128`
          : null,
    }));

    const truncateAuthors = (str, maxWidth, font) => {
      if (!str) return null;
      const tmpCtx = Canvas.createCanvas(10, 10).getContext("2d");
      tmpCtx.font = font;
      const names = str.split(",").map((n) => n.trim());
      let result = names[0];
      for (let i = 1; i < names.length; i++) {
        const next = `${result}, ${names[i]}`;
        const suffix = `, +${names.length - i} more`;
        if (tmpCtx.measureText(next).width > maxWidth)
          return `${result}${suffix}`;
        result = next;
      }
      return result;
    };

    const drawHeader = async (ctx, PAD, INNER_W, dryRun) => {
      const COL_W = 640;
      const col1CenterX = COL_W / 2;
      let curY = PAD;

      ctx.textBaseline = "top";
      ctx.textAlign = "center";

      // Title
      ctx.font = "bold 36px Poppins";
      ctx.fillStyle = dryRun ? "transparent" : THEME.textTitle;
      const titleLines = wrapText(ctx, tableName ?? "", INNER_W, 3);
      for (const line of titleLines) {
        if (!dryRun) ctx.fillText(line, col1CenterX, curY);
        curY += 44;
      }
      curY += 4;

      // Manufacturer + version
      const manufacturerText = [manufacturer, year].filter(Boolean).join(" ");
      const versionText = `v${versionNumber}`;
      ctx.font = "normal 22px PoppinsItalic";
      const manuWidth = ctx.measureText(manufacturerText).width;
      ctx.font = "normal 18px Poppins";
      const versionWidth = ctx.measureText(versionText).width;
      const totalWidth = manuWidth + 10 + versionWidth;
      const startX = col1CenterX - totalWidth / 2;

      if (!dryRun) {
        ctx.font = "normal 22px PoppinsItalic";
        ctx.fillStyle = THEME.textMuted;
        ctx.textAlign = "left";
        ctx.fillText(manufacturerText, startX, curY);
        ctx.font = "normal 18px Poppins";
        ctx.fillStyle = THEME.orange;
        ctx.fillText(versionText, startX + manuWidth + 10, curY + 4);
        ctx.textAlign = "center";
      }
      curY += 30;

      // Authors
      const authorsFont = "normal 18px Poppins";
      const authorsLine = truncateAuthors(
        authorName,
        INNER_W * 0.9,
        authorsFont,
      );
      if (authorsLine) {
        if (!dryRun) {
          ctx.font = authorsFont;
          ctx.fillStyle = THEME.textName;
          ctx.fillText(authorsLine, col1CenterX, curY);
        }
        curY += 26;
      }

      // VPS ID
      if (!dryRun) {
        ctx.font = "normal 16px CourierPrime";
        ctx.fillStyle = THEME.textMuted;
        ctx.fillText(`VPS ID: ${vpsId}`, col1CenterX, curY);
      }
      curY += 28;
      curY += 12; // bottom padding before rows

      return curY - PAD; // return header height
    };

    return renderPortraitScores(normalized, drawHeader);
  }

  // ── landscape layout ─────────────────────────────────────────────────────
  const W = 1920;
  const H = 1080;
  const COL_W = W / 3;
  const PAD = 40;
  const INNER_W = COL_W - PAD * 2;
  const AVATAR_R = 30;
  const ROW_H = (H - PAD * 2) / 10;

  const avatarImages = new Map();
  const avatarPromises = topScores.map(async (s) => {
    const { id, avatar } = s.user ?? {};
    const url =
      id && avatar
        ? avatar.startsWith("http")
          ? avatar
          : `https://cdn.discordapp.com/avatars/${id}/${avatar}.webp?size=128`
        : null;
    avatarImages.set(s.userName, await fetchAvatar(url));
  });

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

  const truncateAuthors = (str, maxWidth, font) => {
    if (!str) return null;
    const tmpCtx = Canvas.createCanvas(10, 10).getContext("2d");
    tmpCtx.font = font;
    const names = str.split(",").map((n) => n.trim());
    let result = names[0];
    for (let i = 1; i < names.length; i++) {
      const next = `${result}, ${names[i]}`;
      const suffix = `, +${names.length - i} more`;
      if (tmpCtx.measureText(next).width > maxWidth)
        return `${result}${suffix}`;
      result = next;
    }
    return result;
  };

  const canvas = Canvas.createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.scale(1, 1);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = THEME.bg;
  ctx.fillRect(0, 0, W, H);
  drawRoundedRect(ctx, 10, 10, W - 20, H - 20, 20, null, THEME.border, 4);

  let curY = PAD + 10;
  const col1X = PAD;
  const col1CenterX = COL_W / 2;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  ctx.font = "bold 42px Poppins";
  ctx.fillStyle = THEME.textTitle;
  const titleLines = wrapText(ctx, tableName, INNER_W, 3);
  for (const line of titleLines) {
    ctx.fillText(line, col1CenterX, curY);
    curY += 52;
  }
  curY += 4;

  const manufacturerText = [manufacturer, year].filter(Boolean).join(" ");
  const versionText = `v${versionNumber}`;
  ctx.font = "normal 28px PoppinsItalic";
  const manuWidth = ctx.measureText(manufacturerText).width;
  ctx.font = "normal 20px Poppins";
  const versionWidth = ctx.measureText(versionText).width;
  const totalWidth = manuWidth + 12 + versionWidth;
  const startX = col1CenterX - totalWidth / 2;

  ctx.font = "normal 28px PoppinsItalic";
  ctx.fillStyle = THEME.textMuted;
  ctx.textAlign = "left";
  ctx.fillText(manufacturerText, startX, curY);
  ctx.font = "normal 20px Poppins";
  ctx.fillStyle = THEME.orange;
  ctx.fillText(versionText, startX + manuWidth + 12, curY + 8);
  ctx.textAlign = "center";
  curY += 40;

  const authorsFont = "normal 24px Poppins";
  const authorsLine = truncateAuthors(authorName, INNER_W * 0.75, authorsFont);
  if (authorsLine) {
    ctx.font = authorsFont;
    ctx.fillStyle = THEME.textName;
    ctx.fillText(authorsLine, col1CenterX, curY);
    curY += 35;
  }

  ctx.font = "normal 20px CourierPrime";
  ctx.fillStyle = THEME.textMuted;
  ctx.fillText(`VPS ID: ${vpsId}`, col1CenterX, curY);
  curY += 40;
  ctx.restore();

  if (b2sImg) {
    const b2sW = INNER_W * 0.65;
    const b2sH = (b2sImg.height * b2sW) / b2sImg.width;
    ctx.drawImage(b2sImg, col1X + (INNER_W - b2sW) / 2, curY, b2sW, b2sH);
    curY += b2sH + 20;
  }

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

      ctx.fillStyle = THEME.orange;
      ctx.font = "bold 28px Poppins";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${startIndex + i + 1}.`, startX + 15, midY);

      const avatarImg = avatarImages.get(entry.userName) ?? null;
      drawAvatar(
        ctx,
        startX + colRankW + AVATAR_R,
        midY,
        AVATAR_R,
        avatarImg,
        entry.userName?.[0],
      );

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

      ctx.font = "bold 28px CourierPrime";
      ctx.fillStyle = THEME.orange;
      ctx.textAlign = "right";
      ctx.fillText(fmtScore(entry.score ?? 0), barStart + barW, nameScoreY);

      const filledW = Math.max(
        Math.floor(barW * ((entry.score ?? 0) / maxScore)),
        0,
      );
      const barY = midY + 10;
      const barH = 6;
      drawRoundedRect(ctx, barStart, barY, barW, barH, 2, THEME.bgRowEven);
      if (filledW > 0)
        drawRoundedRect(
          ctx,
          barStart,
          barY,
          filledW,
          barH,
          2,
          THEME.progressBar,
        );

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

// ── Weekly leaderboard image (portrait or landscape) ──────────────────────────
const generateLeaderboardImage = async (
  weekData,
  layout = "portrait",
  vpsEntry = null,
  vpsData = {},
) => {
  registerHighScoresFonts();

  const { scores = [] } = weekData;

  if (layout === "landscape") {
    const tableData = {
      tableName: vpsData.name ?? weekData.table,
      authorName: weekData.authorName,
      versionNumber: weekData.versionNumber,
      manufacturer: vpsData.manufacturer,
      year: vpsData.year,
      vpsId: weekData.vpsId,
      scores: weekData.scores.map((s) => ({
        userName: s.username,
        score: s.score,
        posted: s.posted,
        user: { id: s.userId, avatar: s.userAvatarUrl },
      })),
    };
    return generateHighScoresImage(tableData, 20, vpsEntry, "landscape");
  }

  // ── portrait layout — no header, embed owns metadata ─────────────────────
  const normalized = scores.slice(0, 20).map((s) => ({
    username: s.username,
    score: s.score,
    userAvatarUrl: s.userAvatarUrl ?? null,
  }));

  return renderPortraitScores(normalized, null);
};

export default { generateHighScoresImage, generateLeaderboardImage };
