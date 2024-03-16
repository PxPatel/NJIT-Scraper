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
    .eq("course_id", `${dep}${course_number}`);

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
    .neq("course_id", " ");

  if (error) {
    console.log(error);
  }
}

exports.deleteCourse = deleteCourseSimple;
exports.deleteSection = deleteSectionSimple;
exports.deleteSemester = deleteSemesterSimple;
