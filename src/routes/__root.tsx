import { ClientOnly, Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import appCss from "../styles.css?url";

const App = lazy(() => import("../App"));

function NotFoundComponent() {
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

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Medi Nexus Plus" },
      { name: "description", content: "Clinic management workspace for Balaji Ortho Care." },
      { name: "author", content: "Medi Nexus Plus" },
      { property: "og:title", content: "Medi Nexus Plus" },
      { property: "og:description", content: "Clinic management workspace for Balaji Ortho Care." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Medi Nexus Plus" },
      { name: "twitter:description", content: "Clinic management workspace for Balaji Ortho Care." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/54a01a7b-fa35-4bf2-b5f5-94734142387d/id-preview-b612ae45--565b8337-1b54-4466-86df-c91de01f5dca.lovable.app-1777251894509.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/54a01a7b-fa35-4bf2-b5f5-94734142387d/id-preview-b612ae45--565b8337-1b54-4466-86df-c91de01f5dca.lovable.app-1777251894509.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
