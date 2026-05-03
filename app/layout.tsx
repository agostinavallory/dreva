import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DREVA | Alquiler de vestidos',
  description:
    'Marketplace moderno para explorar, elegir y reservar vestidos de alquiler.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
