// import { getLocal } from "mockttp";

// // The first tab that opens in a new Chrome/Edge window warns about dangerous flags.
// // Closing it and immediately opening a new one is a bit cheeky, but
// // is completely gets rid that, more or less invisibly:
// // eslint-disable-next-line import/prefer-default-export
// export class HideWarningServer {
//   constructor(config) {
//     this.config = config;
//     this.server = getLocal();
//     // Resolved once the server has seen at least once
//     // request for the warning-hiding page.
//     this.completedPromise = new Promise((resolve) => {
//       this.server.on("request", (req) => {
//         if (req.url.includes("hide-warning")) {
//           resolve();
//         }
//       });
//     });
//   }

//   async start(targetUrl) {
//     await this.server.start();
//     await this.server.get("/hide-warning").thenReply(
//       200,
//       `
//             <html>
//                 <title>${this.config.appName} Warning Fix</title>
//                 <meta charset="UTF-8" />
//                 <style>
//                     body { background-color: #d8e2e6; }
//                 </style>
//                 <script>
//                     const targetUrl = ${JSON.stringify(targetUrl)};
//                     window.open(targetUrl, '_blank');
//                     window.close();
//                 </script>
//                 <body>
//                     This page should disappear momentarily. If it doesn't, click
//                     <a href="${targetUrl}">this link</a>
//                 </body>
//             </html>
//         `,
//       { "content-type": "text/html" }
//     );
//   }

//   get host() {
//     return this.server.url.replace("https://", "");
//   }

//   get hideWarningUrl() {
//     return this.server.url.replace(/\/?$/, "/hide-warning");
//   }

//   async stop() {
//     await this.server.stop();
//   }
// }
