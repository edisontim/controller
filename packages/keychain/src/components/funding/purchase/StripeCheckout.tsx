import React, { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { StripePaymentElementOptions } from "@stripe/stripe-js";
import {
  LayoutContainer,
  LayoutContent,
  LayoutFooter,
  Button,
  LayoutHeader,
  CreditCardIcon,
  Card,
  CardContent,
  Separator,
  InfoIcon,
} from "@cartridge/ui-next";
import { ErrorAlert } from "@/components/ErrorAlert";
import { PricingDetails } from "./PurchaseCredits";

type StripeCheckoutProps = {
  price: PricingDetails;
  onBack: () => void;
  onComplete: () => void;
};

export default function StripeCheckout({
  price,
  onBack,
  onComplete,
}: StripeCheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<Error>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);

    try {
      // On puchase, some forms of payment like banks requires redirection, then on success stripe
      // will use return_url. However, we should NEVER redirect as we're in an iframe and UX would be
      // terrible. So we have turned off all forms of payment that requires redirection allowing us to
      // handle on success/complete synchronously.
      const res = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: "http://cartridge.gg",
        },
        redirect: "if_required",
      });

      if (res.error) {
        setError(new Error(res.error.message));
        return;
      }

      onComplete();
    } catch (e) {
      // Catch redirects, 'allow-top-navigation' is not set on our iframe
      if ((e as Error).message.includes("Failed to set the 'href' property")) {
        setError(new Error("Payment unsupported"));
        return;
      }

      setError(e as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentElementOptions: StripePaymentElementOptions = {
    layout: "tabs",
  };

  return (
    <LayoutContainer>
      <LayoutHeader
        title={"Enter Payment Details"}
        icon={<CreditCardIcon variant="solid" size="lg" />}
        onBack={onBack}
      />
      <LayoutContent className="gap-6">
        <form id="payment-form">
          <PaymentElement
            id="payment-element"
            options={paymentElementOptions}
            onReady={() => setIsLoading(false)}
            onChange={() => setError(undefined)}
          />
        </form>
      </LayoutContent>
      <LayoutFooter>
        {error && (
          <ErrorAlert
            variant="error"
            title="Stripe Checkout Error"
            description={error.message}
          />
        )}
        <CostBreakdown
          costInCents={price.baseCostInCents}
          processingFeeInCents={price.processingFeeInCents}
          totalInCents={price.totalInCents}
        />
        <Button
          isLoading={isLoading}
          disabled={isSubmitting || !stripe || !elements || isLoading}
          onClick={handleSubmit}
        >
          Purchase
        </Button>
      </LayoutFooter>
    </LayoutContainer>
  );
}

type CostBreakdownProps = {
  costInCents: number;
  processingFeeInCents: number;
  totalInCents: number;
};

const CostBreakdown = ({
  costInCents,
  processingFeeInCents,
  totalInCents,
}: CostBreakdownProps) => {
  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 border border-background-200 bg-[#181C19] rounded-[4px] text-xs text-foreground-400">
        <div className="flex justify-between">
          <div>Cost</div>
          <div>{formatCurrency(costInCents)}</div>
        </div>

        <div className="flex justify-between">
          <div className="flex gap-1">
            Processing Fee <InfoIcon size="xs" />
          </div>
          <div>{formatCurrency(processingFeeInCents)}</div>
        </div>

        <Separator className="bg-background-200" />

        <div className="flex justify-between text-sm font-medium">
          <div>Total</div>
          <div className="text-foreground-100">
            {formatCurrency(totalInCents)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
