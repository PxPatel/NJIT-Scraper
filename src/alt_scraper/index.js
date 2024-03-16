const puppeteer = require("puppeteer");
const constants = require("./constants");
const logger = require("./logger");
const fs = require("fs");
const { sanityCheckSemesterDetail } = require("../util/sanitation/semester");

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
  return puppeteer.launch({ headless: false });
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
  async function wait() {
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }

  await wait();

  const coursesDict = await page.evaluate(
    (container, courses) => {
      if (!container) {
        return {};
      }

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
            const days = row
              .querySelector("td:nth-child(3)")
              .textContent.trim();
            const times = row
              .querySelector("td:nth-child(4)")
              .textContent.trim();
            const locations = row
              .querySelector("td:nth-child(5)")
              .textContent.trim();
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
    await page.$(constants.SPAN_CONTAINER_SELECTOR),
    courses
  );
  return coursesDict;
};

const getCompletedSemester = async (page, start, stop) => {
  logger.info("Starting process to scrap");

  const completedSemester = {};

  const { subjects, subjectsHandler } = await getSubjects(page);

  let startIndex = start ? start : 0;
  let iterateLength = stop ? stop : subjectsHandler.length;

  for (let i = startIndex; i < iterateLength; i++) {
    await subjectsHandler[i].click();

    await page.waitForSelector(constants.SPAN_CONTAINER_SELECTOR, {
      visible: true,
    });

    const { courses } = await getCoursesForSubject(page);

    coursesDict = await getAllSectionsForCourse(page, courses);

    completedSemester[subjects[i]] = coursesDict;
  }

  return completedSemester;
};

async function navigateToSemester(page, year, season) {
  await page.waitForSelector(constants.SEMESTER_DROPDOWN_SELECTOR);

  const dropdown = await page.$(constants.SEMESTER_DROPDOWN_SELECTOR);

  await dropdown.type(`${year} ${season}`);

  await page.waitForSelector(constants.SPAN_CONTAINER_SELECTOR, {
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
  await page.waitForSelector(constants.SEMESTER_DROPDOWN_SELECTOR);

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

  console.time("Scraping");
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

  console.log("COMP:", completedSemesterCourses);

  const jsonData = JSON.stringify(completedSemesterCourses);

  updateAndSaveFile(filePath, jsonData, semesterDetails);

  await browser.close();

  console.timeEnd("Scraping");
}

exports.runScraper = main;
