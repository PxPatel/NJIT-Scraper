var scraper = require("./src/alt_scraper/index");
var sb = require("./src/alt_supabase/alt_supabase");

async function main() {
  const FILE_DIRECTORY = "sample\\alt";

  // const semesterDetails = {
  //   year: "2023",
  //   season: "Summer",
  // };

  const semesterDetails = {
    year: "" || process.env.YEAR,
    season: "" || process.env.SEASON,
  };

  console.log(semesterDetails);

  console.time("FULL OPERATION");

  // if (typeof semesterDetails === "undefined") {
  //   await scraper.runScraper(FILE_DIRECTORY);
  // } else {
  //   await scraper.runScraper(FILE_DIRECTORY, semesterDetails);
  // }

  // await sb.addSemesterDataToSupabase(FILE_DIRECTORY, semesterDetails);
  console.timeEnd("FULL OPERATION");
}

main();
