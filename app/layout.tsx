import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from "./providers/AuthProvider";

export const metadata: Metadata = {
  title: 'DREVA | Alquiler de vestidos',
  description:
    'Marketplace moderno para explorar, elegir y reservar vestidos de alquiler.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
  <AuthProvider>
    {children}
  </AuthProvider>
</body>
    </html>
  );
}
