# GEMINI.md - VPC Data API Context

This file provides instructional context for the Virtual Pinball Chat (VPC) Data API project.

## Project Overview

The **VPC Data API** is a Node.js-based web service that provides access to competition data from the Virtual Pinball Chat community. It serves as a data backend for retrieving information about tables, scores, and competition weeks. Additionally, it includes a utility for converting text to images using the `canvas` library, likely for generating scoreboards or social media assets.

### Key Technologies

- **Runtime:** Node.js
- **Framework:** Express 5
- **Database:** MongoDB (via `mongodb` native driver)
- **Graphics:** `canvas` (for text-to-image conversion)
- **Logging:** Pino & Pino-HTTP
- **Environment Management:** `dotenv`

## Architecture & Structure

The project follows a modular structure:

- `src/index.js`: The entry point. Initializes Express, sets up logging, and mounts routes.
- `src/routers/api.v1.js`: Defines the v1 API endpoints and handles request logic.
- `src/utils/mongo.js`: A helper for MongoDB operations (connect, find, aggregate, etc.).
- `src/utils/pipeline.js`: Contains pure functions that return complex MongoDB aggregation pipelines for querying nested score data.
- `src/utils/canvas.js`: Functional utility for generating images from text using custom fonts.
- `src/resources/`: Contains the `.ttf` and `.otf` fonts used by the Canvas utility.

## Building and Running

### Prerequisites

- Node.js installed.
- A MongoDB Atlas instance (or local MongoDB) with a `tables` and `weeks` collection.
- Environment variables configured in a `.env` file.

### Commands

- **Start the application:** `npm start`
- **Build/Test:** (TODO: No explicit build or test scripts are currently defined in `package.json`)

### Environment Variables

The following variables are expected in the `.env` file:

- `PORT`: (Optional) Port to listen on (defaults to 3080).
- `DB_NAME`: MongoDB database name.
- `DB_USER`: MongoDB username.
- `DB_PASSWORD`: MongoDB password.

## API Endpoints (v1)

- `POST /api/v1/convert`: Converts text in `req.body.text` to a Data URI image, used to generate high score leaderboard images.
- `GET /api/v1/scoresByTable?tableName=...`: Get all scores for all tables, tableName can be supplied to filter results.
- `GET /api/v1/scoresByTableAndAuthor?tableName=...&authorName=...`: Get all scores for all tables grouped by author, tableName and authorName can be supplied to filter results to specific table and author combination.
- `GET /api/v1/scoresByVpsId?vpsId=...`: Get all scores for all tables grouped by VPS ID, vpsId can be supplied to filter results to specific table.
- `GET /api/v1/scoresByTableAndAuthorUsingFuzzyTableSearch?tableSearchTerm=...`: Get all scores for all tables grouped by author, partial tableName can be supplied to filter results to specific table and author combination.
- `GET /api/v1/scoresByTableAndAuthorAndVersion?tableName=...&authorName=...&versionNumber=...`: Get all scores for all tables grouped by tableName, authorName, and versionNumber, which can also be supplied to filter results to specific table, author and version combination.
- `GET /api/v1/tables`: Get metadata for all tables.
- `GET /api/v1/tablesWithAuthorVersion`: Get metadata for all tables grouped by author and version info.
- `GET /api/v1/weeks`: Get tables and scores for all competition weeks.
- `GET /api/v1/weeksByChannelName?channelName=...`: Get tables and scores for all weeks grouped by channel, channelName can be supplied to filter results to a specific channel.
- `GET /api/v1/currentWeek?channelName=...`: Get the table and scores for the active week for the competition-corner channel, channelName can be supplied to filter results to another channel.
- `GET /api/v1/recentWeeks?limit=...&channelName=...`: Get the table and scores for the last 13 most recent weeks for the competition-corner channel, channelName can be supplied to filter results to another channel and limit can be supplied to change the number of weeks returned.
- `GET /api/v1/recentTablesByHighscores?limit=...&offset=...&searchTerm=...`: Get the highscores for all of the tables paginated, limit can be supplied to change the number of tables returned, an offset can be supplied to change the pagination offset, and a searchTerm can be supplied to filter results based on the table name.

## Development Conventions

- **ES Modules:** The project uses `import`/`export` syntax.
- **Asynchronous Code:** Heavy use of `async`/`await` for database and file operations.
- **MongoDB Aggregations:** Complex data retrieval is handled via pipelines in `src/utils/pipeline.js` rather than application-side filtering.
- **Logging:** Use the `logger` from `src/utils/logger.js` for consistent output, not `console.log`.
- **Error Handling:** Currently relies on Express's default error handling; adding middleware for centralized error handling is a potential improvement.
