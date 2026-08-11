import { privateAPi } from './private';
import { publicApi } from './public';

export const serviceReducers = {
  [publicApi.reducerPath]: publicApi.reducer,
  [privateAPi.reducerPath]: privateAPi.reducer,
};

export const serviceMiddlewares = [publicApi.middleware, privateAPi.middleware];
