import type {Metadata} from 'next';
import './globals.css';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
  title: 'Risabu Connect ERP',
  description: 'Enterprise Resource Planning for Risabu Technical Training College',
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
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2 border-b px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
                <SidebarTrigger className="-ml-1" />
                <div className="flex-1">
                  <nav aria-label="Breadcrumb">
                    <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <li>Risabu Connect</li>
                      <li className="before:content-['/'] before:mr-2">ERP</li>
                    </ol>
                  </nav>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium">Admin User</span>
                    <span className="text-xs text-muted-foreground">Super Admin</span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    AU
                  </div>
                </div>
              </header>
              <main className="p-6 md:p-8">
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
