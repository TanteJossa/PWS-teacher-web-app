import os
import json
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Fetch database credentials from environment variables
USER = os.getenv("user")
PASSWORD = os.getenv("password")
HOST = os.getenv("host")
PORT = os.getenv("port")
DBNAME = os.getenv("dbname")

# Admin email addresses (load from .env or a config file)
ADMIN_EMAILS = os.getenv("ADMIN_EMAILS", "").split(",")  # Comma-separated list

def set_custom_claims(event, context):
    """
    Supabase Edge Function to set custom JWT claims (specifically the 'role' claim)
    after a user signs up or logs in.  This is triggered by an auth event.

    Args:
        event (dict): The event data from Supabase Auth.
        context (dict): Context about the event.  Not directly used here.

    Returns:
        dict: A dictionary with a 'statusCode' and 'body'.  The body contains
              a JSON string indicating success or failure.
    """
    try:
        # Extract user data from the event
        user_data = event.get('user', {})
        if not user_data:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'No user data found in the event.'})
            }

        user_id = user_data.get('id')
        user_email = user_data.get('email')

        if not user_id or not user_email:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'User ID or email missing from event data.'})
            }

        # Determine user role (admin or user)
        if user_email in ADMIN_EMAILS:
            role = 'admin'
        else:
            role = 'user'

        # Connect to the Supabase database
        conn = psycopg2.connect(
            user=USER,
            password=PASSWORD,
            host=HOST,
            port=PORT,
            dbname=DBNAME
        )
        cur = conn.cursor()

        # Update the user's metadata with the 'role' claim
        # Use jsonb_set to *safely* update the JSONB column, handling existing data
        cur.execute("""
            UPDATE auth.users
            SET raw_app_meta_data = jsonb_set(
                COALESCE(raw_app_meta_data, '{}'::jsonb),  -- Handle cases where it's NULL
                '{role}',                                 -- The path to set (top-level 'role')
                %s,                                       -- The value to set (the role)
                true                                      -- Create the path if it doesn't exist
            )
            WHERE id = %s;
        """, (json.dumps(role), user_id))

        conn.commit()  # Commit the transaction
        cur.close()
        conn.close()

        return {
            'statusCode': 200,
            'body': json.dumps({'message': f"Custom claim 'role' set to '{role}' for user {user_id}."})
        }

    except Exception as e:
        print(f"Error setting custom claims: {e}")  # Log the error
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

# For local testing (optional, but very helpful)
if __name__ == '__main__':
    # Simulate an event (replace with actual event data from Supabase)
    test_event = {
        'user': {
            'id': 'test-user-id',
            'email': 'test@example.com',  # Change to an admin email to test admin role
            # Include other relevant user fields as needed
        }
    }
    test_context = {}  # You can add context data if needed

    result = set_custom_claims(test_event, test_context)
    print(result)