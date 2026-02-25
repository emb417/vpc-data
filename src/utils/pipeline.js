const getScoresByTable = (tableName) => {
  const pipeline = [
    { $unwind: "$authors" },
    {
      $unwind: {
        path: "$authors.versions",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$authors.versions.scores",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        tableId: "$_id",
        tableName: "$tableName",
        authorId: "$authors._id",
        authorName: "$authors.authorName",
        versionId: "$authors.versions._id",
        versionNumber: "$authors.versions.versionNumber",
        scoreId: "$authors.versions.scores._id",
        user: "$authors.versions.scores.user",
        userName: "$authors.versions.scores.username",
        score: "$authors.versions.scores.score",
        // Convert createdAt to a Date object for sorting
        posted: { $toDate: "$authors.versions.scores.createdAt" },
        postUrl: "$authors.versions.scores.postUrl",
        _id: 0,
      },
    },
  ];

  if (tableName) {
    pipeline.push({ $match: { tableName: tableName } });
  }

  pipeline.push(
    { $sort: { tableName: 1, score: -1 } },
    {
      $group: {
        _id: {
          tableId: "$tableId",
          tableName: "$tableName",
        },
        scores: {
          $push: {
            authorId: "$authorId",
            authorName: "$authorName",
            versionId: "$versionId",
            versionNumber: "$versionNumber",
            scoreId: "$scoreId",
            user: "$user",
            userName: "$userName",
            score: "$score",
            posted: "$posted",
            postUrl: "$postUrl",
          },
        },
      },
    },
    {
      $project: {
        tableId: "$_id.tableId",
        tableName: "$_id.tableName",
        scores: "$scores",
        _id: 0,
      },
    },
    { $sort: { tableName: 1 } },
  );

  return pipeline;
};

const getScoresByTableAndAuthor = (tableName, authorName) => {
  const pipeline = [
    { $unwind: "$authors" },
    {
      $unwind: {
        path: "$authors.versions",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$authors.versions.scores",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        tableId: "$_id",
        tableName: "$tableName",
        authorId: "$authors._id",
        authorName: "$authors.authorName",
        versionId: "$authors.versions._id",
        versionNumber: "$authors.versions.versionNumber",
        scoreId: "$authors.versions.scores._id",
        user: "$authors.versions.scores.user",
        userName: "$authors.versions.scores.username",
        score: "$authors.versions.scores.score",
        posted: "$authors.versions.scores.createdAt",
        postUrl: "$authors.versions.scores.postUrl",
        _id: 0,
      },
    },
  ];

  if (tableName && authorName) {
    pipeline.push({ $match: { tableName: tableName, authorName: authorName } });
  }

  pipeline.push(
    { $sort: { tableName: 1, authorName: 1, score: -1 } },
    {
      $group: {
        _id: {
          tableId: "$tableId",
          tableName: "$tableName",
          authorId: "$authorId",
          authorName: "$authorName",
        },
        scores: {
          $push: {
            $cond: [
              { $gt: ["$scoreId", 0] },
              {
                versionId: "$versionId",
                versionNumber: "$versionNumber",
                scoreId: "$scoreId",
                user: "$user",
                userName: "$userName",
                score: "$score",
                posted: "$posted",
                postUrl: "$postUrl",
              },
              null,
            ],
          },
        },
      },
    },
    {
      $project: {
        tableId: "$_id.tableId",
        tableName: "$_id.tableName",
        authorId: "$_id.authorId",
        authorName: "$_id.authorName",
        scores: { $setDifference: ["$scores", [null]] },
        _id: 0,
      },
    },
    { $sort: { tableName: 1, authorName: 1 } },
  );

  return pipeline;
};

