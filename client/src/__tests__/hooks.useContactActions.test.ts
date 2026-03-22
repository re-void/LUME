// @vitest-environment jsdom
/**
 * Tests for hooks/useContactActions.ts
 * Mocks: router, stores, authApi, saveContacts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Hoisted state ─────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  addContact: vi.fn(),
  addChat: vi.fn(),
  setActiveChat: vi.fn(),
  getUser: vi.fn(),
  saveContacts: vi.fn().mockResolvedValue(undefined),
  contacts: [] as unknown[],
  authUsername: 'alice',
  authMasterKey: new Uint8Array(32).fill(1) as Uint8Array | null,
  authIdentityKeys: { signing: { publicKey: 'mock-pk', secretKey: new Uint8Array(64) }, exchange: { publicKey: 'mock-epk', secretKey: new Uint8Array(32) } } as Record<string, unknown> | null,
  existingChats: [] as unknown[],
}));

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/stores', () => {
  const useContactsStore = (selector?: (s: unknown) => unknown) => {
    const state = { contacts: mocks.contacts, addContact: mocks.addContact };
    return selector ? selector(state) : state;
  };
  useContactsStore.getState = () => ({ contacts: mocks.contacts });

  const useChatsStore = (selector?: (s: unknown) => unknown) => {
    const state = { chats: mocks.existingChats, addChat: mocks.addChat, setActiveChat: mocks.setActiveChat };
    return selector ? selector(state) : state;
  };
  useChatsStore.getState = () => ({ chats: mocks.existingChats });

  const useAuthStore = (selector?: (s: unknown) => unknown) => {
    const state = { username: mocks.authUsername, masterKey: mocks.authMasterKey, identityKeys: mocks.authIdentityKeys };
    return selector ? selector(state) : state;
  };

  return { useAuthStore, useContactsStore, useChatsStore };
});

vi.mock('@/lib/api', () => ({
  authApi: { getUser: mocks.getUser },
}));

vi.mock('@/crypto/storage', () => ({
  saveContacts: mocks.saveContacts,
}));

vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { useContactActions } from '@/hooks/useContactActions';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useContactActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.contacts = [];
    mocks.existingChats = [];
    mocks.authUsername = 'alice';
    mocks.authMasterKey = new Uint8Array(32).fill(1);
    mocks.authIdentityKeys = { signing: { publicKey: 'mock-pk', secretKey: new Uint8Array(64) }, exchange: { publicKey: 'mock-epk', secretKey: new Uint8Array(32) } };
    mocks.saveContacts.mockResolvedValue(undefined);
  });

  // ── initial state ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('showAddContact starts as false', () => {
      const { result } = renderHook(() => useContactActions());
      expect(result.current.showAddContact).toBe(false);
    });

    it('newContactUsername starts as empty string', () => {
      const { result } = renderHook(() => useContactActions());
      expect(result.current.newContactUsername).toBe('');
    });

    it('addContactError starts as empty string', () => {
      const { result } = renderHook(() => useContactActions());
      expect(result.current.addContactError).toBe('');
    });

    it('addContactLoading starts as false', () => {
      const { result } = renderHook(() => useContactActions());
      expect(result.current.addContactLoading).toBe(false);
    });
  });

  // ── resetAddContact ────────────────────────────────────────────────────────

  describe('resetAddContact', () => {
    it('resets showAddContact, username input, and error', () => {
      const { result } = renderHook(() => useContactActions());

      act(() => {
        result.current.setShowAddContact(true);
        result.current.setNewContactUsername('bob');
      });

      act(() => {
        result.current.resetAddContact();
      });

      expect(result.current.showAddContact).toBe(false);
      expect(result.current.newContactUsername).toBe('');
      expect(result.current.addContactError).toBe('');
    });
  });

  // ── handleAddContact — happy path ──────────────────────────────────────────

  describe('handleAddContact — happy path', () => {
    it('fetches user, calls addContact, saves contacts, navigates to chat', async () => {
      const newUser = {
        id: 'bob-id',
        username: 'bob',
        identityKey: 'pubkey-bob',
        exchangeIdentityKey: 'exchkey-bob',
        exchangeKey: null,
        signedPrekey: null,
      };
      mocks.getUser.mockResolvedValue({ data: newUser, error: null });

      const { result } = renderHook(() => useContactActions());
      act(() => result.current.setNewContactUsername('bob'));

      await act(async () => {
        await result.current.handleAddContact();
      });

      expect(mocks.getUser).toHaveBeenCalledWith('bob', mocks.authIdentityKeys);
      expect(mocks.addContact).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'bob-id', username: 'bob' })
      );
      expect(mocks.saveContacts).toHaveBeenCalled();
      expect(mocks.push).toHaveBeenCalledWith(expect.stringContaining('/chat/'));
    });

    it('resets the form after successful add', async () => {
      mocks.getUser.mockResolvedValue({
        data: { id: 'bob-id', username: 'bob', identityKey: 'pk', exchangeIdentityKey: 'ek' },
        error: null,
      });

      const { result } = renderHook(() => useContactActions());
      act(() => {
        result.current.setShowAddContact(true);
        result.current.setNewContactUsername('bob');
      });

      await act(async () => {
        await result.current.handleAddContact();
      });

      expect(result.current.showAddContact).toBe(false);
      expect(result.current.newContactUsername).toBe('');
    });

    it('uses exchangeKey fallback when exchangeIdentityKey is absent', async () => {
      mocks.getUser.mockResolvedValue({
        data: { id: 'carol-id', username: 'carol', identityKey: 'pk', exchangeKey: 'ek-fallback' },
        error: null,
      });

      const { result } = renderHook(() => useContactActions());
      act(() => result.current.setNewContactUsername('carol'));

      await act(async () => {
        await result.current.handleAddContact();
      });

      expect(mocks.addContact).toHaveBeenCalledWith(
        expect.objectContaining({ exchangeKey: 'ek-fallback' })
      );
    });
  });

  // ── handleAddContact — error cases ─────────────────────────────────────────

  describe('handleAddContact — error cases', () => {
    it('sets "User not found" when API returns error', async () => {
      mocks.getUser.mockResolvedValue({ data: null, error: 'not found' });

      const { result } = renderHook(() => useContactActions());
      act(() => result.current.setNewContactUsername('ghost'));

      await act(async () => {
        await result.current.handleAddContact();
      });

      expect(result.current.addContactError).toBe('User not found');
      expect(mocks.addContact).not.toHaveBeenCalled();
    });

    it('sets "Cannot add yourself" when trying to add own username', async () => {
      mocks.getUser.mockResolvedValue({
        data: { id: 'alice-id', username: 'alice', identityKey: 'pk', exchangeIdentityKey: 'ek' },
        error: null,
      });

      const { result } = renderHook(() => useContactActions());
      act(() => result.current.setNewContactUsername('alice'));

      await act(async () => {
        await result.current.handleAddContact();
      });

      expect(result.current.addContactError).toBe('Cannot add yourself');
      expect(mocks.addContact).not.toHaveBeenCalled();
    });

    it('sets "Contact already added" for duplicate contact', async () => {
      mocks.contacts = [{ id: 'bob-id', username: 'bob' }];
      mocks.getUser.mockResolvedValue({
        data: { id: 'bob-id', username: 'bob', identityKey: 'pk', exchangeIdentityKey: 'ek' },
        error: null,
      });

      const { result } = renderHook(() => useContactActions());
      act(() => result.current.setNewContactUsername('bob'));

      await act(async () => {
        await result.current.handleAddContact();
      });

      expect(result.current.addContactError).toBe('Contact already added');
      expect(mocks.addContact).not.toHaveBeenCalled();
    });

    it('sets "Not authenticated" when identityKeys is null', async () => {
      mocks.authIdentityKeys = null;

      const { result } = renderHook(() => useContactActions());
      act(() => result.current.setNewContactUsername('bob'));

      await act(async () => {
        await result.current.handleAddContact();
      });

      expect(result.current.addContactError).toBe('Not authenticated');
      expect(mocks.getUser).not.toHaveBeenCalled();
    });

    it('sets "Error adding contact" when API throws', async () => {
      mocks.getUser.mockRejectedValue(new Error('network error'));

      const { result } = renderHook(() => useContactActions());
      act(() => result.current.setNewContactUsername('bob'));

      await act(async () => {
        await result.current.handleAddContact();
      });

      expect(result.current.addContactError).toBe('Error adding contact');
    });

    it('trims whitespace from contact username before API call', async () => {
      mocks.getUser.mockResolvedValue({
        data: { id: 'bob-id', username: 'bob', identityKey: 'pk', exchangeIdentityKey: 'ek' },
        error: null,
      });

      const { result } = renderHook(() => useContactActions());
      act(() => result.current.setNewContactUsername('  bob  '));

      await act(async () => {
        await result.current.handleAddContact();
      });

      expect(mocks.getUser).toHaveBeenCalledWith('bob', mocks.authIdentityKeys);
    });

    it('addContactLoading is false after request completes', async () => {
      mocks.getUser.mockResolvedValue({ data: null, error: 'not found' });

      const { result } = renderHook(() => useContactActions());
      act(() => result.current.setNewContactUsername('ghost'));

      await act(async () => {
        await result.current.handleAddContact();
      });

      expect(result.current.addContactLoading).toBe(false);
    });

    it('does not call saveContacts when masterKey is null', async () => {
      mocks.authMasterKey = null;
      mocks.getUser.mockResolvedValue({
        data: { id: 'bob-id', username: 'bob', identityKey: 'pk', exchangeIdentityKey: 'ek' },
        error: null,
      });

      const { result } = renderHook(() => useContactActions());
      act(() => result.current.setNewContactUsername('bob'));

      await act(async () => {
        await result.current.handleAddContact();
      });

      expect(mocks.saveContacts).not.toHaveBeenCalled();
    });
  });

  // ── openChatForContact ─────────────────────────────────────────────────────

  describe('openChatForContact', () => {
    it('creates a new chat and navigates when no existing chat', () => {
      mocks.existingChats = [];
      const { result } = renderHook(() => useContactActions());

      act(() => {
        result.current.openChatForContact('bob-id');
      });

      expect(mocks.addChat).toHaveBeenCalledWith(
        expect.objectContaining({ contactId: 'bob-id', messages: [] })
      );
      expect(mocks.push).toHaveBeenCalledWith(expect.stringContaining('/chat/'));
    });

    it('navigates to the existing chat without creating a new one', () => {
      mocks.existingChats = [{ id: 'existing-chat-id', contactId: 'bob-id' }];

      const { result } = renderHook(() => useContactActions());

      act(() => {
        result.current.openChatForContact('bob-id');
      });

      expect(mocks.addChat).not.toHaveBeenCalled();
      expect(mocks.setActiveChat).toHaveBeenCalledWith('existing-chat-id');
      expect(mocks.push).toHaveBeenCalledWith('/chat/existing-chat-id');
    });
  });
});
