var supabase = require("../initialize");
var supabaseClient = supabase.supabase;
var constants = require("../constants");

/**
 * @typedef {Object} BatchedData
 * @property {string} course_id - The ID of the course.
 * @property {string} semester_id - The ID of the semester.
 *
 * @param {BatchedData[]} batchedData - An array of objects representing batched data.
 * @returns an object describing the response of the api call
 */
async function upsertCourseSemesterJoinTable(batchedData) {
  const { data, error } = await supabaseClient
    // .schema("alt")
    .from(constants.COURSE_SEM_TABLE)
    .upsert(batchedData)
    .select();

  if (error) {
    console.log(error);
    throw new Error("BRO");
  }

  if (error && error.code !== "23505" && error.code !== "23503") {
    console.log(data, error);
  }

  if (!data && error && error.code !== "23505" && error.code !== "23503") {
    return { success: false };
  }

  if (data.length !== batchedData.length) {
    throw new Error("NOT EQUAL");
  }

  return { success: true };
}

/**
 * @typedef {Object} BatchedData
 * @property {string} section_id - The ID of the section.
 * @property {string} semester_id - The ID of the semester.
 *
 * @param {BatchedData[]} batchedData - An array of objects representing batched data.
 * @returns an object describing the response of the api call
 */
async function upsertSectionSemesterJoinTable(batchedData) {
  const { data, error } = await supabaseClient
    // .schema("alt")
    .from(constants.SECTION_SEM_TABLE)
    .upsert(batchedData)
    .select();
    
  if (error && error.code !== "23505" && error.code !== "23503") {
    console.log(data, error);
  }

  if (!data && error && error.code !== "23505" && error.code !== "23503") {
    return { success: false };
  }

  return { success: true };
}

exports.upsertCourseSemesterJoinTable = upsertCourseSemesterJoinTable;
exports.upsertSectionSemesterJoinTable = upsertSectionSemesterJoinTable;

exports.checkExistingEntries = async function checkExistingEntries(
  jointCourseSemesterData
) {
  const conflictingEntries = [];

  for (const entry of jointCourseSemesterData) {
    const { data, error } = await supabaseClient
      .from(constants.COURSE_SEM_TABLE)
      .select()
      .eq("course_id", entry.course_id)
      .eq("semester_id", entry.semester_id);

    if (error) {
      console.error("Error checking existing entries:", error.message);
      throw new Error(
        "Error checking existing entries in course_semester table"
      );
    }

    if (data.length > 0) {
      conflictingEntries.push(entry);
    }
  }

  return conflictingEntries;
};
