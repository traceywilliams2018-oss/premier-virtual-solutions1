import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://your-live-url.vercel.app";
  return (
    <Html lang="en">
      <Head>
        <meta name="description" content="Executive virtual assistance for leaders who value time, privacy & efficiency." />
        <meta property="og:title" content="Premier Virtual Solutions" />
        <meta property="og:description" content="Confidential, reliable, and efficient executive support." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:image" content="/og.png" />
        <link rel="icon" href="/favicon.svg" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
