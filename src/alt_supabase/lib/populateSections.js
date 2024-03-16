exports.altSectionsPopulate = async function altSectionsPopulate(
    JSON_DATA,
    semesterDetails
  ) {
    const departmentList = Object.keys(JSON_DATA);
    const { year, season } = semesterDetails;
    const semester_id = `${season}_${year}`;
  
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
            const location = section_details.locations ?? null;
            const credits = section_details.credits;
            const info = section_details.info ?? null;
  
            const days = section_details.days.split("");
            const { start_time, end_time } = timeInMilliseconds(
              section_details.times
            );
  
            return {
              section_id: `${department}${course_number}-${section_number}`,
              course: department + course_number,
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
  
          const jointSectionSemesterData = sectionsData.map((sectionData) => {
            return {
              section_id: sectionData.section_id,
              semester_id: semester_id,
            };
          });
  
          try {
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
              console.log("REPEAT");
            }
          } catch (error) {
            console.error("Error catch:", error.message);
            return;
          }
        }
      }
    }
  };
  