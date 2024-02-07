var supabase = require("./initialize.js");
var constants = require("./constants");
const fs = require("fs");

var supabaseClient = supabase.supabase;

async function findDeletedItems(oldJson, newJson) {
  const deletedDepartments = findDeletedKeys(oldJson, newJson);
  const deletedCourses = findDeletedCourses(oldJson, newJson);
  const deletedSections = findDeletedSections(oldJson, newJson);

  return {
    deletedDepartments,
    deletedCourses,
    deletedSections,
  };
}

function findDeletedCourses(oldJson, newJson) {
  const deletedCourses = {};

  for (const department in oldJson) {
    if (department in newJson) {
      const coursesRemoved = findDeletedKeys(
        oldJson[department],
        newJson[department]
      );

      if (coursesRemoved.length > 0) {
        deletedCourses[department] = coursesRemoved;
      }
    } else {
      deletedCourses[department] = Object.keys(oldJson[department]);
    }
  }

  return deletedCourses;
}

function findDeletedSections(oldJson, newJson) {
  const deletedSections = {};

  for (const department in oldJson) {
    for (const course in oldJson[department]) {
      const sectionsRemoved = findDeletedKeys(
        oldJson[department][course],
        newJson[department]?.[course] || {}
      );

      if (sectionsRemoved.length > 0) {
        if (!(department in deletedSections)) {
          deletedSections[department] = {};
        }
        deletedSections[department][course] = sectionsRemoved;
      }
    }
  }

  return deletedSections;
}

function findDeletedKeys(oldObj, newObj) {
  return Object.keys(oldObj).filter((key) => !(key in newObj));
}

async function findDifference(oldSemesterData, newSemesterData) {
  const deletedItems = findDeletedItems(oldSemesterData, newSemesterData);
  return deletedItems;
}

const populateSupabaseTable = async (filePath) => {
  const filePathSteps = filePath.split("\\");

  filePathSteps[filePathSteps.length - 1] =
    "old_" + filePathSteps[filePathSteps.length - 1] + ".json";

  const oldUpdatedFilePath = filePathSteps.join("\\");

  cred = {
    OLD_JSON_FILEPATH: oldUpdatedFilePath,
    NEW_JSON_FILEPATH: filePath + ".json",
  };

  const oldSemesterData = await JSON.parse(
    fs.readFileSync(cred.OLD_JSON_FILEPATH)
  );
  const newSemesterData = await JSON.parse(
    fs.readFileSync(cred.NEW_JSON_FILEPATH)
  );

  const deletedItems = await findDifference(oldSemesterData, newSemesterData);
  console.log(deletedItems.deletedDepartments);
  console.log(deletedItems.deletedCourses);
  console.log(deletedItems.deletedSections);

  await deleteRemovedCourses(deletedItems.deletedCourses);
  await deleteRemovedSections(deletedItems.deletedSections);

  console.time("Start Populate");
  await populateCoursesTable(cred.NEW_JSON_FILEPATH);
  await populateSectionsTable(cred.NEW_JSON_FILEPATH);
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

async function deleteCourse(dep, course_number) {
  const { error } = await supabaseClient
    .from(constants.COURSES_TABLE)
    .delete()
    .eq("department", dep)
    .eq("course_number", course_number);

  if (error) {
    console.log(error);
  }
}

async function deleteSection(dep, course_number, section_number) {
  const { error } = await supabaseClient
    .from(constants.SECTIONS_TABLE)
    .delete()
    .eq("section_number", section_number)
    .eq("course_id", `${dep}${course_number}`);

  if (error) {
    console.log(error);
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
            course_id: department + course,
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

async function upsertBatchCourse(batchedData) {
  const { data, error } = await supabaseClient
    .from(constants.COURSES_TABLE)
    .upsert(batchedData)
    .select();

  if (error && error.code !== "23505" && error.code !== "23503") {
    console.log(data, error);
  }

  if (!data && error && error.code !== "23505" && error.code !== "23503") {
    return false;
  }

  return true;
}

async function upsertBatchSection(batchedData) {
  const { data, error } = await supabaseClient
    .from(constants.SECTIONS_TABLE)
    .upsert(batchedData)
    .select();

  if (error && error.code !== "23505" && error.code !== "23503") {
    console.log(data, error);
  }

  if (!data && error && error.code !== "23505" && error.code !== "23503") {
    return false;
  }

  return true;
}

async function deleteTable(tableName) {
  const { error } = await supabaseClient
    .from(tableName)
    .delete()
    .neq("course_id", " ");

  if (error) {
    console.log(error);
  }
}

exports.populateSupabaseTable = populateSupabaseTable;
