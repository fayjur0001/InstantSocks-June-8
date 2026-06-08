import { z } from "zod";

export const paymentApiProviderConfigSchema = z.object({
  callbackSecret: z.string().min(1, "Callback secret is required"),
  apiKey: z.string().min(1, "API key is required"),
  callbackUrl: z.string().url("Must be a valid URL"),
});

export type PaymentApiProviderConfigValues = z.infer<typeof paymentApiProviderConfigSchema>;

export interface PaymentApiProvider {
  id: string;
  name: string;
  initialConfig: PaymentApiProviderConfigValues;
}