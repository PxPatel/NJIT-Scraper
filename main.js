var scraper = require("./src/alt_scraper/index");
var sb = require("./src/alt_supabase/alt_supabase");

async function main() {
  const FILE_DIRECTORY = "sample\\alt";

  // const semesterDetails = {
  //   year: "2023",
  //   season: "summer",
  // };

  if (typeof semesterDetails === "undefined") {
    await scraper.runScraper(FILE_DIRECTORY);
  } else {
    await scraper.runScraper(FILE_DIRECTORY, semesterDetails);
  }

  // await sb.addSemesterDataToSupabase(FILE_DIRECTORY, semesterDetails);
}

main();