const getScoresByTableAndAuthorAndVersion = (
  tableName,
  authorName,
  versionNumber,
) => {
  const pipeline = [
    { $unwind: "$authors" },
    {
      $unwind: {
        path: "$authors.versions",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$authors.versions.scores",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        tableId: "$_id",
        tableName: "$tableName",
        authorId: "$authors._id",
        authorName: "$authors.authorName",
        versionId: "$authors.versions._id",
        versionNumber: "$authors.versions.versionNumber",
        scoreId: "$authors.versions.scores._id",
        user: "$authors.versions.scores.user",
        userName: "$authors.versions.scores.username",
        score: "$authors.versions.scores.score",
        posted: "$authors.versions.scores.createdAt",
        postUrl: "$authors.versions.scores.postUrl",
        _id: 0,
      },
    },
  ];

  if (tableName && authorName && versionNumber) {
    pipeline.push({
      $match: {
        tableName: tableName,
        authorName: authorName,
        versionNumber: versionNumber,
      },
    });
  }

  pipeline.push(
    { $sort: { tableName: 1, authorName: 1, score: -1 } },
    {
      $group: {
        _id: {
          tableId: "$tableId",
          tableName: "$tableName",
          authorId: "$authorId",
          authorName: "$authorName",
          versionId: "$versionId",
          versionNumber: "$versionNumber",
        },
        scores: {
          $push: {
            scoreId: "$scoreId",
            user: "$user",
            userName: "$userName",
            score: "$score",
            posted: "$posted",
            postUrl: "$postUrl",
          },
        },
      },
    },
    {
      $project: {
        tableId: "$_id.tableId",
        tableName: "$_id.tableName",
        authorId: "$_id.authorId",
        authorName: "$_id.authorName",
        versionId: "$_id.versionId",
        versionNumber: "$_id.versionNumber",
        scores: "$scores",
        _id: 0,
      },
    },
    { $sort: { tableName: 1, authorName: 1, versionNumber: -1 } },
  );

  return pipeline;
};

const getScoresByVpsId = (vpsId) => {
  const pipeline = [
    { $unwind: "$authors" },
    {
      $unwind: {
        path: "$authors.versions",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$authors.versions.scores",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        tableId: "$_id",
        tableName: "$tableName",
        authorId: "$authors._id",
        authorName: "$authors.authorName",
        vpsId: "$authors.vpsId",
        comment: "$authors.comment",
        versionId: "$authors.versions._id",
        versionNumber: "$authors.versions.versionNumber",
        scoreId: "$authors.versions.scores._id",
        user: "$authors.versions.scores.user",
        userName: "$authors.versions.scores.username",
        score: "$authors.versions.scores.score",
        posted: "$authors.versions.scores.createdAt",
        postUrl: "$authors.versions.scores.postUrl",
        _id: 0,
      },
    },
  ];

  if (vpsId) {
    pipeline.push({ $match: { vpsId: vpsId } });
  }

  pipeline.push(
    { $sort: { tableName: 1, versionNumber: -1, score: -1 } },
    {
      $group: {
        _id: {
          tableId: "$tableId",
          tableName: "$tableName",
          authorId: "$authorId",
          authorName: "$authorName",
          comment: "$comment",
          versionId: "$versionId",
          versionNumber: "$versionNumber",
          vpsId: "$vpsId",
        },
        scores: {
          $push: {
            $cond: [
              { $gt: ["$scoreId", 0] },
              {
                scoreId: "$scoreId",
                user: "$user",
                userName: "$userName",
                score: "$score",
                posted: "$posted",
                postUrl: "$postUrl",
              },
              null,
            ],
          },
        },
      },
    },
    {
      $project: {
        vpsId: "$_id.vpsId",
        tableName: "$_id.tableName",
        authorName: "$_id.authorName",
        comment: "$_id.comment",
        versionNumber: "$_id.versionNumber",
        scores: { $setDifference: ["$scores", [null]] },
        _id: 0,
      },
    },
    { $sort: { tableName: 1, authorName: 1 } },
  );

  return pipeline;
};

const getFuzzyTableSearch = (searchTerm) => {
  return [
    { $match: { tableName: { $regex: `.*${searchTerm}*`, $options: "i" } } },
    { $unwind: "$authors" },
    {
      $unwind: {
        path: "$authors.versions",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$authors.versions.scores",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        tableId: "$_id",
        tableName: "$tableName",
        authorId: "$authors._id",
        authorName: "$authors.authorName",
        comment: "$authors.comment",
        vpsId: "$authors.vpsId",
        versionId: "$authors.versions._id",
        versionNumber: "$authors.versions.versionNumber",
        scoreId: "$authors.versions.scores._id",
        user: "$authors.versions.scores.user",
        userName: "$authors.versions.scores.username",
        score: "$authors.versions.scores.score",
        posted: "$authors.versions.scores.createdAt",
        postUrl: "$authors.versions.scores.postUrl",
        _id: 0,
      },
    },
    { $sort: { tableName: 1, versionNumber: -1, score: -1 } },
    {
      $group: {
        _id: {
          tableId: "$tableId",
          tableName: "$tableName",
          authorId: "$authorId",
          authorName: "$authorName",
          comment: "$comment",
          versionId: "$versionId",
          versionNumber: "$versionNumber",
          vpsId: "$vpsId",
        },
        scores: {
          $push: {
            $cond: [
              { $gt: ["$scoreId", 0] },
              {
                scoreId: "$scoreId",
                user: "$user",
                userName: "$userName",
                score: "$score",
                posted: "$posted",
                postUrl: "$postUrl",
              },
              null,
            ],
          },
        },
      },
    },
    {
      $project: {
        vpsId: "$_id.vpsId",
        tableName: "$_id.tableName",
        authorName: "$_id.authorName",
        comment: "$_id.comment",
        versionNumber: "$_id.versionNumber",
        scores: { $setDifference: ["$scores", [null]] },
        _id: 0,
      },
    },
    { $sort: { tableName: 1, vpsId: 1 } },
  ];
};

