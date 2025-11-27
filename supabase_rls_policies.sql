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

-- Enable Row Level Security for the "messages" table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public users to select messages
CREATE POLICY "Allow public users to select messages"
ON messages
FOR SELECT
TO public
USING (true);

-- Create policy to allow public users to insert messages
CREATE POLICY "Allow public users to insert messages"
ON messages
FOR INSERT
TO public
WITH CHECK (true);

-- Create policy to allow public users to update messages
CREATE POLICY "Allow public users to update messages"
ON messages
FOR UPDATE
TO public
USING (true);

-- Enable Row Level Security for the "group_members" table
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public users to select group_members
CREATE POLICY "Allow public users to select group_members"
ON group_members
FOR SELECT
TO public
USING (true);

-- Create policy to allow public users to insert group_members
CREATE POLICY "Allow public users to insert group_members"
ON group_members
FOR INSERT
TO public
WITH CHECK (true);

-- Create policy to allow public users to update group_members
CREATE POLICY "Allow public users to update group_members"
ON group_members
FOR UPDATE
TO public
USING (true);
