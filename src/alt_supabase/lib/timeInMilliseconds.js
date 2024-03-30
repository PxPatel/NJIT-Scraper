function convertTimeToNumeric(time) {
  try {
    if (typeof time !== "string" || time === "" || time === "TBA") {
      return {
        start_time: null,
        end_time: null,
      };
    }
    const [startTime, endTime] = time.split(" - ");

    // Parse start time
    const startParts = startTime.split(" ");
    let startHours = parseInt(startParts[0].split(":")[0]);
    const startMinutes = parseInt(startParts[0].split(":")[1]);
    const startPeriod = startParts[1].toUpperCase();
    startHours = startPeriod === "PM" ? startHours + 12 : startHours;

    // Parse end time
    const endParts = endTime.split(" ");
    let endHours = parseInt(endParts[0].split(":")[0]);
    const endMinutes = parseInt(endParts[0].split(":")[1]);
    const endPeriod = endParts[1].toUpperCase();
    endHours = endPeriod === "PM" ? endHours + 12 : endHours;

    // Calculate milliseconds from midnight
    const startMilliseconds = (startHours * 60 + startMinutes) * 60 * 1000;
    const endMilliseconds = (endHours * 60 + endMinutes) * 60 * 1000;

    return {
      start_time: startMilliseconds,
      end_time: endMilliseconds,
    };
  } catch (error) {
    console.log("ERROR IN TIME", error.message);
    console.log(time);
    throw Error;
  }
}

exports.timeInMilliseconds = function timeInMilliseconds(timeArray) {
  if (!Array.isArray(timeArray)) {
    throw Error("Input timeArray is not an array");
  }

  const start_times = [];
  const end_times = [];

  for (timeRange of timeArray) {
    const { start_time, end_time } = convertTimeToNumeric(timeRange);
    start_times.push(start_time);
    end_times.push(end_time);
  }

  return {
    start_times,
    end_times,
  };
};
