import Link from "next/link";
import UserButton from "./user-button";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex justify-center border-b bg-white">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link href="/">
            <h1 className="text-xl font-semibold text-gray-900 hover:text-gray-700 cursor-pointer">
              {title}
            </h1>
          </Link>
        </div>
        <div className="flex items-center">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
