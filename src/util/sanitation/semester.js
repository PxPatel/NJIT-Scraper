/**
 *
 * @param {Object} semesterDetails
 * @param {string} semesterDetails.year
 * @param {string} semesterDetails.season
 * @description Sanitizes semester details
 * @returns an object with sanity boolean, year string, and season string
 */
function sanityCheckSemesterDetail(semesterDetails) {
  const isValidYear = (yearString) => {
    // Regular expression to match exactly 4 digits
    const yearRegex = /^\d{4}$/;

    // Check if the string matches the regular expression
    return yearRegex.test(yearString);
  };

  const isValidYearRange = (yearRangeString) => {
    // Regular expression to match a valid year range format (e.g., "2002-2004")
    const yearRangeRegex = /^\d{4}-\d{4}$/;

    // Check if the string matches the regular expression
    if (!yearRangeRegex.test(yearRangeString)) return false;

    const [startYear, endYear] = yearRangeString.split("-").map(Number);

    if (startYear >= endYear) return false;
    if (endYear - startYear !== 1) return false;

    return true;
  };

  const isValidSeason = (seasonString) => {
    const seasons = ["FALL", "WINTER", "SPRING", "SUMMER"];
    return seasons.includes(seasonString.toUpperCase());
  };

  const falseObject = { sanity: false, year: null, season: null };

  if (!semesterDetails.year || !semesterDetails.season) return falseObject;

  let year = semesterDetails.year.trim();
  let season = semesterDetails.season.trim();

  const validYear = isValidYear(year);
  const validYearRange = isValidYearRange(year);
  const validSeason = isValidSeason(season);

  if (!validYear && !validYearRange) return falseObject;

  if (!validSeason) return falseObject;

  if (season.toUpperCase() !== "WINTER" && validYearRange) return falseObject;

  if (season.toUpperCase() === "WINTER" && !validYearRange) return falseObject;

  season = season.charAt(0).toUpperCase() + season.slice(1).toLowerCase();
  return { sanity: true, year, season };
}

exports.sanityCheckSemesterDetail = sanityCheckSemesterDetail;
