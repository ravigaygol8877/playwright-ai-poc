export type TestCasePriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type TestCaseType     = 'positive' | 'negative' | 'validation' | 'edge-case' | 'security' | 'boundary';

export interface TestCase {
  id:             string;
  title:          string;
  type:           TestCaseType;
  priority:       TestCasePriority;
  preconditions:  string[];
  steps:          string[];
  expectedResult: string;
  /** True for the single fastest, most critical scenario that should run in a smoke suite. */
  isSmoke:        boolean;
}
