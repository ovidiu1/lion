const { expect } = require('chai');
const { providence } = require('../../../src/program/providence.js');
const { QueryService } = require('../../../src/program/services/QueryService.js');
const { InputDataService } = require('../../../src/program/services/InputDataService.js');
const FindExportsAnalyzer = require('../../../src/program/analyzers/find-exports.js');
const FindImportsAnalyzer = require('../../../src/program/analyzers/find-imports.js');

const {
  mockTargetAndReferenceProject,
  restoreMockedProjects,
} = require('../../../test-helpers/mock-project-helpers.js');
const {
  mockWriteToJson,
  restoreWriteToJson,
} = require('../../../test-helpers/mock-report-service-helpers.js');
const {
  suppressNonCriticalLogs,
  restoreSuppressNonCriticalLogs,
} = require('../../../test-helpers/mock-log-service-helpers.js');

const matchImportsQueryConfig = QueryService.getQueryConfigFromAnalyzer('match-imports');
const _providenceCfg = {
  targetProjectPaths: ['/importing/target/project'],
  referenceProjectPaths: ['/exporting/ref/project'],
};

// 1. Reference input data
const referenceProject = {
  path: '/exporting/ref/project',
  name: 'exporting-ref-project',
  files: [
    // This file contains all 'original' exported definitions
    {
      file: './ref-src/core.js',
      code: `
        // named specifier
        export class RefClass extends HTMLElement {};

        // default specifier
        export default class OtherClass {};
      `,
    },
    // This file is used to test file system 'resolvements' -> importing repos using
    // `import 'exporting-ref-project/ref-src/folder'` should be pointed to this index.js file
    {
      file: './ref-src/folder/index.js',
      code: `
        // this file (and thus this export) should be resolved via
        // [import 'exporting-ref-project/ref-src/folder']
        export const resolvePathCorrect = null;
      `,
    },
    {
      file: './ref-component.js',
      code: `
        // global effects
        import { RefClass } from './ref-src/core.js';
        customElements.define('ref-component', RefClass);
      `,
    },
    {
      file: './not-imported.js',
      code: `
        // this file will not be included by "importing-target-project" defined below
        export const notImported = null;
      `,
    },
    // This file re-exports everything from 'ref-src/core.js'
    {
      file: './index.js',
      // Default export, renamed export
      // export default class X
      code: `
        // re-exported specifier
        export { RefClass } from './ref-src/core.js';

        // renamed re-exported specifier
        export { RefClass as RefRenamedClass } from './ref-src/core.js';

        // re-exported default specifier
        import refConstImported from './ref-src/core.js';
        export default refConstImported;
      `,
    },
    {
      file: './export-namespaced.js',
      code: `
      // This file will test if all its exported specifiers are catched via "import * as"
      // (namespaced)
      export const a = 4;
      export default class B {};
    `,
    },
  ],
};

const searchTargetProject = {
  path: '/importing/target/project',
  name: 'importing-target-project',
  files: [
    {
      file: './target-src/indirect-imports.js',
      code: `
      // named import (indirect, needs transitivity check)
      import { RefClass } from 'exporting-ref-project';

      // renamed import (indirect, needs transitivity check)
      import { RefRenamedClass } from 'exporting-ref-project';

      // default (indirect, needs transitivity check)
      import refConstImported from 'exporting-ref-project';

      // should not be found
      import { nonMatched } from 'unknown-project';
    `,
    },
    {
      file: './target-src/direct-imports.js',
      code: `
      // a direct named import
      import { RefClass } from 'exporting-ref-project/ref-src/core.js';

      // a direct default import
      import refConst from 'exporting-ref-project/ref-src/core.js';

      // should not be found
      import { nonMatched } from 'unknown-project/xyz.js';

      /**
       * Examples below should be resolved to the proper filepath (filename + extension)
       * (direct or indirect is not relevant in this case, it is about the source and not the
       * specifier)
       */

      // Two things:
      // - a file with side effects
      // - should resolve "as file", to 'exporting-ref-project/ref-component.js'
      import 'exporting-ref-project/ref-component';

      // - should resolve "as folder", to 'exporting-ref-project/ref-src/folder/index.js'
      import { resolvePathCorrect } from 'exporting-ref-project/ref-src/folder';
    `,
    },
    {
      file: './import-namespaced.js',
      code: `
      // should return a match for every export in reference source
      import * as namespace from 'exporting-ref-project/export-namespaced.js';
      `,
    },

    /**
     * Possible other checks (although already tested in unit tests of find-import/find-exports):
     * - dynamic imports
     * - default and named specifiers in one declaration
     * - renamed imports
     * - ...?
     */
  ],
};

// 2. Based on the example reference and target projects, we expect the following
// extracted specifiers to be found...
const expectedExportIdsIndirect = [
  'RefClass::./index.js::exporting-ref-project',
  'RefRenamedClass::./index.js::exporting-ref-project',
  '[default]::./index.js::exporting-ref-project',
];

const expectedExportIdsDirect = [
  'RefClass::./ref-src/core.js::exporting-ref-project',
  '[default]::./ref-src/core.js::exporting-ref-project',
  'resolvePathCorrect::./ref-src/folder/index.js::exporting-ref-project',
];

const expectedExportIdsNamespaced = [
  'a::./export-namespaced.js::exporting-ref-project',
  '[default]::./export-namespaced.js::exporting-ref-project',
];

