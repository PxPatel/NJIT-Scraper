const puppeteer = require("puppeteer");
const constants = require("./constants");
const logger = require("./logger");
const fs = require("fs");
const { sanityCheckSemesterDetail } = require("../util/sanitation/semester");

const HARD_WAIT_TIME = 1000;

async function initiatePuppeteer() {
  logger.info("Launching Browser");
  const browser = await newBrowser();
  logger.info("connecting...");
  const page = await browser.newPage();
  await page.goto(constants.websiteLink, { waitUntil: "networkidle0" });
  logger.info("connected!");
  return { page, browser };
}

const newBrowser = async () => {
  return puppeteer.launch({ headless: true });
};

const getSubjects = async (page) => {
  const subjects = await page.$$eval(
    constants.SUBJECT_TABLE_CSS_SELECTOR,
    (subjectsElement) => {
      return subjectsElement.map((subjectElement) => subjectElement.innerText);
    }
  );

  const subjectsHandler = await page.$$(constants.SUBJECT_TABLE_CSS_SELECTOR);

  return { subjects, subjectsHandler };
};

const getCoursesForSubject = async (page) => {
  const courses = await page.$$eval(
    constants.COURSE_TABLE_CSS_SELECTOR,
    (coursesElement) => {
      return coursesElement.map((courseElement) => courseElement.innerText);
    }
  );

  return { courses };
};

