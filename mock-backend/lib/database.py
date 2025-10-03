"""Database models and operations for conversation metadata."""
import sqlite3
import time
from typing import List, Optional, Dict, Any
from contextlib import contextmanager
from dataclasses import dataclass


@dataclass
class ConversationMetadata:
    """Conversation metadata model."""
    id: str
    userid: str
    title: str
    is_pinned: bool
    last_used_at: int  # epoch timestamp


@dataclass
class FileMetadata:
    """File metadata model."""
    file_id: str
    userid: str
    filename: str
    blob_name: str
    status: str  # "pending", "in_progress", "completed", "failed"
    uploaded_at: int  # epoch timestamp
    indexed_at: Optional[int] = None  # epoch timestamp when indexing completed
    error_message: Optional[str] = None
    workflow_id: Optional[str] = None  # orchestration workflow ID

@dataclass
class Attachment:
    """Attachment model. Abstraction layer over Azure Blob Storage for langgraph file ingestion in a chat conversation."""
    id: str # Must be a random long string
    userid: str
    filename: str
    blob_name: str # Azure blob storage name
    created_at: int  # epoch timestamp


class DatabaseManager:
    """Database manager for conversation metadata."""
    
    def __init__(self, db_path: str = "mock.db"):
        self.db_path = db_path
        self.init_db()
    
    @contextmanager
    def get_connection(self):
        """Get database connection with context manager."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Enable column access by name
        try:
            yield conn
        finally:
            conn.close()
    
    def init_db(self):
        """Initialize the database with the required schema."""
        with self.get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    userid TEXT NOT NULL,
                    title TEXT NOT NULL DEFAULT 'New Conversation',
                    is_pinned BOOLEAN DEFAULT FALSE,
                    last_used_at INTEGER NOT NULL
                )
            """)
            
            # Add title column if it doesn't exist (for existing databases)
            try:
                conn.execute("ALTER TABLE conversations ADD COLUMN title TEXT NOT NULL DEFAULT 'New Conversation'")
            except sqlite3.OperationalError:
                # Column already exists
                pass
            
            # Rename created_at to last_used_at for existing databases
            try:
                conn.execute("ALTER TABLE conversations RENAME COLUMN created_at TO last_used_at")
            except sqlite3.OperationalError:
                # Column might already be renamed or doesn't exist
                pass
            
            # Create files table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS files (
                    file_id TEXT PRIMARY KEY,
                    userid TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    blob_name TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    uploaded_at INTEGER NOT NULL,
                    indexed_at INTEGER,
                    error_message TEXT,
                    workflow_id TEXT
                )
            """)
            
            # Add workflow_id column if it doesn't exist (for existing databases)
            try:
                conn.execute("ALTER TABLE files ADD COLUMN workflow_id TEXT")
            except sqlite3.OperationalError:
                # Column already exists
                pass
            
            # Create index for faster queries by userid
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_conversations_userid 
                ON conversations(userid)
            """)
            
            # Create index for userid and last_used_at for ordering
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_conversations_userid_last_used_at 
                ON conversations(userid, last_used_at DESC)
            """)
            
            # Create index for files by userid
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_files_userid 
                ON files(userid)
            """)
            
            # Create index for files by status
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_files_status 
                ON files(status)
            """)
            
            # Create attachments table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS attachments (
                    id TEXT PRIMARY KEY,
                    userid TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    blob_name TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                )
            """)
            
            # Create index for attachments by userid
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_attachments_userid 
                ON attachments(userid)
            """)
            
            # Create index for attachments by created_at for ordering
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_attachments_created_at 
                ON attachments(created_at DESC)
            """)
            
            conn.commit()
    
    def create_conversation(self, conversation_id: str, userid: str, title: str = "New Conversation") -> ConversationMetadata:
        """Create a new conversation metadata entry."""
        last_used_at = int(time.time())
        
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO conversations (id, userid, title, is_pinned, last_used_at)
                VALUES (?, ?, ?, ?, ?)
            """, (conversation_id, userid, title, False, last_used_at))
            conn.commit()
        
        return ConversationMetadata(
            id=conversation_id,
            userid=userid,
            title=title,
            is_pinned=False,
            last_used_at=last_used_at
        )
    
    def get_conversation(self, conversation_id: str, userid: str) -> Optional[ConversationMetadata]:
        """Get conversation metadata by ID and userid."""
        with self.get_connection() as conn:
            row = conn.execute("""
                SELECT id, userid, title, is_pinned, last_used_at 
                FROM conversations 
                WHERE id = ? AND userid = ?
            """, (conversation_id, userid)).fetchone()
            
            if row:
                return ConversationMetadata(
                    id=row['id'],
                    userid=row['userid'],
                    title=row['title'],
                    is_pinned=bool(row['is_pinned']),
                    last_used_at=row['last_used_at']
                )
        return None
    
    def get_user_conversations(self, userid: str) -> List[ConversationMetadata]:
        """Get all conversations for a user, ordered by last_used_at descending."""
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT id, userid, title, is_pinned, last_used_at 
                FROM conversations 
                WHERE userid = ? 
                ORDER BY last_used_at DESC
            """, (userid,)).fetchall()
            
            return [
                ConversationMetadata(
                    id=row['id'],
                    userid=row['userid'],
                    title=row['title'],
                    is_pinned=bool(row['is_pinned']),
                    last_used_at=row['last_used_at']
                )
                for row in rows
            ]
    
    def get_last_conversation_id(self, userid: str) -> Optional[str]:
        """Get the last conversation ID for a user."""
        with self.get_connection() as conn:
            row = conn.execute("""
                SELECT id 
                FROM conversations 
                WHERE userid = ? 
                ORDER BY last_used_at DESC 
                LIMIT 1
            """, (userid,)).fetchone()
            
            return row['id'] if row else None
    
    def pin_conversation(self, conversation_id: str, userid: str, is_pinned: bool = True) -> bool:
        """Pin or unpin a conversation."""
        with self.get_connection() as conn:
            cursor = conn.execute("""
                UPDATE conversations 
                SET is_pinned = ? 
                WHERE id = ? AND userid = ?
            """, (is_pinned, conversation_id, userid))
            conn.commit()
            
            return cursor.rowcount > 0
    
    def update_conversation_last_used(self, conversation_id: str, userid: str) -> bool:
        """Update the last_used_at timestamp for a conversation."""
        last_used_at = int(time.time())
        
        with self.get_connection() as conn:
            cursor = conn.execute("""
                UPDATE conversations 
                SET last_used_at = ? 
                WHERE id = ? AND userid = ?
            """, (last_used_at, conversation_id, userid))
            conn.commit()
            
            return cursor.rowcount > 0
    
    def delete_conversation(self, conversation_id: str, userid: str) -> bool:
        """Delete a conversation."""
        with self.get_connection() as conn:
            cursor = conn.execute("""
                DELETE FROM conversations 
                WHERE id = ? AND userid = ?
            """, (conversation_id, userid))
            conn.commit()
            
            return cursor.rowcount > 0
    
    def conversation_exists(self, conversation_id: str, userid: str) -> bool:
        """Check if a conversation exists for a user."""
        with self.get_connection() as conn:
            row = conn.execute("""
                SELECT 1 FROM conversations 
                WHERE id = ? AND userid = ?
            """, (conversation_id, userid)).fetchone()
            
            return row is not None

    def create_file(self, file_id: str, userid: str, filename: str, blob_name: str, workflow_id: Optional[str] = None) -> FileMetadata:
        """Create a new file metadata entry."""
        uploaded_at = int(time.time())
        
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO files (file_id, userid, filename, blob_name, status, uploaded_at, workflow_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (file_id, userid, filename, blob_name, "pending", uploaded_at, workflow_id))
            conn.commit()
        
        return FileMetadata(
            file_id=file_id,
            userid=userid,
            filename=filename,
            blob_name=blob_name,
            status="pending",
            uploaded_at=uploaded_at,
            workflow_id=workflow_id
        )
    
    def get_file(self, file_id: str) -> Optional[FileMetadata]:
        """Get file metadata by ID."""
        with self.get_connection() as conn:
            row = conn.execute("""
                SELECT file_id, userid, filename, blob_name, status, uploaded_at, indexed_at, error_message, workflow_id
                FROM files 
                WHERE file_id = ?
            """, (file_id,)).fetchone()
            
            if row:
                return FileMetadata(
                    file_id=row['file_id'],
                    userid=row['userid'],
                    filename=row['filename'],
                    blob_name=row['blob_name'],
                    status=row['status'],
                    uploaded_at=row['uploaded_at'],
                    indexed_at=row['indexed_at'],
                    error_message=row['error_message'],
                    workflow_id=row['workflow_id']
                )
        return None
    
    def get_user_files(self, userid: str) -> List[FileMetadata]:
        """Get all files for a user, ordered by uploaded_at descending."""
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT file_id, userid, filename, blob_name, status, uploaded_at, indexed_at, error_message, workflow_id
                FROM files 
                WHERE userid = ? 
                ORDER BY uploaded_at DESC
            """, (userid,)).fetchall()
            
            return [
                FileMetadata(
                    file_id=row['file_id'],
                    userid=row['userid'],
                    filename=row['filename'],
                    blob_name=row['blob_name'],
                    status=row['status'],
                    uploaded_at=row['uploaded_at'],
                    indexed_at=row['indexed_at'],
                    error_message=row['error_message'],
                    workflow_id=row['workflow_id']
                )
                for row in rows
            ]
    
    def update_file_status(self, file_id: str, status: str, error_message: Optional[str] = None) -> bool:
        """Update file indexing status."""
        indexed_at = int(time.time()) if status == "completed" else None
        
        with self.get_connection() as conn:
            cursor = conn.execute("""
                UPDATE files 
                SET status = ?, indexed_at = ?, error_message = ?
                WHERE file_id = ?
            """, (status, indexed_at, error_message, file_id))
            conn.commit()
            
            return cursor.rowcount > 0
    
    def update_file_workflow_id(self, file_id: str, workflow_id: str) -> bool:
        """Update file workflow ID."""
        with self.get_connection() as conn:
            cursor = conn.execute("""
                UPDATE files 
                SET workflow_id = ?
                WHERE file_id = ?
            """, (workflow_id, file_id))
            conn.commit()
            
            return cursor.rowcount > 0
    
    def delete_file(self, file_id: str, userid: str) -> bool:
        """Delete a file metadata entry."""
        with self.get_connection() as conn:
            cursor = conn.execute("""
                DELETE FROM files 
                WHERE file_id = ? AND userid = ?
            """, (file_id, userid))
            conn.commit()
            
            return cursor.rowcount > 0
    
    def file_exists(self, file_id: str) -> bool:
        """Check if a file exists."""
        with self.get_connection() as conn:
            row = conn.execute("""
                SELECT 1 FROM files 
                WHERE file_id = ?
            """, (file_id,)).fetchone()
            
            return row is not None
        
    def create_attachment(self, attachment_id: str, userid: str, filename: str, blob_name: str) -> Attachment:
        """Create a new attachment entry."""
        created_at = int(time.time())
        
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO attachments (id, userid, filename, blob_name, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (attachment_id, userid, filename, blob_name, created_at))
            conn.commit()
        
        return Attachment(
            id=attachment_id,
            userid=userid,
            filename=filename,
            blob_name=blob_name,
            created_at=created_at
        )
    
    def get_attachment(self, attachment_id: str) -> Optional[Attachment]:
        """Get attachment by ID."""
        with self.get_connection() as conn:
            row = conn.execute("""
                SELECT id, userid, filename, blob_name, created_at
                FROM attachments 
                WHERE id = ?
            """, (attachment_id,)).fetchone()
            
            if row:
                return Attachment(
                    id=row['id'],
                    userid=row['userid'],
                    filename=row['filename'],
                    blob_name=row['blob_name'],
                    created_at=row['created_at']
                )
        return None
    
    def get_user_attachments(self, userid: str) -> List[Attachment]:
        """Get all attachments for a user, ordered by created_at descending."""
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT id, userid, filename, blob_name, created_at
                FROM attachments 
                WHERE userid = ? 
                ORDER BY created_at DESC
            """, (userid,)).fetchall()
            
            return [
                Attachment(
                    id=row['id'],
                    userid=row['userid'],
                    filename=row['filename'],
                    blob_name=row['blob_name'],
                    created_at=row['created_at']
                )
                for row in rows
            ]
    
    def delete_attachment(self, attachment_id: str) -> bool:
        """Delete an attachment."""
        with self.get_connection() as conn:
            cursor = conn.execute("""
                DELETE FROM attachments 
                WHERE id = ?
            """, (attachment_id,))
            conn.commit()
            
            return cursor.rowcount > 0
    
    def attachment_exists(self, attachment_id: str) -> bool:
        """Check if an attachment exists."""
        with self.get_connection() as conn:
            row = conn.execute("""
                SELECT 1 FROM attachments 
                WHERE id = ?
            """, (attachment_id,)).fetchone()
            
            return row is not None


# Global database manager instance
db_manager = DatabaseManager()