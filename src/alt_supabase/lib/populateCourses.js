const { upsertBatchCourses } = require("./addCourseRow");
const { upsertCourseSemesterJoinTable } = require("./addJoinTableRow");

exports.altCoursesPopulate = async function altCoursesPopulate(JSON_DATA, semesterDetails) {
  const departmentList = Object.keys(JSON_DATA);
  const { year, season } = semesterDetails;
  const semester_id = `${season}_${year}`;

  for (let i = 0; i < departmentList.length; i++) {
    const department = departmentList[i];
    let availableCoursesList = Object.keys(JSON_DATA[department]);
    let remainingCoursesToEnter = availableCoursesList.length;

    const batchSize =
      availableCoursesList.length > 10
        ? availableCoursesList.length / 2
        : availableCoursesList.length;

    while (remainingCoursesToEnter > 0) {
      const batch = availableCoursesList.slice(0, batchSize); // Adjust batchSize as needed

      const coursesData = batch.map((course_number) => {
        const sectionsList = Object.entries(
          JSON_DATA[department][course_number]
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

      const jointCourseSemesterData = coursesData.map((courseData) => {
        return {
          course_id: courseData.course_id,
          semester_id: semester_id,
        };
      });

      try {
        const courseTableSuccess = (await upsertBatchCourses(coursesData))
          .success;

        const jointCourseSemesterTableSuccess = (
          await upsertCourseSemesterJoinTable(jointCourseSemesterData)
        ).success;

        if (courseTableSuccess && jointCourseSemesterTableSuccess) {
          // Process successful upserts
          remainingCoursesToEnter -= batch.length;
          availableCoursesList.splice(0, batchSize);
        } else {
          console.log("REPEAT");
        }
      } catch (error) {
        console.error("Error catch:", error.message);
        return;
      }
    }
  }
};
