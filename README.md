# VPC Data API

The VPC Data API provides access to Virtual Pinball Chat Competition Corner data, including tables, scores, weekly competitions, and leaderboard image generation.

Base URL: `https://virtualpinballchat.com/vpc/api/v1`

---

## Endpoints

### Tables

**GET /tables**
Returns all tables.

```bash
curl https://virtualpinballchat.com/vpc/api/v1/tables
```

---

**GET /tablesWithAuthorVersion**
Returns all tables with author and version information.

```bash
curl https://virtualpinballchat.com/vpc/api/v1/tablesWithAuthorVersion
```

---

**GET /recentTablesByHighscores**
Returns tables sorted by most recent high scores. Supports pagination and search.

| Parameter    | Default | Description                 |
| ------------ | ------- | --------------------------- |
| `limit`      | `4`     | Number of results to return |
| `offset`     | `0`     | Pagination offset           |
| `searchTerm` |         | Filter by table name        |

```bash
curl "https://virtualpinballchat.com/vpc/api/v1/recentTablesByHighscores?limit=10&searchTerm=Addams"
```

---

### Scores

**GET /scoresByTable**
Returns scores for a specific table.

| Parameter   | Description             |
| ----------- | ----------------------- |
| `tableName` | Table name to filter by |

```bash
curl "https://virtualpinballchat.com/vpc/api/v1/scoresByTable?tableName=myTable"
```

---

**GET /scoresByTableAndAuthor**
Returns scores for a specific table and author.

| Parameter    | Description |
| ------------ | ----------- |
| `tableName`  | Table name  |
| `authorName` | Author name |

```bash
curl "https://virtualpinballchat.com/vpc/api/v1/scoresByTableAndAuthor?tableName=myTable&authorName=johnDoe"
```

---

**GET /scoresByTableAndAuthorUsingFuzzyTableSearch**
Returns scores using fuzzy table name matching.

| Parameter         | Description                  |
| ----------------- | ---------------------------- |
| `tableSearchTerm` | Partial table name to search |

```bash
curl "https://virtualpinballchat.com/vpc/api/v1/scoresByTableAndAuthorUsingFuzzyTableSearch?tableSearchTerm=myTable"
```

---

**GET /scoresByTableAndAuthorAndVersion**
Returns scores for a specific table, author, and version.

| Parameter       | Description    |
| --------------- | -------------- |
| `tableName`     | Table name     |
| `authorName`    | Author name    |
| `versionNumber` | Version number |

```bash
curl "https://virtualpinballchat.com/vpc/api/v1/scoresByTableAndAuthorAndVersion?tableName=myTable&authorName=johnDoe&versionNumber=1.0"
```

---

**GET /scoresByVpsId**
Returns scores for a specific VPS ID.

| Parameter | Description  |
| --------- | ------------ |
| `vpsId`   | VPS table ID |

```bash
curl "https://virtualpinballchat.com/vpc/api/v1/scoresByVpsId?vpsId=YsQs-_ejWL"
```

---

**GET /scoresByPlayer**
Returns all scores for a specific player.

| Parameter  | Description     |
| ---------- | --------------- |
| `username` | Player username |

```bash
curl "https://virtualpinballchat.com/vpc/api/v1/scoresByPlayer?username=ed209"
```

---

### Weeks

**GET /weeks**
Returns all weeks.

```bash
curl https://virtualpinballchat.com/vpc/api/v1/weeks
```

---

**GET /weeksByChannelName**
Returns all weeks grouped by channel name.

```bash
curl https://virtualpinballchat.com/vpc/api/v1/weeksByChannelName
```

---

**GET /currentWeek**
Returns the active week for a channel.

| Parameter     | Default              | Description  |
| ------------- | -------------------- | ------------ |
| `channelName` | `competition-corner` | Channel name |

```bash
curl "https://virtualpinballchat.com/vpc/api/v1/currentWeek?channelName=competition-corner"
```

---

**GET /recentWeeks**
Returns recent weeks for a channel. Supports pagination and search.

| Parameter     | Default              | Description          |
| ------------- | -------------------- | -------------------- |
| `channelName` | `competition-corner` | Channel name         |
| `limit`       | `13`                 | Number of results    |
| `offset`      | `0`                  | Pagination offset    |
| `searchTerm`  |                      | Filter by table name |

```bash
curl "https://virtualpinballchat.com/vpc/api/v1/recentWeeks?limit=5"
```

---

**GET /competitionWeeks**
Returns competition weeks with scores. Supports pagination and search.

| Parameter     | Default              | Description          |
| ------------- | -------------------- | -------------------- |
| `channelName` | `competition-corner` | Channel name         |
| `limit`       | `4`                  | Number of results    |
| `offset`      | `0`                  | Pagination offset    |
| `searchTerm`  |                      | Filter by table name |
| `week`        |                      | Specific week number |

```bash
curl "https://virtualpinballchat.com/vpc/api/v1/competitionWeeks?limit=10&week=1"
```

---

**GET /seasonWeeks**
Returns all weeks for a specific season and channel.

| Parameter     | Default              | Description   |
| ------------- | -------------------- | ------------- |
| `channelName` | `competition-corner` | Channel name  |
| `season`      | `1`                  | Season number |

```bash
curl "https://virtualpinballchat.com/vpc/api/v1/seasonWeeks?season=1"
```

---

**GET /iscored**
Proxies score data from iscored.info for a given room.

| Parameter | Description     |
| --------- | --------------- |
| `roomId`  | iScored room ID |

```bash
curl "https://virtualpinballchat.com/vpc/api/v1/iscored?roomId=1011"
```

---

### Leaderboard Images

All image endpoints return a PNG binary. Layouts:

