const fs = require("fs");
const { sanityCheckSemesterDetail } = require("../util/sanitation/semester.js");
const { deleteStaleRows } = require("./lib/screeningUpdates.js");
const { addSemester } = require("./lib/addSemesterRow.js");
const { altCoursesPopulate } = require("./lib/populateCourses.js");
const {
  test_altCoursesPopulate,
  test_altSectionsPopulate,
} = require("./lib/test.js");
const { altSectionsPopulate } = require("./lib/populateSections.js");

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

  fileLocations = {
    OLD_JSON_FILEPATH:
      filePath + `\\${season}_${year}\\old_${season}_${year}` + ".json",
    NEW_JSON_FILEPATH:
      filePath + `\\${season}_${year}\\${season}_${year}` + ".json",
  };

  const { oldSemesterData, newSemesterData } = await readJSONFiles(
    fileLocations
  );

  // deleteStaleRows(oldSemesterData, newSemesterData);

  // Add semesterDetails into sem table
  await addSemester({
    semester_id: `${season}_${year}`,
    season: season,
    year: year,
  });

  verifyJSONCount(newSemesterData);

  //Helper functions to traverse JSON and add courses and sections appropriately
  //Additionally, create Join Table rows
  console.time("Populating process");

  try {
    await Promise.all([
      altCoursesPopulate(newSemesterData, { year, season }),
      altSectionsPopulate(newSemesterData, { year, season }),
    ]);
  } catch (error) {
    // Handle errors from either promise
    console.error("Error:", error);
  }
  console.timeEnd("Populating process");
};

function verifyJSONCount(newSemesterData) {
  let coursesCount = 0;
  let sectionCount = 0;
  for (const dep in newSemesterData) {
    const coursesAva = Object.keys(newSemesterData[dep]);
    coursesCount += coursesAva.length;
    for (let i = 0; i < coursesAva.length; i++) {
      const sectionsAva = Object.keys(newSemesterData[dep][coursesAva[i]]);
      sectionCount += sectionsAva.length;
    }
  }
  console.log("TOTAL NUMBER OF COURSES:", coursesCount);
  console.log("TOTAL NUMBER OF SECTIONS:", sectionCount);
}

async function readJSONFiles(fileLocations) {
  try {
    const oldSemesterData = await JSON.parse(
      fs.readFileSync(fileLocations.OLD_JSON_FILEPATH)
      // fs.readFileSync('sample\\alt\\Summer_2023\\old_Summer_2023.json')
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
