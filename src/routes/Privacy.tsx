/**
 * Privacy policy (/privacy). Plain and short: what Zambot keeps, which
 * services see it, and how to remove it. Google's sign-in setup asks for a
 * link to this page before the app can be published.
 */
import { Link } from "react-router-dom";

import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import { Icon } from "@/components/ui/Icon";

const UPDATED = "25 October 2026";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "What Zambot keeps",
    body: [
      "Your account: the email address, name and profile picture that Google or the email sign-in link provides.",
      "The files you upload, the text read from them, and the chats you have about them.",
      "Simple daily counters of how many questions and uploads you made, so the free service is shared fairly.",
    ],
  },
  {
    title: "Who can see it",
    body: [
      "Only you. Every chat and file belongs to your account, and nobody else who signs in can open them.",
      "Zambot does not sell your data, show ads, or use your files to train AI models.",
    ],
  },
  {
    title: "Services that process it",
    body: [
      "Supabase stores your account, files and chats.",
      "Scanned pages are read by Google Gemini from the page image.",
      "E2B runs a short-lived, sealed sandbox for spreadsheet calculations.",
      "Google Gemini and Groq read the relevant passages to write each answer.",
      "Upstash keeps short-lived working data, such as the last few messages of a chat.",
      "Vercel and Render host the website and the server.",
    ],
  },
  {
    title: "Removing your data",
    body: [
      "Deleting a chat removes its files, text and messages. Settings → Delete all chats removes everything at once.",
      "To have your account removed as well, ask the person who runs this Zambot.",
    ],
  },
  {
    title: "Cookies",
    body: ["Zambot only stores what is needed to keep you signed in. There are no tracking or advertising cookies."],
  },
];

export function Privacy() {
  return (
    <div className="relative min-h-dvh mesh-bg">
      <div className="relative mx-auto max-w-2xl px-5 pb-20 pt-8 sm:px-8">
        <Link to="/" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13.5px] font-medium text-black/55 transition hover:bg-white/60 hover:text-black">
          <Icon name="arrowLeft" size={15} />
          Home
        </Link>
        <div className="mt-8 rounded-[30px] border border-white/70 bg-white/55 p-6 shadow-sm backdrop-blur-xl sm:p-10">
          <AnimatedLogo className="w-[110px] text-black" />
          <h1 className="mt-6 text-[30px] font-semibold tracking-[-0.03em]">Privacy policy</h1>
          <p className="mt-1 text-[13px] text-black/45">Last updated {UPDATED}</p>
          <p className="mt-5 text-[15.5px] leading-relaxed text-black/70">
            Zambot lets you upload documents and ask questions about them. This page explains, in plain words, what it
            keeps and why.
          </p>
          {SECTIONS.map((section) => (
            <section key={section.title} className="mt-8">
              <h2 className="text-[17px] font-semibold">{section.title}</h2>
              <ul className="mt-2.5 space-y-2">
                {section.body.map((line) => (
                  <li key={line} className="flex gap-2.5 text-[15px] leading-relaxed text-black/70">
                    <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-[2px] bg-black/30" />
                    {line}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
