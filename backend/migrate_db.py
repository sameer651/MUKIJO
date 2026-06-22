import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    if not DATABASE_URL:
        print("DATABASE_URL is not set")
        return
    print(f"Connecting to database: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # Add columns to events table
        cols = [
            ("cover_image", "VARCHAR"),
            ("registration_deadline", "VARCHAR"),
            ("max_participants", "INTEGER"),
            ("fee", "INTEGER DEFAULT 0"),
            ("auto_reminder", "BOOLEAN DEFAULT FALSE"),
            ("attendance_tracking", "BOOLEAN DEFAULT FALSE"),
            ("is_public", "BOOLEAN DEFAULT TRUE"),
            ("allow_guest", "BOOLEAN DEFAULT FALSE"),
            ("allow_waiting_list", "BOOLEAN DEFAULT FALSE"),
            ("rules_pdf", "VARCHAR"),
            ("schedule_file", "VARCHAR"),
            ("permission_forms", "VARCHAR"),
            ("match_fixtures", "VARCHAR"),
            ("event_posters", "VARCHAR"),
            ("owner_id", "INTEGER REFERENCES users(id)")
        ]
        
        # Alter columns if needed or add them
        for col_name, col_type in cols:
            try:
                conn.execute(text(f"ALTER TABLE events ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                print(f"Column '{col_name}' added successfully or already exists.")
            except Exception as e:
                print(f"Error adding '{col_name}': {e}")
                
        # Drop NOT NULL constraint on group_id in events
        try:
            conn.execute(text("ALTER TABLE events ALTER COLUMN group_id DROP NOT NULL;"))
            print("Dropped NOT NULL from group_id in events")
        except Exception as e:
            print(f"Note on group_id alteration: {e}")
            
        # Add columns to venues table
        venue_cols = [
            ("cover_image", "TEXT"),
            ("venue_images", "TEXT")
        ]
        for col_name, col_type in venue_cols:
            try:
                conn.execute(text(f"ALTER TABLE venues ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                print(f"Column '{col_name}' added to venues successfully or already exists.")
            except Exception as e:
                print(f"Error adding '{col_name}' to venues: {e}")
            
        # Add columns to messages table
        message_cols = [
            ("channel", "VARCHAR DEFAULT 'general'"),
            ("recipient_id", "INTEGER"),
            ("recipient_type", "VARCHAR")
        ]
        for col_name, col_type in message_cols:
            try:
                conn.execute(text(f"ALTER TABLE messages ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                print(f"Column '{col_name}' added to messages successfully or already exists.")
            except Exception as e:
                print(f"Error adding '{col_name}' to messages: {e}")
                
        # Drop NOT NULL constraint on group_id in messages
        try:
            conn.execute(text("ALTER TABLE messages ALTER COLUMN group_id DROP NOT NULL;"))
            print("Dropped NOT NULL from group_id in messages")
        except Exception as e:
            print(f"Note on group_id alteration in messages: {e}")
            
        conn.commit()
    print("Database migration finished.")

if __name__ == "__main__":
    migrate()
