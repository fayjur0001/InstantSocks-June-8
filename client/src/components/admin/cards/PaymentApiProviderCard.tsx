"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy } from "lucide-react";
import { PaymentApiProvider, paymentApiProviderConfigSchema, PaymentApiProviderConfigValues } from "@/types/admin/payment-api/payment-api-provider";

interface ProviderCardProps {
  provider: PaymentApiProvider;
  isActive: boolean;
  onToggleActive: (id: string) => void;
  onSave: (id: string, data: PaymentApiProviderConfigValues) => Promise<void>;
}

export function PaymentApiProviderCard({ provider, isActive, onToggleActive, onSave }: ProviderCardProps) {
  const form = useForm<PaymentApiProviderConfigValues>({
    resolver: zodResolver(paymentApiProviderConfigSchema),
    defaultValues: provider.initialConfig,
  });

  const onSubmit = async (data: PaymentApiProviderConfigValues) => {
    await onSave(provider.id, data);
    form.reset(data); 
  };

  const handleReset = () => {
    form.reset(provider.initialConfig);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // toast.success("Copied to clipboard");
  };

  return (
    <Card className="flex flex-col bg-c-bg-750 border-0 shadow-md transition-all py-0 gap-0">
      <CardHeader className="p-5 pb-4 flex flex-row items-center gap-3 space-y-0">
        <Checkbox 
          checked={isActive} 
          onCheckedChange={() => onToggleActive(provider.id)}
          className="w-5 h-5 border-c-slate-500 data-[state=checked]:bg-c-emerald-500 data-[state=checked]:border-c-emerald-500 data-[state=checked]:text-white rounded"
        />
        <CardTitle className="text-base font-medium text-c-slate-100">{provider.name}</CardTitle>
      </CardHeader>
      
      <CardContent className="px-5 pb-5 flex-grow">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="space-y-3">
              {/* Field Layout Mapping */}
              {[
                { name: "callbackSecret", label: "Callback Secret" },
                { name: "apiKey", label: "API Key" },
                { name: "callbackUrl", label: "Callback URL", hasCopy: true },
              ].map((fieldData) => (
                <FormField
                  key={fieldData.name}
                  control={form.control}
                  name={fieldData.name as keyof PaymentApiProviderConfigValues}
                  render={({ field }) => (
                    <FormItem className="flex items-center space-y-0 bg-c-bg-500 rounded-md px-4 py-2 transition-colors focus-within:ring-1 focus-within:ring-c-emerald-500/50">
                      <FormLabel className="w-[140px] shrink-0 text-sm font-normal text-c-slate-300">
                        {fieldData.label}
                      </FormLabel>
                      <div className="flex-1 w-full flex flex-col justify-center">
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input 
                              {...field} 
                              className="bg-transparent border-0 focus-visible:ring-0 px-0 h-8 text-right text-c-slate-100 font-mono text-sm placeholder:text-c-slate-500 w-full"
                            />
                            {fieldData.hasCopy && (
                              <button 
                                type="button" 
                                onClick={() => copyToClipboard(field.value)}
                                className="text-c-slate-400 hover:text-white transition-colors"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <Button 
                type="button" 
                onClick={handleReset}
                disabled={!form.formState.isDirty}
                className="bg-c-red-500 hover:bg-c-red-400 text-white px-6 h-9 rounded-md transition-colors"
              >
                Reset
              </Button>
              <Button 
                type="submit" 
                disabled={!form.formState.isDirty || form.formState.isSubmitting}
                className="bg-c-green-500 hover:bg-c-green-500 text-white px-6 h-9 rounded-md transition-colors"
              >
                {form.formState.isSubmitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}