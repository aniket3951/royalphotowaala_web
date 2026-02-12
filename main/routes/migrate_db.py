import os
import psycopg2
from urllib.parse import urlparse

def init_db():
    # Get database URL from environment variable
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if not DATABASE_URL:
        print("Error: DATABASE_URL environment variable not set")
        return
    
    # Parse the database URL
    result = urlparse(DATABASE_URL)
    dbname = result.path[1:]
    user = result.username
    password = result.password
    host = result.hostname
    port = result.port
    
    try:
        # Connect to PostgreSQL
        conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host,
            port=port,
            sslmode='require'
        )
        
        cursor = conn.cursor()
        
        # Check if tables already exist
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        existing_tables = [table[0] for table in cursor.fetchall()]
        
        # Create tables if they don't exist
        if 'admin_users' not in existing_tables:
            cursor.execute('''
                CREATE TABLE admin_users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password_hash VARCHAR(200) NOT NULL
                )
            ''')
            print("Created 'admin_users' table")
        
        if 'bookings' not in existing_tables:
            cursor.execute('''
                CREATE TABLE bookings (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    email VARCHAR(100) NOT NULL,
                    phone VARCHAR(20) NOT NULL,
                    package VARCHAR(100) NOT NULL,
                    date TIMESTAMP NOT NULL,
                    details TEXT,
                    status VARCHAR(20) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            print("Created 'bookings' table")
        
        if 'reviews' not in existing_tables:
            cursor.execute('''
                CREATE TABLE reviews (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    rating INTEGER NOT NULL,
                    comment TEXT NOT NULL,
                    approved BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            print("Created 'reviews' table")
        
        # Check if admin user exists, if not create one
        cursor.execute("SELECT * FROM admin_users WHERE username = 'admin'")
        if not cursor.fetchone():
            from werkzeug.security import generate_password_hash
            password_hash = generate_password_hash(os.environ.get('ADMIN_PASSWORD', 'admin123'))
            cursor.execute(
                "INSERT INTO admin_users (username, password_hash) VALUES (%s, %s)",
                ('admin', password_hash)
            )
            print("Created default admin user")
        
        conn.commit()
        print("Database initialization completed successfully!")
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    init_db()
