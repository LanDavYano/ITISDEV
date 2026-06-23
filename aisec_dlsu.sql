CREATE DATABASE IF NOT EXISTS aiesec_dlsu;
USE aiesec_dlsu;

DROP TABLE IF EXISTS performance_record;
DROP TABLE IF EXISTS sub_department;
DROP TABLE IF EXISTS department;
DROP TABLE IF EXISTS `user`;
DROP TABLE IF EXISTS role;

-- 1. ROLE  (reference table — 3 fixed roles)
CREATE TABLE role (
    role_id     TINYINT UNSIGNED    NOT NULL AUTO_INCREMENT,
    role_title  VARCHAR(50)         NOT NULL,
    CONSTRAINT pk_role        PRIMARY KEY (role_id),
    CONSTRAINT uq_role_title  UNIQUE (role_title)
) ENGINE=InnoDB;

-- 2. DEPARTMENT
CREATE TABLE department (
    department_id    INT UNSIGNED                       NOT NULL AUTO_INCREMENT,
    department_name  VARCHAR(100)                       NOT NULL,
    office_type      ENUM('Front Office','Back Office') NOT NULL,
    dept_leader_id   INT UNSIGNED                       NULL,   -- one leader per dept
    CONSTRAINT pk_department      PRIMARY KEY (department_id),
    CONSTRAINT uq_department_name UNIQUE (department_name)
) ENGINE=InnoDB;

