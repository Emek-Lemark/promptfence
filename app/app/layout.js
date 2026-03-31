import "./globals.css";

export const metadata = {
  title: "PromptFence — Stop sensitive data from reaching AI tools",
  description: "Browser extension that detects emails, phone numbers, bank details, and API keys before they leave your browser. 100% local processing. GDPR-compliant by design. Free for personal use, team plans from €49/month.",
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
