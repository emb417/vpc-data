import { getOrRefreshGamesData } from "./cache.js";

let memoizedLookup = null;
let lastGamesData = null;

export const getVpsLookup = async () => {
  const vpsData = await getOrRefreshGamesData();
  
  if (memoizedLookup && vpsData === lastGamesData) {
    return memoizedLookup;
  }

  memoizedLookup = Object.fromEntries(
    vpsData
      .flatMap((g) =>
        (g.tableFiles ?? []).map((t) => [
          t.id,
          {
            maker: g.manufacturer,
            year: g.year,
            designer: g.designers?.[0] ?? null,
            imgUrl: g.b2sFiles?.[0]?.imgUrl || null,
            tableUrl: t.urls?.[0]?.url,
            name: g.name,
            version: t.version,
            authors: t.authors,
          },
        ]),
      )
      .filter(([id]) => id),
  );
  
  lastGamesData = vpsData;
  return memoizedLookup;
};

export const enrichItemsWithVpsData = async (items, vpsIdField = "vpsId") => {
  const vpsLookup = await getVpsLookup();
  return items.map((item) => {
    const vpsId = item[vpsIdField];
    if (vpsId && vpsLookup[vpsId]) {
      return { ...item, vpsData: vpsLookup[vpsId] };
    }
    return item;
  });
};
