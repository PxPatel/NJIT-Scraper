var supabase = require("../initialize");
var supabaseClient = supabase.supabase;
var constants = require("../constants");

async function deleteCourseSimple(dep, course_number) {
  const { error } = await supabaseClient
    // .schema("alt")
    .from(constants.COURSES_TABLE)
    .delete()
    .eq("department", dep)
    .eq("course_number", course_number);

  if (error) {
    console.log(error);
  }
}

async function deleteSectionSimple(dep, course_number, section_number) {
  const { error } = await supabaseClient
    // .schema("alt")
    .from(constants.SECTIONS_TABLE)
    .delete()
    .eq("section_number", section_number)
    .eq("course", `${dep}${course_number}`);

  if (error) {
    console.log(error);
  }
}

async function deleteSemesterSimple(year, season) {
  const { error } = await supabaseClient
    // .schema("alt")
    .from(constants.SEMESTER_TABLE)
    .delete()
    .eq("year", year)
    .eq("season", season);

  if (error) {
    console.log(error);
  }
}

async function deleteTable(tableName) {
  const { error } = await supabaseClient
    // .schema("alt")
    .from(tableName)
    .delete()
    .neq("semester_id", " ");

  if (error) {
    console.log(error);
  }
}

async function deleteJointCourseSemesterRow(semester_id, courseIdArray) {
  const { error } = await supabaseClient
    .from(constants.COURSE_SEM_TABLE)
    .delete()
    .eq("semester_id", semester_id)
    .in("course_id", [...courseIdArray]);

  if (error) {
    console.log(error);
    return false;
  }
  return true;
}

async function deleteJointSectionSemesterRow(semester_id, sectionIdArray) {
  const { error } = await supabaseClient
    .from(constants.SECTION_SEM_TABLE)
    .delete()
    .eq("semester_id", semester_id)
    .in("section_id", [...sectionIdArray]);

  if (error) {
    console.log(error);
    return false;
  }
  return true;
}

exports.deleteCourse = deleteCourseSimple;
exports.deleteSection = deleteSectionSimple;
exports.deleteSemester = deleteSemesterSimple;

exports.deleteJointCourseSemesterRow = deleteJointCourseSemesterRow;
exports.deleteJointSectionSemesterRow = deleteJointSectionSemesterRow;
