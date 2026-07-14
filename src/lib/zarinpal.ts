const MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID ?? "";
const CALLBACK_URL = process.env.ZARINPAL_CALLBACK_URL ?? "";
const IS_SANDBOX = process.env.NODE_ENV === "development" && !!MERCHANT_ID;

function getApiBase(): string {
  if (IS_SANDBOX) return "https://sandbox.zarinpal.com/pg/v4/payment/";
  if (!MERCHANT_ID) return "";
  return "https://api.zarinpal.com/pg/v4/payment/";
}

function getPaymentUrl(authority: string): string {
  const base = IS_SANDBOX ? "https://sandbox.zarinpal.com/pg/StartPay/" : "https://www.zarinpal.com/pg/StartPay/";
  return `${base}${authority}`;
}

interface PaymentRequestResult {
  authority: string;
  redirectUrl: string;
}

interface VerifyResult {
  success: boolean;
  refId: string;
  cardPan?: string;
}

export async function requestPayment(
  amount: number,
  description: string
): Promise<PaymentRequestResult> {
  if (!MERCHANT_ID) {
    const authority = `dev_mock_${Date.now()}`;
    return {
      authority,
      redirectUrl: `/api/billing/callback?Authority=${authority}&Status=OK&mock=1`,
    };
  }

  const base = getApiBase();
  const res = await fetch(`${base}request.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchant_id: MERCHANT_ID,
      amount,
      currency: "IRT",
      callback_url: CALLBACK_URL,
      description,
    }),
  });

  const data = await res.json();
  if (data.data?.code !== 100) {
    throw new Error(data.errors?.message || "خطا در ارتباط با زرین‌پال");
  }

  return {
    authority: data.data.authority,
    redirectUrl: getPaymentUrl(data.data.authority),
  };
}

export async function verifyPayment(
  authority: string,
  amount: number
): Promise<VerifyResult> {
  if (!MERCHANT_ID) {
    return { success: true, refId: `dev_ref_${Date.now()}` };
  }

  const base = getApiBase();
  const res = await fetch(`${base}verify.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchant_id: MERCHANT_ID,
      amount,
      authority,
    }),
  });

  const data = await res.json();
  if (data.data?.code !== 100) {
    return { success: false, refId: "" };
  }

  return {
    success: true,
    refId: data.data.ref_id,
    cardPan: data.data.card_pan,
  };
}
