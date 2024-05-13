/**
 *
 * @param {*} JSON_DATA
 */
exports.checkForMismatches = function checkForMismatches(JSON_DATA) {
  const departmentList = Object.keys(JSON_DATA);
  const missMatchedData = [];

  for (let department of departmentList) {
    const depJSON = JSON_DATA[department];

    //List of lists
    //Inner list is of two elements, course and its respective Object
    const entriesCourseSections = Object.entries(depJSON);

    for (let courseEntry of entriesCourseSections) {
      const [courseNumber, sectionsObjects] = courseEntry;

      const sampleSection = Object.values(sectionsObjects)[0];

      if (
        sampleSection.subject !== department ||
        sampleSection.course !== courseNumber
      ) {
        missMatchedData.push({
          department,
          sectionSubject: sampleSection.subject,
          courseNumber,
          sectionCourseNumber: sampleSection.course,
          fullSection: sampleSection,
        });
      }
    }
  }

  return { isDataMissMatched: missMatchedData.length !== 0, missMatchedData };
};
