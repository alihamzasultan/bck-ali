import "./globals.css";
import ThemeRegistry from "@/components/ThemeRegistry";

export const metadata = {
  title: "BCH Vault | Enterprise Asset Manager",
  description: "Secure asset management and PPTX preview",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
            {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
