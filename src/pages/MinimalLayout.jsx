import { Outlet } from 'react-router-dom';

export default function MinimalLayout() {
  return (
    <main className="p-6 bg-gray-50 min-h-screen">
      <Outlet />
    </main>
  );
}