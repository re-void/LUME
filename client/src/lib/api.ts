/**
 * API клиент для взаимодействия с сервером
 */

import { vaultHasKeys, vaultSignRequest } from '@/crypto/keyVault';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T = unknown> {
    data?: T;
    error?: string;
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (response.status === 429) {
            return { error: 'Too many requests. Please try again later.' };
        }

        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (e) {
                console.error('Failed to parse JSON response:', e);
                return { error: 'Invalid server response' };
            }
        } else {
            // If not JSON, try to read text or ignore
            try {
                const text = await response.text();
                // If it's a small text error, use it, otherwise generic
                data = { error: text.length < 100 ? text : 'Server error' };
            } catch {
                data = { error: 'Unknown server error' };
            }
        }

        if (!response.ok) {
            return { error: data.error || `Request failed: ${response.status}` };
        }

        return { data };
    } catch (error) {
        console.error('API request failed:', error);
        return { error: 'Network error' };
    }
}

// ==================== Auth API ====================

export interface RegisterData {
    username: string;
    identityKey: string;
    exchangeIdentityKey?: string;
    signedPrekey: string;
    signedPrekeySignature: string;
    oneTimePrekeys: Array<{ id: string; publicKey: string }>;
}

export interface UserBundle {
    id: string;
    username: string;
    identityKey: string;
    exchangeKey?: string;
    exchangeIdentityKey?: string;
    signedPrekey: string;
    signedPrekeySignature: string;
    oneTimePrekey?: string;
}


export const authApi = {
    register: (data: RegisterData) => {
        const headers = vaultHasKeys()
            ? vaultSignRequest('POST', '/auth/register', data)
            : {};
        return request<{ id: string; username: string; message: string }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
            headers,
        });
    },

    checkUsername: (username: string) =>
        request<{ available: boolean; reason?: string }>(`/auth/check/${username}`),

    getUser: (username: string) => {
        const headers = vaultSignRequest('GET', `/auth/user/${username}`, {});
        return request<UserBundle>(`/auth/user/${username}`, {
            headers,
        });
    },

    getBundle: (username: string) => {
        const body = { username };
        const headers = vaultSignRequest('POST', '/auth/bundle', body);
        return request<UserBundle>('/auth/bundle', {
            method: 'POST',
            body: JSON.stringify(body),
            headers,
        });
    },

    uploadPrekeys: (userId: string, prekeys: Array<{ id: string; publicKey: string }>) => {
        const body = { userId, prekeys };
        const headers = vaultSignRequest('POST', '/auth/prekeys', body);
        return request<{ message: string; totalPrekeys: number }>('/auth/prekeys', {
            method: 'POST',
            body: JSON.stringify(body),
            headers,
        });
    },

    updateSignedPrekey: (
        userId: string,
        signedPrekey: string,
        signedPrekeySignature: string,
    ) => {
        const body = { userId, signedPrekey, signedPrekeySignature };
        const headers = vaultSignRequest('POST', '/auth/keys', body);
        return request<{ message: string }>('/auth/keys', {
            method: 'POST',
            body: JSON.stringify(body),
            headers,
        });
    },

    deleteAccount: (userId: string) => {
        const headers = vaultSignRequest('DELETE', `/auth/user/${userId}`, {});
        return request<{ message: string }>(`/auth/user/${userId}`, {
            method: 'DELETE',
            headers,
        });
    },

    getSession: (userId: string) => {
        const body = { userId };
        const headers = vaultSignRequest('POST', '/auth/session', body);
        return request<{ token: string; expiresIn: number }>('/auth/session', {
            method: 'POST',
            body: JSON.stringify(body),
            headers,
        });
    },

    blockUser: (blockedId: string) => {
        const body = { blockedId };
        const headers = vaultSignRequest('POST', '/auth/block', body);
        return request<{ ok: boolean }>('/auth/block', {
            method: 'POST',
            body: JSON.stringify(body),
            headers,
        });
    },

    unblockUser: (blockedId: string) => {
        const body = { blockedId };
        const headers = vaultSignRequest('POST', '/auth/unblock', body);
        return request<{ ok: boolean }>('/auth/unblock', {
            method: 'POST',
            body: JSON.stringify(body),
            headers,
        });
    },

    getBlockedUsers: () => {
        const headers = vaultSignRequest('GET', '/auth/blocked', {});
        return request<{ blockedIds: string[] }>('/auth/blocked', {
            headers,
        });
    },
};

// ==================== Messages API ====================

export interface SendMessageData {
    senderId: string;
    recipientUsername: string;
    encryptedPayload: string;
}

export interface PendingMessage {
    id: string;
    senderId: string;
    senderUsername: string;
    encryptedPayload: string;
    timestamp: number;
}

