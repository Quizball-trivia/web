import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/api';
import { queryKeys } from '@/lib/queries/queryKeys';
import type {
  FriendRequestsDTO,
  SocialPlayer,
} from '@/lib/queries/social.queries';
import { useAuthStore } from '@/stores/auth.store';

import { AddOpponentFriendButton } from '../AddOpponentFriendButton';
import { deriveOpponentFriendState } from '../friendRelationship';

const repoMocks = vi.hoisted(() => ({
  getFriends: vi.fn().mockResolvedValue({ friends: [] }),
  getFriendRequests: vi.fn().mockResolvedValue({ incoming: [], outgoing: [], incomingCount: 0 }),
  createFriendRequest: vi.fn(),
  acceptFriendRequest: vi.fn(),
}));

vi.mock('@/lib/repositories/social.repo', () => ({
  getFriends: (...args: unknown[]) => repoMocks.getFriends(...args),
  getFriendRequests: (...args: unknown[]) => repoMocks.getFriendRequests(...args),
  createFriendRequest: (...args: unknown[]) => repoMocks.createFriendRequest(...args),
  acceptFriendRequest: (...args: unknown[]) => repoMocks.acceptFriendRequest(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

const OPPONENT_ID = 'opponent-user-id';

function socialPlayer(
  id = OPPONENT_ID,
  friendStatus: SocialPlayer['friendStatus'] = 'none',
): SocialPlayer {
  return {
    id,
    nickname: 'Opponent',
    avatarUrl: null,
    avatarCustomization: null,
    level: 8,
    pendingDeletion: false,
    ranked: null,
    friendStatus,
  };
}

function emptyRequests(): FriendRequestsDTO {
  return {
    incoming: [],
    outgoing: [],
    incomingCount: 0,
  };
}

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderButton({
  client = createClient(),
  friends = [],
  requests = emptyRequests(),
  opponentId = OPPONENT_ID,
}: {
  client?: QueryClient;
  friends?: SocialPlayer[];
  requests?: FriendRequestsDTO;
  opponentId?: string;
} = {}) {
  client.setQueryData<SocialPlayer[]>(queryKeys.social.friends(), friends);
  client.setQueryData<FriendRequestsDTO>(queryKeys.social.requests(), requests);

  const view = render(
    <QueryClientProvider client={client}>
      <AddOpponentFriendButton opponentId={opponentId} opponentUsername="Opponent" />
    </QueryClientProvider>,
  );

  return { ...view, client };
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ status: 'authenticated' });
  repoMocks.getFriends.mockResolvedValue({ friends: [] });
  repoMocks.getFriendRequests.mockResolvedValue({ incoming: [], outgoing: [], incomingCount: 0 });
  repoMocks.createFriendRequest.mockResolvedValue({ requestId: 'new-request', status: 'pending' });
  repoMocks.acceptFriendRequest.mockResolvedValue({ success: true });
});

describe('deriveOpponentFriendState', () => {
  it('derives friends, sent, received, and none from cached social data', () => {
    const requests = emptyRequests();
    requests.outgoing.push({
      requestId: 'outgoing-id',
      createdAt: '2026-01-01T00:00:00.000Z',
      user: socialPlayer(OPPONENT_ID, 'pending_sent'),
    });
    requests.incoming.push({
      requestId: 'incoming-id',
      createdAt: '2026-01-01T00:00:00.000Z',
      user: socialPlayer('other-user', 'pending_received'),
    });

    expect(deriveOpponentFriendState(OPPONENT_ID, [socialPlayer(OPPONENT_ID, 'friends')], requests)).toEqual({
      status: 'friends',
    });
    expect(deriveOpponentFriendState(OPPONENT_ID, [], requests)).toEqual({ status: 'sent' });
    expect(
      deriveOpponentFriendState(OPPONENT_ID, [], {
        ...emptyRequests(),
        incoming: [{
          requestId: 'incoming-id',
          createdAt: '2026-01-01T00:00:00.000Z',
          user: socialPlayer(OPPONENT_ID, 'pending_received'),
        }],
        incomingCount: 1,
      }),
    ).toEqual({ status: 'received', requestId: 'incoming-id' });
    expect(deriveOpponentFriendState(OPPONENT_ID, [], emptyRequests())).toEqual({ status: 'none' });
  });
});

describe('AddOpponentFriendButton', () => {
  it('renders nothing when opponentId is empty', () => {
    const { container } = renderButton({ opponentId: '   ' });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders relationship states from query cache data', () => {
    renderButton({
      requests: {
        ...emptyRequests(),
        outgoing: [{
          requestId: 'outgoing-id',
          createdAt: '2026-01-01T00:00:00.000Z',
          user: socialPlayer(OPPONENT_ID, 'pending_sent'),
        }],
      },
    });
    expect(screen.getByRole('button', { name: /request sent/i })).toBeDisabled();
  });

  it('renders incoming requests as an accept action', () => {
    renderButton({
      requests: {
        incoming: [{
          requestId: 'incoming-id',
          createdAt: '2026-01-01T00:00:00.000Z',
          user: socialPlayer(OPPONENT_ID, 'pending_received'),
        }],
        outgoing: [],
        incomingCount: 1,
      },
    });

    expect(screen.getByRole('button', { name: /accept request/i })).toBeInTheDocument();
  });

  it('renders friends as a static badge', () => {
    renderButton({ friends: [socialPlayer(OPPONENT_ID, 'friends')] });
    expect(screen.getByText('Friends')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /friends/i })).not.toBeInTheDocument();
  });

  it('optimistically shows sent, then reverts and toasts when send fails', async () => {
    let rejectRequest!: (error: unknown) => void;
    repoMocks.createFriendRequest.mockImplementationOnce(
      () => new Promise((_, reject) => {
        rejectRequest = reject;
      }),
    );

    renderButton();
    fireEvent.click(screen.getByRole('button', { name: /add friend/i }));

    expect(screen.getByRole('button', { name: /request sent/i })).toBeDisabled();
    await waitFor(() => {
      expect(repoMocks.createFriendRequest).toHaveBeenCalledWith({ targetUserId: OPPONENT_ID });
    });

    await act(async () => {
      rejectRequest(new ApiError('Request failed', 404, { message: 'Not found' }));
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add friend/i })).toBeInTheDocument();
    });
    expect(toast.error).toHaveBeenCalledWith('Friend request failed. Please try again.');
  });

  it('holds the friends state after accepting even while the requests cache is stale', async () => {
    const incoming = {
      requestId: 'incoming-id',
      createdAt: '2026-01-01T00:00:00.000Z',
      user: socialPlayer(OPPONENT_ID, 'pending_received'),
    };
    repoMocks.getFriendRequests.mockResolvedValue({
      incoming: [incoming],
      outgoing: [],
      incomingCount: 1,
    });

    renderButton({
      requests: { incoming: [incoming], outgoing: [], incomingCount: 1 },
    });
    fireEvent.click(screen.getByRole('button', { name: /accept request/i }));

    await waitFor(() => {
      expect(repoMocks.acceptFriendRequest).toHaveBeenCalledWith('incoming-id');
    });
    await waitFor(() => {
      expect(screen.getByText('Friends')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /accept request/i })).not.toBeInTheDocument();
  });

  it('resolves accept 409 conflicts silently against refetched state', async () => {
    repoMocks.acceptFriendRequest.mockRejectedValueOnce(
      new ApiError('Request failed', 409, { message: 'Already handled' }),
    );

    renderButton({
      requests: {
        incoming: [{
          requestId: 'incoming-id',
          createdAt: '2026-01-01T00:00:00.000Z',
          user: socialPlayer(OPPONENT_ID, 'pending_received'),
        }],
        outgoing: [],
        incomingCount: 1,
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /accept request/i }));

    await waitFor(() => {
      expect(repoMocks.acceptFriendRequest).toHaveBeenCalledWith('incoming-id');
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add friend/i })).toBeInTheDocument();
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('resolves 409 conflicts against refetched server state without an error toast', async () => {
    repoMocks.createFriendRequest.mockRejectedValueOnce(
      new ApiError('Request failed', 409, { message: 'Already pending' }),
    );
    repoMocks.getFriendRequests.mockResolvedValue({
      incoming: [],
      outgoing: [{
        requestId: 'existing-request',
        createdAt: '2026-01-01T00:00:00.000Z',
        user: socialPlayer(OPPONENT_ID, 'pending_sent'),
      }],
      incomingCount: 0,
    });

    renderButton();
    fireEvent.click(screen.getByRole('button', { name: /add friend/i }));

    await waitFor(() => {
      expect(repoMocks.createFriendRequest).toHaveBeenCalledWith({ targetUserId: OPPONENT_ID });
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /request sent/i })).toBeDisabled();
    });
    expect(toast.error).not.toHaveBeenCalled();
  });
});
