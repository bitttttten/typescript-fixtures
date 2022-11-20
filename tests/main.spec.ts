import { test, expect } from "vitest";
import { parse } from "graphql";
import { plugin } from "../src/index.js";

test("Should generate mocks based on queries and mutations", async () => {
  const documents = [
    {
      document: parse(
        `query User { slug id firstName lastName user { address { number street }} }`
      ),
    },
  ];

  const result = await plugin(null, documents, {});

  // handler function names
  expect(result.content).toContain(`generateUserQueryFixture`);
  expect(result.content).toMatchSnapshot("content");

  // handles imports
  expect(result.prepend).toMatchSnapshot("imports");
});
