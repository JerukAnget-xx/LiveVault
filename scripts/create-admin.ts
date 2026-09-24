import { stdin, stdout } from 'node:process';
import { createInterface, emitKeypressEvents } from 'node:readline';

import { config } from 'dotenv';
import { z } from 'zod';

config({ path: '.env.local', quiet: true });

const displayNameSchema = z.string().trim().min(1).max(100);
const emailSchema = z.email().max(320);
const passwordSchema = z.string().min(8).max(128);

class InputCancelledError extends Error {}

function promptHidden(label: string): Promise<string> {
  return new Promise((resolve, reject) => {
    emitKeypressEvents(stdin);

    const wasRaw = stdin.isRaw;
    let value = '';

    const finish = () => {
      stdin.off('keypress', onKeypress);
      stdin.setRawMode(wasRaw);
      stdin.pause();
      stdout.write('\n');
    };

    const onKeypress = (
      character: string,
      key: { ctrl?: boolean; meta?: boolean; name?: string },
    ) => {
      if (key.ctrl && (key.name === 'c' || key.name === 'd')) {
        finish();
        reject(new InputCancelledError());
        return;
      }

      if (key.name === 'return' || key.name === 'enter') {
        finish();
        resolve(value);
        return;
      }

      if (key.name === 'backspace') {
        if (value.length > 0) {
          value = value.slice(0, -1);
          stdout.write('\b \b');
        }
        return;
      }

      if (
        character &&
        !key.ctrl &&
        !key.meta &&
        key.name !== 'escape' &&
        key.name !== 'tab'
      ) {
        value += character;
        stdout.write('*');
      }
    };

    stdout.write(label);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('keypress', onKeypress);
  });
}

async function collectCredentials() {
  const prompts = createInterface({ input: stdin, output: stdout });
  let rawDisplayName: string;
  let rawEmail: string;

  try {
    rawDisplayName = await new Promise((resolve) =>
      prompts.question('Display name: ', resolve),
    );
    rawEmail = await new Promise((resolve) =>
      prompts.question('Email: ', resolve),
    );
  } finally {
    prompts.close();
  }

  const displayName = displayNameSchema.safeParse(rawDisplayName);
  if (!displayName.success) {
    throw new Error('INVALID_DISPLAY_NAME');
  }

  const email = emailSchema.safeParse(rawEmail.trim().toLowerCase());
  if (!email.success) {
    throw new Error('INVALID_EMAIL');
  }

  const password = await promptHidden('Password: ');
  const validPassword = passwordSchema.safeParse(password);
  if (!validPassword.success) {
    throw new Error('INVALID_PASSWORD');
  }

  const passwordConfirmation = await promptHidden('Confirm password: ');
  if (password !== passwordConfirmation) {
    throw new Error('PASSWORD_MISMATCH');
  }

  return {
    name: displayName.data,
    email: email.data,
    password: validPassword.data,
  };
}

async function createAdmin(): Promise<number> {
  if (!stdin.isTTY || !stdout.isTTY) {
    console.error('Admin creation requires an interactive command line.');
    return 1;
  }

  const [{ db, databasePool }, { user }] = await Promise.all([
    import('@/db'),
    import('@/db/schema/auth'),
  ]);

  try {
    const existingUsers = await db.select({ id: user.id }).from(user).limit(1);

    if (existingUsers.length > 0) {
      console.error(
        'Admin creation refused: a Live.Vault administrator already exists.',
      );
      return 1;
    }

    const credentials = await collectCredentials();
    const { auth } = await import('@/lib/auth');
    const result = await auth.api.signUpEmail({
      body: {
        name: credentials.name,
        email: credentials.email,
        password: credentials.password,
        rememberMe: false,
      },
    });

    console.log(`Administrator created successfully for ${result.user.email}.`);
    return 0;
  } finally {
    await databasePool.end();
  }
}

try {
  process.exitCode = await createAdmin();
} catch (error) {
  if (error instanceof InputCancelledError) {
    console.error('Admin creation cancelled.');
  } else if (
    error instanceof Error &&
    error.message === 'INVALID_DISPLAY_NAME'
  ) {
    console.error(
      'Admin creation failed: display name must be 1–100 characters.',
    );
  } else if (error instanceof Error && error.message === 'INVALID_EMAIL') {
    console.error('Admin creation failed: enter a valid email address.');
  } else if (error instanceof Error && error.message === 'INVALID_PASSWORD') {
    console.error('Admin creation failed: password must be 8–128 characters.');
  } else if (error instanceof Error && error.message === 'PASSWORD_MISMATCH') {
    console.error('Admin creation failed: passwords do not match.');
  } else {
    console.error(
      'Admin creation failed. Verify the environment and database connection.',
    );
  }

  process.exitCode = 1;
}
