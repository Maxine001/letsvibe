import { useEffect, useRef, useState } from "react";
import {
  FileDetails,
  FileType,
  GroupMember,
  Message,
  Queue,
  SideScreenSchema,
  User,
  UserConnection,
} from "../Components/types";
import { getUniqueID } from "../Components/Utils";
import { DB, DBStorage, STORAGE_BUCKET } from "../supabase/Supabase";
//import sentSound from "../assets/sent.mp3";
// import receivedSound from "../assets/received.mp3";
import MessageBox from "../Components/Message";
import TopProfileView from "../Components/TopProfileView";
import BottomMessagingBar from "../Components/BottomMessagingBar";
import { MessageStatus } from "../Components/types";
import { useRecoilState, useRecoilValue } from "recoil";
import { chatMessagesAtom, sideScreenAtom } from "../atoms/atom";
import Loader from "../Components/Loader";
import { XMarkIcon } from "@heroicons/react/20/solid";
import fileIcon from "../assets/file.png";
import ReactDOM from "react-dom";
// import chatBG from "../assets/chatBG.jpg";



const queueMessages = new Queue();

function FilePreview({ file, emptyFileDraft }: any) {
  return (
    <>
      <XMarkIcon
        className="text-bold h-6 absolute top-0 right-0 bg-zinc-400 text-black rounded-full opacity-60 hover:opacity-90 cursor-pointer"
        onClick={() => {
          document.getElementById("file-preview").style.display = "none";
          emptyFileDraft();
        }}
      />
      {file}
    </>
  );
}

function UnknownFileGraphic({ ext, size, name }: any) {
  if (Math.floor(Number(size)) > 0) {
    size = Math.round(Number(size) * 10) / 10 + " MB";
  } else {
    size = Math.round(Number(size) * 1024 * 10) / 10 + " KB";
  }
  return (
    <>
      <div className="bg-secondary p-3 rounded-lg mr-2 flex gap-3 drop-shadow-xl">
        <img
          src={fileIcon}
          className="h-20 bg-zinc-500 py-2 rounded-lg opacity-90"
        />
        <div className="flex flex-col">
          <p className="opacity-90">{name}</p>
          <p className="opacity-40 text-sm">{ext.toUpperCase() + " File"}</p>
          <p className="opacity-40 text-xs">{size}</p>
        </div>
      </div>
    </>
  );
}

