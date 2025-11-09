export const onRequest = async ({ env }) =>
  new Response(
    JSON.stringify(
      {
        STRIPE_SECRET_KEY: !!env.STRIPE_SECRET_KEY,
        STRIPE_PRICE_ID: !!env.STRIPE_PRICE_ID,
        STRIPE_SUCCESS_URL: !!env.STRIPE_SUCCESS_URL,
        STRIPE_CANCEL_URL: !!env.STRIPE_CANCEL_URL,
        ELARIN_DB: !!(env.ELARIN_DB || env.elarin_db),
      },
      null,
      2
    ),
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    }
  );
