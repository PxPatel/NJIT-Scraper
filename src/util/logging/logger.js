const fs = require("fs");

exports.logger = function logger(statement, logFilePath) {
  try {
    fs.appendFileSync(
      logFilePath ? logFilePath : "sample\\log\\log.txt",
      `\n${new Date().toLocaleString()} ${statement}`
    );
  } catch (error) {
    console.log(error);
  }
};
