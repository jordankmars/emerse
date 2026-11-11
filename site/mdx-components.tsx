import type { MDXComponents } from "mdx/types";
import type { ReactElement } from "react";
import { CodeBlock } from "@/components/code-block";
import { Install } from "@/components/install";
import { external } from "@/lib/links";

type Fence = ReactElement<{
	children: ReactElement<{ className?: string; children: string }>;
}>;

/** MDX hands over <pre><code class="language-x">source</code></pre>. */
function fenced(pre: Fence["props"]) {
	const { className, children } = pre.children.props;
	return {
		code: children,
		lang: className?.replace("language-", "") ?? "text",
	};
}

/** A fenced code block with its filename above it. */
function CodeFile({ name, children }: { name: string; children: Fence }) {
	return <CodeBlock {...fenced(children.props)} filename={name} />;
}

const components: MDXComponents = {
	CodeFile,
	Install,
	h1: (props) => (
		<h1 className="mb-4 text-3xl font-semibold tracking-tight" {...props} />
	),
	h2: (props) => (
		<h2
			className="mt-10 mb-3 text-xl font-semibold tracking-tight"
			{...props}
		/>
	),
	p: (props) => (
		<p
			className="my-4 leading-7 text-neutral-600 dark:text-neutral-300"
			{...props}
		/>
	),
	a: (props) => (
		<a
			{...(/^https?:\/\//.test(props.href ?? "") ? external : {})}
			className="font-medium underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900 dark:decoration-neutral-700 dark:hover:decoration-neutral-100"
			{...props}
		/>
	),
	ul: (props) => (
		<ul
			className="my-4 list-disc space-y-1 pl-6 text-neutral-600 dark:text-neutral-300"
			{...props}
		/>
	),
	code: (props) => (
		<code
			className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.875em] dark:bg-neutral-800"
			{...props}
		/>
	),
	pre: (props) => <CodeBlock {...fenced(props as Fence["props"])} />,
};

export function useMDXComponents(): MDXComponents {
	return components;
}
