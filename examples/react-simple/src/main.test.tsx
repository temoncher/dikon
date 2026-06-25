import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';

import { App, createDi } from './main';

describe('react-simple example', () => {
  test('passes the built container through props', async () => {
    const di = createDi().build({
      appConfig: {
        title: 'Props Only',
      },
    });

    render(<App di={di} />);

    expect(screen.getByRole('heading', { name: 'Props Only' })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Note'), 'Keep DI boring first');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Keep DI boring first')).toBeInTheDocument();
  });
});
