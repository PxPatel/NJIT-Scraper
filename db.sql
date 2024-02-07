-- Run query to create postgres database tables

DROP TABLE IF EXISTS sections;
DROP TABLE IF EXISTS courses;

CREATE TABLE courses (
    course_id TEXT PRIMARY KEY,
    department TEXT,
    course_name TEXT,
    course_number TEXT,
    number_of_sections INT,
    CONSTRAINT courses_uniqueness UNIQUE (department, course_number) 
);

  
CREATE TABLE sections (
    id BIGINT PRIMARY KEY generated always as identity,
    section_number TEXT,
    course_id TEXT,
    crn INT,
    days TEXT[],
    start_time BIGINT,
    end_time BIGINT,
    location TEXT,
    credits INT,
    info TEXT,
    instructor TEXT,

    CONSTRAINT fk_sections_course_id
    FOREIGN KEY (course_id)
    REFERENCES courses (course_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

    CONSTRAINT sections_uniqueness
    UNIQUE (section_number, course_id)
  );
