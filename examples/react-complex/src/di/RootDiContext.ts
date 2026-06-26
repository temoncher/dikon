import { createContext } from 'react';

import type { RootDi } from './rootDi';

export const RootDiContext = createContext<RootDi>(null!);
