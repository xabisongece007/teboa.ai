export const metadata = {
  metadataBase: new URL("https://teboatech.com"),
  title: {
    default: "Teboa | AI-Powered Shopify Platform for eCommerce",
    template: "%s | Teboa",
  },
  description:
    "An AI-powered eCommerce operating system that helps store owners automate operations, manage customers, and grow revenue without burning out.",
  alternates: {
    canonical: "https://teboatech.com",
  },
  openGraph: {
    title: "Teboa | AI-Powered Shopify Platform for eCommerce",
    description:
      "An AI-powered eCommerce operating system that helps store owners automate operations, manage customers, and grow revenue without burning out.",
    url: "https://teboatech.com",
    siteName: "Teboa",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={{ background: "#EEEAE6", colorScheme: "light only" }}
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
        <meta name="theme-color" content="#EEEAE6" />
        <link rel="icon" type="image/png" href="/assets/images/teboa-logo.png" />
        <link rel="apple-touch-icon" href="/assets/images/teboa-logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800&family=Inter:wght@300;400;500;600&display=swap"
        />
        <link rel="stylesheet" href="/shared-footer.css" />
      </head>
      <body
        suppressHydrationWarning
        style={{
          margin: 0,
          background: "#EEEAE6",
          color: "#0A0A0A",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
