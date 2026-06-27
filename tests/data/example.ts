// Template for page data files — copy and adapt for each new page under test
export interface ExamplePageData {
  validEmail: string;
  validPassword: string;
  invalidEmail: string;
  validUsername: string;
}

export const examplePageData: ExamplePageData = {
  validEmail: 'test@example.com',
  validPassword: 'Test@1234',
  invalidEmail: 'not-an-email',
  validUsername: 'testuser',
};
