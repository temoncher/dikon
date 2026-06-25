import { useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";

import { dikon } from "../../../dikon.ts";

interface AppConfig {
  readonly title: string;
}

interface Note {
  readonly createdAt: string;
  readonly id: number;
  readonly text: string;
}

interface NotesStore {
  add(text: string): void;
  getSnapshot(): readonly Note[];
  subscribe(listener: () => void): () => void;
}

interface Clock {
  now(): Date;
}

type NotesStorage = Pick<Storage, "getItem" | "setItem">;

const NOTES_STORAGE_KEY = "dikon.react-simple.notes";

function createNotesStore(storage: NotesStorage, clock: Clock): NotesStore {
  let notes = readNotes(storage);
  const listeners = new Set<() => void>();

  return {
    add(text) {
      notes = [
        ...notes,
        {
          createdAt: clock.now().toISOString(),
          id: getNextNoteId(notes),
          text,
        },
      ];
      writeNotes(storage, notes);

      for (const listener of listeners) {
        listener();
      }
    },
    getSnapshot: () => notes,
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function readNotes(storage: NotesStorage): readonly Note[] {
  const value = storage.getItem(NOTES_STORAGE_KEY);

  if (value === null) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    return Array.isArray(parsed) ? parsed.filter(isNote) : [];
  } catch {
    return [];
  }
}

function writeNotes(storage: NotesStorage, notes: readonly Note[]) {
  storage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
}

function isNote(value: unknown): value is Note {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Note).createdAt === "string" &&
    typeof (value as Note).id === "number" &&
    typeof (value as Note).text === "string"
  );
}

function getNextNoteId(notes: readonly Note[]) {
  return Math.max(0, ...notes.map((note) => note.id)) + 1;
}

export function createDi() {
  // The simple example keeps DI creation local and passes the built container as a prop.
  return dikon()
    .require<{ appConfig: AppConfig }>()
    .provide({
      clock() {
        return {
          now: () => new Date(),
        };
      },
      storage() {
        return window.localStorage;
      },
    })
    .provide({
      notesStore({ clock, storage }) {
        return createNotesStore(storage, clock);
      },
    });
}

type AppDi = dikon.Of<ReturnType<typeof createDi>>;

export function App({ di }: { readonly di: AppDi }) {
  const notes = useSyncExternalStore(di.notesStore.subscribe, di.notesStore.getSnapshot);
  const [text, setText] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextText = text.trim();

    if (nextText.length === 0) {
      return;
    }

    di.notesStore.add(nextText);
    setText("");
  }

  return (
    <main className="simple-app">
      <h1>{di.appConfig.title}</h1>
      <form onSubmit={submit}>
        <label htmlFor="note">Note</label>
        <input id="note" value={text} onChange={(event) => setText(event.currentTarget.value)} />
        <button type="submit">Add</button>
      </form>
      <ul>
        {notes.map((note) => (
          <li key={note.id}>{note.text}</li>
        ))}
      </ul>
    </main>
  );
}
