import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const App = lazy(() => import("../App"));

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <ClientOnly fallback={<AppLoading />}>
      <Suspense fallback={<AppLoading />}>
        <App />
      </Suspense>
    </ClientOnly>
  );
}

function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
