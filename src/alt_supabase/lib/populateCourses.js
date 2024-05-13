const { upsertBatchCourses, getCourse } = require("./addCourseRow");
const { upsertCourseSemesterJoinTable } = require("./addJoinTableRow");
const readline = require("readline");

const useUserBreaks = false;
const rl = useUserBreaks
  ? readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
  : null;

exports.altCoursesPopulate = async function altCoursesPopulate(
  JSON_DATA,
  semesterDetails
) {
  const departmentList = Object.keys(JSON_DATA);
  console.log("NUM DEPARTMENTS:", departmentList.length);
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
      //TODO: Rescope the try catch
      try {
        const batch = availableCoursesList.slice(0, batchSize); // Adjust batchSize as needed

        const coursesData = batch.map((course_number) => {
          const sectionsList = Object.entries(
            JSON_DATA[department][course_number]
          );
          const course_name = sectionsList[0][1].name;
          const credits = sectionsList[0][1].credits;

          let isCourseHeaderUnique = true;
          const courseNameSet = new Set();

          for (section of sectionsList) {
            courseNameSet.add(section[1].name);
          }

          const normalCourses = new Set();

          courseNameSet.forEach((course) => {
            if (!course.includes("HONORS")) {
              normalCourses.add(course);
            }
          });

          isCourseHeaderUnique = normalCourses.size === 1 ? true : false;

          // if (courseNameSet.size > 1) {
          //   console.log(courseNameSet);
          //   console.log(isCourseHeaderUnique);
          // }
          return {
            department,
            course_name: isCourseHeaderUnique
              ? course_name
              : `${semester_id}_VARIED`,
            course_number,
            credits,
          };
        });

        const duplicateData = await findDuplicateRowsInBatch(coursesData);
        const dedupData = await dedupBatchedData(coursesData, duplicateData);

        const { success: courseTableSuccess, data: courseTableData } =
          await upsertBatchCourses(dedupData);

        const augmentedData = duplicateData.concat(courseTableData);

        const jointCourseSemesterData = augmentedData.map((courseData) => {
          return {
            co_sem_id: `${season}${year}_${courseData.department}${courseData.course_number}`,
            course_id: courseData.course_id,
            semester_id: semester_id,
          };
        });

        useUserBreaks &&
          (await new Promise((resolve) => {
            console.log("INSERTED DATA:", coursesData);
            console.log("GET_DATA:", duplicateData);
            console.log("DEDUPED DATA:", dedupData);

            // console.log("OUTPUT DATA:", courseTableData);
            // console.log("isSuccessful:", courseTableSuccess);

            rl.question("Press Enter to continue...", () => {
              resolve();
            });
          }));

        const jointCourseSemesterTableSuccess = (
          await upsertCourseSemesterJoinTable(jointCourseSemesterData)
        ).success;

        // let courseTableSuccess = true;
        if (courseTableSuccess && jointCourseSemesterTableSuccess) {
          // Process successful upserts
          remainingCoursesToEnter -= batch.length;
          availableCoursesList.splice(0, batchSize);
        } else {
          console.log("REPEATING COURSES BATCH");
        }
      } catch (error) {
        console.error("Large Error Catch in Course:", error.message);
        return;
      }
    }
  }

  useUserBreaks && rl.close();
};

async function findDuplicateRowsInBatch(batchedData) {
  try {
    const fetchedData = [];
    for (const courseData of batchedData) {
      const { data } = await getCourse(courseData);

      if (data.length > 0) {
        fetchedData.push(data[0]);
      }
    }
    return fetchedData;
  } catch (error) {
    console.error("Error fetching course data:", error);
    throw error;
  }
}

async function dedupBatchedData(batchedData, duplicateData) {
  try {
    const duplicateSet = new Set(
      duplicateData.map((obj) =>
        JSON.stringify({
          course_name: obj.course_name,
          department: obj.department,
          course_number: obj.course_number,
        })
      )
    );

    // Filter out objects from batchedData that are not duplicates
    const deduplicatedData = batchedData.filter((obj) => {
      // Convert the object to a string for comparison
      const objString = JSON.stringify({
        course_name: obj.course_name,
        department: obj.department,
        course_number: obj.course_number,
      });
      // Check if the string representation of the object exists in the duplicateSet
      return !duplicateSet.has(objString);
    });

    return deduplicatedData;
  } catch (error) {
    console.error("Error deduplicating batched data:", error);
    console.log("From dedupBatchedData", batchedData);
    console.log("From dedupBatchedData", duplicateData);
    throw error;
  }
}
