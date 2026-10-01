import sys
from sqlalchemy import inspect, text
from app.db.session import engine, Base
import app.models.business

print("1. Connecting to database via SQLAlchemy engine...")
try:
    with engine.connect() as conn:
        res = conn.execute(text("SELECT current_database(), current_user, version();")).fetchone()
        print(f" Connected successfully to database '{res[0]}' as user '{res[1]}'")
        print(f" PostgreSQL Version: {res[2][:60]}")
except Exception as e:
    print(f" Connection failed: {e}")
    sys.exit(1)

print("\n2. Ensuring tables are created (Base.metadata.create_all)...")
Base.metadata.create_all(bind=engine)
print(" Base.metadata.create_all completed.")

print("\n3. Inspecting tables in public schema...")
inspector = inspect(engine)
tables = inspector.get_table_names()
print(f" Tables in database: {tables}")

if "businesses" in tables:
    print(" Table 'businesses' exists in Supabase!")
    columns = inspector.get_columns("businesses")
    print(" Columns in 'businesses':")
    for col in columns:
        print(f"   - {col['name']}: {col['type']} (nullable={col['nullable']})")

    with engine.connect() as conn:
        count = conn.execute(text("SELECT count(*) FROM businesses;")).scalar()
        print(f"\n Current records in 'businesses' table: {count}")
    print("\nVerification successful! All tables are present in Supabase.")
else:
    print(" ERROR: 'businesses' table was not found.")
    sys.exit(1)
