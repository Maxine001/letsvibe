import AddUser from "./Components/AddUser";
import Chat from "./Screens/Chat";
import ChatsList from "./Screens/ChatsList";
import About from "./Screens/About";
import Loader from "./Components/Loader";
import { useRecoilValue } from "recoil";
import { globalLoaderAtom } from "./atoms/atom";
import { sideScreenAtom } from "./atoms/atom";
import { SideScreenSchema, User } from "./Components/types";
import { isSideScreenActiveAtom } from "./atoms/atom";
import { DB } from "./supabase/Supabase";
import { useEffect, useState } from "react";
import Call from "./Screens/Call";
import IncommingCall from "./Components/IncommingCall";

function SideScreen({ Screen }: any) {
  return (
    <>
      <div className="bg-zinc-700 bg-opacity-60 w-0.5 hidden md:block"></div>
      {Screen}
    </>
  );
}
export default function App() {
  const isLoading = useRecoilValue(globalLoaderAtom);
  const currentSideScreen = useRecoilValue<SideScreenSchema>(sideScreenAtom);
  const isSideScreenActive = useRecoilValue<boolean>(isSideScreenActiveAtom);
  const [isUser, setIsUser] = useState<boolean>();
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // New state to track user list refresh toggle
  const [userListRefreshToggle, setUserListRefreshToggle] = useState(false);

    useEffect(() => {
    let subscription: any; // To hold realtime subscription
    const checkUserExists = async () => {
      const userId = window.localStorage.getItem("chatapp-user-id") as string;
      if (userId == null) {
        setIsUser(false);
        return;
      }

      // Fetch user from supabase
      let { data: userData, error } = await DB
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !userData) {
        setIsUser(false);
        return;
      }

      setIsUser(true);
      setCurrentUser(userData as User);

      // Subscribe to realtime updates for the user - Supabase v2 syntax
      subscription = DB.channel(`public:users:id=eq.${userId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
          (payload) => {
            if (payload.new) {
              setCurrentUser(payload.new as User);
            }
          }
        )
        .subscribe();

      // Function to set online status
      const setOnlineStatus = async () => {
        await DB
          .from("users")
          .update({ is_online: true })
          .eq("id", userId);
      };

      // Function to set offline status
      const setOfflineStatus = async () => {
        await DB
          .from("users")
          .update({ is_online: false })
          .eq("id", userId);
      };

      // Set online on mount
      setOnlineStatus();

      // Set offline handlers on unload and offline events
      window.addEventListener("beforeunload", setOfflineStatus);
      window.addEventListener("offline", setOfflineStatus);

      return () => {
        window.removeEventListener("beforeunload", setOfflineStatus);
        window.removeEventListener("offline", setOfflineStatus);
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    };

    checkUserExists();

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  return (
    <>
      {isLoading && <Loader classes="fixed bg-zinc-700/50 z-50" />}
      {isUser == false && <AddUser onClose={() => {
        setIsUser(true);
        setUserListRefreshToggle((prev) => !prev);
      }} />}
      {currentUser && currentUser.incommingCall && currentUser.incommingCall.isIncomming && <IncommingCall call={currentUser.incommingCall} />}
      <div className="md:flex md:w-screen overflow-hidden h-screen">
        <ChatsList
          classes={
            "md:w-5/12 h-screen" +
            " " +
            (isSideScreenActive ? "hidden md:block" : "")
          }
          refreshToggle={userListRefreshToggle}
        />
        <SideScreen
          Screen={
            isSideScreenActive ? (
              currentSideScreen.onCall ? <Call classes="md:flex h-screen" /> :
              <Chat classes="md:flex h-screen" />
            ) : (
              <About classes="md:flex h-screen" />
            )
          }
        />
      </div>
    </>
  );
}