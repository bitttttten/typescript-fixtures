import {
  ClientSideBaseVisitor,
  ClientSideBasePluginConfig,
  LoadedFragment,
  getConfigValue,
} from "@graphql-codegen/visitor-plugin-common";
import { RawPluginConfig } from "./config.js";
import autoBind from "auto-bind";
import {
  OperationDefinitionNode,
  GraphQLSchema,
  print,
  FieldNode,
  SelectionNode,
  Kind,
} from "graphql";
import { pascalCase, camelCase } from "change-case-all";
import { faker } from "@faker-js/faker";

function isFieldNode(sel: SelectionNode): sel is FieldNode {
  return sel.kind === Kind.FIELD;
}

type Part = [string, string] | [string, Part[]];

function buildVariablesObjectFromArray(selections: SelectionNode[]): Part[] {
  const obj = [];

  for (const selection of selections) {
    if (isFieldNode(selection)) {
      obj.push(buildVariablesObject(selection));
    }
  }

  return obj;
}

function buildVariablesObject(sel: FieldNode) {
  if (sel.selectionSet?.selections.length > 0) {
    return [
      sel.name.value,
      buildVariablesObjectFromArray([...sel.selectionSet.selections]),
    ];
  }

  return [sel.name.value, getValueFromSelection(sel.name.value)];
}

function getValueFromSelection(path: string) {
  for (const key of Object.keys(faker)) {
    if (faker[key].hasOwnProperty(path)) {
      return `faker.${key}.${path}()`;
    }
  }

  return `faker.datatype.string(5)`;
}

export interface PluginConfig extends ClientSideBasePluginConfig {
  map?: RawPluginConfig["map"];
}

export class Visitor extends ClientSideBaseVisitor<
  RawPluginConfig,
  PluginConfig
> {
  private _externalImportPrefix: string;
  private _operationsToInclude: {
    node: OperationDefinitionNode;
    documentVariableName: string;
    operationType: string;
    operationResultType: string;
    operationVariablesTypes: string;
  }[] = [];

  constructor(
    schema: GraphQLSchema,
    fragments: LoadedFragment[],
    rawConfig: RawPluginConfig
  ) {
    super(schema, fragments, rawConfig, {
      map: getConfigValue(rawConfig.map, undefined),
    });

    autoBind(this);

    this._externalImportPrefix = this.config.importOperationTypesFrom
      ? `${this.config.importOperationTypesFrom}.`
      : "";
  }

  public getImports() {
    return [`import { faker } from '@faker-js/faker'`];
  }

  public getContent() {
    let endpoint: string;
    // const { map } = this.config;

    const operations = this._operationsToInclude.map(
      ({
        node,
        operationType,
        operationResultType,
        operationVariablesTypes,
      }) => {
        if (operationType === "Mutation") {
        }
        if (operationType === "Query") {
          const inputName = camelCase(node.name.value);
          const fnName = pascalCase(node.name.value);
          const handlerName = `generate${fnName}QueryFixture`;

          const selections = buildVariablesObjectFromArray([
            ...node.selectionSet.selections,
          ]);

          const variables = getVariables(selections);
          const base = getBase(selections);

          // //           console.log(selections);


          return `
export const ${handlerName} = (${inputName}?: Partial<${operationResultType}>) {
${variables.join("\n")}

${base.join("\n")}

\treturn merge(base, ${inputName})
}
          `;
        }

        return "";
      }
    );

    return [endpoint, ...operations].join("\n");
  }

  buildOperation(
    node: OperationDefinitionNode,
    documentVariableName: string,
    operationType: string,
    operationResultType: string,
    operationVariablesTypes: string
  ) {
    operationResultType = this._externalImportPrefix + operationResultType;
    operationVariablesTypes =
      this._externalImportPrefix + operationVariablesTypes;

    if (node.name == null) {
      throw new Error(
        "Plugin 'fixtures' cannot generate fixtures for unnamed operation.\n\n" +
          print(node)
      );
    } else {
      this._operationsToInclude.push({
        node,
        documentVariableName,
        operationType,
        operationResultType,
        operationVariablesTypes,
      });
    }

    return null;
  }
}

function getVariables(selections: Part[]) {
  const variables = []

  function renderInner(p: Part, depth = 0) {
    const [key, value] = p;

    const indent = Array(depth + 1).fill('\t').join('')

    function print(value: string) {
      variables.push(`${indent}${value}`)
    }

    if (typeof value === "string") {
      if (depth === 0) {
        print(`const ${key} = ${value};`);
        return;
      }

      print(`${key}: ${value},`);

      return;
    }

    if (depth === 0) {
      print(`const ${key} = {`);
    }

    if (depth > 0) {
      print(`${key}: {`);
    }

    for (const part of value) {
      renderInner(part, depth + 1);
    }

    // start or no start, we need to render the closing tag
    print(`}`);
  }

  for (const selection of selections) {
    renderInner(selection);
  }

  return variables
}

function getBase(selections: Part[]) {
  const base = []

  base.push("\tconst base = {")

  for (const [key] of selections) {
    base.push(`\t\t${key},`)
  }

  base.push(`\t}`)

  return base
}