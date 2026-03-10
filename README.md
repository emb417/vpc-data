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

- **`portrait`** — Single column, compact rows, optimized for mobile and Discord embeds (640px wide, height scales with score count)
- **`landscape`** — Three-column layout with table art, backglass image, and metadata (1920×1080)

---

**POST /generateWeeklyLeaderboard**
Generates a leaderboard image for the current active competition week.

| Parameter     | Default              | Description                           |
| ------------- | -------------------- | ------------------------------------- |
| `channelName` | `competition-corner` | Channel to fetch the active week from |
| `layout`      | `portrait`           | `portrait` or `landscape`             |

```bash
# Portrait (default)
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
