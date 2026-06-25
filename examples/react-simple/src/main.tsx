import { useState } from 'react';
import type { FormEvent } from 'react';
import { createRoot } from 'react-dom/client';

import { dikon } from '../../../dikon.ts';

import './style.css';

interface AppConfig {
  readonly title: string;
}

interface Note {
  readonly id: number;
  readonly text: string;
}

interface NotesStore {
  add(text: string): void;
  list(): readonly Note[];
}

function createNotesStore(): NotesStore {
  let nextId = 1;
  let notes: readonly Note[] = [];

  return {
    add(text) {
      notes = [...notes, { id: nextId, text }];
      nextId += 1;
    },
    list: () => notes,
  };
}

export function createDi() {
  // The simple example keeps DI creation local and passes the built container as a prop.
  return dikon()
    .require<{ appConfig: AppConfig }>()
    .provide({
      notesStore: createNotesStore,
      heading({ appConfig }) {
        return appConfig.title;
      },
    });
}

type AppDi = dikon.Of<ReturnType<typeof createDi>>;

export function App({ di }: { readonly di: AppDi }) {
  const [notes, setNotes] = useState(di.notesStore.list());
  const [text, setText] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextText = text.trim();

    if (nextText.length === 0) {
      return;
    }

    di.notesStore.add(nextText);
    setNotes(di.notesStore.list());
    setText('');
  }

  return (
    <main className='simple-app'>
      <h1>{di.heading}</h1>
      <form onSubmit={submit}>
        <label htmlFor='note'>Note</label>
        <input id='note' value={text} onChange={(event) => setText(event.currentTarget.value)} />
        <button type='submit'>Add</button>
      </form>
      <ul>
        {notes.map((note) => (
          <li key={note.id}>{note.text}</li>
        ))}
      </ul>
    </main>
  );
}

function main() {
  const root = document.getElementById('root');

  if (root === null) {
    return;
  }

  const di = createDi().build({
    appConfig: {
      title: 'Simple Dikon Notes',
    },
  });

  createRoot(root).render(<App di={di} />);
}

main();