export default function Chat({ classes }: { classes: string }) {
  const [list, setList] = useRecoilState<Message[]>(chatMessagesAtom);
  const currentSideScreen = useRecoilValue<SideScreenSchema>(sideScreenAtom);
  const [currentUser, setCurrentUser] = useState<User>();
  const messagesListRef = useRef(null);
  const isProcessingRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileDetails, setFileDetails] = useState<FileDetails | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const scrollListToBottom = () => {
    if (
      list.length !== 0 &&
      messagesListRef.current.scrollHeight > messagesListRef.current.clientHeight
    ) {
      messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    let subscription = null;
    const fetchMessagesAndSubscribe = async () => {
      if (!currentSideScreen.listId) {
        setList([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      const chatFilterColumn = currentSideScreen.isGroup ? "group_id" : "chat_id";

      // Fetch initial messages
      const { data: initialMessages, error: fetchError } = await DB
        .from("messages")
        .select("*")
        .eq(chatFilterColumn, currentSideScreen.listId)
        .order("id", { ascending: true });

      if (fetchError) {
        console.error("Error fetching messages:", fetchError);
        setIsLoading(false);
        return;
      }

      // Map database fields to interface fields
      const mappedMessages = (initialMessages || []).map(msg => ({
        ...msg,
        senderId: msg.sender_id,
        senderName: msg.sender_name,
        senderProfileImg: msg.sender_profile_img,
        msgStatus: msg.msg_status,
        isFile: msg.is_file,
        fileDetails: msg.file_details,
        chat_id: msg.chat_id,
        group_id: msg.group_id,
      }));

      setList(mappedMessages);

      // Setup realtime subscription for new messages and updates
      subscription = DB.channel('public:messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `${chatFilterColumn}=eq.${currentSideScreen.listId}` },
          (payload) => {
            console.log("[realtime subscription] INSERT new message payload:", payload);
            const dbMsg = payload.new;
            const newMsg: Message = {
              ...dbMsg,
              senderId: dbMsg.sender_id,
              senderName: dbMsg.sender_name,
              senderProfileImg: dbMsg.sender_profile_img,
              msgStatus: dbMsg.msg_status,
              isFile: dbMsg.is_file,
              fileDetails: dbMsg.file_details,
              chat_id: dbMsg.chat_id,
              group_id: dbMsg.group_id,
            };
            setList((prevList) => {
              // Avoid duplicates
              if (prevList.find((m) => m.id === newMsg.id)) {
                return prevList;
              }
              return [...prevList, newMsg];
            });

            if (
              newMsg.senderId !== window.localStorage.getItem("chatapp-user-id")
            ) {
              if (!currentSideScreen.isGroup) {
                updateMessageStatusSeen(newMsg);
                updateUserConnectionsStatusSeen(currentSideScreen.userId);
              } else {
                updateGroupMessageStatusSeen(currentSideScreen.listId, newMsg);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `${chatFilterColumn}=eq.${currentSideScreen.listId}` },
          (payload) => {
            console.log("[realtime subscription] UPDATE message payload:", payload);
            const dbMsg = payload.new;
            const updatedMsg: Message = {
              ...dbMsg,
              senderId: dbMsg.sender_id,
              senderName: dbMsg.sender_name,
              senderProfileImg: dbMsg.sender_profile_img,
              msgStatus: dbMsg.msg_status,
              isFile: dbMsg.is_file,
              fileDetails: dbMsg.file_details,
              chat_id: dbMsg.chat_id,
              group_id: dbMsg.group_id,
            };
            setList((prevList) =>
              prevList.map((msg) =>
                msg.id === updatedMsg.id ? updatedMsg : msg
              )
            );
          }
        )
        .subscribe();

      setIsLoading(false);
    };

    fetchMessagesAndSubscribe();

    return () => {
      if (subscription) {
        DB.removeChannel(subscription);
      }
    };
  }, [currentSideScreen]);

  const updateMessageStatusSeen = async (message: Message) => {
    try {
      await DB
        .from("messages")
        .update({ msg_status: MessageStatus.SEEN })
        .eq("id", message.id);
    } catch (e) {
      console.error("Failed to update message status seen", e);
    }
  };

  const updateUserConnectionsStatusSeen = async (userId: string) => {
    try {
      const currUserId = window.localStorage.getItem("chatapp-user-id");
      const { data: userData, error: userError } = await DB
        .from("users")
        .select("connections")
        .eq("id", currUserId)
        .maybeSingle();

      if (userError || !userData) {
        console.error("Failed to get user connections", userError);
        return;
      }
      const connections: UserConnection[] = userData.connections || [];
      const index = connections.findIndex(c => c.userId === userId);
      if (index === -1) return;

      connections[index].lastMsgStatus = MessageStatus.SEEN;

      const { error: updateError } = await DB
        .from("users")
        .update({ connections: connections })
        .eq("id", currUserId);

      if (updateError) {
        console.error("Failed to update user connections", updateError);
      }
    } catch (e) {
      console.error("Error updating user connections status", e);
    }
  };

  const updateGroupMessageStatusSeen = async (groupId: string, message: Message) => {
    try {
      const currUserId = window.localStorage.getItem("chatapp-user-id");

      // Update the current user's last_msg_status to SEEN in group_members
      await DB
        .from("group_members")
        .update({ last_msg_status: MessageStatus.SEEN })
        .eq("group_id", groupId)
        .eq("user_id", currUserId);

      // Check if all members have seen the message
      const { data: allMembers, error: membersError } = await DB
        .from("group_members")
        .select("last_msg_status")
        .eq("group_id", groupId);

      if (!membersError && allMembers) {
        const allSeen = allMembers.every(m => m.last_msg_status === MessageStatus.SEEN);

        if (allSeen) {
          // Update message's msg_status to SEEN when all members have seen it
          await DB
            .from("messages")
            .update({ msg_status: MessageStatus.SEEN })
            .eq("id", message.id);
        }
      }
    } catch (e) {
      console.error("Error updating group message status seen", e);
    }
  };

  const getCurrentUser = async () => {
    const currUserId = window.localStorage.getItem("chatapp-user-id");
    if (!currUserId) {
      setCurrentUser(undefined);
      return;
    }
    try {
      const { data, error } = await DB
        .from("users")
        .select("*")
        .eq("id", currUserId)
        .maybeSingle();

      if (error || !data) {
        console.error("Failed to fetch current user", error);
        setCurrentUser(undefined);
        return;
      }

      setCurrentUser(data);
    } catch (e) {
      console.error("Error fetching current user", e);
      setCurrentUser(undefined);
    }
  };

  // Process message queue to insert messages into DB
  const processQueue = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    while (!queueMessages.isEmpty()) {
      const msg = queueMessages.dequeue();
      console.log("[DBupdate] dequeued message:", msg);

      if (!msg || msg === -1) continue;

      try {
        // For private chats, ensure the chat exists in chats table
        if (!msg.group_id && msg.chat_id) {
          const { data: existingChat, error: chatError } = await DB
            .from('chats')
            .select('id')
            .eq('id', msg.chat_id)
            .maybeSingle();

          if (chatError) {
            console.error("Error checking chat existence:", chatError);
          } else if (!existingChat) {
            // Insert the chat for private conversation
            const receiverId = msg.chat_id.split('-').find(id => id !== msg.senderId);
            const { error: insertChatError } = await DB
              .from('chats')
              .insert([{
                id: msg.chat_id,
                members: [msg.senderId, receiverId]
              }]);

            if (insertChatError) {
              console.error("Error inserting chat:", insertChatError);
            }
          }
        }

        const { data, error } = await DB.from("messages").insert([
          {
            msg: msg.msg,
            msg_status: msg.msgStatus,
            sender_id: msg.senderId,
            sender_name: msg.senderName,
            sender_profile_img: msg.senderProfileImg,
            time: msg.time,
            is_file: msg.isFile,
            file_details: msg.fileDetails,
            chat_id: msg.chat_id,
            group_id: msg.group_id,
          },
        ]).select();

        if (error) {
          console.error("Supabase insert message error:", error);
          // Additional handling or retry logic could be placed here
        } else {
          console.log("[DBupdate] Message inserted successfully");

          if (data?.length > 0) {
            const insertedMsg = data[0];

            // Update the message status in the database to SENT
            try {
              await DB
                .from("messages")
                .update({ msg_status: MessageStatus.SENT })
                .eq("id", insertedMsg.id);
            } catch (e) {
              console.error("Failed to update message status to SENT in database", e);
            }

            // Update the message in the list with the real ID and SENT status
            setList((prevList) =>
              prevList.map((m) =>
                m.id === msg.id
                  ? {
                      ...m,
                      id: insertedMsg.id,
                      msgStatus: MessageStatus.SENT,
                      senderId: insertedMsg.sender_id,
                      senderName: insertedMsg.sender_name,
                      senderProfileImg: insertedMsg.sender_profile_img,
                      msg: insertedMsg.msg,
                      time: insertedMsg.time,
                      isFile: insertedMsg.is_file,
                      fileDetails: insertedMsg.file_details,
                      chat_id: insertedMsg.chat_id,
                      group_id: insertedMsg.group_id,
                    }
                  : m
              )
            );

            // For group chats, update group members' last_msg_status
            if (currentSideScreen.isGroup) {
              try {
                // Query group_members table
                const { data: groupMembers, error: groupError } = await DB
                  .from("group_members")
                  .select("*")
                  .eq("group_id", currentSideScreen.listId);

                if (!groupError && groupMembers) {
                  const members: GroupMember[] = groupMembers.map(gm => ({
                    userId: gm.user_id,
                    lastMsgStatus: gm.last_msg_status,
                    color: gm.color
                  }));

                  // Update each member's last_msg_status in group_members table in parallel
                  const updatePromises = members.map(member => {
                    const newStatus = member.userId === window.localStorage.getItem("chatapp-user-id")
                      ? MessageStatus.SEEN
                      : MessageStatus.SENT;

                    return DB
                      .from("group_members")
                      .update({ last_msg_status: newStatus })
                      .eq("group_id", currentSideScreen.listId)
                      .eq("user_id", member.userId);
                  });

                  await Promise.allSettled(updatePromises); // Use allSettled to prevent one failure from stopping others
                }
              } catch (e) {
                console.error("Error updating group members after message sent", e);
              }
            }

            // For private chats, update connections for both users
            if (!currentSideScreen.isGroup) {
              const receiverId = currentSideScreen.listId.split('-').find(id => id !== window.localStorage.getItem("chatapp-user-id"));
              const senderId = window.localStorage.getItem("chatapp-user-id");

              // Update sender's connections
              const { data: senderData, error: senderError } = await DB
                .from('users')
                .select('connections')
                .eq('id', senderId)
                .maybeSingle();

              if (!senderError && senderData) {
                let connections = senderData.connections || [];
                const index = connections.findIndex(c => c.userId === receiverId);
                const updateData = {
                  userId: receiverId,
                  chatId: currentSideScreen.listId,
                  lastMessage: msg.msg,
                  lastUpdated: new Date().toISOString(),
                  lastUpdatedTime: new Date().toISOString(),
                  lastMsgSenderId: msg.senderId,
                  lastMsgSenderName: msg.senderName,
                  lastMsgStatus: MessageStatus.SENT
                };
                if (index >= 0) {
                  connections[index] = { ...connections[index], ...updateData };
                } else {
                  connections.push(updateData);
                }
                await DB
                  .from('users')
                  .update({ connections: connections })
                  .eq('id', senderId);
              }

              // Update receiver's connections
              const { data: receiverData, error: receiverError } = await DB
                .from('users')
                .select('connections')
                .eq('id', receiverId)
                .maybeSingle();

              if (!receiverError && receiverData) {
                let connections = receiverData.connections || [];
                const index = connections.findIndex(c => c.userId === senderId);
                const updateData = {
                  userId: senderId,
                  chatId: currentSideScreen.listId,
                  lastMessage: msg.msg,
                  lastUpdated: new Date().toISOString(),
                  lastUpdatedTime: new Date().toISOString(),
                  lastMsgSenderId: msg.senderId,
                  lastMsgSenderName: msg.senderName,
                  lastMsgStatus: MessageStatus.SENT
                };
                if (index >= 0) {
                  connections[index] = { ...connections[index], ...updateData };
                } else {
                  connections.push(updateData);
                }
                await DB
                  .from('users')
                  .update({ connections: connections })
                  .eq('id', receiverId);
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to insert message with exception", e);
      }
    }
    isProcessingRef.current = false;
  };

  useEffect(() => {
    processQueue();
  }, [currentSideScreen]);

  const sendMsg = async (msg: string) => {
    console.log("[sendMsg] currentSideScreen:", currentSideScreen);
    console.log("[sendMsg] currentUser:", currentUser);

    if (!currentUser) {
      console.warn("[sendMsg] No current user set, abort sending message");
      return;
    }
    const id = getUniqueID();
      let newMsg: Message = {
      id: Number(id),
      msg: msg,
      msgStatus: MessageStatus.WAITING,
      senderId: window.localStorage.getItem("chatapp-user-id") as string,
      senderName: currentUser.name,
      senderProfileImg: currentUser.profileImgUrl,
      time: new Date().toISOString(),
      isFile: file != null && fileDetails != null,
      chat_id: currentSideScreen.isGroup ? null : currentSideScreen.listId,
      group_id: currentSideScreen.isGroup ? currentSideScreen.listId : null,
      fileDetails: null,
    };

    console.log("[sendMsg] newMsg to enqueue:", newMsg);

    if (newMsg.isFile && fileDetails != null && file != null) {
      newMsg.fileDetails = { ...fileDetails };
      setList((l) => [...l, newMsg]);

      // upload file and set url from blob to storage
      const { error } = await DBStorage.from(STORAGE_BUCKET).upload("Files/" + fileDetails.name, file);
      if (error) throw error;
      const { data: { publicUrl } } = DBStorage.from(STORAGE_BUCKET).getPublicUrl("Files/" + fileDetails.name);
      const fileUrl = publicUrl;

      newMsg = {
        ...newMsg,
        fileDetails: {
          ...fileDetails,
          url: fileUrl,
        },
      };

      console.log("[sendMsg] newMsg with uploaded file URL:", newMsg);
    } else {
      setList((l) => [...l, newMsg]);
    }

    queueMessages.enqueue(newMsg);
    setList((l) => [...l]);
    setFile(null);
    setFileDetails(null);

    // Process the queue after enqueuing
    processQueue();
  };

  useEffect(() => {
    scrollListToBottom();
  }, [list]);

  const inputFile = (e) => {
    const file: File = e.target.files[0];
    if (!file) {
      return;
    }
    const size: number = file.size / (1024 * 1024); // MegaBytes
    const sizeLimit = 30; // 30 MB
    if (size > sizeLimit) {
      alert(
        "File size is larger than expected.\nMax Upload size is: " +
          sizeLimit +
          " MB"
      );
      return;
    }

    const filePreviewDiv = document.getElementById("file-preview");
    const fileUrl = URL.createObjectURL(file);
    const fileName = file.name;
    const slashIndex = file.type.indexOf("/");
    const fileExt = file.type.substring(slashIndex + 1);
    let fileType: FileType = FileType.OTHER;

    if (file.type.startsWith("image/")) {
      fileType = FileType.IMAGE;
      const imgElement = (
        <img
          src={fileUrl}
          className="h-20 rounded-lg drop-shadow-xl mr-2"
        ></img>
      );
      const imgPreviewComponent = (
        <FilePreview
          file={imgElement}
          emptyFileDraft={() => {
            setFile(null);
            setFileDetails(null);
          }}
        />
      );
      ReactDOM.render(imgPreviewComponent, filePreviewDiv);
    } else if (file.type.startsWith("video/")) {
      fileType = FileType.VIDEO;
      const videoElement = (
        <video controls className="h-20 rounded-lg drop-shadow-xl mr-2">
          <source src={fileUrl}></source>
        </video>
      );
      const videoPreviewComponent = (
        <FilePreview
          file={videoElement}
          emptyFileDraft={() => {
            setFile(null);
            setFileDetails(null);
          }}
        />
      );
      ReactDOM.render(videoPreviewComponent, filePreviewDiv);
    } else {
      const unknownFileComponent = (
        <UnknownFileGraphic ext={fileExt} size={size} name={fileName} />
      );
      const unknownFilePreviewComponent = (
        <FilePreview
          file={unknownFileComponent}
          emptyFileDraft={() => {
            setFile(null);
            setFileDetails(null);
          }}
        />
      );
      ReactDOM.render(unknownFilePreviewComponent, filePreviewDiv);
    }
    filePreviewDiv.style.display = "block";
    setFile(file);
    setFileDetails({
      type: fileType,
      name: fileName,
      ext: fileExt,
      size: size,
      url: fileUrl,
    });
  };

  return (
    <div
      className={
        "flex flex-col h-screen w-screen chat-pattern bg-repeat bg-contain" +
        " " +
        classes
      }
    >
      <TopProfileView />
      {isLoading && <Loader classes="absolute" />}
      {list.length === 0 && (
        <div className="text-lg opacity-30 flex items-end justify-center h-full select-none">
          <p>No messages to show</p>
        </div>
      )}
      <div className="flex flex-col overflow-auto h-full" ref={messagesListRef}>
        {list.map((m, i) => (
          <MessageBox
            key={i}
            msgStatus={m.msgStatus}
            isSender={m.senderId === window.localStorage.getItem("chatapp-user-id")}
            isGroup={currentSideScreen.isGroup}
            msgText={m.msg}
            senderName={m.senderName}
            imageUrl={m.senderProfileImg}
            time={m.time}
            chatId={currentSideScreen.listId}
            senderId={m.senderId}
            isFile={m.isFile}
            fileDetails={m.fileDetails}
          />
        ))}
      </div>
      <div
        className="bg-transparent w-fit pl-3 pb-5 pr-5 rounded-lg absolute bottom-20 pt-5"
        id="file-preview"
      ></div>
      <BottomMessagingBar
        sendMsg={sendMsg}
        inputFile={inputFile}
        emptyFileDraft={() => {
          setFile(null);
          setFileDetails(null);
        }}
      />
    </div>
  );
}
