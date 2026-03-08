import { useQuery } from "@tanstack/react-query";
import {
  getStoreInventory,
  getStoreWallet,
  listStoreProducts,
  type StoreInventoryResponse,
  type StoreProductResponse,
  type StoreWalletResponse,
} from "@/lib/repositories/store.repo";
import { queryKeys } from "@/lib/queries/queryKeys";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { useAuthStore } from "@/stores/auth.store";

export interface StoreProductDTO {
  id: string;
  slug: string;
  type: StoreProductResponse["type"];
  name: Record<string, string>;
  description: Record<string, string>;
  priceCents: number;
  currency: string;
  metadata: unknown;
  displayAmount: number;
}

export interface StoreInventoryItemDTO {
  inventoryId: string;
  productId: string;
  slug: string;
  type: StoreProductResponse["type"];
  name: Record<string, string>;
  description: Record<string, string>;
  metadata: unknown;
  quantity: number;
  acquiredAt: string;
}

function getDisplayAmount(type: StoreProductResponse["type"], metadata: unknown): number {
  if (type !== "coin_pack" && type !== "ticket_pack") return 1;
  if (typeof metadata !== "object" || metadata === null) return 0;

  const value = type === "coin_pack"
    ? (metadata as { coins?: unknown }).coins
    : (metadata as { tickets?: unknown }).tickets;

  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

const toStoreProductDTO = (item: StoreProductResponse): StoreProductDTO => ({
  id: item.id,
  slug: item.slug,
  type: item.type,
  name: item.name,
  description: item.description,
  priceCents: item.priceCents,
  currency: item.currency,
  metadata: item.metadata,
  displayAmount: getDisplayAmount(item.type, item.metadata),
});

const toStoreInventoryDTO = (
  item: StoreInventoryResponse["items"][number]
): StoreInventoryItemDTO => ({
  inventoryId: item.inventoryId,
  productId: item.productId,
  slug: item.slug,
  type: item.type,
  name: item.name,
  description: item.description,
  metadata: item.metadata,
  quantity: item.quantity,
  acquiredAt: item.acquiredAt,
});

const STORE_PRODUCTS_QUERY_OPTIONS = {
  staleTime: 10 * 60_000,
  gcTime: 30 * 60_000,
} as const;

const STORE_WALLET_QUERY_OPTIONS = {
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
} as const;

type CachedWallet = {
  coins: number;
  tickets: number;
  updatedAt: number;
};

function readCachedWallet(): CachedWallet | null {
  const cached = storage.get<CachedWallet | null>(STORAGE_KEYS.STORE_WALLET, null);
  if (!cached) return null;
  if (
    typeof cached.coins !== "number" ||
    typeof cached.tickets !== "number" ||
    typeof cached.updatedAt !== "number"
  ) {
    return null;
  }
  return cached;
}

function writeCachedWallet(wallet: StoreWalletResponse): void {
  storage.set(STORAGE_KEYS.STORE_WALLET, {
    coins: wallet.coins,
    tickets: wallet.tickets,
    updatedAt: Date.now(),
  } satisfies CachedWallet);
}

const STORE_INVENTORY_QUERY_OPTIONS = {
  staleTime: 60_000,
  gcTime: 30 * 60_000,
  refetchOnWindowFocus: true,
} as const;

export const getStoreProductsQuery = () => ({
  queryKey: queryKeys.store.products(),
  queryFn: async (): Promise<{ items: StoreProductDTO[] }> => {
    const data = await listStoreProducts();
    return {
      items: data.items.map(toStoreProductDTO),
    };
  },
  ...STORE_PRODUCTS_QUERY_OPTIONS,
});

export function useStoreProducts() {
  return useQuery(getStoreProductsQuery());
}

export const getStoreWalletQuery = () => ({
  queryKey: queryKeys.store.wallet(),
  queryFn: async (): Promise<StoreWalletResponse> => {
    const wallet = await getStoreWallet();
    writeCachedWallet(wallet);
    return wallet;
  },
  initialData: readCachedWallet()
    ? {
        coins: readCachedWallet()!.coins,
        tickets: readCachedWallet()!.tickets,
      }
    : undefined,
  initialDataUpdatedAt: readCachedWallet()?.updatedAt,
  ...STORE_WALLET_QUERY_OPTIONS,
});

export function useStoreWallet() {
  const authStatus = useAuthStore((state) => state.status);
  return useQuery({
    ...getStoreWalletQuery(),
    enabled: authStatus !== "anonymous",
  });
}

export const getStoreInventoryQuery = () => ({
  queryKey: queryKeys.store.inventory(),
  queryFn: async (): Promise<{ items: StoreInventoryItemDTO[] }> => {
    const data = await getStoreInventory();
    return {
      items: data.items.map(toStoreInventoryDTO),
    };
  },
  ...STORE_INVENTORY_QUERY_OPTIONS,
});

export function useStoreInventory() {
  return useQuery(getStoreInventoryQuery());
}
