var supabase = require("../initialize");
var supabaseClient = supabase.supabase;
var constants = require("../constants");

async function upsertBatchCourses(batchedData) {
  const { data, error } = await supabaseClient
    // .schema("alt")
    .from(constants.COURSES_TABLE)
    .upsert(batchedData)
    .select();

  if (error) {
    console.log("Catch 1", data, error);
  }

  if (error && error.code !== "23505" && error.code !== "23503") {
    console.log("Catch 2", data, error);
  }

  if (!data && error && error.code !== "23505" && error.code !== "23503") {
    console.log("Catch 3 (BAD): False in course upsert was returned");
    return { success: false, data };
  }

  return { success: true, data };
}

async function getCourse(conditions) {
  try {
    const { data, error } = await supabaseClient
      .from("alt_courses")
      .select()
      .eq("department", conditions.department)
      .eq("course_number", conditions.course_number)
      .eq("course_name", conditions.course_name);

    if (error) {
      console.log("IN GET COURSE:", error);
      return { success: false, data };
    }
    return { success: true, data };
  } catch (error) {
    console.log(error);
    throw Error("Large Catch in getCourse:", error);
  }
}

exports.upsertBatchCourses = upsertBatchCourses;
exports.getCourse = getCourse;
