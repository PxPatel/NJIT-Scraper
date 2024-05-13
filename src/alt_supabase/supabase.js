const fs = require("fs");
const { sanityCheckSemesterDetail } = require("../util/sanitation/semester.js");


const populateSupabaseTable = async (filePath, semesterDetails) => {
  if (!filePath) {
    throw new Error("No file path provided");
  }

  semesterDetails = sanityCheckSemesterDetail(semesterDetails);
  const { sanity, year, season } = semesterDetails;
  if (!sanity) {
    throw new Error("Please provide valid 'semesterDetails' paramater");
  }

  fileLocations = {
    OLD_JSON_FILEPATH: filePath + `old_${season}_${year}` + ".json",
    NEW_JSON_FILEPATH: filePath + `${season}_${year}` + ".json",
  };

  // TODO Add a try catch to see that file exists
  const oldSemesterData = await JSON.parse(
    fs.readFileSync(fileLocations.OLD_JSON_FILEPATH)
  );
  const newSemesterData = await JSON.parse(
    fs.readFileSync(fileLocations.NEW_JSON_FILEPATH)
  );


  // let count = 0;
  // let sectionCount = 0;
  // for (const dep in newSemesterData) {
  //   const coursesAva = Object.keys(newSemesterData[dep]);
  //   count += coursesAva.length;
  //   for (let i = 0; i < coursesAva.length; i++) {
  //     const sectionsAva = Object.keys(newSemesterData[dep][coursesAva[i]]);
  //     sectionCount += sectionsAva.length;
  //   }
  // }
  // console.log(count);
  // console.log(sectionCount);

  console.time("Start Populate");
  await populateCoursesTable(fileLocations.NEW_JSON_FILEPATH);
  console.log("Finished with Courses");
  await populateSectionsTable(fileLocations.NEW_JSON_FILEPATH);
  console.log("Finished with Sections");
  console.timeEnd("Start Populate");
};

async function deleteRemovedCourses(deletedCourses) {
  const removedCoursesEntries = Object.entries(deletedCourses);

  for (const [dep, courses] of removedCoursesEntries) {
    for (const course_number of courses) {
      await deleteCourse(dep, course_number);
    }
  }
}

async function deleteRemovedSections(deletedSections) {
  const removedSectionEntries = Object.entries(deletedSections);

  for (const [dep, courseEntries] of removedSectionEntries) {
    for (const [course_number, arrSections] of Object.entries(courseEntries)) {
      for (const section_number of arrSections) {
        await deleteSection(dep, course_number, section_number);
      }
    }
  }
}

function timeToMilliseconds(time) {
  if (time === "" || time === "TBA") {
    return {
      start_time: null,
      end_time: null,
    };
  }
  const [startTime, endTime] = time.split(" - ");

  // Parse start time
  const startParts = startTime.split(" ");
  let startHours = parseInt(startParts[0].split(":")[0]);
  const startMinutes = parseInt(startParts[0].split(":")[1]);
  const startPeriod = startParts[1].toUpperCase();
  startHours = startPeriod === "PM" ? startHours + 12 : startHours;

  // Parse end time
  const endParts = endTime.split(" ");
  let endHours = parseInt(endParts[0].split(":")[0]);
  const endMinutes = parseInt(endParts[0].split(":")[1]);
  const endPeriod = endParts[1].toUpperCase();
  endHours = endPeriod === "PM" ? endHours + 12 : endHours;

  // Calculate milliseconds from midnight
  const startMilliseconds = (startHours * 60 + startMinutes) * 60 * 1000;
  const endMilliseconds = (endHours * 60 + endMinutes) * 60 * 1000;

  return {
    start_time: startMilliseconds,
    end_time: endMilliseconds,
  };
}

async function populateCoursesTable(JSON_FILEPATH) {
  const semesterData = await JSON.parse(fs.readFileSync(JSON_FILEPATH));
  const departmentList = Object.keys(semesterData);

  for (let i = 0; i < departmentList.length; i++) {
    const department = departmentList[i];
    let availableCoursesList = Object.keys(semesterData[department]);
    let remainingCoursesToEnter = availableCoursesList.length;

    const batchSize =
      availableCoursesList.length > 10
        ? availableCoursesList.length / 2
        : availableCoursesList.length;

    while (remainingCoursesToEnter > 0) {
      const batch = availableCoursesList.splice(0, batchSize); // Adjust batchSize as needed

      const coursesData = batch.map((course_number) => {
        const sectionsList = Object.entries(
          semesterData[department][course_number]
        );
        const course_name = sectionsList[0][1].name;
        const number_of_sections = sectionsList.length;

        return {
          course_id: department + course_number,
          department,
          course_name,
          course_number,
          number_of_sections,
        };
      });

      const isSuccessful = await upsertBatchCourse(coursesData);

      if (isSuccessful) {
        // Process successful upserts
        remainingCoursesToEnter -= batch.length;
        batch.forEach((course_number) => {
          delete semesterData[department][course_number];
        });
      }
    }
  }
}

async function populateSectionsTable(JSON_FILEPATH) {
  const semesterData = await JSON.parse(fs.readFileSync(JSON_FILEPATH));

  const departmentList = Object.keys(semesterData);

  for (let i = 0; i < departmentList.length; i++) {
    const department = departmentList[i];
    let availableCoursesList = Object.keys(semesterData[department]);

    for (let j = 0; j < availableCoursesList.length; j++) {
      const course = availableCoursesList[j];
      let availableSectionsList = Object.keys(semesterData[department][course]);

      let remainingSectionsToEnter = availableSectionsList.length;

      const batchSize =
        availableSectionsList.length > 20
          ? availableSectionsList.length / 2
          : availableSectionsList.length;

      while (remainingSectionsToEnter > 0) {
        const batch = availableSectionsList.slice(0, batchSize); // Adjust batchSize as needed

        const sectionsData = batch.map((section_number) => {
          const section_details =
            semesterData[department][course][section_number];

          const crn = section_details.crn;
          const instructor = section_details.instructors ?? null;
          const location = section_details.locations ?? null;
          const credits = section_details.credits;
          const info = section_details.info ?? null;

          const days = section_details.days.split("");
          const { start_time, end_time } = timeToMilliseconds(
            section_details.times
          );

          return {
            course: department + course,
            section_number,
            crn,
            days,
            start_time,
            end_time,
            location,
            credits,
            info,
            instructor,
          };
        });

        const isSuccessful = false || (await upsertBatchSection(sectionsData));

        if (isSuccessful === true) {
          availableSectionsList.splice(0, batchSize);
          remainingSectionsToEnter -= sectionsData.length;
          batch.forEach((section_number) => {
            delete semesterData[department][course][section_number];
          });
        }
      }

      // console.log("Finished course:", course, "\n Next Course in:", department);
    }
  }
}

exports.populateSupabaseTable = populateSupabaseTable;
