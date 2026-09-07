import { RequestHandler } from 'express';
import { createOAuthState, exchangeGoogleCode, getGoogleAuthorizationUrl } from './google.provider.js';
import { authenticateGoogleUser, loginUser, logoutUser, registerUser } from './auth.service.js';
import type { LoginInput, RegisterInput } from './auth.validation.js';
import { AppError } from '../../middleware/error.middleware.js';
import { env } from '../../config/env.js';

const oauthStateCookie = 'intervue_oauth_state';
const oauthRoleCookie = 'intervue_oauth_role';
const authCookie = 'intervue_auth';

export const register: RequestHandler = async (request, response, next) => {
  try {
    const user = await registerUser(request.body as RegisterInput);
    response.status(201).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (request, response, next) => {
  try {
    const result = await loginUser(request.body as LoginInput);
    response.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const logout: RequestHandler = (_request, response, next) => {
  try {
    logoutUser();
    response.clearCookie(authCookie, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
    });
    response.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (error) {
    next(error);
  }
};

export const startGoogleAuth: RequestHandler = (request, response, next) => {
  try {
    const state = createOAuthState();
    const requestedRole = request.query.role === 'interviewer' || request.query.role === 'candidate'
      ? request.query.role
      : undefined;
    response.cookie(oauthStateCookie, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000,
    });
    if (requestedRole) {
      response.cookie(oauthRoleCookie, requestedRole, {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
        maxAge: 10 * 60 * 1000,
      });
    }
    response.redirect(getGoogleAuthorizationUrl(state));
  } catch (error) {
    next(error);
  }
};

export const googleCallback: RequestHandler = async (request, response, next) => {
  try {
    const queryError = typeof request.query.error === 'string' ? request.query.error : undefined;
    const code = typeof request.query.code === 'string' ? request.query.code : undefined;
    const state = typeof request.query.state === 'string' ? request.query.state : undefined;
    const storedState = request.cookies?.[oauthStateCookie];
    const requestedRole = request.cookies?.[oauthRoleCookie] === 'interviewer' ? 'interviewer' : 'candidate';

    response.clearCookie(oauthStateCookie, { httpOnly: true, sameSite: 'lax', secure: env.NODE_ENV === 'production' });
    response.clearCookie(oauthRoleCookie, { httpOnly: true, sameSite: 'lax', secure: env.NODE_ENV === 'production' });

    if (queryError || !code || !state || !storedState || state !== storedState) {
      throw new AppError(401, 'OAUTH_FAILED', 'Google authentication failed');
    }

    const identity = await exchangeGoogleCode(code);
    const result = await authenticateGoogleUser(identity, requestedRole);

    response.cookie(authCookie, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
    });
    response.redirect(env.CORS_ORIGIN);
  } catch (error) {
    next(error);
  }
};