// eslint-disable-next-line no-unused-vars
const expectedExportIds = [
  ...expectedExportIdsIndirect,
  ...expectedExportIdsDirect,
  ...expectedExportIdsNamespaced,
];

// 3. The AnalyzerResult generated by "match-imports"
// eslint-disable-next-line no-unused-vars
const expectedMatchesOutput = [
  {
    exportSpecifier: {
      name: 'RefClass',
      project: 'exporting-ref-project', // name under which it is registered in npm ("name" attr in package.json)
      filePath: './ref-src/core.js',
      id: 'RefClass::./ref-src/core.js::exporting-ref-project',
    },
    // All the matched targets (files importing the specifier), ordered per project
    matchesPerProject: [
      {
        project: 'importing-target-project',
        files: [
          './target-src/indirect-imports.js',
          // ...
        ],
      },
      // ...
    ],
  },
];

describe('Analyzer "match-imports"', () => {
  const originalReferenceProjectPaths = InputDataService.referenceProjectPaths;
  const queryResults = [];

  const cacheDisabledInitialValue = QueryService.cacheDisabled;

  before(() => {
    QueryService.cacheDisabled = true;
    suppressNonCriticalLogs();
  });

  after(() => {
    QueryService.cacheDisabled = cacheDisabledInitialValue;
    restoreSuppressNonCriticalLogs();
  });

  beforeEach(() => {
    mockWriteToJson(queryResults);
    InputDataService.referenceProjectPaths = [];
  });

  afterEach(() => {
    InputDataService.referenceProjectPaths = originalReferenceProjectPaths;
    restoreWriteToJson(queryResults);
    restoreMockedProjects();
  });

  function testMatchedEntry(targetExportedId, queryResult, importedByFiles = []) {
    const matchedEntry = queryResult.queryOutput.find(
      r => r.exportSpecifier.id === targetExportedId,
    );

    const [name, filePath, project] = targetExportedId.split('::');
    expect(matchedEntry.exportSpecifier).to.eql({
      name,
      filePath,
      project,
      id: targetExportedId,
    });
    expect(matchedEntry.matchesPerProject[0].project).to.equal('importing-target-project');
    expect(matchedEntry.matchesPerProject[0].files).to.eql(importedByFiles);
  }

  describe('Extracting exports', () => {
    it(`identifies all direct export specifiers consumed by "importing-target-project"`, async () => {
      mockTargetAndReferenceProject(searchTargetProject, referenceProject);
      await providence(matchImportsQueryConfig, _providenceCfg);
      const queryResult = queryResults[0];
      expectedExportIdsDirect.forEach(directId => {
        expect(
          queryResult.queryOutput.find(
            exportMatchResult => exportMatchResult.exportSpecifier.id === directId,
          ),
        ).not.to.equal(undefined, `id '${directId}' not found`);
      });
    });

    it(`identifies all indirect export specifiers consumed by "importing-target-project"`, async () => {
      mockTargetAndReferenceProject(searchTargetProject, referenceProject);
      await providence(matchImportsQueryConfig, _providenceCfg);
      const queryResult = queryResults[0];
      expectedExportIdsIndirect.forEach(indirectId => {
        expect(
          queryResult.queryOutput.find(
            exportMatchResult => exportMatchResult.exportSpecifier.id === indirectId,
          ),
        ).not.to.equal(undefined, `id '${indirectId}' not found`);
      });
    });

    it(`matches namespaced specifiers consumed by "importing-target-project"`, async () => {
      mockTargetAndReferenceProject(searchTargetProject, referenceProject);
      await providence(matchImportsQueryConfig, _providenceCfg);
      const queryResult = queryResults[0];
      expectedExportIdsNamespaced.forEach(exportedSpecifierId => {
        expect(
          queryResult.queryOutput.find(
            exportMatchResult => exportMatchResult.exportSpecifier.id === exportedSpecifierId,
          ),
        ).not.to.equal(undefined, `id '${exportedSpecifierId}' not found`);
      });
    });
  });

  describe('Matching', () => {
    it(`produces a list of all matches, sorted by project`, async () => {
      mockTargetAndReferenceProject(searchTargetProject, referenceProject);
      await providence(matchImportsQueryConfig, _providenceCfg);
      const queryResult = queryResults[0];

      expectedExportIdsDirect.forEach(targetId => {
        testMatchedEntry(targetId, queryResult, ['./target-src/direct-imports.js']);
      });

      expectedExportIdsIndirect.forEach(targetId => {
        testMatchedEntry(targetId, queryResult, ['./target-src/indirect-imports.js']);
      });
    });
  });

  describe('Configuration', () => {
    it(`allows to provide results of FindExportsAnalyzer and FindImportsAnalyzer`, async () => {
      mockTargetAndReferenceProject(searchTargetProject, referenceProject);
      const importsAnalyzerResult = await new FindImportsAnalyzer().execute({
        targetProjectPath: searchTargetProject.path,
      });
      const exportsAnalyzerResult = await new FindExportsAnalyzer().execute({
        targetProjectPath: referenceProject.path,
      });
      await providence(matchImportsQueryConfig, {
        ..._providenceCfg,
        importsAnalyzerResult,
        exportsAnalyzerResult,
      });
      const queryResult = queryResults[0];

      expectedExportIdsDirect.forEach(targetId => {
        testMatchedEntry(targetId, queryResult, ['./target-src/direct-imports.js']);
      });

      expectedExportIdsIndirect.forEach(targetId => {
        testMatchedEntry(targetId, queryResult, ['./target-src/indirect-imports.js']);
      });
    });
  });
});
