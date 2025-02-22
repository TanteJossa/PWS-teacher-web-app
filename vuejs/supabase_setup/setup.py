# --- START OF FILE setup.py ---

import os
import sys
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Fetch variables
USER = os.getenv("user")
PASSWORD = os.getenv("password")
HOST = os.getenv("host")
PORT = os.getenv("port")
DBNAME = os.getenv("dbname")


def create_tables(conn):
    cur = conn.cursor()

    # Drop tables if they exist, with CASCADE to handle dependencies
    cur.execute("DROP TABLE IF EXISTS grade_instances CASCADE;")
    cur.execute("DROP TABLE IF EXISTS gpt_tests_settings CASCADE;")
    cur.execute("DROP TABLE IF EXISTS gpt_questions_settings CASCADE;")
    cur.execute("DROP TABLE IF EXISTS test_pdf_settings CASCADE;")
    cur.execute("DROP TABLE IF EXISTS students_points_results CASCADE;")
    cur.execute("DROP TABLE IF EXISTS students_question_results CASCADE;")
    cur.execute("DROP TABLE IF EXISTS rubric_points CASCADE;")
    cur.execute("DROP TABLE IF EXISTS targets CASCADE;")
    cur.execute("DROP TABLE IF EXISTS questions CASCADE;")
    cur.execute("DROP TABLE IF EXISTS sections CASCADE;")
    cur.execute("DROP TABLE IF EXISTS results CASCADE;")
    cur.execute("DROP TABLE IF EXISTS students CASCADE;")
    cur.execute("DROP TABLE IF EXISTS files CASCADE;")
    cur.execute("DROP TABLE IF EXISTS tests CASCADE;")


    # Create tests table
    cur.execute("""
    CREATE TABLE tests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        name text NOT NULL,
        is_public boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        gpt_provider text,
        gpt_model text,
        grade_rules text,
        test_data_result jsonb
    );
    """)

    # Create students table (child of tests) - **Moved up**
    cur.execute("""
    CREATE TABLE students (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        student_id text,
        created_at timestamptz DEFAULT now()
    );
    """)

    # Create questions table (child of tests)
    cur.execute("""
    CREATE TABLE questions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        question_number text,
        question_text text,
        question_context text,
        answer_text text,
        is_draw_question boolean DEFAULT FALSE,
        created_at timestamptz DEFAULT now()
    );
    """)

    # Create rubric_points table (child of questions and students) - Students now exists
    cur.execute("""
    CREATE TABLE rubric_points (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        point_text text,
        point_name text,
        point_weight integer,
        point_index integer,
        target_id uuid,
        created_at timestamptz DEFAULT now()
    );
    """)

    # Create targets table (child of tests)
    cur.execute("""
    CREATE TABLE targets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        target_name text,
        explanation text,
        created_at timestamptz DEFAULT now()
    );
    """)


     # Create students_question_results table (child of student and question)
    cur.execute("""
    CREATE TABLE students_question_results (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        feedback text,
        student_handwriting_percent numeric,
        created_at timestamptz DEFAULT now()

    );
    """)
    # Create students_points_results table (child of students_question_results)
    cur.execute("""
    CREATE TABLE students_points_results (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        student_question_result_id uuid NOT NULL REFERENCES students_question_results(id) ON DELETE CASCADE,
        point_index text,
        has_point boolean,
        feedback text,
        created_at timestamptz DEFAULT now()
    );
    """)
    # Create grade_instances table (child of students_question_results)
    cur.execute("""
    CREATE TABLE grade_instances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        student_question_result_id uuid NOT NULL REFERENCES students_question_results(id) ON DELETE CASCADE,
        is_gpt boolean DEFAULT FALSE,
        model text,
        provider text,
        created_at timestamptz DEFAULT now()
    );
    """)
    # Create gpt_tests_settings table (child of tests)
    cur.execute("""
    CREATE TABLE gpt_tests_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        school_type text,
        school_year integer,
        school_subject text,
        subject text,
        learned text,
        requested_topics text,
        created_at timestamptz DEFAULT now()
    );
    """)
    # Create gpt_questions_settings table (child of tests)
    cur.execute("""
    CREATE TABLE gpt_questions_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        rtti text,
        subject text,
        targets jsonb,
        point_count integer,
        created_at timestamptz DEFAULT now()
    );
    """)
    # Create test_pdf_settings table (child of tests)
    cur.execute("""
    CREATE TABLE test_pdf_settings (
        id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        test_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        test_name text,
        show_targets boolean,
        show_answers boolean,
        output_type text,
        created_at timestamptz DEFAULT now()
    );
    """)

    # Create sections table (child of tests)
    cur.execute("""
    CREATE TABLE sections (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        name text,
        description text,
        question_number text,
        is_qr_section boolean,
        student_id text,
        created_at timestamptz DEFAULT now()
    );
    """)
    # Create results table (child of tests, and referencing questions)
    cur.execute("""
    CREATE TABLE results (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        student_id uuid NOT NULL,
        points numeric,
        created_at timestamptz DEFAULT now()
    );
    """)
    # Create files table
    cur.execute("""
    CREATE TABLE files (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        test_id uuid REFERENCES tests(id),
        student_question_result_id uuid REFERENCES students_question_results(id),
        location text,
        file_type text,
        created_at timestamptz DEFAULT now()
    );
    """)

    conn.commit()
    cur.close()
    print("Tables created or replaced successfully.")


