var supabase = require("../initialize");
var supabaseClient = supabase.supabase;
var constants = require("../constants");

async function addSemester(semData) {
  const { data, error } = await supabaseClient
    // .schema("alt")
    .from(constants.SEMESTER_TABLE)
    .upsert(semData)
    .select();

  if (error && error.code !== "23505" && error.code !== "23503") {
    console.log(data, error);
  }

  if (!data && error && error.code !== "23505" && error.code !== "23503") {
    return { success: false };
  }

  return { success: true };
}
exports.addSemester = addSemester;
