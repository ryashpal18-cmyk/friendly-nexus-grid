import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import App from "../App";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return <App />;
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
