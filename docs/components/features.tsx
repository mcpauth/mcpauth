"use client";

import {
  Globe2Icon,
  PlugIcon,
  PlugZap2Icon,
  Plus,
  RabbitIcon,
  ShieldCheckIcon,
  Webhook,
} from "lucide-react";
import { LockClosedIcon } from "@radix-ui/react-icons";

import SupportedMatrix from "./landing/supported-matrix";
import { cn } from "@/lib/utils";
import { TechStackDisplay } from "./landing/display-techstack";
import { GithubStat } from "./landing/github-stat";
import Link from "next/link";

const features = [
  {
    id: 1,
    label: "Self-Hosted",
    title: "Own Your Data and Your <strong>Authentication</strong>.",
    description:
      "With @mcpauth/auth, you host the server, you own the data. No separate authorization server. No vendor lock-in.",
    icon: PlugZap2Icon,
  },
  {
    id: 2,
    label: "MCP-Ready",
    title: "Required for Modern <strong>MCP Clients</strong>.",
    description:
      "Major MCP clients like OpenAI's ChatGPT require OAuth 2.0. @mcpauth/auth provides the compliant, secure server you need.",
    icon: LockClosedIcon,
  },
  {
    id: 3,
    label: "Integrates with Existing Auth",
    title: "Seamlessly Integrate Your <strong>Existing Auth</strong>.",
    description:
      "Plug in any existing authentication logic, whether it's a session cookie, a bearer token, or an external system.",
    icon: Webhook,
  },
  {
    id: 4,
    label: "Framework Adapters",
    title: "Support for popular <strong>frameworks</strong>.",
    description:
      "Supports popular frameworks, including Next.js and Express, with more to come.",
    icon: ShieldCheckIcon,
  },
  {
    id: 5,
    label: "Database Stores",
    title: "<strong>Prisma</strong> and <strong>Drizzle</strong> Support.",
    description:
      "Choose your preferred database with support for both Prisma and Drizzle out of the box.",

    icon: RabbitIcon,
  },

  {
    id: 6,
    label: "Extensible & Open Source",
    title: "Request new <strong>adapters</strong> & <strong>stores</strong>.",
    description:
      "Don't see your preferred framework or database? Open an issue and the community will add support — @mcpauth/auth is built to be extended.",
    icon: Plus,
  },
];

export default function Features({ stars }: { stars: string | null }) {
  return (
    <div className="md:w-10/12 mt-10 mx-auto font-geist relative md:border-l-0 md:border-b-0 md:border-[1.2px] rounded-none -pr-2 dark:bg-black/5">
      <div className="w-full md:mx-0">
        <div className="grid grid-cols-1 relative md:grid-rows-2 md:grid-cols-3 border-b-[1.2px]">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              className={cn(
                "justify-center border-l-[1.2px] md:min-h-[240px] border-t-[1.2px] md:border-t-0 transform-gpu flex flex-col p-10",
                index >= 3 && "md:border-t-[1.2px]"
              )}
            >
              <div className="flex items-center gap-2 my-1">
                <feature.icon className="w-4 h-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.label}
                </p>
              </div>
              <div className="mt-2">
                <div className="max-w-full">
                  <div className="flex gap-3 ">
                    <p
                      className="max-w-lg text-xl font-normal tracking-tighter md:text-2xl"
                      dangerouslySetInnerHTML={{
                        __html: feature.title,
                      }}
                    />
                  </div>
                </div>
                <p className="mt-2 text-sm text-left text-muted-foreground">
                  {feature.description}
                  <a className="ml-2 underline" href="/docs" target="_blank">
                    Learn more
                  </a>
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative col-span-3 border-t-[1.2px] border-l-[1.2px] md:border-b-[1.2px] dark:border-b-0 h-full p-10 md:p-20">
          <div className="flex flex-col items-center justify-center w-full h-full gap-8">
            <h2 className="text-3xl font-bold tracking-tight text-center">
              Wide Compatibility
            </h2>
            <div className="w-full max-w-2xl">
              <SupportedMatrix />
            </div>
          </div>
        </div>

        <div className="relative col-span-3 border-t-[1.2px] border-l-[1.2px] md:border-b-[1.2px] dark:border-b-0 h-full p-10 md:p-20">
          <div className="flex flex-col items-center justify-center w-full h-full gap-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Ready to Get Started?
            </h2>
            <p className="max-w-lg text-muted-foreground">
              Integrate MCP-compliant OAuth into your application in minutes. Follow our installation guide to get up and running.
            </p>
            <div className="mt-2">
                <Link href="/docs/installation" className="inline-block bg-white text-black font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                    View Installation Docs
                </Link>
            </div>
          </div>
        </div>

        <div className="relative col-span-3 border-t-[1.2px] border-l-[1.2px] md:border-b-[1.2px] dark:border-b-0  h-full py-20">
          <div className="w-full h-full p-16 pt-10 md:px-10">
            <div className="flex flex-col items-center justify-center w-full h-full gap-3">
              <p className="max-w-md mx-auto mt-4 text-4xl font-normal tracking-tighter text-center md:text-4xl">
                <strong>Spin up your own MCP Auth in minutes!</strong>
              </p>
              <div className="flex mt-[10px] z-20 justify-center items-start">
                <TechStackDisplay
                  skills={[]}
                />
              </div>
              <div className="flex items-center gap-2">
                <GithubStat stars={stars} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
