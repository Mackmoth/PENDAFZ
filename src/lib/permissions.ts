import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function usePermission(permissionKey: string | null) {
  const { user, loading: authLoading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || !permissionKey) {
      setAllowed(user ? false : null);
      return;
    }
    let cancelled = false;
    supabase
      .rpc("user_has_permission", { _user_id: user.id, _permission_key: permissionKey })
      .then(({ data }) => {
        if (!cancelled) setAllowed(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [user, permissionKey]);

  return { allowed, loading: authLoading || allowed === null };
}