-- 3. SUB_DEPARTMENT
CREATE TABLE sub_department (
    sub_department_id    INT UNSIGNED   NOT NULL AUTO_INCREMENT,
    sub_department_name  VARCHAR(100)   NOT NULL,
    department_id        INT UNSIGNED   NOT NULL,
    sub_dept_leader_id   INT UNSIGNED   NULL,
    CONSTRAINT pk_sub_department  PRIMARY KEY (sub_department_id),
    CONSTRAINT uq_subdept_in_dept UNIQUE (department_id, sub_department_name),
    CONSTRAINT fk_subdept_department
        FOREIGN KEY (department_id) REFERENCES department (department_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT   -- don't allow deleting a dept that still has sub-depts
) ENGINE=InnoDB;

-- 4. USER
CREATE TABLE `user` (
    user_id           INT UNSIGNED   NOT NULL AUTO_INCREMENT,
    first_name        VARCHAR(100)   NOT NULL,
    last_name         VARCHAR(100)   NOT NULL,
    email             VARCHAR(255)   NOT NULL,
    password          VARCHAR(255)   NOT NULL,   -- store a hash, never plaintext
    birthdate         DATE           NOT NULL,
    id_number         VARCHAR(20)    NOT NULL,   -- VARCHAR to preserve leading zeros
    role_id           TINYINT UNSIGNED NOT NULL,
    department_id     INT UNSIGNED   NOT NULL,
    sub_department_id INT UNSIGNED   NULL,
    created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                              ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_user            PRIMARY KEY (user_id),
    CONSTRAINT uq_user_email      UNIQUE (email),
    CONSTRAINT uq_user_id_number  UNIQUE (id_number),
    CONSTRAINT chk_user_email     CHECK (email LIKE '%_@_%._%'),  -- basic format guard
    CONSTRAINT fk_user_role
        FOREIGN KEY (role_id) REFERENCES role (role_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_user_department
        FOREIGN KEY (department_id) REFERENCES department (department_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_user_sub_department
        FOREIGN KEY (sub_department_id) REFERENCES sub_department (sub_department_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5. PERFORMANCE_RECORD  (the "Input Data" — one submission per member, period)
CREATE TABLE performance_record (
    record_id              INT UNSIGNED      NOT NULL AUTO_INCREMENT,
    user_id                INT UNSIGNED      NOT NULL,
    period_month           ENUM('January','February','March','April','May','June',
                                'July','August','September','October','November',
                                'December')  NOT NULL,
    period_year            SMALLINT UNSIGNED NOT NULL,
    deliverables_assigned  INT UNSIGNED      NOT NULL DEFAULT 0,
    deliverables_answered  INT UNSIGNED      NOT NULL DEFAULT 0,
    meetings_total         INT UNSIGNED      NOT NULL DEFAULT 0,
    meetings_attended      INT UNSIGNED      NOT NULL DEFAULT 0,
    qualitative_answer     TEXT              NULL,
    quantitative_rating    TINYINT UNSIGNED  NULL,   -- 0..100, validated by CHECK
    created_at             TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                      ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_performance_record PRIMARY KEY (record_id),
    CONSTRAINT uq_record_per_period  UNIQUE (user_id, period_year, period_month),
    CONSTRAINT chk_rating_range      CHECK (quantitative_rating BETWEEN 0 AND 100),
    CONSTRAINT chk_answered_le_assigned
        CHECK (deliverables_answered <= deliverables_assigned),
    CONSTRAINT chk_attended_le_total
        CHECK (meetings_attended <= meetings_total),
    CONSTRAINT chk_period_year       CHECK (period_year BETWEEN 2000 AND 2100),
    CONSTRAINT fk_record_user
        FOREIGN KEY (user_id) REFERENCES `user` (user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE   -- remove a user's records if the user is deleted
) ENGINE=InnoDB;

-- 6. CIRCULAR FOREIGN KEYS  (added after `user` exists)
ALTER TABLE department
    ADD CONSTRAINT fk_department_leader
        FOREIGN KEY (dept_leader_id) REFERENCES `user` (user_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;

ALTER TABLE sub_department
    ADD CONSTRAINT fk_subdept_leader
        FOREIGN KEY (sub_dept_leader_id) REFERENCES `user` (user_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;

-- 7. SEED DATA  (reference + organizational structure)
-- Roles -----------------------------------------------------------------------
INSERT INTO role (role_id, role_title) VALUES
    (1, 'Member'),
    (2, 'Team Leader of Sub Department'),
    (3, 'Leader of Department');   -- shares admin-level access

-- Departments -----------------------------------------------------------------
INSERT INTO department (department_name, office_type) VALUES
    ('Incoming Global Talent',            'Front Office'),
    ('Incoming Global Volunteer',         'Front Office'),
    ('Outgoing Exchange',                 'Front Office'),
    ('Business Development',              'Back Office'),
    ('Finance and Legal Administrations', 'Back Office'),
    ('Marketing',                         'Back Office'),
    ('Talent Management',                 'Back Office');

-- Sub-departments (department resolved by name so insert order doesn't matter)
INSERT INTO sub_department (sub_department_name, department_id)
SELECT v.name, d.department_id
FROM department d
JOIN (
    SELECT 'Incoming Global Talent'            AS dept, 'Product Management'             AS name UNION ALL
    SELECT 'Incoming Global Talent',                'International Relations'                 UNION ALL
    SELECT 'Incoming Global Talent',                'Customer Experience'                     UNION ALL

    SELECT 'Incoming Global Volunteer',             'Product Management'                      UNION ALL
    SELECT 'Incoming Global Volunteer',             'Customer Experience'                     UNION ALL
    SELECT 'Incoming Global Volunteer',             'International Relations'                 UNION ALL
    SELECT 'Incoming Global Volunteer',             'Accounts Management'                     UNION ALL

    SELECT 'Outgoing Exchange',                     'External Growth Strategies'              UNION ALL
    SELECT 'Outgoing Exchange',                     'Exchange Management'                     UNION ALL
    SELECT 'Outgoing Exchange',                     'International Relations'                 UNION ALL

    SELECT 'Business Development',                  'Stakeholder Development'                 UNION ALL
    SELECT 'Business Development',                  'Business Intelligence'                   UNION ALL
    SELECT 'Business Development',                  'Product Sales'                           UNION ALL

    SELECT 'Finance and Legal Administrations',     'University Compliance'                   UNION ALL
    SELECT 'Finance and Legal Administrations',     'Finance and Legalities'                  UNION ALL
    SELECT 'Finance and Legal Administrations',     'Strategic Finance'                       UNION ALL

    SELECT 'Marketing',                             'Brand Marketing'                         UNION ALL
    SELECT 'Marketing',                             'Incoming Exchange Marketing'             UNION ALL
    SELECT 'Marketing',                             'Outgoing Exchange Marketing'             UNION ALL

    SELECT 'Talent Management',                     'Performance Management'                  UNION ALL
    SELECT 'Talent Management',                     'Learning and Development'                UNION ALL
    SELECT 'Talent Management',                     'Member and Alumni Experience'
) AS v
  ON v.dept = d.department_name;