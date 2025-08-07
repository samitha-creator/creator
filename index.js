// server.js

import express from 'express';
import session from 'express-session';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import crypto from 'crypto';
import morgan from 'morgan';

// Constants for our WebAuthn application
const port = 3000;
const relyingPartyId = 'studious-zebra-jjwrx5p544jp2p445-3000.app.github.dev'; // The domain of your application
const relyingPartyName = 'My Awesome App'; // The name of your application
const origin = `https://${relyingPartyId}`; // Full origin URL

// In-memory "database" to store user data and challenges
// For a production app, you would use a real database (e.g., MongoDB, PostgreSQL)
const users = new Map();
const sessions = new Map();

const app = express();
app.use(express.static('public')); // Serve static files from a 'public' directory if you had any
app.use(express.json());
app.use(morgan('dev'));

// Session middleware to store challenges and user info
// This is crucial to prevent replay attacks
app.use(
  session({
    secret: crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in a production environment with HTTPS
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  }),
);

// POST /register-start - Generates registration options
app.post('/register-start', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).send('Username is required.');
  }

  // Create a new user if they don't exist
  if (!users.has(username)) {
    users.set(username, {
      id: crypto.randomUUID(),
      name: username,
      credentials: [],
    });
  }

  const user = users.get(username);
  const options = await generateRegistrationOptions({
    rpName: relyingPartyName,
    rpID: relyingPartyId,
    userName: user.name,
    challenge: crypto.randomBytes(32).toString('hex'), // Create a new challenge for this session
    attestationType: 'none',
    excludeCredentials: user.credentials.map((cred) => ({
      id: cred.credentialID,
      type: 'public-key',
    })),
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
    },
  });

  // Store the challenge in the user's session for later verification
  req.session.currentChallenge = options.challenge;

  res.json(options);
});

// POST /register-finish - Verifies the registration response
app.post('/register-finish', async (req, res) => {
  const { username, attestationResponse } = req.body;
  const user = users.get(username);

  try {
    const verification = await verifyRegistrationResponse({
      response: attestationResponse,
      expectedChallenge: req.session.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: relyingPartyId,
    });

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credential } = registrationInfo;
      const newCredential = {
        credentialID: credential.id,
        credentialPublicKey: Buffer.from(credential.publicKey).toString(
          'base64',
        ),
        counter: credential.counter,
      };

      // Add the new credential to the user's list of credentials
      user.credentials.push(newCredential);
      users.set(username, user);
      console.log(`New credential registered for user: ${username}`);
      console.log(users.get(username));

      // Clear the challenge from the session after use
      delete req.session.currentChallenge;

      return res.json({ verified: true });
    }
  } catch (error) {
    console.error(error);
  }

  return res.json({ verified: false });
});

// POST /login-start - Generates authentication options
app.post('/login-start', async (req, res) => {
  const { username } = req.body;
  const user = users.get(username);
  console.log(users);
  if (!user || user.credentials.length === 0) {
    return res
      .status(404)
      .send({ error: 'User not found or has no passkeys registered.' });
  }

  const options = await generateAuthenticationOptions({
    rpID: relyingPartyId,
    userVerification: 'required',
    allowCredentials: user.credentials.map((cred) => ({
      id: cred.credentialID,
      type: 'public-key',
    })),
  });

  // Store the challenge in the user's session
  req.session.currentChallenge = options.challenge;

  res.json(options);
});

// POST /login-finish - Verifies the authentication response
app.post('/login-finish', async (req, res) => {
  const { username, assertionResponse } = req.body;
  const user = users.get(username);

  try {
    const credential = user.credentials.find(
      (cred) => cred.credentialID === assertionResponse.id,
    );
    if (!credential) {
      return res.status(400).send('Credential not found.');
    }

    const verification = await verifyAuthenticationResponse({
      response: assertionResponse,
      expectedChallenge: req.session.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: relyingPartyId,
      credential: {
        id: credential.credentialID,
        publicKey: credential.credentialPublicKey,
        counter: credential.counter,
      },
    });

    const { verified, authenticationInfo } = verification;

    if (verified) {
      // Update the counter to prevent replay attacks
      credential.counter = authenticationInfo.newCounter;
      users.set(username, user);

      // Clear the challenge from the session
      delete req.session.currentChallenge;

      return res.json({ verified: true });
    }
  } catch (error) {
    console.error(error);
  }

  return res.json({ verified: false });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
