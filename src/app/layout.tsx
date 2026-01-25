import type { Metadata, Viewport } from "next";
import { ConfigProvider, App } from "antd";
import MainLayout from "@/components/MainLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Pro - WhatsApp Business",
  description: "Free-tier CRM system with WhatsApp integration",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1890ff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#1890ff',
              borderRadius: 6,
            },
          }}
        >
          <App>
            <MainLayout>{children}</MainLayout>
          </App>
        </ConfigProvider>
      </body>
    </html>
  );
}
