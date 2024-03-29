const puppeteer = require("puppeteer");
const constants = require("./constants");
const logger = require("./logger");
const fs = require("fs");

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

function updateAndSaveFile(filePath, jsonData) {
  try {
    const filePathSteps = filePath.split("\\");

    const fileName = filePathSteps[filePathSteps.length - 1];
    const directoryPath = filePathSteps
      .slice(0, filePathSteps.length - 1)
      .join("\\");

    // Create the entire directory path if it doesn't exist
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    const fileDirectory = filePath + ".json";
    const oldUpdatedFilePath =
      directoryPath + "\\" + "old_" + fileName + ".json";

    // Rename the file if it exists
    if (fs.existsSync(fileDirectory)) {
      fs.renameSync(fileDirectory, oldUpdatedFilePath);
    } else {
      fs.writeFileSync(oldUpdatedFilePath, JSON.stringify({}));
    }

    // Write to the new file
    fs.writeFileSync(fileDirectory, jsonData);

    console.log("File updated and saved successfully.");
  } catch (error) {
    console.error("Error updating and saving the file:", error);
  }
}

async function main(filePath) {
  if (!filePath) {
    throw new Error("No file path provided");
  }

  console.time("Scraping");
  const { page, browser } = await initiatePuppeteer();

  const completedSemesterCourses = await getCompletedSemester(page);

  const jsonData = JSON.stringify(completedSemesterCourses);

  updateAndSaveFile(filePath, jsonData);

  await browser.close();

  console.timeEnd("Scraping");
}

exports.runScraper = main;
