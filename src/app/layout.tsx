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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "CRM Pro",
              "operatingSystem": "Web",
              "applicationCategory": "BusinessApplication",
              "offers": {
                "@type": "Offer",
                "price": "999",
                "priceCurrency": "TRY"
              }
            })
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#2563eb', // Elite blue
              borderRadius: 12,
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

