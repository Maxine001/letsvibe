import Close from "./Close";
import Input from "./Input";
import {
  PlusIcon,
  ChevronUpDownIcon,
  UserCircleIcon,
} from "@heroicons/react/20/solid";
import { AddPhoto, Photo } from "./AddUser";
import { useEffect, useState } from "react";
import { globalLoaderAtom } from "../atoms/atom";
import { useSetRecoilState } from "recoil";
import { DB as supabase, GROUP_STORAGE_BUCKET } from "../supabase/Supabase";
import { Group, GroupMember, MessageStatus, User } from "./types";
import {
  cropPhoto,
  dataURLToBlob,
  generateRandomColor,
  //getCurrentTime,
  getUniqueID,
} from "./Utils";

export default function AddGroup({ onClose }: any) {
  const [photo, setPhoto] = useState<File>();
  const [groupname, setGroupname] = useState("");
  const setIsLoading = useSetRecoilState(globalLoaderAtom);
  const [selectedUsers, setSelectedUsers] = useState<GroupMember[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isDropDownActive, toggleDropDown] = useState(false);
  const [croppedPhoto, setCroppedPhoto] = useState("");

  const inputPhoto = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.click();
    input.addEventListener("change", async () => {
      const file = input.files[0];
      //  get cropped photo
      const bolbUrl = URL.createObjectURL(file);
      const croppedPhotoSrc = await cropPhoto(bolbUrl) as string;
      const croppedBlobUrl = dataURLToBlob(croppedPhotoSrc);
      const croppedFile = new File([croppedBlobUrl], file.name, {type: croppedBlobUrl.type})
      setPhoto(croppedFile);
      setCroppedPhoto(croppedPhotoSrc);
    });
  };
  const addGroup = async () => {
    if (!groupname) {
      alert("Group name field are mandatory");
      return;
    }
    if (selectedUsers.length === 0) {
      alert("Select at least one user for group.");
      return;
    }
    
    setIsLoading(true);
    try {
      // Check if group name already exists
      const { data: existingGroups, error } = await supabase
        .from('groups')
        .select('id')
        .eq('name', groupname)
        .limit(1);
      
      if (error) {
        throw error;
      }

      if (existingGroups.length > 0) {
        setIsLoading(false);
        alert("Group name already exists");
        return;
      }

      // Upload group image if added
      let photoUrl = "";
      if (photo) {
        const fileExt = photo.name.split('.').pop();
        const fileName = `${groupname}-${Date.now()}.${fileExt}`;
        const filePath = `group_images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(GROUP_STORAGE_BUCKET)
          .upload(filePath, photo);

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from(GROUP_STORAGE_BUCKET)
          .getPublicUrl(filePath);

        const { publicURL, error: urlError } = data;
        
        if (urlError) {
          throw urlError;
        }

        photoUrl = publicURL;
      }

      // Create new group object
      const newGroup: Group = {
        id: getUniqueID(),
        name: groupname,
        groupImgUrl: photoUrl || '',
        lastUpdated: new Date().toISOString(),
        members: [
          {
            userId: window.localStorage.getItem("chatapp-user-id") as string,
            lastMsgStatus: MessageStatus.SEEN,
            color: generateRandomColor(),
          },
          ...selectedUsers,
        ],
        lastMessage: "",
        lastUpdatedTime: new Date().toISOString(),
        lastMsgSenderId: "",
        lastMsgSenderName: "",
      };

      // Map camelCase Group object to snake_case for DB insert (without members)
      const insertGroup: any = {
        id: newGroup.id,
        name: newGroup.name,
        group_img_url: newGroup.groupImgUrl,
        last_updated: newGroup.lastUpdated,
        last_message: newGroup.lastMessage,
        last_updated_time: newGroup.lastUpdatedTime,
        last_msg_sender_id: newGroup.lastMsgSenderId,
        last_msg_sender_name: newGroup.lastMsgSenderName,
      };

      // Insert new group into Supabase
      const { error: insertError } = await supabase
        .from('groups')
        .insert([insertGroup]);

      if (insertError) {
        throw insertError;
      }

      // Insert members into group_members table
      const groupMembersInsert = newGroup.members.map((member) => ({
        group_id: newGroup.id,
        user_id: member.userId,
        last_msg_status: member.lastMsgStatus,
        color: member.color,
      }));
      
      const { error: insertMembersError } = await supabase
        .from('group_members')
        .insert(groupMembersInsert);

      if (insertMembersError) {
        throw insertMembersError;
      }

      onClose();
      window.location.reload();
    } catch (e) {
      alert("There was an Error");
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckboxChange = (userId: string) => {
    let updatedSelection = [...selectedUsers];
    const index = updatedSelection.findIndex((s) => s.userId == userId);
    if (index >= 0) {
      updatedSelection.splice(index, 1);
    } else {
      updatedSelection.push({
        userId: userId,
        lastMsgStatus: MessageStatus.SEEN,
        color: generateRandomColor(),
      });
    }
    setSelectedUsers(updatedSelection);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error(error);
        setUsersList([]);
        return;
      }

      const filteredUsers = data.filter(
        (u) => u.id !== window.localStorage.getItem("chatapp-user-id")
      );

      setUsersList(filteredUsers);
    };
    fetchUsers();

    const clickListener = (e: Event) => {
      const usersListDiv = document.querySelectorAll(".users-list");
      const docArea = e.target as Node;
      let isInside = false;
      usersListDiv.forEach((div) => {
        if (div.contains(docArea)) {
          isInside = true;
        }
      });
      if (!isInside) {
        toggleDropDown(false);
        document.removeEventListener("click", clickListener);
      }
    };

    document.addEventListener("click", clickListener);

    return () => {
      document.removeEventListener("click", clickListener);
    };
  }, []);
  return (
    <div
      className="bg-black w-screen h-screen absolute bg-opacity-70 flex items-center justify-center z-10"
      onClick={(e) => {
        if (e.target == e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-dark rounded-xl px-6 pb-6 pt-3 flex flex-col items-end">
        <Close onClick={onClose} />
        <div className="flex flex-col gap-5 items-center pt-5">
          {photo && croppedPhoto ? (
            <Photo src={croppedPhoto} />
          ) : (
            <AddPhoto onClick={inputPhoto} />
          )}
          <Input
            placeholder="Enter Group name..."
            onInput={(e) => {
              setGroupname(e.target.value);
            }}
          />
          <div className="w-full relative h-full">
            <div
              className="users-list cursor-pointer flex items-center w-full rounded-xl outline outline-[1px] outline-zinc-400 border-0 py-3 pl-5 pr-2 bg-secondary text-white font-light placeholder:text-white/70"
              onClick={() => {
                toggleDropDown((val) => !val);
              }}
            >
              Select Member of the Group...
              <ChevronUpDownIcon className="h-8 pl-5" />
            </div>
            {isDropDownActive && (
              <div className="users-list absolute flex flex-col bg-secondary outline-zinc-400 outline outline-[1px] rounded-xl w-full cursor-pointer px-2 py-2 min-h-full max-h-[150px] overflow-y-auto">
                {usersList.map((user) => (
                  <label
                    key={user.id}
                    className="cursor-pointer hover:bg-dark px-1 py-2 rounded-xl flex"
                  >
                    <input
                      type="checkbox"
                      value={user.id}
                      checked={
                        selectedUsers.findIndex((u) => u.userId == user.id) >= 0
                      }
                      onChange={() => handleCheckboxChange(user.id)}
                      className="cursor-pointer ml-1 mr-2"
                    />
                    <div className="flex justify-left items-center rounded-xl">
                      {user.profileImgUrl ? (
                        <img src={user.profileImgUrl} className="h-10 mr-2 rounded-full" />
                      ) : (
                        <UserCircleIcon className="h-10 pr-1" />
                      )}
                      <div className="flex flex-col">
                        <p className="text-lg font-semibold text-zinc-200">
                          {user.name}
                        </p>
                        <p className="text-sm text-zinc-400">{user.status}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-5">
            <button
              className="rounded-xl border-none bg-primary text-white py-2 pl-6 pr-8 flex items-center text-lg"
              onClick={addGroup}
            >
              <PlusIcon className="h-6 pr-1" />
              Add
            </button>
            <button
              className="rounded-xl border-none bg-secondary text-white py-4 px-9 text-lg"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
