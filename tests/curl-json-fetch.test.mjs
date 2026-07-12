import assert from "node:assert/strict";
import test from "node:test";

import { curlJsonFetch } from "../src/curl-json-fetch.mjs";

function successResult(body = "[]", overrides = {}) {
  return {
    stderr: `200\napplication/json; charset=utf-8\nhttps://fixturedownload.com/feed/json/epl-2026\n${Buffer.byteLength(body)}\n0`,
    stdout: body,
    ...overrides,
  };
}

test("curl transport is HTTPS-only, shell-free, bounded, and response-compatible", async () => {
  let invocation = null;
  const response = await curlJsonFetch("https://fixturedownload.com/feed/json/epl-2026", {
    execFileImpl: async (...args) => {
      invocation = args;
      return successResult();
    },
  });
  assert.equal(invocation[0], "curl");
  assert.equal(Array.isArray(invocation[1]), true);
  assert.equal(invocation[1].includes("--max-filesize"), true);
  assert.equal(invocation[1].includes("--max-redirs"), true);
  assert.equal(invocation[1].at(-1), "https://fixturedownload.com/feed/json/epl-2026");
  assert.equal(response.ok, true);
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(await response.text(), "[]");
  assert.deepEqual(await response.json(), []);
  const calendarResponse = await curlJsonFetch("https://www.eliteserien.no/terminliste/subscribe", {
    execFileImpl: async (...args) => {
      assert.equal(args[1].includes("Accept: text/calendar"), true);
      return successResult("BEGIN:VCALENDAR\nEND:VCALENDAR", {
        stderr: "200\ntext/calendar; charset=utf-8\nhttps://www.eliteserien.no/terminliste/subscribe\n29\n0",
      });
    },
    headers: { accept: "text/calendar" },
  });
  assert.equal(calendarResponse.headers.get("content-type"), "text/calendar; charset=utf-8");
  const htmlResponse = await curlJsonFetch("https://www.fcbarcelona.com/en/football/first-team/schedule", {
    execFileImpl: async (...args) => {
      assert.equal(args[1].includes("Accept: text/html"), true);
      return successResult("<html></html>", {
        stderr: "200\ntext/html; charset=utf-8\nhttps://www.fcbarcelona.com/en/football/first-team/schedule\n13\n0",
      });
    },
    headers: { accept: "text/html" },
  });
  assert.equal(htmlResponse.headers.get("content-type"), "text/html; charset=utf-8");
  await curlJsonFetch("https://www.youtube.com/feeds/videos.xml?channel_id=UC9QZZRUajPEoo1Q-V3MfvnQ", {
    execFileImpl: async (...args) => {
      assert.equal(args[1].includes("Accept: application/atom+xml, application/xml;q=0.9"), true);
      return successResult("<feed></feed>", {
        stderr: "200\ntext/xml; charset=UTF-8\nhttps://www.youtube.com/feeds/videos.xml?channel_id=UC9QZZRUajPEoo1Q-V3MfvnQ\n13\n0",
      });
    },
    headers: { accept: "application/atom+xml, application/xml;q=0.9" },
  });
  await assert.rejects(
    curlJsonFetch("http://fixturedownload.com/feed/json/epl-2026"),
    /credential-free HTTPS/,
  );
});

test("curl transport fails closed on malformed metadata, redirects, and execution failure", async () => {
  await assert.rejects(
    curlJsonFetch("https://fixturedownload.com/feed/json/epl-2026", {
      execFileImpl: async () => successResult("[]", { stderr: "malformed" }),
    }),
    /fixture_feed_unavailable/,
  );
  await assert.rejects(
    curlJsonFetch("https://fixturedownload.com/feed/json/epl-2026", {
      execFileImpl: async () => successResult("[]", {
        stderr: "302\ntext/html\nhttps://example.test/redirect\n0\n1",
      }),
    }),
    /fixture_feed_redirect_rejected/,
  );
  await assert.rejects(
    curlJsonFetch("https://fixturedownload.com/feed/json/epl-2026", {
      execFileImpl: async () => { throw new Error("curl failed"); },
    }),
    /fixture_feed_unavailable/,
  );
});
