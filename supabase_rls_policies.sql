-- Enable Row Level Security for the "users" table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow SELECT for everyone (or adjust as needed)
CREATE POLICY "Allow all users to select users"
ON users
FOR SELECT
USING (true);

-- Create policy to allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert"
ON users
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy to allow public users to insert
CREATE POLICY "Allow public users to insert"
ON users
FOR INSERT
TO public
WITH CHECK (true);
