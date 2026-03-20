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
    {
      $addFields: {
        versionParts: {
          $map: {
            input: { $split: ["$versionNumber", "."] },
            as: "p",
            in: {
              $convert: {
                input: {
                  $trim: {
                    input: {
                      $ltrim: {
                        input: "$$p",
                        chars:
                          "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ",
                      },
                    },
                  },
                },
                to: "int",
                onError: 0,
                onNull: 0,
              },
            },
          },
        },
      },
    },
    {
      $sort: {
        tableName: 1,
        authorName: 1,
        "versionParts.0": -1,
        "versionParts.1": -1,
        "versionParts.2": -1,
      },
    },
    {
      $unset: "versionParts",
    },
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

const getTablesByHighscores = (limit, offset, searchTerm, vpsId) => {
  const pipeline = [];

  if (searchTerm) {
    pipeline.push({
      $match: { tableName: { $regex: `.*${searchTerm}.*`, $options: "i" } },
    });
  }
  if (vpsId) {
    pipeline.push({
      $match: { "authors.vpsId": vpsId },
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

const getCompetitionWeeks = (limit, offset, searchTerm, week, channelName) => {
  const pipeline = [];

  pipeline.push({ $match: { channelName } });

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

const getScoresByPlayer = (username) => {
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
        versionId: "$authors.versions._id",
        versionNumber: "$authors.versions.versionNumber",
        scoreId: "$authors.versions.scores._id",
        user: "$authors.versions.scores.user",
        userName: "$authors.versions.scores.username",
        score: "$authors.versions.scores.score",
        posted: { $toDate: "$authors.versions.scores.createdAt" },
        postUrl: "$authors.versions.scores.postUrl",
        _id: 0,
      },
    },
    { $sort: { tableName: 1, authorName: 1, versionNumber: 1, score: -1 } },
    {
      $group: {
        _id: {
          tableName: "$tableName",
          authorName: "$authorName",
          versionNumber: "$versionNumber",
        },
        vpsId: { $first: "$vpsId" },
        scores: {
          $push: {
            userName: "$userName",
            score: "$score",
            posted: "$posted",
            postUrl: "$postUrl",
          },
        },
      },
    },
    {
      $unwind: {
        path: "$scores",
        includeArrayIndex: "rank",
      },
    },
    { $match: { "scores.userName": username } },
    {
      $project: {
        tableName: "$_id.tableName",
        authorName: "$_id.authorName",
        versionNumber: "$_id.versionNumber",
        vpsId: "$vpsId",
        score: "$scores.score",
        posted: "$scores.posted",
        postUrl: "$scores.postUrl",
        rank: { $add: ["$rank", 1] },
        _id: 0,
      },
    },
    { $sort: { score: -1 } },
    {
      $group: {
        _id: {
          tableName: "$tableName",
          authorName: "$authorName",
          versionNumber: "$versionNumber",
        },
        tableName: { $first: "$tableName" },
        authorName: { $first: "$authorName" },
        versionNumber: { $first: "$versionNumber" },
        vpsId: { $first: "$vpsId" },
        score: { $first: "$score" },
        posted: { $first: "$posted" },
        postUrl: { $first: "$postUrl" },
        rank: { $first: "$rank" },
      },
    },
    { $sort: { tableName: 1 } },
  ];

  return pipeline;
};

export default {
  getScoresByVpsId,
  getFuzzyTableSearch,
  getTablesByHighscores,
  getCompetitionWeeks,
  getScoresByPlayer,
};
