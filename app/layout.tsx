import './globals.css';
import type { Metadata } from 'next';
import { APP_NAME } from '@/lib/config';

export const metadata: Metadata = {
  title: `${APP_NAME} – Publikums-Voting`,
  description: 'Wähle deine Top 12 aus der aktuellen Songliste.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
