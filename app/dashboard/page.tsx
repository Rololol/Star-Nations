import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import DashboardContent from "./DashboardContent";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="h-screen flex flex-col bg-[#0b0f19] overflow-hidden">
      <DashboardContent
        user={{
          userId: user.userId,
          displayName: user.displayName,
          factionId: user.factionId,
          factionName: user.factionName,
        }}
      />
    </div>
  );
}
