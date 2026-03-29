import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './useAuthStore';

// The auth store delegates everything to Supabase. When Supabase is not
// configured (no env vars in test), the client is null and the store
// initializes to a safe no-op state.

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    session: null,
    loading: true,
    error: null,
  });
});

describe('initialize (no Supabase configured)', () => {
  it('sets loading to false immediately', () => {
    const unsubscribe = useAuthStore.getState().initialize();
    expect(useAuthStore.getState().loading).toBe(false);
    unsubscribe();
  });

  it('returns a no-op unsubscribe function', () => {
    const unsubscribe = useAuthStore.getState().initialize();
    expect(() => unsubscribe()).not.toThrow();
  });
});

describe('signIn (no Supabase configured)', () => {
  it('is a no-op and does not throw', async () => {
    await expect(
      useAuthStore.getState().signIn('a@b.com', 'pw'),
    ).resolves.toBeUndefined();
  });

  it('does not change user state', async () => {
    await useAuthStore.getState().signIn('a@b.com', 'pw');
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe('signUp (no Supabase configured)', () => {
  it('is a no-op and does not throw', async () => {
    await expect(
      useAuthStore.getState().signUp('a@b.com', 'pw'),
    ).resolves.toBeUndefined();
  });
});

describe('signOut (no Supabase configured)', () => {
  it('is a no-op and does not throw', async () => {
    await expect(useAuthStore.getState().signOut()).resolves.toBeUndefined();
  });
});

describe('clearError', () => {
  it('clears the error message', () => {
    useAuthStore.setState({ error: 'Something went wrong' });
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });
});

describe('state shape', () => {
  it('starts with null user and null session', () => {
    const { user, session } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(session).toBeNull();
  });

  it('can be patched directly for testing', () => {
    const fakeUser = { id: 'u1', email: 'test@example.com' };
    useAuthStore.setState({ user: fakeUser as never });
    expect(useAuthStore.getState().user?.email).toBe('test@example.com');
  });
});

describe('console.error is not called for no-op operations', () => {
  it('signIn does not log errors when unconfigured', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await useAuthStore.getState().signIn('a@b.com', 'pw');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
