import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const metadata: Metadata = {
  title: "Вечер за столом: 8 игр онлайн",
  description:
    "Онлайн-сборник настольных и словесных игр для компании друзей: Бонжур мадам, Шляпа, Перудо, Лото, Пароль, Верю не верю, Кубики, Чапаев. Создайте комнату и играйте по ссылке.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#14100b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&family=Unbounded:wght@500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`,
          }}
        />
      </body>
    </html>
  );
}
