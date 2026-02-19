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

export const getStoreProductsQuery = () => ({
  queryKey: queryKeys.store.products(),
  queryFn: async (): Promise<{ items: StoreProductDTO[] }> => {
    const data = await listStoreProducts();
    return {
      items: data.items.map(toStoreProductDTO),
    };
  },
});

export function useStoreProducts() {
  return useQuery(getStoreProductsQuery());
}

export const getStoreWalletQuery = () => ({
  queryKey: queryKeys.store.wallet(),
  queryFn: async (): Promise<StoreWalletResponse> => getStoreWallet(),
});

export function useStoreWallet() {
  return useQuery(getStoreWalletQuery());
}

export const getStoreInventoryQuery = () => ({
  queryKey: queryKeys.store.inventory(),
  queryFn: async (): Promise<{ items: StoreInventoryItemDTO[] }> => {
    const data = await getStoreInventory();
    return {
      items: data.items.map(toStoreInventoryDTO),
    };
  },
});

export function useStoreInventory() {
  return useQuery(getStoreInventoryQuery());
}
