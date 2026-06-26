export interface AeHomePageData {
  successAddToCartNotification: string;
  successfulCheckoutRedirectPattern: RegExp;
  productViewLinkSelector: string;
}

export const aeHomePageData: AeHomePageData = {
  successAddToCartNotification: "Your product has been added to cart.",
  successfulCheckoutRedirectPattern: /\/cart\//,
  productViewLinkSelector: "a.product_details",
};
