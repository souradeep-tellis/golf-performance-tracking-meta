// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

// Use service role for webhook — no user context
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const userId = session.metadata?.supabase_user_id
      const planType = session.metadata?.plan_type
      const subscriptionId = session.subscription as string

      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)

      await supabaseAdmin.from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscriptionId,
        plan_type: planType,
        status: 'active',
        amount: stripeSubscription.items.data[0].price.unit_amount,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      }, { onConflict: 'stripe_subscription_id' })

      break
    }

    case 'invoice.payment_succeeded': {
      // Renewal succeeded
      const invoice = event.data.object
      const subscriptionId = invoice.subscription as string

      const sub = await stripe.subscriptions.retrieve(subscriptionId)
      
      await supabaseAdmin.from('subscriptions')
        .update({
          status: 'active',
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId)

      // ALSO: Add this month's contribution to prize pool
      // This is where subscription money flows into the draw system
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      await supabaseAdmin.from('subscriptions')
        .update({ status: 'past_due' })
        .eq('stripe_subscription_id', invoice.subscription as string)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object
      await supabaseAdmin.from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('stripe_subscription_id', sub.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}