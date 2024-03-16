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

exports.deleteStaleRows = async function deleteStaleRows(
  oldSemesterData,
  newSemesterData
) {
  const { deletedDepartments, deletedCourses, deletedSections } =
    findDeletedItems(oldSemesterData, newSemesterData);

  console.log(deletedDepartments, "\n", deletedCourses, "\n", deletedSections);

  // await deleteRemovedCourses(deletedCourses);
  // await deleteRemovedSections(deletedSections);
  console.log("Finished with Deletion");
};
