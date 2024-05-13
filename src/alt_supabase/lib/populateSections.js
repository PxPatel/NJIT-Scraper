const { upsertBatchSections } = require("./addSectionRow");
const { upsertSectionSemesterJoinTable } = require("./addJoinTableRow");
const { timeInMilliseconds } = require("./timeInMilliseconds");
const readline = require("readline");

const useUserBreaks = false;
const rl = useUserBreaks
  ? readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
  : null;

exports.altSectionsPopulate = async function altSectionsPopulate(
  JSON_DATA,
  semesterDetails
) {
  const departmentList = Object.keys(JSON_DATA);
  const { year, season } = semesterDetails;
  const semester_id = `${season}_${year}`;

  try {
    for (let i = 0; i < departmentList.length; i++) {
      const department = departmentList[i];
      let availableCoursesList = Object.keys(JSON_DATA[department]);

      for (let j = 0; j < availableCoursesList.length; j++) {
        const course_number = availableCoursesList[j];
        let availableSectionsList = Object.keys(
          JSON_DATA[department][course_number]
        );

        let remainingSectionsToEnter = availableSectionsList.length;

        const batchSize =
          availableSectionsList.length > 20
            ? availableSectionsList.length / 2
            : availableSectionsList.length;

        while (remainingSectionsToEnter > 0) {
          const batch = availableSectionsList.slice(0, batchSize); // Adjust batchSize as needed

          const sectionsData = batch.map((section_number) => {
            const section_details =
              JSON_DATA[department][course_number][section_number];

            const crn = section_details.crn;
            const instructor = section_details.instructors ?? null;
            const location = section_details.locations;
            const status = section_details.status;
            const credits = section_details.credits;
            const info = section_details.info ?? null;

            const days = section_details.days;
            // .split("");
            const { start_times, end_times } = timeInMilliseconds(
              section_details.times
            );

            return {
              section_id: `${season}${year}_${department}${course_number}-${section_number}`,
              section_number,
              co_sem_id: `${season}${year}_${department}${course_number}`,
              crn,
              days,
              start_times,
              end_times,
              location,
              status,
              credits,
              info,
              instructor,
            };
          });

          useUserBreaks &&
            (await new Promise((resolve) => {
              console.log(
                sectionsData.map((section) => {
                  return {
                    section_id: section.section_id,
                    start_times: section.start_times,
                    end_times: section.end_times,
                  };
                })
              );

              rl.question("Press Enter to continue...", () => {
                resolve();
              });
            }));

          const jointSectionSemesterData = sectionsData.map((sectionData) => {
            return {
              sec_sem_id: `${season}${year}_${sectionData.section_id}`,
              section_id: sectionData.section_id,
              semester_id: semester_id,
            };
          });

          const sectionTableSucess = (await upsertBatchSections(sectionsData))
            .success;

          const jointSectionSemesterTableSuccess = (
            await upsertSectionSemesterJoinTable(jointSectionSemesterData)
          ).success;

          if (sectionTableSucess && jointSectionSemesterTableSuccess) {
            // Process successful upserts
            remainingSectionsToEnter -= batch.length;
            availableSectionsList.splice(0, batchSize);
          } else {
            console.log(sectionTableSucess);
            console.log(jointSectionSemesterTableSuccess);

            console.log(sectionsData[0]);

            console.log("REPEATING SECTION BATCH");
          }
        }
      }
    }
  } catch (error) {
    console.error("Error catch:", error.message);
    return;
  }

  useUserBreaks && rl.close();
};
