/**
 * utils/scoring.js
 *
 * Score processing logic for vpc-data, adapted from vpc-bot's scoring.js
 * and points.js. Works without Discord-specific objects — user identity
 * is passed as plain { userId, username } rather than a Discord user object.
 *
 * This module only processes vpc-score-agent submissions. Discord scores
 * are handled entirely within vpc-bot.
 */

// ---------------------------------------------------------------------------
// Points
// ---------------------------------------------------------------------------

const POINTS_BY_RANK = [12, 10, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Assign points to scores based on rank position.
 * Mutates the scores array in place.
 * @param {Array} scores - Already sorted descending by score
 */
export const assignPoints = (scores) => {
  scores.forEach((score, index) => {
    score.points = index < POINTS_BY_RANK.length ? POINTS_BY_RANK[index] : 1;
  });
};

/**
 * Calculate total points for a player across multiple weeks.
 * @param {Array} weeks - Array of week objects with scores
 * @returns {Array} Leaderboard sorted by points descending
 */
export const calculateSeasonPoints = (weeks) => {
  const playerMap = new Map();

  weeks.forEach((week) => {
    if (!week.scores) return;
    week.scores.forEach((score) => {
      const username = score.username.toLowerCase();
      const existing = playerMap.get(username);
      if (existing) {
        existing.points += parseInt(score.points) || 0;
        existing.score += parseInt(score.score) || 0;
      } else {
        playerMap.set(username, {
          username,
          score: parseInt(score.score) || 0,
          points: parseInt(score.points) || 0,
        });
      }
    });
  });

  return Array.from(playerMap.values()).sort((a, b) => {
    if (a.points === b.points) return b.score - a.score;
    return b.points - a.points;
  });
};

// ---------------------------------------------------------------------------
// Ranking helpers
// ---------------------------------------------------------------------------

/**
 * Get the rank change for a user after a new score.
 * @param {string} username
 * @param {Array} previousScores - Scores before the update
 * @param {Array} newScores - Scores after the update
 * @returns {number} Positive = moved up
 */
export const getRankChange = (username, previousScores, newScores) => {
  const newIndex = newScores.findIndex((x) => x.username === username);
  const previousIndex = previousScores.findIndex(
    (x) => x.username === username,
  );
  if (previousIndex === -1) return newScores.length - newIndex;
  return previousIndex - newIndex;
};

/**
 * Get the current rank text for a user.
 * @param {string} username
 * @param {Array} scores
 * @returns {string} e.g. "3 of 15"
 */
export const getCurrentRankText = (username, scores) => {
  const index = scores.findIndex((x) => x.username === username) + 1;
  return `${index} of ${scores.length}`;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a score value.
 * @param {string|number} score
 * @returns {{ valid: boolean, value: number|null, error: string|null }}
 */
export const validateScore = (score) => {
  const scoreAsInt = parseInt(String(score).replace(/,/g, ""));
  const re = /^([1-9]|[1-9][0-9]{1,14})$/;

  if (isNaN(scoreAsInt) || !re.test(String(scoreAsInt))) {
    return {
      valid: false,
      value: null,
      error: "The score needs to be a number between 1 and 999999999999999.",
    };
  }

  return { valid: true, value: scoreAsInt, error: null };
};

// ---------------------------------------------------------------------------
// Score processing
// ---------------------------------------------------------------------------

/**
 * Format a date as MM/DD/YYYY HH:mm:ss — matches the vpc-bot posted field format.
 */
const formatDateTime = (date = new Date()) => {
  const pad = (n) => n.toString().padStart(2, "0");
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/**
 * Process a new score submission against a current week.
 * Adapted from vpc-bot's processScore — works with a plain user object
 * { userId, username } instead of a Discord user object.
 *
 * @param {{ userId: string, username: string }} user
 * @param {number} scoreValue
 * @param {Object} currentWeek
 * @param {Object} [options]
 * @param {string} [options.source] - submission source, defaults to "vpc-score-agent"
 * @param {string} [options.rom] - ROM name
 * @param {number} [options.gameDuration] - Game duration in seconds
 * @returns {Object} Result with updated scores and metadata
 */
export const processScore = (user, scoreValue, currentWeek, options = {}) => {
  const {
    source = "vpc-score-agent",
    rom = null,
    gameDuration = null,
  } = options;
  const username = user.username?.trimEnd() || user.userId;
  const mode = currentWeek.mode ?? "default";
  const scoreAsInt = parseInt(String(scoreValue).replace(/,/g, ""));

  // Clone scores arrays
  const prevScores = currentWeek.scores
    ? JSON.parse(JSON.stringify(currentWeek.scores))
    : [];
  const scores = currentWeek.scores
    ? JSON.parse(JSON.stringify(currentWeek.scores))
    : [];

  const existing = scores.find((x) => x.username === username);
  let previousScore = 0;

  if (existing) {
    previousScore = existing.score;
    existing.score = scoreAsInt;
    existing.diff = scoreAsInt - previousScore;
    existing.mode = mode;
    existing.posted = formatDateTime(new Date());
    existing.source = source;
    existing.rom = rom;
    existing.gameDuration = gameDuration;
    existing.updatedAt = new Date();
  } else {
    scores.push({
      userId: user.userId,
      username: username.replace("`", ""),
      userAvatarUrl: null,
      score: scoreAsInt,
      diff: scoreAsInt,
      mode,
      posted: formatDateTime(new Date()),
      source,
      rom,
      gameDuration,
      createdAt: new Date(),
    });
  }

  // Sort descending by score
  scores.sort((a, b) => b.score - a.score);

  // Assign points
  assignPoints(scores);

  const rankChange = getRankChange(username, prevScores, scores);
  const currentRank = getCurrentRankText(username, scores);

  return {
    scores,
    previousScore,
    scoreAsInt,
    scoreDiff: scoreAsInt - previousScore,
    rankChange,
    currentRank,
    username,
    mode,
  };
};

export default {
  assignPoints,
  calculateSeasonPoints,
  getRankChange,
  getCurrentRankText,
  validateScore,
  processScore,
};
