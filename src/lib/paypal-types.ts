export type PayPalApproveData = {
  orderID: string;
};

export type PayPalButtonsOptions = {
  style?: Record<string, string>;
  createOrder: () => Promise<string>;
  onApprove: (data: PayPalApproveData) => Promise<void>;
  onError?: (error: unknown) => void;
};

export type PayPalSdk = {
  Buttons: (options: PayPalButtonsOptions) => {
    render: (container: HTMLElement) => void;
  };
};

export function getPayPalSdk(): PayPalSdk | undefined {
  return (window as Window & { paypal?: PayPalSdk }).paypal;
}
