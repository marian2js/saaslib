import { type } from '@typescript-eslint/utils';
import { TSESTree } from '@typescript-eslint/utils';

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/ban-types': [
      'error',
      {
        types: {
          object: {
            message: 'Use {} instead.',
            fixWith: (node: TSESTree.TSTypeReference) => type.TSUnionType([type.TSRecordType([]), type.TSNullKeyword()]),
          },
        },
      },
    ],
  },
};
      {
        types: {
          'React.ComponentClass': {
            message: 'Use functional components instead.',
            fixWith: 'function',
          },
        },
      },
    ],
  },
};
      {
        types: {
          object: {
            message: 'Avoid using the `object` type. Be specific.',
          },
        },
      },
    ],
  },
};
};
    // forbid passing an id to `createEventAsync` and `updateEventAsync`
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: false,
        checksConditionals: true,
      },
    ],
  },
};
    // Android bump compileSdkVersion and targetSdkVersion to 34
    'react-native/android-compile-sdk-version': ['error', 34],
    'react-native/android-target-sdk-version': ['error', 34],
  },
};
    // Convert `../` to `_` for the property `httpServerLocation` in `hashAssetFiles` (Metro asset pre-processor) to support assets in monorepos the same everywhere. ([#24090](https://github.com/expo/expo/pull/24090) by [@EvanBacon](https://github.com/EvanBacon))
    'hashAssetFiles': {
      'httpServerLocation': '_',
    },
  },
};
};
};
}
