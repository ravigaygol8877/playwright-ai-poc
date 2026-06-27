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
}
