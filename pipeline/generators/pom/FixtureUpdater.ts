/**
 * FixtureUpdater — no-op stub.
 *
 * In the enterprise pattern, POMs are NOT registered in fixtures.
 * Page Objects are instantiated directly in each spec's beforeEach.
 * This file is kept only for import compatibility.
 */

export interface FixtureEntry {
  className:     string;
  fileName:      string;
  fixtureKey:    string;
  dataInterface: string;
  dataVarName:   string;
  dataFileName:  string;
}

export class FixtureUpdater {
  update(_fixturesPath: string, _entry: FixtureEntry): boolean {
    return false;
  }
}

export function classNameToFixtureKey(className: string): string {
  return className.charAt(0).toLowerCase() + className.slice(1);
}
