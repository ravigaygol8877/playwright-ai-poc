const ENV = process.env['ENVIRONMENT'] || 'qa';

export function getApiConfig() {
    const baseURL = process.env['API_BASE_URL'] || '';
    return {
        baseURL,
        loginURL: `${baseURL}/log-in`,
    };
}

export function getUserCredentials(): { email: string; password: string } {
    const email    = process.env[`${ENV.toUpperCase()}_USER_EMAIL`] || '';
    const password = process.env[`${ENV.toUpperCase()}_USER_PASS`]  || '';
    if (!email || !password) {
        throw new Error(`Missing credentials for environment: ${ENV}`);
    }
    return { email, password };
}

export function getEnvironment(): string {
    return ENV;
}
