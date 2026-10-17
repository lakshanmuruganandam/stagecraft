import { Suspense } from "react";
import { getViewer } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <Suspense fallback={<div className="h-[45px] border-b border-white/6" />}>
        <Nav />
      </Suspense>
      {children}
    </>
  );
}

async function Nav() {
  const v = await getViewer();
  // Members and signed-out visitors get the page's own gate, without the nav.
  if (!v || (v.role !== "admin" && v.role !== "organizer")) return null;
  return <AdminNav isAdmin={v.role === "admin"} />;
}
