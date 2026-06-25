import { createContext } from 'react';

import type { RootDi } from './createRootDi';

export const RootDiContext = createContext<RootDi>(null!);
