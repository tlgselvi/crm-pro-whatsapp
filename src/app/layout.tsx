import type { Metadata, Viewport } from "next";
import { ConfigProvider, App } from "antd";
import MainLayout from "@/components/MainLayout";
import themeConfig from "@/theme/themeConfig";
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
  const jsonLd = {
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
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>
        <ConfigProvider theme={themeConfig}>
          <App>
            <MainLayout>{children}</MainLayout>
          </App>
        </ConfigProvider>
      </body>

    </html>
  );
}


