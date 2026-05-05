import type {Metadata} from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ClientLayout } from '@/components/layout/client-layout';

export const metadata: Metadata = {
  title: 'Risabu Connect ERP',
  description: 'Enterprise Resource Planning for Risabu Technical Training Institute',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased selection:bg-accent/30">
        <FirebaseClientProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
