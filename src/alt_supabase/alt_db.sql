-- Run query to create postgres database tables

DROP TABLE IF EXISTS alt.section_semester;
DROP TABLE IF EXISTS alt.course_semester;
DROP TABLE IF EXISTS alt.alt_sections;
DROP TABLE IF EXISTS alt.alt_courses;
DROP TABLE IF EXISTS alt.alt_semester;


CREATE TABLE alt.alt_semester (
    semester_id TEXT PRIMARY KEY,
    season TEXT NOT NULL,
    year TEXT NOT NULL, 
    CONSTRAINT semester_uniqueness UNIQUE (season, year)
);

--TODO: Create better non-nullable within tables
CREATE TABLE alt.alt_courses (
    course_id TEXT PRIMARY KEY,
    department TEXT NOT NULL,
    course_name TEXT NOT NULL,
    course_number TEXT NOT NULL,
    number_of_sections INT NOT NULL,
    CONSTRAINT courses_uniqueness UNIQUE (department, course_number) 
);

CREATE TABLE alt.alt_sections (
    section_id TEXT PRIMARY KEY,
    section_number TEXT NOT NULL,
    course TEXT NOT NULL,
    crn INT NOT NULL,
    days TEXT[],
    start_time BIGINT,
    end_time BIGINT,
    location TEXT,
    credits INT,
    info TEXT,
    instructor TEXT,

    CONSTRAINT fk_sections_course_id
    FOREIGN KEY (course)
    REFERENCES alt.alt_courses (course_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

    CONSTRAINT sections_uniqueness
    UNIQUE (section_number, course)
  );

CREATE TABLE alt.course_semester (
    course_id TEXT NOT NULL,
    semester_id TEXT NOT NULL,
    PRIMARY KEY (course_id, semester_id),
    FOREIGN KEY (course_id) REFERENCES alt.alt_courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES alt.alt_semester(semester_id) ON DELETE CASCADE
);

CREATE TABLE alt.section_semester (
    section_id TEXT NOT NULL,
    semester_id TEXT NOT NULL,
    PRIMARY KEY (section_id, semester_id),
    FOREIGN KEY (section_id) REFERENCES alt.alt_sections(section_id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES alt.alt_semester(semester_id) ON DELETE CASCADE
);




