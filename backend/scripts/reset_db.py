"""
Safe Database Reset Script for Fresh Video Recording.
Can be executed in 'test_data_only' mode (clears users, requests, donors, logs, slips)
or 'full_wipe' mode (truncates all tables).
"""
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.core.database import SessionLocal, engine
from app.models import (
    User,
    Donor,
    Request,
    Notification,
    Event,
    Registration,
    AuditLog,
    AwarenessContent,
    HealthFeedback,
)

def reset_database(mode: str = "test_data_only"):
    db = SessionLocal()
    try:
        print(f"[*] Starting database reset in '{mode}' mode...")
        
        # Deleting dependent child tables first to respect foreign keys
        print("  - Clearing notifications...")
        db.query(Notification).delete()
        
        print("  - Clearing audit logs...")
        db.query(AuditLog).delete()
        
        print("  - Clearing health feedbacks...")
        db.query(HealthFeedback).delete()
        
        print("  - Clearing event registrations...")
        db.query(Registration).delete()
        
        print("  - Clearing blood drive events...")
        db.query(Event).delete()
        
        print("  - Clearing blood requests...")
        db.query(Request).delete()
        
        print("  - Clearing donors...")
        db.query(Donor).delete()
        
        print("  - Clearing users...")
        db.query(User).delete()

        if mode == "full_wipe":
            print("  - Clearing awareness content...")
            db.query(AwarenessContent).delete()

        db.commit()
        print("[+] Database tables reset successfully!")

        # Clean uploaded test slips in backend/media/slips
        slips_dir = backend_dir / "media" / "slips"
        if slips_dir.exists():
            deleted_count = 0
            for file in slips_dir.iterdir():
                if file.is_file() and file.name != ".gitkeep":
                    file.unlink()
                    deleted_count += 1
            print(f"[+] Cleaned {deleted_count} uploaded test slip file(s) from media/slips.")

        print("[SUCCESS] Ready for a fresh, clean recording start!")

    except Exception as e:
        db.rollback()
        print(f"[!] Error during database reset: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "test_data_only"
    reset_database(mode)
