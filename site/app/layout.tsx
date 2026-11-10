import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
	variable: "--font-jetbrains-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: { default: "Emerse", template: "%s · Emerse" },
	description: "A menu that lifts what you press above the page.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html
			lang="en"
			className={`${inter.variable} ${jetbrainsMono.variable}`}
			suppressHydrationWarning
		>
			<body className="flex min-h-dvh flex-col bg-white font-sans text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
				{children}
			</body>
		</html>
	);
}
