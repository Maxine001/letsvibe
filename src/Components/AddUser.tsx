import { useState } from "react";
import Input from "./Input";
import { UserPlusIcon, PlusIcon } from "@heroicons/react/20/solid";
import supabase, { addUser, usernameExists, STORAGE_BUCKET } from "../supabase/Supabase";
import { useSetRecoilState } from "recoil";
import { globalLoaderAtom } from "../atoms/atom";
//import { User } from "./types";
import { cropPhoto, dataURLToBlob } from "./Utils";

// Import uuidv4 from 'uuid' package if available, else use crypto API
function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // fallback for older browsers
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return (
    s4() +
    s4() +
    "-" +
    s4() +
    "-" +
    s4() +
    "-" +
    s4() +
    "-" +
    s4() +
    s4() +
    s4()
  );
}

export function AddPhoto(props: any) {
  return (
    <div
      {...props}
      className="text-zinc-400 pl-4 py-2 pr-2 rounded-2xl border-zinc-400 border-dashed border-4 hover:cursor-pointer opacity-50 hover:opacity-100"
    >
      <UserPlusIcon className="h-24" />
    </div>
  );
}
export function Photo(props: any) {
  return <img {...props} className="rounded-full h-32" />;
}
export default function AddUser({ onClose }: { onClose?: () => void }) {
  const [photo, setPhoto] = useState<File>();
  const setIsLoading = useSetRecoilState(globalLoaderAtom);
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("");
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

  // Upload photo to Supabase storage bucket using configured bucket name
  const uploadPhoto = async (file) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${username}-${Date.now()}.${fileExt}`;
    const filePath = `Profile_Images/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.status === 404) {
          throw new Error(`Storage bucket '${STORAGE_BUCKET}' not found. Please verify bucket exists in Supabase.`);
        } else {
          throw uploadError;
        }
      }

      const { data } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      throw err;
    }
  };

  const addUserHandler = async () => {
    if (!username || !status) {
      alert("username and status fields are mandatory");
      return;
    }
    setIsLoading(true);
    try {
      const exists = await usernameExists(username);
      if (exists) {
        setIsLoading(false);
        alert("username already exists");
        return;
      }
      // Upload photo if any
      let photoUrl = "";
      if (photo) {
        photoUrl = await uploadPhoto(photo);
      }

      // generate id here
      const id = generateUUID();

      const newUser = {
        id,
        name: username,
        status: status,
        profileImgUrl: photoUrl || '',
        connections: [],
        isOnline: false,
      };

      const insertedUsers = await addUser(newUser);
      const insertedUserId = insertedUsers?.[0]?.id;

      if (!insertedUserId) {
        alert("Error: User ID could not be retrieved after insertion.");
        setIsLoading(false);
        return;
      }
      window.localStorage.setItem("chatapp-user-id", insertedUserId);

      // Dispatch a custom event to notify that the current user ID has changed
      window.dispatchEvent(new CustomEvent("chatappUserIdChanged", { detail: insertedUserId }));

      // Call onClose callback to close/hide AddUser after successful addition
      if (onClose) {
        onClose();
      }
    } catch (e) {
      alert("There was an Error");
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="bg-black w-screen h-screen absolute bg-opacity-80 flex items-center justify-center z-10">
        <div className="bg-dark rounded-xl px-6 pb-6 pt-3 mx-10">
          <div className="flex flex-wrap items-start gap-5 pt-5 justify-center">
            {photo && croppedPhoto ? (
              <Photo src={croppedPhoto} />
            ) : (
              <AddPhoto onClick={inputPhoto} />
            )}

            <div className="flex flex-col gap-3 items-center">
              <Input
                placeholder="Enter your name..."
                onInput={(e) => {
                  setUsername(e.target.value);
                }}
              />
              <Input
                placeholder="Status..."
                onInput={(e) => {
                  setStatus(e.target.value);
                }}
              />
              <div className="flex gap-5 mt-3">
                <button
                  className="rounded-xl border-none bg-primary text-white py-2 pl-3 pr-5 flex items-center text-lg"
                  onClick={addUserHandler}
                >
                  <PlusIcon className="h-8 pr-1" />
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
