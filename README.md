# emerse

> Press and hold an item to lift it above a blurred page, with a menu next to it.

Keep your finger down and slide onto an option to pick it in one motion, or let
go and tap through the menu afterward. Right-click and the keyboard open it too.

The hard part isn't the animation. It's telling a long press apart from a scroll,
a tap or text selection, keeping the iOS callout and Android context menu out of
the way, and making sure the menu still works for people who can't hold a press.

## Status

Early days. The framework-agnostic core and the React adapter are in place and
can be tried in the playground. Nothing is published yet.

## Usage

```tsx
import { Emerse } from "emerse/react";

<Emerse.Root>
	<Emerse.Trigger>…message…</Emerse.Trigger>
	<Emerse.Overlay className="scrim" />
	<Emerse.Menu className="menu">
		<Emerse.Item onSelect={reply}>Reply</Emerse.Item>
		<Emerse.Item onSelect={copy}>Copy</Emerse.Item>
	</Emerse.Menu>
</Emerse.Root>;
```

| Part             | Renders           | Props                                                                                                                                                     |
| ---------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Emerse.Root`    | nothing           | `onOpenChange(open)`, called when the menu starts opening and closing. `onClosed`, called once it has finished closing. `container`, defaults to the body |
| `Emerse.Trigger` | `div`             | `asChild`, and `clone` to build the lifted copy yourself                                                                                                  |
| `Emerse.Overlay` | `div`, while open | Optional. Without it, outside taps still dismiss the menu but nothing is painted                                                                          |
| `Emerse.Menu`    | `div`, while open | `align`, `"start"` or `"end"`                                                                                                                             |
| `Emerse.Item`    | `button`          | `onSelect`, `disabled`, `asChild`                                                                                                                         |

Every part that renders an element also takes that element's usual props and a
ref. `asChild` puts the behaviour on your own element instead:

```tsx
<Emerse.Item asChild onSelect={open}>
	<a href="/thread">Open thread</a>
</Emerse.Item>;
```

### Removing an item

Unmounting the Root ends the close animation on the spot. To let it finish, note
the pick in `onSelect` and remove the item in `onClosed`:

```tsx
function Message({ remove }: { remove: () => void }) {
	const deleting = useRef(false);
	return (
		<Emerse.Root onClosed={() => deleting.current && remove()}>
			<Emerse.Trigger>…message…</Emerse.Trigger>
			<Emerse.Menu>
				<Emerse.Item onSelect={() => (deleting.current = true)}>
					Delete
				</Emerse.Item>
			</Emerse.Menu>
		</Emerse.Root>
	);
}
```

## Styling

emerse ships no styles, so the blur, the shadow and the menu's look are yours.
These are the hooks:

| Selector                | What it is                                      |
| ----------------------- | ----------------------------------------------- |
| `[data-emerse-overlay]` | The overlay, including the one you don't render |
| `[data-emerse-lifted]`  | The lifted copy of the trigger                  |
| `[data-highlighted]`    | The item under a drag                           |

A starting point. The z-indices only matter if the page has z-indexed content of
its own, and all three need setting together, or the overlay covers the rest.

```css
[data-emerse-overlay] {
	z-index: 60;
	background: rgb(0 0 0 / 0.25);
	-webkit-backdrop-filter: blur(10px);
	backdrop-filter: blur(10px);
}

[data-emerse-lifted] {
	z-index: 61;
	box-shadow: 0 12px 32px rgb(0 0 0 / 0.18);
}

.menu {
	z-index: 62;
	background: white;
	border-radius: 14px;
}

.menu [data-highlighted],
.menu [role="menuitem"]:hover {
	background: #eee;
}
```

## Adapters

| Framework | Import path     | Status        |
| --------- | --------------- | ------------- |
| React     | `emerse/react`  | Not published |
| Vue       | `emerse/vue`    | Coming soon   |
| Svelte    | `emerse/svelte` | Coming soon   |

## Development

```sh
pnpm install
pnpm test               # unit tests
pnpm playground         # playground at localhost:5173
pnpm playground --host  # same, reachable from a phone on your network
```

The playground uses the React adapter, all in one file. Long presses behave
differently on real devices, so it's worth opening it on a phone.

## Contributing

Contributions are welcome. Please open an issue to discuss changes before submitting a pull request.

## License

[MIT](./LICENSE)
