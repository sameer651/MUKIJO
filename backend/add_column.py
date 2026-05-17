import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def add_columns():
    if not DATABASE_URL: return
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhar_number VARCHAR;"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR;"))
        conn.execute(text("ALTER TABLE groups ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id);"))
        conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS start_time VARCHAR;"))
        conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time VARCHAR;"))
        conn.commit()
    print("Columns added successfully")

if __name__ == "__main__":
    add_columns()
