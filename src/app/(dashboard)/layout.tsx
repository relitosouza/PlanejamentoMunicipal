import Sidebar from '@/components/Sidebar/Sidebar';
import Topbar from '@/components/Topbar/Topbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="layout-container">
      <Sidebar />
      <div className="main-wrapper">
        <Topbar />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
