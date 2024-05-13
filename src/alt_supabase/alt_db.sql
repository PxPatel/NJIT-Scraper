-- Run query to create postgres database tables

DROP TABLE IF EXISTS section_semester cascade;
DROP TABLE IF EXISTS course_semester cascade;
DROP TABLE IF EXISTS alt_sections cascade;
DROP TABLE IF EXISTS alt_courses cascade;
DROP TABLE IF EXISTS alt_semesters cascade;
DROP FUNCTION IF EXISTS get_unique_departments_in_semester(text);

CREATE TABLE alt_semesters (
    semester_id TEXT PRIMARY KEY,
    season TEXT NOT NULL,
    year TEXT NOT NULL, 
    CONSTRAINT semester_uniqueness UNIQUE (season, year)
);

CREATE TABLE alt_courses (
    course_id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    department TEXT NOT NULL,
    course_name TEXT NOT NULL,
    course_number TEXT NOT NULL,
    credits NUMERIC(10, 1) NOT NULL,
    CONSTRAINT courses_uniqueness UNIQUE (department, course_number, course_name) 
);


CREATE TABLE course_semester (
    co_sem_id TEXT PRIMARY KEY, --Ex: FALL23_ACCT112
    course_id BIGINT NOT NULL,
    semester_id TEXT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES alt_courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES alt_semesters(semester_id) ON DELETE CASCADE,
    CONSTRAINT courses_sem_uniqueness UNIQUE (course_id, semester_id) 
);

CREATE TABLE alt_sections (
    section_id TEXT PRIMARY KEY,
    section_number TEXT NOT NULL,
    co_sem_id TEXT NOT NULL,
    crn INT NOT NULL,
    days TEXT[] NOT NULL,
    start_times BIGINT[] NOT NULL,
    end_times BIGINT[] NOT NULL,
    location TEXT[] NOT NULL,
    status TEXT NOT NULL,
    credits NUMERIC(10,1) NOT NULL,
    info TEXT,
    instructor TEXT,
    
    CONSTRAINT fk_sections_course_semester_id
    FOREIGN KEY (co_sem_id)
    REFERENCES course_semester (co_sem_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

    CONSTRAINT sections_uniqueness
    UNIQUE (section_number, co_sem_id)

  );

CREATE TABLE section_semester (
    sec_sem_id TEXT PRIMARY KEY, --FALL23_ACCT112-02
    section_id TEXT NOT NULL,
    semester_id TEXT NOT NULL,
    FOREIGN KEY (section_id) REFERENCES alt_sections(section_id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES alt_semesters(semester_id) ON DELETE CASCADE,
);

CREATE OR REPLACE FUNCTION get_unique_departments_in_semester(semester_id_param TEXT, limit_param bigint)
RETURNS TABLE (
    department TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ac.department 
    FROM alt_courses ac 
    INNER JOIN course_semester cs ON ac.course_id = cs.course_id
    WHERE cs.semester_id = semester_id_param
    ORDER BY department
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;
