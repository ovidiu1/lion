/* eslint-disable import/no-extraneous-dependencies */
module.exports = {
  '*': ['eclint fix', 'git add'],
  '*.js': ['eslint --fix', 'prettier --write', 'git add'],
  '*.md': ['prettier --write', 'markdownlint', 'git add'],
  'yarn.lock': ['node ./scripts/yarn-lock-scan.js'],
  '*package.json': absolutePaths => {
    const sortPackages = [];
    absolutePaths.forEach(p => {
      sortPackages.push(`node ./scripts/sort-package-json.js ${p}`);
    });
    return [...sortPackages, `node ./scripts/lint-versions.js`];
  },
};
