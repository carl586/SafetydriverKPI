import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Safety KPI - MNM Freight',
  description: 'Safety KPI Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css"
        />
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js" defer></script>
      </head>
      <body className="bg-gray-100 font-sans">{children}</body>
    </html>
  );
}