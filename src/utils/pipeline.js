const getScoresByTablePipeline = (tableName) => {
  const pipeline = [];

  if (tableName) {
    pipeline.push({ $match: { tableName: tableName } });
  }

  pipeline.push(
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
  );

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

const getScoresByTableAndAuthorPipeline = (tableName, authorName) => {
  const pipeline = [];

  if (tableName && authorName) {
    pipeline.push({
      $match: { tableName: tableName, "authors.authorName": authorName },
    });
  } else if (tableName) {
    pipeline.push({ $match: { tableName: tableName } });
  } else if (authorName) {
    pipeline.push({ $match: { "authors.authorName": authorName } });
  }

  pipeline.push(
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
  );

  // Filter specific author after unwind if we matched by authorName initially
  if (authorName) {
    pipeline.push({ $match: { "authors.authorName": authorName } });
  }

  pipeline.push(
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

const getScoresByTableAndAuthorAndVersionPipeline = (
  tableName,
  authorName,
  versionNumber,
) => {
  const pipeline = [];

  if (tableName && authorName && versionNumber) {
    pipeline.push({
      $match: {
        tableName: tableName,
        "authors.authorName": authorName,
        "authors.versions.versionNumber": versionNumber,
      },
    });
  }

  pipeline.push(
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
  );

  // Filter specific author and version after unwind
  if (authorName && versionNumber) {
    pipeline.push({
      $match: {
        "authors.authorName": authorName,
        "authors.versions.versionNumber": versionNumber,
      },
    });
  }

  pipeline.push(
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

const getScoresByVpsIdPipeline = (vpsId) => {
  const pipeline = [];

  if (vpsId) {
    pipeline.push({ $match: { "authors.vpsId": vpsId } });
  }

  pipeline.push(
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
  );

  if (vpsId) {
    pipeline.push({ $match: { "authors.vpsId": vpsId } });
  }

  pipeline.push(
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
    { $sort: { tableName: 1, score: -1 } },
    {
      $group: {
        _id: {
          tableName: "$tableName",
          authorName: "$authorName",
          vpsId: "$vpsId",
          comment: "$comment",
        },
        scores: {
          $push: {
            $cond: [
              { $gt: ["$scoreId", 0] },
              {
                tableId: "$tableId",
                tableName: "$tableName",
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
        scores: { $setDifference: ["$scores", [null]] },
        _id: 0,
      },
    },
    { $sort: { tableName: 1, authorName: 1 } },
  );

  return pipeline;
};

const getFuzzyTableSearchPipeline = (searchTerm) => {
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
    { $sort: { tableName: 1, vpsId: 1, score: -1 } },
    {
      $group: {
        _id: {
          tableId: "$tableId",
          tableName: "$tableName",
          authorId: "$authorId",
          authorName: "$authorName",
          vpsId: "$vpsId",
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
        vpsId: "$_id.vpsId",
        scores: { $setDifference: ["$scores", [null]] },
        _id: 0,
      },
    },
    { $sort: { tableName: 1, vpsId: 1 } },
  ];
};

const getTablesWithAuthorVersionPipeline = () => {
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

const getWeeksByChannelNamePipeline = () => {
  return [
    {
      $project: {
        _id: 0,
        channelName: "$channelName",
        weekData: "$$ROOT",
      },
    },
    { $sort: { weekNumber: -1 } },
    {
      $group: {
        _id: {
          channelName: "$channelName",
        },
        weeks: { $push: "$weekData" },
      },
    },
    {
      $project: {
        _id: 0,
        channelName: "$_id.channelName",
        weeks: "$weeks",
      },
    },
    { $sort: { channelName: 1 } },
  ];
};

export {
  getScoresByTablePipeline,
  getScoresByTableAndAuthorPipeline,
  getScoresByTableAndAuthorAndVersionPipeline,
  getScoresByVpsIdPipeline,
  getFuzzyTableSearchPipeline,
  getTablesWithAuthorVersionPipeline,
  getWeeksByChannelNamePipeline,
};