const getTablesWithAuthorVersion = () => {
  return [
    { $unwind: "$authors" },
    {
      $unwind: {
        path: "$authors.versions",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        tableId: { $toString: "$_id" },
        tableName: "$tableName",
        authorId: { $toString: "$authors._id" },
        authorName: "$authors.authorName",
        versionId: { $toString: "$authors.versions._id" },
        versionNumber: "$authors.versions.versionNumber",
        tableUrl: "$authors.versions.versionUrl",
        scores: "$authors.versions.scores",
        postUrl: "$authors.versions.scores.postUrl",
        _id: 0,
      },
    },
    { $sort: { tableName: 1, authorName: -1, versionNumber: -1 } },
    {
      $group: {
        _id: {
          tableId: "$tableId",
          tableName: "$tableName",
          authorId: "$authorId",
          authorName: "$authorName",
        },
        versionId: { $first: "$versionId" },
        versionNumber: { $first: "$versionNumber" },
        tableUrl: { $first: "$tableUrl" },
        scores: { $first: "$scores" },
        postUrl: { $first: "$postUrl" },
      },
    },
    {
      $project: {
        tableId: "$_id.tableId",
        tableName: "$_id.tableName",
        authorId: "$_id.authorId",
        authorName: "$_id.authorName",
        versionId: "$versionId",
        versionNumber: "$versionNumber",
        tableUrl: "$tableUrl",
        scores: "$scores",
        postUrl: "$postUrl",
        _id: 0,
      },
    },
    { $sort: { tableName: 1, authorName: -1, versionNumber: -1 } },
  ];
};

const getTablesByHighscores = (limit, offset, searchTerm) => {
  const pipeline = [];

  if (searchTerm) {
    pipeline.push({
      $match: { tableName: { $regex: `.*${searchTerm}.*`, $options: "i" } },
    });
  }

  pipeline.push(
    { $unwind: "$authors" },
    {
      $unwind: { path: "$authors.versions", preserveNullAndEmptyArrays: true },
    },
    {
      $unwind: {
        path: "$authors.versions.scores",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        tableId: { $toString: "$_id" },
        tableName: "$tableName",
        tableUrl: "$authors.versions.versionUrl",
        authorId: { $toString: "$authors._id" },
        authorName: "$authors.authorName",
        vpsId: "$authors.vpsId",
        versionId: { $toString: "$authors.versions._id" },
        versionNumber: "$authors.versions.versionNumber",
        scoreId: { $toString: "$authors.versions.scores._id" },
        user: "$authors.versions.scores.user",
        userName: "$authors.versions.scores.username",
        score: "$authors.versions.scores.score",
        posted: { $toDate: "$authors.versions.scores.createdAt" },
        postUrl: "$authors.versions.scores.postUrl",
        _id: 0,
      },
    },
    {
      $group: {
        _id: {
          tableId: "$tableId",
          tableName: "$tableName",
          tableUrl: "$tableUrl",
          authorId: "$authorId",
          authorName: "$authorName",
          vpsId: "$vpsId",
          versionId: "$versionId",
          versionNumber: "$versionNumber",
        },
        latestScoreDate: { $max: "$posted" },
        scores: {
          $push: {
            scoreId: "$scoreId",
            user: "$user",
            userName: "$userName",
            score: "$score",
            posted: "$posted",
            postUrl: "$postUrl",
          },
        },
      },
    },
    { $sort: { latestScoreDate: -1 } },
    {
      $facet: {
        totalCount: [{ $count: "count" }],
        results: [
          { $skip: offset },
          { $limit: limit },
          {
            $project: {
              tableId: "$_id.tableId",
              tableName: "$_id.tableName",
              tableUrl: "$_id.tableUrl",
              authorId: "$_id.authorId",
              authorName: "$_id.authorName",
              vpsId: "$_id.vpsId",
              versionId: "$_id.versionId",
              versionNumber: "$_id.versionNumber",
              scores: {
                $sortArray: {
                  input: "$scores",
                  sortBy: { score: -1 },
                },
              },
              _id: 0,
            },
          },
        ],
      },
    },
    {
      $project: {
        totalCount: {
          $ifNull: [{ $arrayElemAt: ["$totalCount.count", 0] }, 0],
        },
        results: 1,
      },
    },
  );
  return pipeline;
};

