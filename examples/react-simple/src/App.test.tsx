import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { App, createDi } from "./App";

describe("react-simple example", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("passes the built container through props", async () => {
    const user = userEvent.setup();
    const di = createDi()
      .override({
        clock() {
          return {
            now: () => new Date("2026-06-25T12:00:00.000Z"),
          };
        },
      })
      .build({
        appConfig: {
          title: "Props Only",
        },
      });

    render(<App di={di} />);

    expect(screen.getByRole("heading", { name: "Props Only" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Note"), "Keep DI boring first");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByText("Keep DI boring first")).toBeInTheDocument();
  });

  test("exposes notes store through a sync external store interface", () => {
    const di = createDi()
      .override({
        clock() {
          return {
            now: () => new Date("2026-06-25T12:00:00.000Z"),
          };
        },
      })
      .build({
        appConfig: {
          title: "Props Only",
        },
      });
    const listener = vi.fn<() => void>();

    const unsubscribe = di.notesStore.subscribe(listener);

    di.notesStore.add("Use the store from React");

    expect(listener).toHaveBeenCalledOnce();
    expect(di.notesStore.getSnapshot()).toEqual([
      { id: 1, text: "Use the store from React", createdAt: "2026-06-25T12:00:00.000Z" },
    ]);

    unsubscribe();
    di.notesStore.add("No listener after unsubscribe");

    expect(listener).toHaveBeenCalledOnce();
  });

  test("stores notes with a timestamp from services in the earlier provider layer", () => {
    const firstDi = createDi()
      .override({
        clock() {
          return {
            now: () => new Date("2026-06-25T12:00:00.000Z"),
          };
        },
      })
      .build({
        appConfig: {
          title: "Props Only",
        },
      });

    firstDi.notesStore.add("Use layered providers");

    expect(firstDi.notesStore.getSnapshot()).toEqual([
      { id: 1, text: "Use layered providers", createdAt: "2026-06-25T12:00:00.000Z" },
    ]);

    const secondDi = createDi()
      .override({
        clock() {
          return {
            now: () => new Date("2026-06-25T13:00:00.000Z"),
          };
        },
      })
      .build({
        appConfig: {
          title: "Props Only",
        },
      });

    expect(secondDi.notesStore.getSnapshot()).toEqual(firstDi.notesStore.getSnapshot());
  });
});
