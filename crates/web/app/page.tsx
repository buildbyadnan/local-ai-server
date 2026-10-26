import Sidebar from "@/components/Sidebar";
import CenterChat from "@/components/CenterChat";
import AiModule from "@/components/AiModule";

export default function Home() {
  return (
    <div className="app">
      <Sidebar />
      <CenterChat />
      <AiModule />
    </div>
  );
}
