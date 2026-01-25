import "@ant-design/v5-patch-for-react-19";
import type { Metadata } from "next";
import { ConfigProvider, App } from "antd";
import MainLayout from "@/components/MainLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Pro - WhatsApp Business",
  description: "Free-tier CRM system with WhatsApp integration",
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