const getAllSectionsForCourse = async (page, courses) => {
  await hardWait();

  const container = await page.$(constants.SPAN_CONTAINER_SELECTOR);

  const coursesDict = await page.evaluate(
    (container, courses) => {
      if (!container) {
        return {};
      }

      const getElementText = (tdElement) => {
        const textContent = tdElement.innerHTML.trim();

        // Check if the text content contains the <br> tag
        if (textContent.includes("<br>")) {
          // If it contains <br>, split the text content based on <br> tag
          return textContent.split("<br>").map((text) => text.trim());
        } else {
          // If it doesn't contain <br>, return an array with just the text content
          return [textContent];
        }
      };

      const separateDaysData = (tdElement) => {
        const rawDaysArray = getElementText(tdElement).map((dayString) => {
          return dayString === "" ? "X" : dayString;
        });

        const unorderedDaysArray = [];
        for (let i = 0; i < rawDaysArray.length; i++) {
          const dayString = rawDaysArray[i];

          if (dayString.length > 1) {
            const daysInString = Array.from(dayString);
            unorderedDaysArray.push(...daysInString);
          } else {
            unorderedDaysArray.push(dayString);
          }
        }

        const { sortedDaysArray, swapCoordinates } =
          orderDaysArray(unorderedDaysArray);

        return { sortedDaysArray, rawDaysArray, swapCoordinates };
      };

      const orderDaysArray = (days) => {
        // Define a mapping of days of the week to their positions
        const dayOrder = { M: 1, T: 2, W: 3, R: 4, F: 5, S: 6, X: 7 };

        // Handle the edge case where the array has only one element
        if (days.length === 1) {
          if (days[0] === "") return { days: [""], swapCoordinates: [0] };
        }

        // Create an array to hold the sorted days and their original indices
        const indexedDays = days.map((day, index) => ({ day: day, index }));

        // Sort the array based on the mapping of days of the week
        indexedDays.sort(
          (a, b) => dayOrder[a.day] - dayOrder[b.day] || a.index - b.index
        );

        // Extract sorted days and original indices
        const sortedDays = indexedDays.map(({ day }) => day);
        const sortedDaysCopy = [...sortedDays];

        const swapCoordinates = days.map((day) => {
          const swapIndex = sortedDaysCopy.indexOf(day);
          sortedDaysCopy[swapIndex] = null;
          return swapIndex;
        });

        return { sortedDaysArray: sortedDays, swapCoordinates };
      };

      const seperateTimesData = (tdElement, rawDaysArray, swapCoordinates) => {
        const rawTimesArray = getElementText(tdElement);

        if (rawTimesArray.length != rawDaysArray.length) {
          return Array.from({ length: rawTimesArray.length }, () => "TBA");
        }

        const matchingSizeTimesArray = [];
        for (let dayIndex in rawDaysArray) {
          const strLength = rawDaysArray[dayIndex].length;
          for (let i = 0; i < strLength; i++) {
            matchingSizeTimesArray.push(rawTimesArray[dayIndex]);
          }
        }

        const sortedTimesArray = Array.from(
          { length: swapCoordinates.length },
          () => ""
        );
        for (let timeIndex in matchingSizeTimesArray) {
          const timeRange = matchingSizeTimesArray[timeIndex];
          const swapTo = swapCoordinates[timeIndex];
          sortedTimesArray[swapTo] = timeRange;
        }

        return sortedTimesArray;
      };

      const seperateLocationData = (
        tdElement,
        rawDaysArray,
        swapCoordinates
      ) => {
        const rawLocationArray = getElementText(tdElement);

        if (rawLocationArray.length != rawDaysArray.length) {
          return Array.from({ length: rawLocationArray.length }, () => "");
        }

        const matchingSizeLocationArray = [];
        for (let dayIndex in rawDaysArray) {
          const strLength = rawDaysArray[dayIndex].length;
          for (let i = 0; i < strLength; i++) {
            matchingSizeLocationArray.push(rawLocationArray[dayIndex]);
          }
        }

        const sortedLocationArray = Array.from(
          { length: swapCoordinates.length },
          () => ""
        );
        for (let timeIndex in matchingSizeLocationArray) {
          const timeRange = matchingSizeLocationArray[timeIndex];
          const swapTo = swapCoordinates[timeIndex];
          sortedLocationArray[swapTo] = timeRange;
        }

        return sortedLocationArray;
      };

      const getSectionDetails = (dupTable) => {
        const sections = {};

        if (!dupTable) {
          return {};
        }

        for (const set of dupTable) {
          const table = set.tableElement;
          const rows = table.querySelectorAll("tbody tr");

          for (const row of rows) {
            const sectionNumberCell = row.querySelector("td:nth-child(1)");
            if (!sectionNumberCell) {
              continue; // Skip rows without section number
            }

            const sectionNumber = row
              .querySelector("td:nth-child(1)")
              .textContent.trim();
            const crn = row.querySelector("td:nth-child(2)").textContent.trim();

            const {
              sortedDaysArray: days,
              rawDaysArray,
              swapCoordinates,
            } = separateDaysData(row.querySelector("td:nth-child(3)"));

            const times = seperateTimesData(
              row.querySelector("td:nth-child(4)"),
              rawDaysArray,
              swapCoordinates
            );

            const locations = seperateLocationData(
              row.querySelector("td:nth-child(5)"),
              rawDaysArray,
              swapCoordinates
            );

            const status = row
              .querySelector("td:nth-child(6)")
              .textContent.trim();
            const max = row.querySelector("td:nth-child(7)").textContent.trim();
            const now = row.querySelector("td:nth-child(8)").textContent.trim();
            const instructors = row
              .querySelector("td:nth-child(9)")
              .textContent.trim();
            const deliveryMode = row
              .querySelector("td:nth-child(10)")
              .textContent.trim();
            const credits = row
              .querySelector("td:nth-child(11)")
              .textContent.trim();
            const info =
              row.querySelector("td:nth-child(12) a").getAttribute("href") ??
              null;
            const comments = row
              .querySelector("td:nth-child(13)")
              .textContent.trim();

            sections[sectionNumber] = {
              name: set.courseName,
              course: set.courseNumberOnHeader,
              subject: set.subjectAbvOnHeader,
              crn,
              days,
              times,
              locations,
              status,
              max,
              now,
              instructors,
              deliveryMode,
              credits,
              info,
              comments,
            };
          }
        }

        return sections;
      };

      const getHeaderInfo = (courseName) => {
        // const match = courseName.match(/^([A-Z]+) (\d+) - (.+)$/);
        const match = courseName.split(" ");

        const subjectAbvOnHeader = match ? match[0] : null;
        const courseNumberOnHeader = match ? match[1] : null;
        return { subjectAbvOnHeader, courseNumberOnHeader };
      };

      const children = container.children;
      const newDict = {};

      let dupTable = [];

      for (let i = 0; i < children.length; i += 2) {
        const headerElement = children[i];
        const tableElement = children[i + 1];

        const courseName = headerElement.innerText.trim();

        const { subjectAbvOnHeader, courseNumberOnHeader } =
          getHeaderInfo(courseName);

        dupTable.push({
          courseName,
          courseNumberOnHeader,
          subjectAbvOnHeader,
          tableElement,
        });

        if (
          i === children.length - 2 ||
          courseNumberOnHeader !==
            getHeaderInfo(children[i + 2].innerText.trim()).courseNumberOnHeader
        ) {
          newDict[courseNumberOnHeader] = getSectionDetails(dupTable);
          dupTable = [];
        }
      }
      return newDict;
    },
    container,
    courses
  );
  return coursesDict;
};

