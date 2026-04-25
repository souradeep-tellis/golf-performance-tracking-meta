// src/lib/stripe.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

// Create these products in Stripe Dashboard or via API:
export const PLANS = {
  monthly: {
    priceId: 'price_monthly_xxx', // from Stripe dashboard
    amount: 999, // £9.99 in pence
    name: 'Monthly Plan',
  },
  yearly: {
    priceId: 'price_yearly_xxx', // from Stripe dashboard  
    amount: 9990, // £99.90 (discounted from £119.88)
    name: 'Yearly Plan',
  },
}