import '@/styles/globals.css';
import type { Metadata } from 'next';
import { Public_Sans, Geist } from 'next/font/google';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const publicSans = Public_Sans({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-public-sans'
});

export const metadata: Metadata = {
  title: 'PPA LDO LOA - Gestão Orçamentária',
  description: 'Sistema de Planejamento e Orçamento Público',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={cn("font-sans", geist.variable)}>
      <body className="font-display">
        {children}
      </body>
    </html>
  );
}
