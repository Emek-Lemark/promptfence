import "./globals.css";

export const metadata = {
  title: "PromptFence Admin",
  description: "Protect sensitive data from AI prompts",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
