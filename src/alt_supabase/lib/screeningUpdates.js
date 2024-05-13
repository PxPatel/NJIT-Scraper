const {
  deleteJointCourseSemesterRow,
  deleteSection,
  deleteJointSectionSemesterRow,
} = require("./deleteRows");

const fs = require("fs");

/**
 *
 * @param {*} oldObj
 * @param {*} newObj
 * @description Filters all the keys that exist in the oldJSON, but not in newJSON
 * @returns string[]
 */
function findDeletedKeys(oldObj, newObj) {
  return Object.keys(oldObj).filter((key) => !(key in newObj));
}

function findDeletedItems(oldJson, newJson) {
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

async function deleteRemovedCourses(deletedCoursesArray, semester_id) {
  const removedCoursesEntries = Object.entries(deletedCoursesArray);

  for (const [dep, courses] of removedCoursesEntries) {
    let courseIdArray = courses.map((course) => dep + course); // Constructing courseIdArray
    let successFlag = false;
    do {
      successFlag = await deleteJointCourseSemesterRow(
        semester_id,
        courseIdArray
      );
    } while (!successFlag);
  }
}

async function deleteRemovedSections(deletedSectionsArray, semester_id) {
  const removedSectionEntries = Object.entries(deletedSectionsArray);

  for (const [dep, courseEntries] of removedSectionEntries) {
    for (const [courseNumber, sections] of Object.entries(courseEntries)) {
      let sectionIdArray = sections.map(
        (sectionNumber) => `${dep}${courseNumber}-${sectionNumber}`
      ); // Constructing sectionIdArray

      let successFlag = false;
      do {
        successFlag = await deleteJointSectionSemesterRow(
          semester_id,
          sectionIdArray
        );
      } while (!successFlag);
    }
  }
}

exports.deleteStaleRows = async function deleteStaleRows(
  oldSemesterData,
  newSemesterData,
  semesterDetails
) {
  if (Object.keys(newSemesterData).length === 0) {
    console.log("The object is empty");
    return;
  }

  const { deletedDepartments, deletedCourses, deletedSections } =
    findDeletedItems(oldSemesterData, newSemesterData);

  console.log(
    "Deleted Departments:",
    deletedDepartments,
    "\nDeleted Courses:",
    deletedCourses
    // "\nDeleted Sections:",
    // deletedSections
  );

  const semester_id = `${semesterDetails.season}_${semesterDetails.year}`;

  // await deleteRemovedCourses(deletedCourses, semester_id);
  // await deleteRemovedSections(deletedSections, semester_id);
  console.log("\nFinished with Deletion");
};
