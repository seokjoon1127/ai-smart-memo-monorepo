import { Outlet, useLocation } from "react-router-dom";
import { DemoSidebar } from "./DemoSidebar";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { Toast } from "@/components/common/Toast";

export function DemoLayout() {
  const location = useLocation();
  return (
    <div className="flex h-screen">
      <DemoSidebar />
      <main className="flex-1 overflow-auto">
        <div key={location.pathname} className="fade-in">
          <Outlet />
        </div>
      </main>
      <ConfirmModal />
      <Toast />
    </div>
  );
}
