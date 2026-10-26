import Sidebar from "@/components/Sidebar";
import CenterChat from "@/components/CenterChat";
import AiModule from "@/components/AiModule";
import ModelProvider from "@/components/ModelProvider";

export default function Home() {
  return (
    <ModelProvider>
      <div className="app">
        <Sidebar />
        <CenterChat />
        <AiModule />
      </div>
    </ModelProvider>
  );
}
