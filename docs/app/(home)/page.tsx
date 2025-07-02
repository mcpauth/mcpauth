import Section from "@/components/landing/section";
import Hero from "@/components/landing/hero";
import Features from "@/components/features";
import Link from "next/link";


async function getGitHubStars() {
  try {
    const response = await fetch(
      "https://api.github.com/repos/mcpauth/mcpauth",
      {
        next: {
          revalidate: 60,
        },
      }
    );
    if (!response?.ok) {
      return null;
    }
    const json = await response.json();
    const stars = parseInt(json.stargazers_count).toLocaleString();
    return stars;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const stars = await getGitHubStars();
  return (
    <main className="md:grid md:grid-cols-[1.5rem_1fr_1.5rem] lg:grid-cols-[2.5rem_1fr_2.5rem]">
      <div className="hidden md:block border-r border-stone-200 dark:border-[#26242C]"></div>
      <div className="overflow-hidden">
        <Section
          customPaddings
          id="hero"
        >
          <Hero />
          <Features stars={stars} />
        </Section>

      </div>
      <div className="hidden md:block border-l border-stone-200 dark:border-[#26242C]"></div>
    </main>
  );
}
