# Repository Guidance

## Testing

Write tests for behavior that should break if the system regresses. Prefer tests that exercise a
user-visible flow, a public library contract, data transformation, lifecycle behavior, or a bug that
actually happened.

Avoid tests that only assert the current implementation shape. In particular, do not add tests just
to prove that a component receives a prop instead of using context, a factory forwards one config
field, a tiny wrapper returns a provided value, or a DI module can be overridden when that behavior is
already covered by Dikon itself. If a test would keep passing only because it mirrors the current
code structure rather than protecting meaningful behavior, delete it or fold the assertion into a
higher-value test.

Example apps should be especially low-ceremony: route stories and component tests can pass plain
object-shaped dependencies instead of building app-level DI unless the app shell itself is under
test.
