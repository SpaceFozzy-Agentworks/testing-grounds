// DELIBERATELY VULNERABLE: Never deploy or expose this server.
const childProcess = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");

const host = "127.0.0.1";
const port = 3000;
const baseUrl = `http://${host}:${port}`;

function commandInjection(request, response) {
  const command = new URL(request.url, baseUrl).searchParams.get("command");

  childProcess.exec(command, (error, stdout, stderr) => {
    response.writeHead(error ? 500 : 200, { "Content-Type": "text/plain" });
    response.end(error ? stderr : stdout);
  });
}

function pathTraversal(request, response) {
  const filePath = new URL(request.url, baseUrl).searchParams.get("path");

  fs.readFile(filePath, (error, contents) => {
    response.writeHead(error ? 404 : 200, { "Content-Type": "text/plain" });
    response.end(error ? "file not found\n" : contents);
  });
}

function codeInjection(request, response) {
  const code = new URL(request.url, baseUrl).searchParams.get("code");
  const result = eval(code);

  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end(`${result}\n`);
}

function serverSideRequestForgery(request, response) {
  const targetUrl = new URL(request.url, baseUrl).searchParams.get("url");

  http
    .get(targetUrl, (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode || 200, {
        "Content-Type": "text/plain",
      });
      upstreamResponse.pipe(response);
    })
    .on("error", (error) => {
      response.writeHead(502, { "Content-Type": "text/plain" });
      response.end(`${error.message}\n`);
    });
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, baseUrl);

  switch (requestUrl.pathname) {
    case "/command":
      commandInjection(request, response);
      break;
    case "/file":
      pathTraversal(request, response);
      break;
    case "/eval":
      codeInjection(request, response);
      break;
    case "/fetch":
      serverSideRequestForgery(request, response);
      break;
    default:
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("not found\n");
  }
});

server.listen(port, host, () => {
  console.warn(
    `DELIBERATELY VULNERABLE test server listening only on http://${host}:${port}`,
  );
});
