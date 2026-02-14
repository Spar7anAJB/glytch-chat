import { useCallback, useEffect, useState } from "react";

export type AppRoute = "/" | "/auth" | "/app";

function normalizeRouteFromHash(hash: string): AppRoute {
  const cleaned = hash.replace(/^#/, "") || "/";

  if (cleaned === "/auth" || cleaned.startsWith("/auth/")) {
    return "/auth";
  }

  if (cleaned === "/app" || cleaned.startsWith("/app/")) {
    return "/app";
  }

  return "/";
}

function routeToHash(route: AppRoute): string {
  return `#${route}`;
}

export function useHashRoute() {
  const [route, setRoute] = useState<AppRoute>(() => normalizeRouteFromHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => {
      setRoute(normalizeRouteFromHash(window.location.hash));
    };

    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  const navigate = useCallback((nextRoute: AppRoute, replace = false) => {
    const nextHash = routeToHash(nextRoute);
    if (replace) {
      const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
      window.history.replaceState(null, "", nextUrl);
      setRoute(nextRoute);
      return;
    }

    window.location.hash = nextHash;
  }, []);

  return {
    route,
    navigate,
  };
}
