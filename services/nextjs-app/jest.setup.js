import "@testing-library/jest-dom";

// jsdom 30 dropped a handful of web-platform globals that undici (and
// Next.js's runtime) depend on. Pull them from Node's built-in modules
// so undici can load and NextResponse.json() works in tests.
const { TextDecoder, TextEncoder } = require("util");
const { ReadableStream, WritableStream, TransformStream } = require("stream/web");
const { Blob, File } = require("buffer");
const { MessageChannel, MessagePort, BroadcastChannel } = require("worker_threads");

const polyfills = {
  TextDecoder,
  TextEncoder,
  ReadableStream,
  WritableStream,
  TransformStream,
  Blob,
  File,
  MessageChannel,
  MessagePort,
  BroadcastChannel,
};
for (const [key, value] of Object.entries(polyfills)) {
  if (typeof globalThis[key] === "undefined") {
    globalThis[key] = value;
  }
}

// jsdom does not expose the Fetch API's Request/Response/Headers/fetch
// globals. Polyfill them from undici (which has the full modern Response
// API including the static `Response.json()` method that Next.js depends
// on) so route handlers and Next.js runtime code can construct Request
// instances in tests.
if (typeof globalThis.Request === "undefined") {
  const { Request, Response, Headers, fetch, FormData } = require("undici");
  globalThis.Request = Request;
  globalThis.Response = Response;
  globalThis.Headers = Headers;
  globalThis.fetch = fetch;
  globalThis.FormData = globalThis.FormData || FormData;
}
