"""
Enable Row-Level Security (RLS) on all tables in Supabase public schema.
Resolves Supabase Security Vulnerability: 'rls_disabled_in_public'.
"""
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.core.database import engine

def fix_rls():
    with engine.begin() as conn:
        # 1. Fetch all user tables in public schema
        result = conn.execute(text("""
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public';
        """)).fetchall()

        print("[*] Current RLS status on public tables:")
        tables_to_enable = []
        for tablename, rowsecurity in result:
            print(f"  - {tablename}: RLS={rowsecurity}")
            if not rowsecurity:
                tables_to_enable.append(tablename)

        # 2. Enable RLS on each table
        if not tables_to_enable:
            print("[+] All tables already have RLS enabled!")
            return

        print(f"\n[*] Enabling RLS on {len(tables_to_enable)} table(s)...")
        for tablename in tables_to_enable:
            conn.execute(text(f'ALTER TABLE "{tablename}" ENABLE ROW LEVEL SECURITY;'))
            print(f"  [+] Enabled RLS on: {tablename}")

        # 3. Verify
        print("\n[*] Verifying updated status:")
        res_after = conn.execute(text("""
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public';
        """)).fetchall()
        for tablename, rowsecurity in res_after:
            print(f"  - {tablename}: RLS={rowsecurity}")

    print("\n[SUCCESS] Supabase 'rls_disabled_in_public' vulnerability fixed successfully!")

if __name__ == "__main__":
    fix_rls()
