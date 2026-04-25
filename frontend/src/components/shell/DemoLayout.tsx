import { Outlet } from "react-router-dom";
import { DemoSidebar } from "./DemoSidebar";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { Toast } from "@/components/common/Toast";

export function DemoLayout() {
  return (
    <div className="flex min-h-screen">
      <DemoSidebar />
      <main className="flex-1 overflow-auto fade-in">
        <Outlet />
      </main>
      <ConfirmModal />
      <Toast />
    </div>
  );
}
