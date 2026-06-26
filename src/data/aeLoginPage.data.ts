export interface AeLoginPageData {
  validLoginEmail: string;
  validLoginPassword: string;
  invalidLoginEmail: string;
  invalidLoginPassword: string;
  validSignupName: string;
  validSignupEmail: string;
  invalidSignupEmail: string;
  validSubscribeEmail: string;
  subscriptionSuccessMessage: string;
  successfulLoginRedirectPattern: RegExp;
}

export const aeLoginPageData: AeLoginPageData = {
  validLoginEmail: "testuser@example.com",
  validLoginPassword: "SecurePass123!",
  invalidLoginEmail: "wrongemail@example.com",
  invalidLoginPassword: "WrongPass",
  validSignupName: "Jane Doe",
  validSignupEmail: "newuser@example.com",
  invalidSignupEmail: "taken@example.com",
  validSubscribeEmail: "subscriber@example.com",
  subscriptionSuccessMessage: "You have been successfully subscribed!",
  successfulLoginRedirectPattern: /\/profile\//,
};
