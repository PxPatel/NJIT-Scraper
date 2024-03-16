async function queryTemplate(func) {
  const { data, error } = await func();

  if (error && error.code !== "23505" && error.code !== "23503") {
    console.log(data, error);
  }

  if (!data && error && error.code !== "23505" && error.code !== "23503") {
    return { success: false, data: null, error };
  }

  return { success: true, data: data };
}

exports.queryTemplate = queryTemplate


// async function upsertBatchSections(batchedData) {
//     return queryTemplate(async () => {
//       return await supabaseClient
//         .schema("alt")
//         .from(constants.SECTIONS_TABLE)
//         .upsert(batchedData)
//         .select();
//     });
//   }