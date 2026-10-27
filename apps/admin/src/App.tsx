import { RouterProvider } from '@tanstack/react-router';
import { SessaoProvider } from './features/auth/SessaoProvider';
import { router } from './routes';

export function App() {
  return (
    <SessaoProvider>
      <RouterProvider router={router} />
    </SessaoProvider>
  );
}
