var scraper = require("./src/scraper/index");
var sb = require("./src/supabase/supabase");

async function main() {
  const JSON_FILEPATH = "sample\\data\\spring2024";

  await scraper.runScraper(JSON_FILEPATH);

  await sb.populateSupabaseTable(JSON_FILEPATH);
}

main();
