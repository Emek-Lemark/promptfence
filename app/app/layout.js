import "./globals.css";

export const metadata = {
  title: "PromptFence: AI Data Protection and Compliance for Teams",
  description: "PromptFence stops sensitive data from reaching AI tools like ChatGPT, Claude, and Gemini, and gives developers an API to enforce the same rules inside their products. Browser extension plus developer proxy. GDPR and EU AI Act ready. Team plans from €49/month.",
  keywords: "AI data protection, DLP for AI, prevent data leaks AI, ChatGPT compliance, EU AI Act compliance, AI governance, PII detection, prompt security, GDPR AI",
  openGraph: {
    title: "PromptFence: AI Data Protection and Compliance for Teams",
    description: "Stop sensitive data leaking into AI tools. Browser extension plus developer API. GDPR and EU AI Act compliance evidence built in.",
    url: "https://promptfence.ai",
    siteName: "PromptFence",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PromptFence: AI Data Protection for Teams",
    description: "Stop sensitive data leaking into ChatGPT, Claude and Gemini. Browser extension plus developer proxy API. EU AI Act compliance included.",
  },
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