async function hardWait(time) {
  await new Promise((resolve) => {
    setTimeout(resolve, time ? time : 100);
  });
}

const getCompletedSemester = async (page, start, stop) => {
  logger.info("Starting process to scrap");

  const completedSemester = {};

  const { subjects, subjectsHandler } = await getSubjects(page);
  console.log(subjects);

  let startIndex = start ? start : 0;
  let iterateLength = stop ? stop : subjectsHandler.length;

  // console.log("subjects:", subjects);
  for (let i = startIndex; i < iterateLength; i++) {
    await subjectsHandler[i].click();

    await wait(page);
    await hardWait(HARD_WAIT_TIME); //HERE

    const { courses } = await getCoursesForSubject(page);

    coursesDict = await getAllSectionsForCourse(page, courses);

    completedSemester[subjects[i]] = coursesDict;
  }

  return completedSemester;
};

async function navigateToSemester(page, year, season) {
  await wait(page);

  const dropdown = await page.$(constants.SEMESTER_DROPDOWN_SELECTOR);

  await dropdown.type(`${year} ${season}`);

  await wait(page);
  await hardWait(HARD_WAIT_TIME); //HERE
}

async function wait(page) {
  await page.waitForSelector(constants.SPAN_CONTAINER_SELECTOR, {
    visible: true,
  });

  await page.waitForSelector(constants.COURSE_TABLE_CSS_SELECTOR, {
    visible: true,
  });

  await page.waitForSelector(constants.SUBJECT_TABLE_CSS_SELECTOR, {
    visible: true,
  });

  await page.waitForSelector(constants.SEMESTER_DROPDOWN_SELECTOR, {
    visible: true,
  });
}

function updateAndSaveFile(filePath, jsonData, semesterDetails) {
  try {
    const semesterCombo = `${semesterDetails.season}_${semesterDetails.year}`;

    const fileName = `${semesterCombo}.json`;

    const directoryPath = filePath + `\\${semesterCombo}`;

    console.log("228:", directoryPath);

    // Create the entire directory path if it doesn't exist
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    } else {
      fs.renameSync(directoryPath, directoryPath);
    }

    const fileLocation = directoryPath + "\\" + fileName;
    const oldUpdatedFileLocation = directoryPath + "\\" + "old_" + fileName;
    // Rename the file if it exists
    if (fs.existsSync(fileLocation)) {
      fs.renameSync(fileLocation, oldUpdatedFileLocation);
    } else {
      fs.writeFileSync(oldUpdatedFileLocation, JSON.stringify({}));
    }

    // Write to the new file
    fs.writeFileSync(fileLocation, jsonData);

    console.log("File updated and saved successfully.");
  } catch (error) {
    console.error("Error updating and saving the file:", error);
  }
}

async function getCurrentSemester(page) {
  await wait(page);

  const dropdown = await page.$(constants.SEMESTER_DROPDOWN_SELECTOR);
  const selectedOptionText = await dropdown.evaluate((select) => {
    const selectedOption = select.querySelector("option:checked");
    return selectedOption.textContent;
  });

  const semesterComponents = selectedOptionText.split(" ");
  return { year: semesterComponents[0], season: semesterComponents[1] };
}

async function main(filePath, semesterDetails) {
  if (!filePath) {
    throw new Error("No file path provided");
  }

  console.time("SCRAPING PROCESS");
  const { page, browser } = await initiatePuppeteer();

  if (semesterDetails) {
    const { sanity, year, season } = sanityCheckSemesterDetail(semesterDetails);

    if (sanity) {
      semesterDetails = { year: year, season: season };
      await navigateToSemester(page, year, season);
    } else {
      throw new Error("Please provide valid 'semesterDetails' paramater");
    }
  } else {
    semesterDetails = await getCurrentSemester(page);
  }

  logger.info(semesterDetails);

  const completedSemesterCourses = await getCompletedSemester(page);

  const jsonData = JSON.stringify(completedSemesterCourses);

  updateAndSaveFile(filePath, jsonData, semesterDetails);

  await browser.close();

  console.timeEnd("SCRAPING PROCESS");
}

exports.runScraper = main;
