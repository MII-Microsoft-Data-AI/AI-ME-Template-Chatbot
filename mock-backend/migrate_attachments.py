"""
Migration script to remove conversation_id from attachments table.

This script:
1. Creates a backup of the attachments table
2. Drops the old attachments table
3. Creates a new attachments table without conversation_id
4. Migrates data from backup (if needed)
5. Recreates indexes

Run this script once to update your database schema.
"""

import sqlite3
import os
from datetime import datetime

def migrate_attachments_table(db_path: str = "mock.db"):
    """Migrate attachments table to remove conversation_id."""
    
    print(f"Starting migration for database: {db_path}")
    
    # Create backup
    backup_path = f"{db_path}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    print(f"Creating backup: {backup_path}")
    
    if os.path.exists(db_path):
        import shutil
        shutil.copy2(db_path, backup_path)
        print("Backup created successfully")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if attachments table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='attachments'
        """)
        
        if cursor.fetchone() is None:
            print("Attachments table doesn't exist, nothing to migrate")
            return
        
        # Check current schema
        cursor.execute("PRAGMA table_info(attachments)")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"Current columns: {columns}")
        
        if 'conversation_id' not in columns:
            print("Migration already completed - conversation_id column doesn't exist")
            return
        
        print("Starting migration...")
        
        # Create temporary backup table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS attachments_backup AS 
            SELECT * FROM attachments
        """)
        print("Created backup table")
        
        # Drop old indexes
        cursor.execute("DROP INDEX IF EXISTS idx_attachments_conversation_id")
        cursor.execute("DROP INDEX IF EXISTS idx_attachments_created_at")
        print("Dropped old indexes")
        
        # Drop old table
        cursor.execute("DROP TABLE attachments")
        print("Dropped old attachments table")
        
        # Create new table without conversation_id
        cursor.execute("""
            CREATE TABLE attachments (
                id TEXT PRIMARY KEY,
                userid TEXT NOT NULL,
                filename TEXT NOT NULL,
                blob_name TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
        """)
        print("Created new attachments table")
        
        # Migrate data - extract userid from blob_name if possible
        # blob_name format: attachments/{userid}/{conversation_id}/{attachment_id}_{filename}
        # New format: attachments/{userid}/{attachment_id}_{filename}
        cursor.execute("""
            INSERT INTO attachments (id, userid, filename, blob_name, created_at)
            SELECT 
                id,
                CASE 
                    WHEN blob_name LIKE 'attachments/%/%/%' THEN 
                        substr(blob_name, 13, instr(substr(blob_name, 13), '/') - 1)
                    ELSE 'unknown_user'
                END as userid,
                filename,
                blob_name,
                created_at
            FROM attachments_backup
        """)
        
        migrated_count = cursor.rowcount
        print(f"Migrated {migrated_count} records")
        
        # Create new indexes
        cursor.execute("""
            CREATE INDEX idx_attachments_userid 
            ON attachments(userid)
        """)
        
        cursor.execute("""
            CREATE INDEX idx_attachments_created_at 
            ON attachments(created_at DESC)
        """)
        print("Created new indexes")
        
        # Drop backup table
        cursor.execute("DROP TABLE attachments_backup")
        print("Dropped backup table")
        
        # Commit changes
        conn.commit()
        print("Migration completed successfully!")
        
        # Show new schema
        cursor.execute("PRAGMA table_info(attachments)")
        new_columns = [col[1] for col in cursor.fetchall()]
        print(f"New columns: {new_columns}")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
        raise
    
    finally:
        conn.close()


if __name__ == "__main__":
    # Run migration
    migrate_attachments_table()
    print("\nMigration complete. You can delete the backup file if everything works correctly.")