- **`portrait`** — Single column, compact rows, optimized for mobile and Discord embeds (640x1168 for 20 rows, 608px tall for 10 rows)
- **`landscape`** — Three-column layout with table art, backglass image, and metadata (1920×1080)

---

**POST /generateWeeklyLeaderboard**
Generates a leaderboard image for the current active competition week.

| Parameter     | Default              | Description                           |
| ------------- | -------------------- | ------------------------------------- |
| `channelName` | `competition-corner` | Channel to fetch the active week from |
| `layout`      | `portrait`           | `portrait` or `landscape`             |
| `numRows`     | `20`                 | Number of scores to show              |

```bash
# Portrait (default 20 rows)
curl -X POST https://virtualpinballchat.com/vpc/api/v1/generateWeeklyLeaderboard \
  -H "Content-Type: application/json" \
  -d '{"layout": "portrait"}' \
  --output weekly_portrait.png

# Landscape
curl -X POST https://virtualpinballchat.com/vpc/api/v1/generateWeeklyLeaderboard \
  -H "Content-Type: application/json" \
  -d '{"layout": "landscape"}' \
  --output weekly_landscape.png
```

---

**POST /generateHighScoresLeaderboard**
Generates a leaderboard image for all-time high scores for a specific table.

| Parameter | Default     | Description                       |
| --------- | ----------- | --------------------------------- |
| `vpsId`   | required    | VPS table ID                      |
| `numRows` | `20`        | Number of scores to show (max 20) |
| `layout`  | `landscape` | `portrait` or `landscape`         |

```bash
# Landscape (default)
curl -X POST https://virtualpinballchat.com/vpc/api/v1/generateHighScoresLeaderboard \
  -H "Content-Type: application/json" \
  -d '{"vpsId": "YsQs-_ejWL"}' \
  --output highscores_landscape.png

# Portrait with 10 rows
curl -X POST https://virtualpinballchat.com/vpc/api/v1/generateHighScoresLeaderboard \
  -H "Content-Type: application/json" \
  -d '{"vpsId": "YsQs-_ejWL", "layout": "portrait", "numRows": 10}' \
  --output highscores_portrait.png
```

---

**POST /convert** _(legacy alias for /generateHighScoresLeaderboard)_
Retained for backwards compatibility. Accepts the same parameters as `/generateHighScoresLeaderboard`.

```bash
curl -X POST https://virtualpinballchat.com/vpc/api/v1/convert \
  -H "Content-Type: application/json" \
  -d '{"vpsId": "YsQs-_ejWL"}' \
  --output highscores.png
```

---

## VPC Score Agent API

Base URL: `https://virtualpinballchat.com/vpc/api/v2`

Endpoints for receiving score events from vpc-score-agent running on player cabinets. Data is written to POC collections (`poc_events`, `poc_tables`, `poc_weeks`) and does not affect production data.

---

**POST /events**
Accepts a raw score event from vpc-score-agent. Always logs to `poc_events`. On `game_end`, processes scores into `poc_tables` and `poc_weeks` if applicable.

| Field           | Required | Description                                            |
| --------------- | -------- | ------------------------------------------------------ |
| `userId`        | yes      | Discord user ID                                        |
| `username`      | yes      | Discord username                                       |
| `event`         | yes      | Event type: `game_start`, `current_scores`, `game_end` |
| `timestamp`     | yes      | ISO 8601 timestamp from the agent                      |
| `vpsId`         | no       | VPS table ID (required for score processing)           |
| `versionNumber` | no       | Table version number                                   |
| `rom`           | no       | ROM name as reported by VPX                            |
| `payload`       | no       | Event-specific data (see below)                        |

`game_end` payload shape:

```json
{
  "players": 1,
  "scores": [{ "player": "emb417", "score": "47250000" }],
  "game_duration": 342
}
```

Multiplayer sessions (`players > 1`) are discarded. Sessions with no `vpsId` are logged but not scored.

```bash
curl -X POST https://virtualpinballchat.com/vpc/api/v2/events \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "718313274164117505",
    "username": "emb417",
    "vpsId": "40Ne76_8Jn",
    "versionNumber": "1.0.0",
    "rom": "lostspc",
    "event": "game_end",
    "timestamp": "2026-03-16T18:00:00.000Z",
    "payload": {
      "players": 1,
      "scores": [{ "player": "emb417", "score": "47250000" }],
      "game_duration": 342
    }
  }'
```

---

**GET /active**
Returns all active and recently finished sessions grouped by `vpsId`, with past scores from `poc_tables` merged into each table's leaderboard. Used by the live leaderboard page in vpc-next.

Each table entry includes an `activeSessions` array indicating who is currently playing, and a `scores` array combining past scores with any live in-progress score. Live scores are flagged with `isLive: true`.

Sessions with no event received within 30 minutes are automatically expired before the response is returned.

```bash
curl https://virtualpinballchat.com/vpc/api/v2/active
```

Response shape:

```json
{
  "fetchedAt": "2026-03-16T18:00:00.000Z",
  "tables": [
    {
      "vpsId": "40Ne76_8Jn",
      "tableName": "Lost in Space (Sega 1998)",
      "activeSessions": [
        {
          "username": "emb417",
          "status": "playing",
          "currentScore": "32000000",
          "startedAt": "2026-03-16T17:55:00.000Z",
          "lastEventAt": "2026-03-16T17:59:00.000Z"
        }
      ],
      "scores": [
        {
          "username": "ed209",
          "score": 47250000,
          "isLive": false,
          "source": "vpc-score-agent"
        },
        {
          "username": "emb417",
          "score": 32000000,
          "isLive": true,
          "source": "vpc-score-agent"
        }
      ]
    }
  ]
}
```
