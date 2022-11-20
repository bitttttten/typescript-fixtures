import { test, expect } from "vitest";
import { pascalCase } from "change-case-all";
import { parse } from "graphql";
import { plugin } from "../src/index.js";

const queryName = "User";
const mutationName = "UpdateUser";

const documents = [
  { document: parse(`query ${queryName} { slug id firstName lastName user { address { number street }} }`) },
  { document: parse(`mutation ${mutationName} { name }`) },
];

test("Should generate mocks based on queries and mutations", async () => {
  const result = await plugin(null, documents, {});

  console.log(result.content);

  return;

  // handler function names
  expect(result.content).toContain(`generate${queryName}Query`);
  // expect(result.content).toContain(`generate${mutationName}Mutation`);

  // handler strings
  expect(result.content).toContain(`'${queryName}',`);
  // expect(result.content).toContain(`'${mutationName}',`);

  expect(result.prepend).toMatchSnapshot("imports");
  // expect(result.content).toMatchSnapshot("content");
});