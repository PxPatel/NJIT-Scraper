# NJIT Courses Web-Scraper

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)


## Purpose

To collect data regarding available courses and class section for the **latest posted semester**, and store the data in a Supabase database. This project is part of a larger project designed for NJIT students

NOTE: "Latest posted semester" can either be the current semester or the next semester, if the administration rolled out new information for the coming semester. Please be aware.

## Contribution

I encourage everyone to try and develop on the program. Anything from refactoring parts of the codebase to optimizing algorithms would be appreciated.

### Pull Requests

Please Fork the repo and open a PR with your changes. Please offer a rich description of what changes were made and how it improves the code.

### Upcoming Projects

As mentioned, this project is a stepping stone for a larger project. Keep an eye out for another repo.

## Tech Stack

- Node (Javascript)
- Puppeteer
- Supabase (PostgreSQL)

## Installation

### Packages

Run command in Terminal

```bash
npm install
```

### Supabase

Create a new project on Supabase Console and save Supabase Public Key and URL as environment variables.

TIP: Use the .env.example as a template to create your own .env file

### Database Tables

Create the necessary tables on Supabase database by writing on the SQL Editor on the Console.

Copy and Paste the PostgreSQL query at /src/supabase/db.sql file into the SQL Editor, and run the query.

## Usage

### Run Main command

Run following command in Terminal to scrap and store data:

```bash
npm run start
```

### Modify Environment Variables

The main command assumes an environment variable file named ".env" exists in the root directory. If the file has a different name, placed at another location, or doesn't exist, please modify the "npm run start" script in package.json accordingly.

Example: If environment variable file was at path: "\sampleDir\\setting.env.development"

Modify package.json:

```javascript
"scripts": {
    - "start": "node --env-file=.env main.js"
    + "start": "node --env-file=\\sampleDir\\setting.env.development main.js"
  },
```

### Modify Data Collection Location

In main.js at the root directory, the string variable JSON_FILEPATH defines where the resulting JSON file will be stored. If the file path inputted does not exist, or only partially exists, the program will create the path as appropriate.

NOTE: The last element of the variable represents the name of the JSON file. All elements before the last element represent directories.

TIP: If you would like to hide your preferred file path, store the variable as an environment variable and change the code accordingly.
