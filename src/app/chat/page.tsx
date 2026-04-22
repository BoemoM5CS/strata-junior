import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatApp from "./ChatApp";

export default async function ChatPage() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/auth");
    return (
      <ChatApp
        currentUserId={user.id}
        currentUserName={user.user_metadata?.full_name ?? user.email ?? "You"}
        currentUserEmail={user.email ?? ""}
      />
    );
  } catch {
    redirect("/auth");
  }
}
