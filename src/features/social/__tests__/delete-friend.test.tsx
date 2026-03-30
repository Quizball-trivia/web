import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';

import { SocialScreen } from '../SocialScreen';
import * as socialQueries from '@/lib/queries/social.queries';
import * as socialRepo from '@/lib/repositories/social.repo';

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock queries
vi.mock('@/lib/queries/social.queries', () => ({
  useSocialFriends: vi.fn(),
  useFriendRequests: vi.fn(),
  useSocialSearch: vi.fn(),
}));

// Mock repository
vi.mock('@/lib/repositories/social.repo', () => ({
  createFriendRequest: vi.fn(),
  acceptFriendRequest: vi.fn(),
  declineFriendRequest: vi.fn(),
  removeFriend: vi.fn(),
}));

describe('Delete Friend Feature', () => {
  let queryClient: QueryClient;

  const mockFriend = {
    id: 'friend-id-123',
    nickname: 'TestFriend',
    avatarUrl: null,
    level: 15,
    friendStatus: 'friends' as const,
    ranked: null,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();

    // useSocialFriends returns SocialPlayer[] directly (not { friends: [...] })
    (socialQueries.useSocialFriends as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [mockFriend],
      isLoading: false,
      isError: false,
    });

    (socialQueries.useFriendRequests as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { incoming: [], outgoing: [], incomingCount: 0 },
      isLoading: false,
      isError: false,
    });

    (socialQueries.useSocialSearch as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
  });

  function renderScreen() {
    return render(
      <QueryClientProvider client={queryClient}>
        <SocialScreen />
      </QueryClientProvider>
    );
  }

  it('renders delete button for friends', () => {
    renderScreen();

    expect(screen.getByText('TestFriend')).toBeInTheDocument();

    const deleteButton = screen.getAllByRole('button').find((btn) => btn.title === 'Remove friend');
    expect(deleteButton).toBeInTheDocument();
  });

  it('calls removeFriend when delete button is clicked', async () => {
    (socialRepo.removeFriend as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

    renderScreen();

    const deleteButton = screen.getAllByRole('button').find((btn) => btn.title === 'Remove friend');
    fireEvent.click(deleteButton!);

    await waitFor(() => {
      expect(socialRepo.removeFriend).toHaveBeenCalledWith('friend-id-123');
    });
  });

  it('disables delete button while request is in progress', async () => {
    (socialRepo.removeFriend as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ success: true }), 100);
        })
    );

    renderScreen();

    const deleteButton = screen.getAllByRole('button').find((btn) => btn.title === 'Remove friend');
    expect(deleteButton).not.toBeDisabled();

    fireEvent.click(deleteButton!);

    await waitFor(() => {
      expect(deleteButton).toBeDisabled();
    });
  });

  it('shows success toast on successful deletion', async () => {
    (socialRepo.removeFriend as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

    renderScreen();

    const deleteButton = screen.getAllByRole('button').find((btn) => btn.title === 'Remove friend');
    fireEvent.click(deleteButton!);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Friend removed');
    });
  });

  it('shows error toast on deletion failure', async () => {
    (socialRepo.removeFriend as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    renderScreen();

    const deleteButton = screen.getAllByRole('button').find((btn) => btn.title === 'Remove friend');
    fireEvent.click(deleteButton!);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Network error');
    });
  });

  it('does not show delete button for non-friend users', () => {
    const nonFriend = {
      ...mockFriend,
      friendStatus: 'none' as const,
    };

    (socialQueries.useSocialFriends as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [nonFriend],
      isLoading: false,
      isError: false,
    });

    renderScreen();

    // TestFriend should still render in the list
    expect(screen.getByText('TestFriend')).toBeInTheDocument();

    // Should not show delete button for non-friend status
    const deleteButtons = screen.queryAllByRole('button').filter((btn) => btn.title === 'Remove friend');
    expect(deleteButtons.length).toBe(0);
  });

  it('invalidates friends query on successful deletion', async () => {
    (socialRepo.removeFriend as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

    const queryClientSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderScreen();

    const deleteButton = screen.getAllByRole('button').find((btn) => btn.title === 'Remove friend');
    fireEvent.click(deleteButton!);

    await waitFor(() => {
      expect(queryClientSpy).toHaveBeenCalled();
    });
  });
});