const getCompetitionWeeks = (limit, offset, searchTerm, week) => {
  const pipeline = [];

  if (week) {
    pipeline.push({ $match: { weekNumber: week } });
  } else if (searchTerm) {
    pipeline.push({
      $match: { table: { $regex: `.*${searchTerm}.*`, $options: "i" } },
    });
  }

  pipeline.push(
    {
      $unwind: {
        path: "$scores",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        postedDate: {
          $dateFromString: {
            dateString: "$scores.posted",
            onError: null,
            onNull: null,
          },
        },
      },
    },
    {
      $project: {
        weekId: { $toString: "$_id" },
        channelName: 1,
        weekNumber: 1,
        periodStart: 1,
        periodEnd: 1,
        table: 1,
        tableUrl: 1,
        romUrl: 1,
        romName: 1,
        b2sUrl: 1,
        vpsId: 1,
        versionNumber: 1,
        authorName: 1,
        season: 1,
        currentSeasonWeekNumber: 1,
        isArchived: 1,
        scoreUser: "$scores.username",
        scoreAvatar: "$scores.userAvatarUrl",
        scoreValue: "$scores.score",
        scorePosted: "$postedDate",
        scoreDiff: "$scores.diff",
        scorePoints: "$scores.points",

        _id: 0,
      },
    },
    {
      $group: {
        _id: {
          weekId: "$weekId",
          channelName: "$channelName",
          weekNumber: "$weekNumber",
          periodStart: "$periodStart",
          periodEnd: "$periodEnd",
          table: "$table",
          tableUrl: "$tableUrl",
          romUrl: "$romUrl",
          romName: "$romName",
          b2sUrl: "$b2sUrl",
          vpsId: "$vpsId",
          versionNumber: "$versionNumber",
          authorName: "$authorName",
          season: "$season",
          currentSeasonWeekNumber: "$currentSeasonWeekNumber",
          isArchived: "$isArchived",
        },
        scores: {
          $push: {
            username: "$scoreUser",
            userAvatarUrl: "$scoreAvatar",
            score: "$scoreValue",
            posted: "$scorePosted",
            diff: "$scoreDiff",
            points: "$scorePoints",
          },
        },
      },
    },
    { $sort: { "_id.weekNumber": -1 } },
    {
      $facet: {
        totalCount: [{ $count: "count" }],
        results: [
          { $skip: offset },
          { $limit: limit },
          {
            $project: {
              weekId: "$_id.weekId",
              channelName: "$_id.channelName",
              weekNumber: "$_id.weekNumber",
              periodStart: "$_id.periodStart",
              periodEnd: "$_id.periodEnd",
              table: "$_id.table",
              tableUrl: "$_id.tableUrl",
              romUrl: "$_id.romUrl",
              romName: "$_id.romName",
              b2sUrl: "$_id.b2sUrl",
              vpsId: "$_id.vpsId",
              versionNumber: "$_id.versionNumber",
              authorName: "$_id.authorName",
              season: "$_id.season",
              currentSeasonWeekNumber: "$_id.currentSeasonWeekNumber",
              isArchived: "$_id.isArchived",
              scores: {
                $sortArray: {
                  input: "$scores",
                  sortBy: { score: -1 },
                },
              },

              _id: 0,
            },
          },
        ],
      },
    },
    {
      $project: {
        totalCount: {
          $ifNull: [{ $arrayElemAt: ["$totalCount.count", 0] }, 0],
        },
        results: 1,
      },
    },
  );

  return pipeline;
};

export default {
  getScoresByTable,
  getScoresByTableAndAuthor,
  getScoresByTableAndAuthorAndVersion,
  getScoresByVpsId,
  getFuzzyTableSearch,
  getTablesWithAuthorVersion,
  getTablesByHighscores,
  getCompetitionWeeks,
};