export const messagesApi = {
    send: (data: SendMessageData) => {
        const headers = vaultSignRequest('POST', '/messages/send', data);
        return request<{ messageId: string; delivered: boolean }>('/messages/send', {
            method: 'POST',
            body: JSON.stringify(data),
            headers,
        });
    },

    getPending: (userId: string) => {
        const headers = vaultSignRequest('GET', `/messages/pending/${userId}`, {});
        return request<{ messages: PendingMessage[] }>(`/messages/pending/${userId}`, {
            headers
        });
    },

    acknowledge: (messageId: string) => {
        const headers = vaultSignRequest('DELETE', `/messages/${messageId}`, {});
        return request<{ message: string }>(`/messages/${messageId}`, {
            method: 'DELETE',
            headers
        });
    },

    acknowledgeBatch: (messageIds: string[]) => {
        const body = { messageIds };
        const headers = vaultSignRequest('POST', '/messages/acknowledge', body);
        return request<{ acknowledged: number }>('/messages/acknowledge', {
            method: 'POST',
            body: JSON.stringify(body),
            headers,
        });
    },
};

// ==================== Files API ====================

export const filesApi = {
    upload: (data: string, mimeHint: string) => {
        const body = { data, mimeHint };
        const headers = vaultSignRequest('POST', '/files/upload', body);
        return request<{ fileId: string; size: number; expiresAt: number }>('/files/upload', {
            method: 'POST',
            body: JSON.stringify(body),
            headers,
        });
    },

    download: (fileId: string) => {
        const headers = vaultSignRequest('GET', `/files/${fileId}`, {});
        return request<{ fileId: string; data: string; mimeHint: string; size: number }>(`/files/${fileId}`, {
            headers,
        });
    },
};

// ==================== Groups API ====================

export interface GroupData {
    id: string;
    name: string;
    creator_id: string;
    created_at: number;
    members: Array<{ user_id: string; username: string; role: string }>;
}

export const groupsApi = {
    create: (name: string, memberIds: string[]) => {
        const body = { name, memberIds };
        const headers = vaultSignRequest('POST', '/groups/create', body);
        return request<GroupData>('/groups/create', {
            method: 'POST',
            body: JSON.stringify(body),
            headers,
        });
    },

    list: () => {
        const headers = vaultSignRequest('GET', '/groups', {});
        return request<{ groups: GroupData[] }>('/groups', {
            headers,
        });
    },

    get: (groupId: string) => {
        const headers = vaultSignRequest('GET', `/groups/${groupId}`, {});
        return request<GroupData>(`/groups/${groupId}`, {
            headers,
        });
    },

    addMember: (groupId: string, userId: string) => {
        const body = { userId };
        const headers = vaultSignRequest('POST', `/groups/${groupId}/members`, body);
        return request<{ ok: boolean; members: GroupData['members'] }>(`/groups/${groupId}/members`, {
            method: 'POST',
            body: JSON.stringify(body),
            headers,
        });
    },

    removeMember: (groupId: string, userId: string) => {
        const headers = vaultSignRequest('DELETE', `/groups/${groupId}/members/${userId}`, {});
        return request<{ ok: boolean }>(`/groups/${groupId}/members/${userId}`, {
            method: 'DELETE',
            headers,
        });
    },
};

// ==================== Profile API ====================

export interface ProfileData {
    id: string;
    username: string;
    displayName: string | null;
    avatarFileId: string | null;
    discoverable?: boolean;
}

export const profileApi = {
    get: (userId: string) => {
        const headers = vaultSignRequest('GET', `/profile/${userId}`, {});
        return request<ProfileData>(`/profile/${userId}`, { headers });
    },

    update: (userId: string, data: { displayName?: string | null; avatarFileId?: string | null }) => {
        const body = data as Record<string, unknown>;
        const headers = vaultSignRequest('PUT', `/profile/${userId}`, body);
        return request<ProfileData>(`/profile/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(body),
            headers,
        });
    },
};

// ==================== Invite API ====================

export const inviteApi = {
    createToken: (userId: string) => {
        const body = { userId };
        const headers = vaultSignRequest('POST', '/auth/invite-token', body);
        return request<{ token: string; expiresAt: number }>('/auth/invite-token', {
            method: 'POST',
            body: JSON.stringify(body),
            headers,
        });
    },

    resolveToken: (token: string) => {
        const headers = vaultSignRequest('GET', `/auth/resolve-invite/${token}`, {});
        return request<UserBundle & { expiresAt: number }>(`/auth/resolve-invite/${token}`, {
            headers,
        });
    },

    setDiscoverable: (userId: string, discoverable: boolean) => {
        const body = { userId, discoverable };
        const headers = vaultSignRequest('PUT', '/auth/discoverable', body);
        return request<{ ok: boolean; discoverable: boolean }>('/auth/discoverable', {
            method: 'PUT',
            body: JSON.stringify(body),
            headers,
        });
    },
};

// ==================== Health API ====================

export const healthApi = {
    check: () =>
        request<{
            status: string;
            timestamp: string;
        }>('/health'),
};
