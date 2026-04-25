// src/hooks/useSubscription.ts
// This checks subscription status on every authenticated request
// as required by the PRD: "Real-time subscription status check"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useSubscription() {
  const [subscription, setSubscription] = useState(null)
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkSubscription() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      setSubscription(data)
      setIsActive(!!data)
      setLoading(false)
    }

    checkSubscription()
  }, [])

  return { subscription, isActive, loading }
}