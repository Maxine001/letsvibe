import ProfileBar from "../Components/ProfileBar";
import Input from "../Components/Input";
import AddGroup from "../Components/AddGroup";
import { useEffect, useState } from "react";
import { PlusIcon, UserGroupIcon, UserCircleIcon } from "@heroicons/react/20/solid";
import supabase from "../supabase/Supabase";
import {
  Group,
  MessageStatus,
  User,
  //UserConnection,
} from "../Components/types";
import Loader from "../Components/Loader";

export default function ChatsList({ classes }: any) {
  const [isAddGroupClicked, addGroupToggle] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User>();
  const [isLoading, setIsLoading] = useState(false);
  const [searchString, setSearchString] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<{[key: string]: number}>({});

  const fetchUnreadCounts = async (currUser: string) => {
    const counts: {[key: string]: number} = {};

    // Fetch unread counts for groups
    for (const g of groups) {
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("group_id", g.id)
        .neq("sender_id", currUser)
        .neq("msg_status", MessageStatus.SEEN);

      if (!error && count !== null) {
        counts[g.id] = count;
      }
    }

    // Fetch unread counts for users
    for (const u of users) {
      const chatId = [currUser, u.id].sort().join('-');
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("chat_id", chatId)
        .neq("sender_id", currUser)
        .neq("msg_status", MessageStatus.SEEN);

      if (!error && count !== null) {
        counts[chatId] = count;
      }
    }

    setUnreadCounts(counts);
  };

  useEffect(() => {
    setIsLoading(true);
    const currUser = window.localStorage.getItem("chatapp-user-id");

      const fetchGroups = async () => {
        // Fetch groups and related group_members data
        const { data, error } = await supabase
          .from("groups")
          .select("*, group_members(*)")
          .order("last_updated", { ascending: false });

        if (error) {
          console.error(error);
          return;
        }

        // Map group_members to members with camelCase keys
        const groupsWithMembers = data.map((g: any) => {
          const members = (g.group_members || []).map((m: any) => ({
            userId: m.user_id,
            lastMsgStatus: m.last_msg_status,
            color: m.color,
          }));
          return {
            ...g,
            members: members,
          };
        });

        if (!currUser) {
          setGroups([]);
          return;
        }

        const filteredGroups = groupsWithMembers.filter(g =>
          Array.isArray(g.members) && g.members.some(m => m.userId === currUser)
        );
        setGroups(filteredGroups);
      };

const fetchUsersAndCurrentUser = async () => {
  if (!currUser || typeof currUser !== "string" || currUser.trim() === "") {
    console.warn("Invalid currUser in localStorage:", currUser);
    setUsers([]);
    setCurrentUser(undefined);
    window.localStorage.removeItem("chatapp-user-id");
    return;
  }

  const trimmedCurrUser = currUser.trim();

  // Regex for UUID v4 format (typical supabase id) or alphanumeric ids
  const validIdRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$|^[a-zA-Z0-9_-]{10,}$/;

  if (!validIdRegex.test(trimmedCurrUser)) {
    console.warn(
      "User id in localStorage is invalid format and will be removed:",
      trimmedCurrUser
    );
    setUsers([]);
    setCurrentUser(undefined);
    window.localStorage.removeItem("chatapp-user-id");
    return;
  }

  let userData = null;
  let userError = null;

  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", trimmedCurrUser)
      .maybeSingle();

    userData = data;
    userError = error;
  } catch (err) {
    userError = err;
  }

  if (userError) {
    if (userError.code === "PGRST116" || userError.status === 406) {
      // Handle PostgreSQL error code for zero rows or 406 Not Acceptable gracefully
      console.warn(
        "User query returned zero rows or 406 for id:",
        trimmedCurrUser,
        userError.message || userError
      );
      setCurrentUser(undefined);
      setUsers([]);
      window.localStorage.removeItem("chatapp-user-id");
      return;
    }
    console.error(userError);
    setCurrentUser(undefined);
    setUsers([]);
    window.localStorage.removeItem("chatapp-user-id");
    return;
  }
  if (!userData) {
    console.warn("No user found with id:", trimmedCurrUser);
    setCurrentUser(undefined);
    setUsers([]);
    window.localStorage.removeItem("chatapp-user-id");
    return;
  }

  setCurrentUser(userData);

  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("*")
    .neq("id", trimmedCurrUser);

  if (usersError) {
    console.error(usersError);
    setUsers([]);
    return;
  }

  const connections = userData.connections || [];
  const sortedUsers = usersData.sort((a, b) => {
    const lastUpdatedA =
      connections.find((c) => c.userId === a.id)?.lastUpdated || 0;
    const lastUpdatedB =
      connections.find((c) => c.userId === b.id)?.lastUpdated || 0;
    return lastUpdatedB - lastUpdatedA;
  });

  setUsers(sortedUsers);
};

    fetchGroups();
    fetchUsersAndCurrentUser();

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser && (groups.length > 0 || users.length > 0)) {
      fetchUnreadCounts(currentUser.id);
    }
  }, [groups, users, currentUser]);

  const filteredGroups = () => {
    if (searchString) {
      return groups.filter((g) =>
        g.name.toLowerCase().includes(searchString.toLowerCase())
      );
    }
    return groups;
  };

  const filteredUsers = () => {
    if (searchString) {
      return users.filter((u) =>
        u.name.toLowerCase().includes(searchString.toLowerCase())
      );
    }
    return users;
  };

  return (
    <div className={"flex flex-col h-screen relative" + " " + classes}>
      {isAddGroupClicked && (
        <AddGroup
          onClose={() => {
            addGroupToggle((val) => !val);
          }}
        />
      )}
      {isLoading && <Loader classes="absolute" />}
      <div className="flex gap-3 p-3 sticky top-0 bg-secondary">
        {currentUser && currentUser.profileImgUrl ? (
          <img src={currentUser.profileImgUrl} className="h-14 rounded-full" />
        ) : (
          <div>
            <UserCircleIcon className="border-white border-2 h-14 rounded-full" />
          </div>
        )}

        <Input
          placeholder="Search user or group..."
          onInput={(e) => {
            setSearchString(e.target.value);
          }}
          type="text"
          autoComplete="off"
        />
        <button
          className="rounded-xl border-none bg-primary text-white py-1 pl-2 pr-3 flex items-center"
          onClick={() => {
            addGroupToggle((val) => !val);
          }}
        >
          <PlusIcon className="h-8 pr-1" />
          <p className="w-max">
            <UserGroupIcon className="h-11" />
          </p>
        </button>
      </div>
      <div className="flex flex-col overflow-auto h-full">
        {groups.length > 0 && (
          <div className="border-white border-b-2 mx-5 opacity-50 text-lg">
            <p className="ml-1">Groups</p>
          </div>
        )}
        {filteredGroups().map((g, i) => (
          <ProfileBar
            key={i}
            isGroup={true}
            id={g.id}
            chatId={g.id}
            imageUrl={g.groupImgUrl}
            name={g.name}
            status=""
            lastMsgStatus={
              g.members[
                g.members.findIndex(
                  (m) =>
                    m.userId ==
                    (window.localStorage.getItem("chatapp-user-id") as string)
                )
              ].lastMsgStatus
            }
            lastMsgStatusForGroup={(() => {
              for (let m of g.members) {
                if (m.lastMsgStatus != MessageStatus.SEEN)
                  return MessageStatus.SENT;
              }
              return MessageStatus.SEEN;
            })()}
            lastMsg={g.lastMessage}
            lastUpdatedTime={g.lastUpdatedTime}
            lastMsgSenderId={g.lastMsgSenderId}
            lastMsgSenderName={g.lastMsgSenderName}
            unreadCount={unreadCounts[g.id] || 0}
          />
        ))}
        {users.length > 0 && (
          <div className="border-white border-b-2 mx-5 opacity-50 text-lg">
            <p className="ml-1">Users</p>
          </div>
        )}
        {filteredUsers().map((u, i) => {
          const connection = currentUser?.connections.find(
            (c) => c.userId == u.id
          );
          const chatId = [currentUser.id, u.id].sort().join('-');
          return (
            <ProfileBar
              key={i}
              isGroup={false}
              chatId={chatId}
              id={u.id}
              imageUrl={u.profileImgUrl}
              name={u.name}
              status={u.status}
              isOnline={u.isOnline}
              lastMsgStatus={connection ? connection.lastMsgStatus : MessageStatus.SEEN}
              lastMsg={connection ? connection.lastMessage : ""}
              lastUpdatedTime={connection ? connection.lastUpdatedTime : ""}
              lastMsgSenderId={connection ? connection.lastMsgSenderId : ""}
              lastMsgSenderName={connection ? connection.lastMsgSenderName : ""}
              unreadCount={unreadCounts[chatId] || 0}
            />
          );
        })}
      </div>
    </div>
  );
}
