
"use client";

import React, { useEffect, useState } from "react";

// This provider is responsible for ensuring that Firebase is initialized
// only once on the client-side. See:
// https://github.com/firebase/firebase-admin-node/issues/2111
//
// It should be used to wrap any components that need access to Firebase services.
export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? <>{children}</> : null;
}
