var scraper = require("./src/scraper/index");
var sb = require("./src/supabase/supabase");
var path = require("path");

async function main() {
  const JSON_FILENAME = "data\\spring2024";

  await scraper.runScraper(JSON_FILENAME);

  await sb.populateSupabaseTable(JSON_FILENAME);
}

main();
