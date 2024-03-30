const fs = require("fs");
const { sanityCheckSemesterDetail } = require("../util/sanitation/semester.js");
const { deleteStaleRows } = require("./lib/screeningUpdates.js");
const { addSemester } = require("./lib/addSemesterRow.js");
const { altCoursesPopulate } = require("./lib/populateCourses.js");
const { altSectionsPopulate } = require("./lib/populateSections.js");
const { verifySingularData } = require("../util/verification/verify.js");
const { logger } = require("../util/logging/logger.js");

exports.addSemesterDataToSupabase = async function addSemesterDataToSupabase(
  filePath,
  semesterDetails
) {
  if (!filePath) {
    throw new Error("No file path provided");
  }

  semesterDetails = sanityCheckSemesterDetail(semesterDetails);
  const { sanity, year, season } = semesterDetails;
  if (!sanity) {
    throw new Error("Please provide valid 'semesterDetails' paramater");
  }

  const fileLocations = createFileLocationPaths(filePath, season, year);

  const { oldSemesterData, newSemesterData } = await readJSONFiles(
    fileLocations
  );

  verifyJSONCount(newSemesterData, { log: true });

  await semesterDataChanges(oldSemesterData, newSemesterData, semesterDetails);

  const { isDataMissMatched, missMatchedData } =
    verifySingularData(newSemesterData);
  console.log(
    `\nisDataMissMatched: ${isDataMissMatched}, missMatchedData: ${
      missMatchedData.length === 0 ? "[]" : missMatchedData
    }`
  );

  if (isDataMissMatched) {
    return;
  }

  console.time("POPULATING PROCESS");
  try {
    await addSemester({
      semester_id: `${season}_${year}`,
      season: season,
      year: year,
    });
    await Promise.all([
      altCoursesPopulate(newSemesterData, { year, season }),
      altSectionsPopulate(newSemesterData, { year, season }),
    ]);
  } catch (error) {
    // Handle errors from either promise
    console.error("Error:", error);
  }
  console.timeEnd("POPULATING PROCESS");
};

async function semesterDataChanges(
  oldSemesterData,
  newSemesterData,
  semesterDetails
) {
  console.log("-----------NEW does not have These-----------");
  await deleteStaleRows(oldSemesterData, newSemesterData, semesterDetails);
  console.log("-----------OLD does not have These-----------");
  deleteStaleRows(newSemesterData, oldSemesterData, semesterDetails);
}

function createFileLocationPaths(filePath, season, year) {
  return {
    OLD_JSON_FILEPATH:
      filePath + `\\${season}_${year}\\old_${season}_${year}` + ".json",
    NEW_JSON_FILEPATH:
      filePath + `\\${season}_${year}\\${season}_${year}` + ".json",
  };
}

function verifyJSONCount(newSemesterData, options) {
  let coursesCount = 0;
  let sectionsCount = 0;
  for (const dep in newSemesterData) {
    const coursesAva = Object.keys(newSemesterData[dep]);
    coursesCount += coursesAva.length;
    for (let i = 0; i < coursesAva.length; i++) {
      const sectionsAva = Object.keys(newSemesterData[dep][coursesAva[i]]);
      sectionsCount += sectionsAva.length;
    }
  }
  console.log("TOTAL NUMBER OF COURSES:", coursesCount);
  console.log("TOTAL NUMBER OF SECTIONS:", sectionsCount);

  if (options.log === true) {
    logger(`Course Count: ${coursesCount}, Section Count: ${sectionsCount}`);
  }
}

async function readJSONFiles(fileLocations) {
  try {
    const oldSemesterData = await JSON.parse(
      fs.readFileSync(fileLocations.OLD_JSON_FILEPATH)
    );
    const newSemesterData = await JSON.parse(
      fs.readFileSync(fileLocations.NEW_JSON_FILEPATH)
    );
    return { oldSemesterData, newSemesterData };
  } catch (error) {
    console.log(error);
    return { oldSemesterData: {}, newSemesterData: {} };
  }
}
