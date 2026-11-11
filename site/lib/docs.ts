export const SECTIONS = [
	{
		title: "Basics",
		pages: [
			{ title: "Getting Started", href: "/docs" },
			{ title: "API", href: "/docs/api" },
		],
	},
	{
		title: "Guides",
		pages: [
			{ title: "Interaction", href: "/docs/interaction" },
			{ title: "Placement", href: "/docs/placement" },
			{ title: "Styling", href: "/docs/styling" },
		],
	},
	{
		title: "Examples",
		pages: [{ title: "Patterns", href: "/docs/examples" }],
	},
];

export const DOCS = SECTIONS.flatMap((section) => section.pages);