def create_triggers(conn):
    cur = conn.cursor()

    # Function to update the updated_at column
    cur.execute("""
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = now();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
    """)

    # Trigger on tests table
    cur.execute("""
    DROP TRIGGER IF EXISTS update_tests_updated_at ON tests;
    CREATE TRIGGER update_tests_updated_at
    BEFORE UPDATE ON tests
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
    """)


    conn.commit()
    cur.close()
    print("Triggers created or replaced successfully.")


def create_policies(conn):
    cur = conn.cursor()
    # Enable row-level security on all tables

    all_tables = [
    'tests', 'questions', 'sections', 'results', 'students',
    'rubric_points', 'targets', 'students_question_results',
    'students_points_results', 'grade_instances',
    'gpt_tests_settings', 'gpt_questions_settings',
    'test_pdf_settings', 'files'
    ]

    for table in all_tables:
        cur.execute(f"ALTER TABLE IF EXISTS {table} ENABLE ROW LEVEL SECURITY;")

    # Policies for tests table
    cur.execute("""
    DROP POLICY IF EXISTS select_tests ON tests;
    CREATE POLICY select_tests ON tests
    FOR SELECT
    USING (
      auth.uid() = user_id OR is_public = true OR current_setting('jwt.claims.role', true) = 'admin'
    );
    """)

    cur.execute("""
    DROP POLICY IF EXISTS insert_tests ON tests;
    CREATE POLICY insert_tests ON tests
    FOR INSERT
    WITH CHECK (
      auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin'
    );
    """)

    cur.execute("""
    DROP POLICY IF EXISTS update_tests ON tests;
    CREATE POLICY update_tests ON tests
    FOR UPDATE
    USING (
      auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin'
    )
    WITH CHECK (
      auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin'
    );
    """)

    cur.execute("""
    DROP POLICY IF EXISTS delete_tests ON tests;
    CREATE POLICY delete_tests ON tests
    FOR DELETE
    USING (
      auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin'
    );
    """)

    child_tables = [
    'rubric_points', # Removed grade_instances
    ]

    # Generic policies for child tables related to questions and directly having question_id
    for table in child_tables:
        cur.execute(f"DROP POLICY IF EXISTS select_{table} ON {table};")
        cur.execute(f"""
        CREATE POLICY select_{table} ON {table}
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM tests
            JOIN questions ON {table}.question_id = questions.id
            WHERE questions.test_id = tests.id
              AND (auth.uid() = user_id OR is_public = true OR current_setting('jwt.claims.role', true) = 'admin')
          )
        );
        """)

        cur.execute(f"DROP POLICY IF EXISTS insert_{table} ON {table};")
        cur.execute(f"""
        CREATE POLICY insert_{table} ON {table}
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM tests
            JOIN questions ON {table}.question_id = questions.id
            WHERE questions.test_id = tests.id
              AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin')
          )
        );
        """)

        cur.execute(f"DROP POLICY IF EXISTS update_{table} ON {table};")
        cur.execute(f"""
        CREATE POLICY update_{table} ON {table}
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM tests
            JOIN questions ON {table}.question_id = questions.id
            WHERE questions.test_id = tests.id
              AND (auth.uid() = user_id OR is_public = true OR current_setting('jwt.claims.role', true) = 'admin')
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM tests
            JOIN questions ON {table}.question_id = questions.id
            WHERE questions.test_id = tests.id
              AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin')
          )
        );
        """)

        cur.execute(f"DROP POLICY IF EXISTS delete_{table} ON {table};")
        cur.execute(f"""
        CREATE POLICY delete_{table} ON {table}
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM tests
            JOIN questions ON {table}.question_id = questions.id
            WHERE questions.test_id = tests.id
              AND (auth.uid() = user_id OR is_public = true OR current_setting('jwt.claims.role', true) = 'admin')
          )
        );
        """)

    # Policies for questions table (separate from generic policy) - as before
    cur.execute("""
    DROP POLICY IF EXISTS select_questions ON questions;
    CREATE POLICY select_questions ON questions
    FOR SELECT
    USING (
      EXISTS (SELECT 1 FROM tests WHERE tests.id = questions.test_id AND (auth.uid() = user_id OR is_public = true OR current_setting('jwt.claims.role', true) = 'admin'))
    );
    """)
    cur.execute("""
    DROP POLICY IF EXISTS insert_questions ON questions;
    CREATE POLICY insert_questions ON questions
    FOR INSERT
    WITH CHECK (
       EXISTS (SELECT 1 FROM tests WHERE tests.id = questions.test_id AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin'))
    );
    """)
    cur.execute("""
    DROP POLICY IF EXISTS update_questions ON questions;
    CREATE POLICY update_questions ON questions
    FOR UPDATE
    USING (
       EXISTS (SELECT 1 FROM tests WHERE tests.id = questions.test_id AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin'))
    )
    WITH CHECK (
       EXISTS (SELECT 1 FROM tests WHERE tests.id = questions.test_id AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin'))
    );
    """)
    cur.execute("""
    DROP POLICY IF EXISTS delete_questions ON questions;
    CREATE POLICY delete_questions ON questions
    FOR DELETE
    USING (
       EXISTS (SELECT 1 FROM tests WHERE tests.id = questions.test_id AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin'))
    );
    """)

    # Policies for targets table (separate policy, direct test_id link) - as before
    cur.execute("""
    DROP POLICY IF EXISTS select_targets ON targets;
    CREATE POLICY select_targets ON targets
    FOR SELECT
    USING (
      EXISTS (SELECT 1 FROM tests WHERE tests.id = targets.test_id AND (auth.uid() = user_id OR is_public = true OR current_setting('jwt.claims.role', true) = 'admin'))
    );
    """)
    cur.execute("""
    DROP POLICY IF EXISTS insert_targets ON targets;
    CREATE POLICY insert_targets ON targets
    FOR INSERT
    WITH CHECK (
       EXISTS (SELECT 1 FROM tests WHERE tests.id = targets.test_id AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin'))
    );
    """)
    cur.execute("""
    DROP POLICY IF EXISTS update_targets ON targets;
    CREATE POLICY update_targets ON targets
    FOR UPDATE
    USING (
       EXISTS (SELECT 1 FROM tests WHERE tests.id = targets.test_id AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin'))
    )
    WITH CHECK (
       EXISTS (SELECT 1 FROM tests WHERE tests.id = targets.test_id AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin'))
    );
    """)
    cur.execute("""
    DROP POLICY IF EXISTS delete_targets ON targets;
    CREATE POLICY delete_targets ON targets
    FOR DELETE
    USING (
       EXISTS (SELECT 1 FROM tests WHERE tests.id = targets.test_id AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin'))
    );
    """)


    # Specialized Policies for students_question_results - Corrected joins - as before
    cur.execute(f"DROP POLICY IF EXISTS select_students_question_results ON students_question_results;")
    cur.execute(f"""
    CREATE POLICY select_students_question_results ON students_question_results
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM tests
        JOIN questions ON students_question_results.question_id = questions.id
        WHERE questions.test_id = tests.id
          AND (auth.uid() = user_id OR is_public = true OR current_setting('jwt.claims.role', true) = 'admin')
      )
    );
    """)
    cur.execute(f"DROP POLICY IF EXISTS insert_students_question_results ON students_question_results;")
    cur.execute(f"""
    CREATE POLICY insert_students_question_results ON students_question_results
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM tests
        JOIN questions ON students_question_results.question_id = questions.id
        WHERE questions.test_id = tests.id
          AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin')
      )
    );
    """)
    cur.execute(f"DROP POLICY IF EXISTS update_students_question_results ON students_question_results;")
    cur.execute(f"""
    CREATE POLICY update_students_question_results ON students_question_results
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM tests
        JOIN questions ON students_question_results.question_id = questions.id
        WHERE questions.test_id = tests.id
          AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM tests
        JOIN questions ON students_question_results.question_id = questions.id
        WHERE questions.test_id = tests.id
          AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin')
      )
    );
    """)
    cur.execute(f"DROP POLICY IF EXISTS delete_students_question_results ON students_question_results;")
    cur.execute(f"""
    CREATE POLICY delete_students_question_results ON students_question_results
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM tests
        JOIN questions ON students_question_results.question_id = questions.id
        WHERE questions.test_id = tests.id
          AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin')
      )
    );
    """)


    # Specialized Policies for grade_instances - Corrected joins, using student_question_result_id
    cur.execute(f"DROP POLICY IF EXISTS select_grade_instances ON grade_instances;")
    cur.execute(f"""
    CREATE POLICY select_grade_instances ON grade_instances
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM tests
        JOIN students_question_results ON grade_instances.student_question_result_id = students_question_results.id
        JOIN questions ON students_question_results.question_id = questions.id
        WHERE questions.test_id = tests.id
          AND (auth.uid() = user_id OR is_public = true OR current_setting('jwt.claims.role', true) = 'admin')
      )
    );
    """)

    cur.execute(f"DROP POLICY IF EXISTS insert_grade_instances ON grade_instances;")
    cur.execute(f"""
    CREATE POLICY insert_grade_instances ON grade_instances
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM tests
        JOIN students_question_results ON grade_instances.student_question_result_id = students_question_results.id
        JOIN questions ON students_question_results.question_id = questions.id
        WHERE questions.test_id = tests.id
          AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin')
      )
    );
    """)

    cur.execute(f"DROP POLICY IF EXISTS update_grade_instances ON grade_instances;")
    cur.execute(f"""
    CREATE POLICY update_grade_instances ON grade_instances
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM tests
        JOIN students_question_results ON grade_instances.student_question_result_id = students_question_results.id
        JOIN questions ON students_question_results.question_id = questions.id
        WHERE questions.test_id = tests.id
          AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM tests
        JOIN students_question_results ON grade_instances.student_question_result_id = students_question_results.id
        JOIN questions ON students_question_results.question_id = questions.id
        WHERE questions.test_id = tests.id
          AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin')
      )
    );
    """)

    cur.execute(f"DROP POLICY IF EXISTS delete_grade_instances ON grade_instances;")
    cur.execute(f"""
    CREATE POLICY delete_grade_instances ON grade_instances
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM tests
        JOIN students_question_results ON grade_instances.student_question_result_id = students_question_results.id
        JOIN questions ON students_question_results.question_id = questions.id
        WHERE questions.test_id = tests.id
          AND (auth.uid() = user_id OR is_public = true OR current_setting('jwt.claims.role', true) = 'admin')
      )
    );
    """)


    # Policies for files table (assuming files can be associated with either tests or students_question_results) - Separate policy - as before
    cur.execute("""
    DROP POLICY IF EXISTS select_files ON files;
    CREATE POLICY select_files ON files
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM tests WHERE id = files.test_id
          AND (auth.uid() = user_id OR is_public = true OR current_setting('jwt.claims.role', true) = 'admin')
      )
      OR EXISTS (
        SELECT 1 FROM students_question_results
        JOIN questions ON students_question_results.question_id = questions.id
        JOIN tests ON questions.test_id = tests.id
        WHERE students_question_results.id = files.student_question_result_id
          AND (auth.uid() = tests.user_id OR tests.is_public = true OR current_setting('jwt.claims.role', true) = 'admin')
      )
    );
    """)

    cur.execute("""
    DROP POLICY IF EXISTS insert_files ON files;
    CREATE POLICY insert_files ON files
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM tests WHERE id = files.test_id
          AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin')
      )
      OR EXISTS (
        SELECT 1 FROM students_question_results
        JOIN questions ON students_question_results.question_id = questions.id
        JOIN tests ON questions.test_id = tests.id
        WHERE students_question_results.id = files.student_question_result_id
          AND (auth.uid() = tests.user_id OR current_setting('jwt.claims.role', true) = 'admin')
      )
    );
    """)

    cur.execute("""
    DROP POLICY IF EXISTS update_files ON files;
    CREATE POLICY update_files ON files
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM tests WHERE id = files.test_id
          AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin')
      )
      OR EXISTS (
        SELECT 1 FROM students_question_results
        JOIN questions ON students_question_results.question_id = questions.id
        JOIN tests ON questions.test_id = tests.id
        WHERE students_question_results.id = files.student_question_result_id
          AND (auth.uid() = tests.user_id OR current_setting('jwt.claims.role', true) = 'admin')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM tests WHERE id = files.test_id
          AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin')
      )
      OR EXISTS (
        SELECT 1 FROM students_question_results
        JOIN questions ON students_question_results.question_id = questions.id
        JOIN tests ON questions.test_id = tests.id
        WHERE students_question_results.id = files.student_question_result_id
          AND (auth.uid() = tests.user_id OR current_setting('jwt.claims.role', true) = 'admin')
      )
    );
    """)

    cur.execute("""
    DROP POLICY IF EXISTS delete_files ON files;
    CREATE POLICY delete_files ON files
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM tests WHERE id = files.test_id
          AND (auth.uid() = user_id OR current_setting('jwt.claims.role', true) = 'admin')
      )
      OR EXISTS (
        SELECT 1 FROM students_question_results
        JOIN questions ON students_question_results.question_id = questions.id
        JOIN tests ON questions.test_id = tests.id
        WHERE students_question_results.id = files.student_question_result_id
          AND (auth.uid() = tests.user_id OR current_setting('jwt.claims.role', true) = 'admin')
      )
    );
    """)


    conn.commit()
    cur.close()
    print("Policies created or replaced successfully.")


def main():
    db_url = os.getenv('SUPABASE_DB_CONNECTION_STRING')
    if not db_url:
        print("Please set the SUPABASE_DB_CONNECTION_STRING environment variable.")
        sys.exit(1)

    # Connect to the database
    try:
        conn = psycopg2.connect(
            user=USER,
            password=PASSWORD,
            host=HOST,
            port=PORT,
            dbname=DBNAME
        )
        print("Connection successful!")

    except Exception as e:
        print(f"Failed to connect: {e}")

    try:
        create_tables(conn)
        create_triggers(conn)
        create_policies(conn)
    except Exception as e:
        print("Error creating or replacing schema:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    main()

# --- END OF FILE setup.py ---