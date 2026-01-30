# VPC Data API

The VPC Data API is a web service that provides access to data from the Virtual Pinball Chat Competition Corner. This API allows developers to retrieve and utilize data from the competition, including tables, scores, and weeks, to build innovative applications and integrations.

Let me know if you'd like me to make any changes!

## **API Endpoints**

The VPC Data Service provides the following API endpoints:

### Tables

**GET /tables**: Returns a list of all tables.

- Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/tables
```

- Response: A JSON array of table objects

---

**GET /tablesWithAuthorVersion**: Returns a list of tables with author and version information.

- Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/tablesWithAuthorVersion
```

- Response: A JSON array of table objects with author and version information

---

**GET /recentTablesByHighscores**: Returns tables sorted by the most recent highscores. Supports pagination and search. Query parameters: `limit` (default 4), `offset` (default 0), `searchTerm`.

- Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/recentTablesByHighscores?limit=10&searchTerm=Addams
```

- Response: A JSON object containing `totalCount` and `results` (an array of table objects with scores)

### Scores

---

**GET /scoresByTable**: Returns scores for a specific table. Query parameter: `tableName`.

- Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/scoresByTable?tableName=myTable
```

- Response: A JSON object containing scores for the specified table

---

**GET /scoresByTableAndAuthor**: Returns scores for a specific table and author. Query parameters: `tableName`, `authorName`.

- Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/scoresByTableAndAuthor?tableName=myTable&authorName=johnDoe
```

- Response: A JSON object containing scores for the specified table and author

---

**GET /scoresByTableAndAuthorUsingFuzzyTableSearch**: Returns scores for a specific table and author using fuzzy table search. Query parameter: `tableSearchTerm`.

- Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/scoresByTableAndAuthorUsingFuzzyTableSearch?tableSearchTerm=myTable
```

- Response: A JSON object containing scores for the specified table and author, using fuzzy search

---

**GET /scoresByTableAndAuthorAndVersion**: Returns scores for a specific table, author, and version. Query parameters: `tableName`, `authorName`, `versionNumber`.

- Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/scoresByTableAndAuthorAndVersion?tableName=myTable&authorName=johnDoe&versionNumber=1.0
```

- Response: A JSON object containing scores for the specified table, author, and version

---

**GET /scoresByVpsId**: Returns scores for a specific VPS ID. Query parameter: `vpsId`.

- Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/scoresByVpsId?vpsId=12345
```

- Response: A JSON object containing scores for the specified VPS ID

### Weeks

---

**GET /weeks**: Returns a list of all weeks.

- Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/weeks
```

- Response: A JSON array of week objects

---

**GET /weeksByChannelName**: Returns a list of weeks grouped by channel name.

- Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/weeksByChannelName
```

- Response: A JSON array of week objects, grouped by channel name

---

**GET /currentWeek**: Returns the current week for a specific channel. Query parameter: `channelName` (optional, defaults to "competition-corner").

- Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/currentWeek?channelName=myChannel
```

- Response: A JSON object containing the current week for the specified channel

---

**GET /recentWeeks**: Returns the most recent weeks for a specific channel. Query parameters: `channelName` (default "competition-corner"), `limit` (default 13), `offset` (default 0), `searchTerm`.

- Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/recentWeeks?limit=5
```

- Response: A JSON array of week objects

---

**GET /competitionWeeks**: Returns competition weeks with scores. Supports pagination and search. Query parameters: `limit` (default 4), `offset` (default 0), `searchTerm`, `week` (specific week number).

- Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/competitionWeeks?limit=10&week=1
```

- Response: A JSON object containing `totalCount` and `results` (an array of week objects with scores)

---

**GET /seasonWeeks**: Returns all weeks for a specific season and channel. Query parameters: `channelName` (default "competition-corner"), `season` (default 1).

- Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/seasonWeeks?season=1
```

- Response: A JSON array of week objects for the specified season

---

**GET /iscored**: Returns scores for a specific room ID. Query parameter: `roomId`.

- Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/iscored?roomId=1011
```

- Response: A JSON object containing scores for the specified room ID

### Utilities

- **POST /convert**: Converts text to a PNG image (Data URI). Request body should be JSON with a `text` field.
  - Example:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"text":"Hello World"}' https://virtualpinballchat.com:8443/vpc/api/v1/convert
```

- Response: A Data URI string representing the generated image
