import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default {
  resolve: {
    alias: {
      'iteratio/src/__test__': path.resolve(__dirname, 'src/__mocks__/iteratio-test.ts'),
      'iteratio': path.resolve(__dirname, 'src/__mocks__/iteratio.ts'),
      'inversify': path.resolve(__dirname, 'src/__mocks__/inversify.ts'),
    },
  },
  test: {
    globals: false,
  },
};
