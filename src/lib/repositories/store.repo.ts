import { apiFetch } from "@/lib/api/client";
import type { paths } from "@/types/api.generated";

export type StoreProductsResponse =
  paths["/api/v1/store/products"]["get"]["responses"]["200"]["content"]["application/json"];
export type StoreProductResponse = StoreProductsResponse["items"][number];
export type StoreWalletResponse =
  paths["/api/v1/store/wallet"]["get"]["responses"]["200"]["content"]["application/json"];
export type StoreInventoryResponse =
  paths["/api/v1/store/inventory"]["get"]["responses"]["200"]["content"]["application/json"];
export type StoreCheckoutRequest =
  paths["/api/v1/store/checkout"]["post"]["requestBody"]["content"]["application/json"];
export type StoreCheckoutResponse =
  paths["/api/v1/store/checkout"]["post"]["responses"]["200"]["content"]["application/json"];
export type StorePurchaseWithCoinsRequest =
  paths["/api/v1/store/purchase-coins"]["post"]["requestBody"]["content"]["application/json"];
export type StorePurchaseWithCoinsResponse =
  paths["/api/v1/store/purchase-coins"]["post"]["responses"]["200"]["content"]["application/json"];
export type StoreDevGrantSelfRequest =
  paths["/api/v1/store/dev/grant-self"]["post"]["requestBody"]["content"]["application/json"];
export type StoreDevGrantSelfResponse =
  paths["/api/v1/store/dev/grant-self"]["post"]["responses"]["200"]["content"]["application/json"];

export async function listStoreProducts() {
  return apiFetch("get", "/api/v1/store/products", { auth: false });
}

export async function createStoreCheckout(body: StoreCheckoutRequest) {
  return apiFetch("post", "/api/v1/store/checkout", { body });
}

export async function purchaseStoreWithCoins(body: StorePurchaseWithCoinsRequest) {
  return apiFetch("post", "/api/v1/store/purchase-coins", { body });
}

export async function getStoreWallet() {
  return apiFetch("get", "/api/v1/store/wallet");
}

export async function getStoreInventory() {
  return apiFetch("get", "/api/v1/store/inventory");
}

export async function createStoreDevGrantSelf(body: StoreDevGrantSelfRequest) {
  return apiFetch("post", "/api/v1/store/dev/grant-self", { body });
}
