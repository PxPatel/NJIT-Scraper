var supabase = require("../initialize");
var supabaseClient = supabase.supabase;
var constants = require("../constants");
const { queryTemplate } = require("./queryTemplate.js");

async function upsertBatchSections(batchedData) {
  const { data, error } = await supabaseClient
    // .schema("alt")
    .from(constants.SECTIONS_TABLE)
    .upsert(batchedData)
    .select();

  if (error) {
    console.log(data, error);
  }

  if (error && error.code !== "23505" && error.code !== "23503") {
    console.log(data, error);
  }

  if (!data && error && error.code !== "23505") {
    //Trigger
    console.log("False was returned");
    return { success: false };
  }

  return { success: true };
}
exports.upsertBatchSections = upsertBatchSections;
