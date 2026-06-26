import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body { background-color: #EEF2FF; width: 100%; margin: 0; }
              body { overflow: auto; }
              #root, [data-expo-router-root] {
                min-height: 100vh;
                width: 100%;
                display: flex;
                flex-direction: column;
              }
              .admin-sidebar-nav-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }
              .admin-sidebar-nav-scroll { -ms-overflow-style: none; scrollbar-width: none; }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
