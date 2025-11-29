UPDATE groups
SET
  last_message = m.msg,
  last_updated = m.time,
  last_updated_time = m.time,
  last_msg_sender_id = m.sender_id,
  last_msg_sender_name = m.sender_name
FROM (
  SELECT
    group_id,
    msg,
    sender_id,
    sender_name,
    time
  FROM messages
  WHERE group_id IS NOT NULL
  ORDER BY time DESC
) AS m
WHERE groups.id = m.group_id
  AND (groups.last_message IS NULL OR groups.last_updated < m.time);
