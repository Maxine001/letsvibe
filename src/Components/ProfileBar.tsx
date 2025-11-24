import { UserGroupIcon, UserCircleIcon } from "@heroicons/react/20/solid";
import { useRecoilState, useSetRecoilState } from "recoil";
import {
  chatMessagesAtom,
  isSideScreenActiveAtom,
  sideScreenAtom,
} from "../atoms/atom";
import { GroupMember, MessageStatus, SideScreenSchema, UserConnection } from "./types";
import { getUniqueID } from "./Utils";
import { DB } from "../supabase/Supabase";
import { useEffect, useState } from "react";
// import notificationSound from "../assets/notification.mp3";
import { StatusIndicator } from "./Message";

export const getMemberColor = async (chatId: string, senderId: string) => {
  try {
    const { data: members, error } = await DB
      .from("group_members")
      .select("*")
      .eq("group_id", chatId);

    if (error || !members) {
      throw error || new Error("Group members not found");
    }

    const index = members.findIndex((m: GroupMember) => m.userId === senderId);
    if (index === -1) {
      throw new Error("Member not found");
    }
    return members[index].color;
  } catch (error) {
    throw error;
  }
};
export default function ProfileBar({
  isGroup,
  name,
  imageUrl,
  id,
  chatId,
  status,
  isOnline = false,
  lastMsgStatus,
  lastMsg,
  lastUpdatedTime,
  lastMsgSenderId,
  lastMsgSenderName,
  lastMsgStatusForGroup,
}: any) {
  const [currentSideScreen, setCurrentSideScreen] =
    useRecoilState<SideScreenSchema>(sideScreenAtom);
  const setChatMessagesList = useSetRecoilState(chatMessagesAtom);
  const setIsSideScreenActive = useSetRecoilState(isSideScreenActiveAtom);
  const [color, setColor] = useState("rgb(161 161 170)");

  useEffect(() => {
    if (
      isGroup &&
      lastMsgSenderId &&
      chatId &&
      lastMsgSenderId !== window.localStorage.getItem("chatapp-user-id")?.toString()
    ) {
      let isMounted = true;
      getMemberColor(chatId, lastMsgSenderId)
        .then((clr) => {
          if (isMounted) setColor(clr as string);
        })
        .catch((e) => {
          console.log(e);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [lastMsg, chatId, lastMsgSenderId, isGroup]);

  const openChat = async () => {
    if (currentSideScreen.listId === chatId) {
      return;
    }
    if (isGroup === false && chatId == null) {
      const currUserId = window.localStorage.getItem("chatapp-user-id") as string;
      chatId = getUniqueID();

      try {
        // Insert new chat into chats table for foreign key integrity
        const { error: insertChatError } = await DB
          .from("chats")
          .insert([
            {
              id: chatId,
              members: JSON.stringify([currUserId, id]),
            },
          ]);

        if (insertChatError) throw insertChatError;

        const { data: currUserData, error: currUserError } = await DB
          .from("users")
          .select("connections")
          .eq("id", currUserId)
          .maybeSingle();

        if (currUserError) throw currUserError;

        const existingConnections: UserConnection[] = currUserData?.connections ?? [];

        existingConnections.push({
          userId: id,
          chatId: chatId,
          lastMessage: "",
          lastUpdated: getUniqueID(),
          lastMsgStatus: MessageStatus.SEEN,
          lastUpdatedTime: "",
          lastMsgSenderId: "",
          lastMsgSenderName: "",
        });

        const { error: updateCurrUserError } = await DB
          .from("users")
          .update({ connections: existingConnections })
          .eq("id", currUserId);

        if (updateCurrUserError) throw updateCurrUserError;

        const { data: userData, error: userError } = await DB
          .from("users")
          .select("connections")
          .eq("id", id)
          .maybeSingle();

        if (userError) throw userError;

        const userExistingConnections: UserConnection[] = userData?.connections ?? [];

        userExistingConnections.push({
          userId: currUserId,
          chatId: chatId,
          lastMessage: "",
          lastUpdated: getUniqueID(),
          lastMsgStatus: MessageStatus.SEEN,
          lastUpdatedTime: "",
          lastMsgSenderId: "",
          lastMsgSenderName: "",
        });

        const { error: updateUserError } = await DB
          .from("users")
          .update({ connections: userExistingConnections })
          .eq("id", id);

        if (updateUserError) throw updateUserError;
      } catch (e) {
        console.error("Error updating user connections:", e);
      }
    }

    setChatMessagesList([]);
    setCurrentSideScreen(curr => ({
      ...curr,
      listId: chatId,
      isGroup: isGroup,
      name: name,
      imageUrl: imageUrl,
      userId: isGroup ? "" : id,
      status: status,
      isOnline: isOnline
    }));

    // for mobile view
    setIsSideScreenActive(true);
  };
  return (
    <div
      className={`flex gap-3 justify-left items-center hover:bg-secondary m-3 rounded-xl relative ${currentSideScreen.onCall ? "cursor-not-allowed": "cursor-pointer"}`}
      onClick={()=>{
        if(!currentSideScreen.onCall) openChat();
      }}
    >
      {imageUrl ? (
        <img src={imageUrl} className="h-12 mr-1 my-2 ml-3 rounded-full" />
      ) : isGroup ? (
        <UserGroupIcon className="h-12 mr-1 my-2 ml-3 p-1 border-white border-2 rounded-full" />
      ) : (
        <UserCircleIcon className="h-12 mr-1 my-2 ml-2 border-white border-2 rounded-full" />
      )}
      <div className="flex flex-col">
        <p className="text-lg font-semibold text-zinc-200">{name}</p>
        <div className="flex gap-1 items-center">
          {lastMsgSenderId ==
            (window.localStorage.getItem("chatapp-user-id") as string) &&
            (isGroup ? (
              <StatusIndicator status={lastMsgStatusForGroup} />
            ) : (
              <StatusIndicator status={lastMsgStatus} />
            ))}
          {isGroup &&
            lastMsg &&
            (lastMsgSenderId !=
            (window.localStorage.getItem("chatapp-user-id") as string) ? (
              <>
                <p className="text-sm font-bold" style={{ color: color }}>
                  {lastMsgSenderName}
                </p>
                <p className="text-sm text-zinc-400">:</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-zinc-400">You</p>
                <p className="text-sm text-zinc-400">:</p>
              </>
            ))}
          <p className="text-sm text-zinc-400">{lastMsg}</p>
        </div>
      </div>
      <div className="absolute right-4 top-2 text-xs">{lastUpdatedTime}</div>
      <div className="absolute right-4 bottom-3 flex gap-2">
        {!isGroup && isOnline && <div className="h-3 w-3 bg-green-500 rounded-full"></div> }
        {currentSideScreen.listId !== chatId &&
          lastMsgSenderId !==
            (window.localStorage.getItem("chatapp-user-id") as string) &&
          lastMsgStatus === MessageStatus.SENT && (
            <div className="h-3 w-3 bg-primary rounded-full"></div>
          )}
      </div>
    </div>
  );
}