# VPC Data API

The VPC Data API is a web service that provides access to data from the Virtual Pinball Chat Competition Corner. This API allows developers to retrieve and utilize data from the competition, including tables, scores, and weeks, to build innovative applications and integrations.

Let me know if you'd like me to make any changes!

## **API Endpoints**

The VPC Data Service provides the following API endpoints:

### Tables

- **GET /tables**: Returns a list of all tables.
  - Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/tables
```

- Response: A JSON array of table objects

- **GET /tablesWithAuthorVersion**: Returns a list of tables with author and version information.
  - Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/tablesWithAuthorVersion
```

- Response: A JSON array of table objects with author and version information

### Scores

- **GET /scoresByTable**: Returns scores for a specific table. Query parameter: `tableName`.
  - Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/scoresByTable?tableName=myTable
```

- Response: A JSON object containing scores for the specified table

- **GET /scoresByTableAndAuthor**: Returns scores for a specific table and author. Query parameters: `tableName`, `authorName`.
  - Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/scoresByTableAndAuthor?tableName=myTable&authorName=johnDoe
```

- Response: A JSON object containing scores for the specified table and author

- **GET /scoresByTableAndAuthorUsingFuzzyTableSearch**: Returns scores for a specific table and author using fuzzy table search. Query parameter: `tableSearchTerm`.
  - Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/scoresByTableAndAuthorUsingFuzzyTableSearch?tableSearchTerm=myTable
```

- Response: A JSON object containing scores for the specified table and author, using fuzzy search

- **GET /scoresByTableAndAuthorAndVersion**: Returns scores for a specific table, author, and version. Query parameters: `tableName`, `authorName`, `versionNumber`.
  - Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/scoresByTableAndAuthorAndVersion?tableName=myTable&authorName=johnDoe&versionNumber=1.0
```

- Response: A JSON object containing scores for the specified table, author, and version

- **GET /scoresByVpsId**: Returns scores for a specific VPS ID. Query parameter: `vpsId`.
  - Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/scoresByVpsId?vpsId=12345
```

- Response: A JSON object containing scores for the specified VPS ID

### Weeks

- **GET /weeks**: Returns a list of all weeks.
  - Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/weeks
```

- Response: A JSON array of week objects

- **GET /weeksByChannelName**: Returns a list of weeks grouped by channel name.
  - Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/weeksByChannelName
```

- Response: A JSON array of week objects, grouped by channel name

- **GET /currentWeek**: Returns the current week for a specific channel. Query parameter: `channelName` (optional, defaults to "competition-corner").
  - Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/currentWeek?channelName=myChannel
```

- Response: A JSON object containing the current week for the specified channel

- **GET /iscored**: Returns scores for a specific room ID. Query parameter: `roomId`.
  - Example:

```bash
curl https://virtualpinballchat.com:8443/vpc/api/v1/iscored?roomId=1011
```

- Response: A JSON object containing scores for the specified room ID
