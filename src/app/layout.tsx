import type { Metadata, Viewport } from "next";
import { ConfigProvider, App } from "antd";
import MainLayout from "@/components/MainLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Pro | Elite WhatsApp Business Intelligence",
  description: "Next-generation customer relationship management with seamless WhatsApp integration and AI-driven insights.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CRM Pro",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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
