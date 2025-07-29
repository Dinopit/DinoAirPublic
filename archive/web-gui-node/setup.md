# DinoAir Web GUI Setup Guide

This guide will help you set up your own DinoAir Web GUI instance with your own Supabase database.

## Prerequisites

* Node.js 18+ installed
* A Supabase account (free tier available)
* Git (for cloning the repository)

## Step 1: Clone and Install

1. Clone the DinoAir repository (if you haven't already)
2.  Navigate to the web-gui-node directory:

    ```bash
    cd DinoAirPublic/web-gui-node
    ```
3.  Install dependencies:

    ```bash
    npm install
    ```

## Step 2: Set Up Supabase Project

### Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   * **Name**: DinoAir (or any name you prefer)
   * **Database Password**: Choose a strong password (save this!)
   * **Region**: Choose the closest region to you
5. Click "Create new project"
6. Wait for the project to be created (this may take a few minutes)

### Get Your Supabase Credentials

Once your project is ready:

1. Go to **Settings** → **API** in your Supabase dashboard
2. You'll find these important values:
   * **Project URL**: `https://your-project-id.supabase.co`
   * **anon public key**: A long JWT token starting with `eyJ...`
   * **service\_role secret key**: Another JWT token (keep this secure!)
3. Go to **Settings** → **Database** to get:
   * **Connection string**: Look for the "Connection string" section
   * Use the "URI" format: `postgresql://postgres:[YOUR-PASSWORD]@db.your-project-id.supabase.co:5432/postgres`

## Step 3: Configure Environment Variables

1.  Copy the example environment file:

    ```bash
    cp .env.example .env
    ```
2. Open the `.env` file in your text editor
3.  Replace the placeholder values with your Supabase credentials:

    ```env
    # Server Configuration
    PORT=3000
    NODE_ENV=development
    PUBLIC_URL=http://localhost:3000
    CORS_ORIGIN=http://localhost:3000

    # Supabase Configuration
    SUPABASE_URL=https://your-project-id.supabase.co
    SUPABASE_ANON_KEY=your-anon-key-here
    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

    # Database Configuration
    DATABASE_URL=postgresql://postgres:your-password@db.your-project-id.supabase.co:5432/postgres

    # Session Configuration (change this to a random string)
    SESSION_SECRET=your-secure-session-secret-change-this-in-production

    # API Configuration
    RATE_LIMIT_WINDOW_MS=60000
    RATE_LIMIT_MAX_REQUESTS=100

    # Socket.io Configuration
    SOCKET_CORS_ORIGIN=http://localhost:3000

    # Optional: API Key (same as SUPABASE_ANON_KEY)
    SUPABASE_API_KEY=your-anon-key-here
    ```

### Where to Find Each Value:

* **SUPABASE\_URL**: Project Settings → API → Project URL
* **SUPABASE\_ANON\_KEY**: Project Settings → API → Project API keys → anon public
* **SUPABASE\_SERVICE\_ROLE\_KEY**: Project Settings → API → Project API keys → service\_role secret
* **DATABASE\_URL**: Project Settings → Database → Connection string (URI format)
* **SESSION\_SECRET**: Generate a random string (you can use an online generator)

## Step 4: Set Up Database Tables

### Option 1: Automatic Setup (Recommended)

1.  Test your Supabase connection:

    ```bash
    npm run db:test
    ```
2.  If the connection is successful, create the required tables:

    ```bash
    npm run db:setup
    ```

### Option 2: Manual Setup

If the automatic setup doesn't work, you can create the tables manually:

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Create a new query and paste the following SQL:

```sql
-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT chat_sessions_user_id_check CHECK (char_length(user_id) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT chat_messages_content_check CHECK (char_length(content) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Create chat_metrics table
CREATE TABLE IF NOT EXISTS chat_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  response_time_ms INTEGER NOT NULL CHECK (response_time_ms >= 0),
  token_count INTEGER NOT NULL CHECK (token_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT chat_metrics_model_check CHECK (char_length(model) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_metrics_session_id ON chat_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_metrics_created_at ON chat_metrics(created_at);

-- Create DinoAI main memory table
CREATE TABLE IF NOT EXISTS public."DinoAI" (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "DinoAI_pkey" PRIMARY KEY (id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS "idx_DinoAI_created_at" ON public."DinoAI"(created_at);
CREATE INDEX IF NOT EXISTS "idx_DinoAI_id" ON public."DinoAI"(id);
```

4. Click "Run" to execute the SQL

## Step 5: Set Up Row Level Security (Optional but Recommended)

For better security, enable Row Level Security on your tables:

1. In the Supabase SQL Editor, run this SQL:

```sql
-- Enable RLS on all tables
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DinoAI" ENABLE ROW LEVEL SECURITY;

-- Create policies for open access (suitable for development)
-- You can modify these based on your security requirements

-- Chat sessions policies
CREATE POLICY IF NOT EXISTS "Allow authenticated access to sessions" ON chat_sessions
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon' OR auth.role() = 'service_role');

-- Chat messages policies
CREATE POLICY IF NOT EXISTS "Allow authenticated access to messages" ON chat_messages
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon' OR auth.role() = 'service_role');

-- Chat metrics policies
CREATE POLICY IF NOT EXISTS "Allow authenticated access to metrics" ON chat_metrics
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon' OR auth.role() = 'service_role');

-- DinoAI policies
CREATE POLICY IF NOT EXISTS "Allow authenticated access to DinoAI" ON public."DinoAI"
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon' OR auth.role() = 'service_role');
```

## Step 6: Test Your Setup

1.  Test the Supabase connection:

    ```bash
    npm run db:test
    ```
2.  Test CRUD operations:

    ```bash
    npm run test:crud
    ```
3.  Run the complete test suite:

    ```bash
    npm run test:supabase
    ```

## Step 7: Start the Application

1.  Start the development server:

    ```bash
    npm start
    ```
2. Open your browser and go to: `http://localhost:3000`
3. You should see the DinoAir web interface!

## Troubleshooting

### Common Issues

#### Connection Errors

* **Error**: `SUPABASE_URL environment variable is required`
* **Solution**: Make sure your `.env` file exists and contains all required variables

#### Database Errors

* **Error**: `relation "chat_sessions" does not exist`
* **Solution**: Run the database setup again or create tables manually

#### Permission Errors

* **Error**: `insufficient_privilege`
* **Solution**: Check your service role key and RLS policies

### Getting Help

1. Check the logs in your terminal for detailed error messages
2. Verify your Supabase credentials in the dashboard
3. Make sure your Supabase project is active and not paused
4. Review the [Supabase documentation](https://supabase.com/docs) for additional help

## Security Notes

* **Never commit your `.env` file** to version control
* **Use strong passwords** for your database
* **Keep your service role key secure** - it has admin access to your database
* **Consider implementing proper authentication** for production use
* **Review and customize RLS policies** based on your security requirements

## Next Steps

Once your setup is complete:

1. Customize the application for your needs
2. Set up proper authentication if required
3. Configure production environment variables
4. Deploy to your preferred hosting platform

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in your environment
2. Use a secure `SESSION_SECRET`
3. Configure proper CORS origins
4. Set up HTTPS
5. Review and tighten RLS policies
6. Consider using connection pooling for high traffic

***

_For more detailed information, see the_ [_Supabase Integration Documentation_](../docs/supabase_integration_documentation.md)
