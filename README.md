# emerse

> Press and hold an item to lift it above a blurred page, with a menu next to it.

Keep your finger down and slide onto an option to pick it in one motion, or let
go and tap through the menu afterward. Right-click and the keyboard open it too.

The hard part isn't the animation. It's telling a long press apart from a scroll,
a tap or text selection, keeping the iOS callout and Android context menu out of
the way, and making sure the menu still works for people who can't hold a press.

## Status

Early days. The framework-agnostic core is in place and can be tried in the
playground. The React adapter comes next, and nothing is published yet.

This is the API it's heading for:

```tsx
<Emerse.Root>
	<Emerse.Trigger>…message…</Emerse.Trigger>
	<Emerse.Menu>
		<Emerse.Item onSelect={reply}>Reply</Emerse.Item>
		<Emerse.Item onSelect={copy}>Copy</Emerse.Item>
	</Emerse.Menu>
</Emerse.Root>;
```

## Adapters

| Framework | Import path     | Status      |
| --------- | --------------- | ----------- |
| React     | `emerse/react`  | In progress |
| Vue       | `emerse/vue`    | Coming soon |
| Svelte    | `emerse/svelte` | Coming soon |

## Development

```sh
pnpm install
pnpm test               # unit tests
pnpm playground         # playground at localhost:5173
pnpm playground --host  # same, reachable from a phone on your network
```

The playground drives the core directly from React, all in one file. Long presses
behave differently on real devices, so it's worth opening it on a phone.

## Contributing

Contributions are welcome. Please open an issue to discuss changes before submitting a pull request.

## License

[MIT](./LICENSE)
