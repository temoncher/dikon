# React Simple Example

This example is the smallest useful React shape for Dikon.

It intentionally avoids React context, route containers, reusable pipe helpers, and lazy loading.
The app creates one root container in `main()`, then passes the built container to `App` as a prop.
That keeps the dependency flow visible and makes this example a good starting point before looking at
`react-complex`.

## What It Shows

- `createDi()` declares one required build value: `appConfig`.
- Provider layers create storage and clock services first, then build a tiny notes store from them.
- React owns rendering and form state.
- Dikon owns long-lived app services.
- The built DI object is passed explicitly through props.

## Run It

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
```

## Files To Read

- `src/App.tsx` contains the app, DI setup, and notes store.
- `src/main.tsx` mounts the app in the browser.
- `src/App.test.tsx` verifies the app can render with a test-built container.
