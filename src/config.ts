import { RawClientSideBasePluginConfig, ClientSideBasePluginConfig } from '@graphql-codegen/visitor-plugin-common';

interface Map { [key: string]: string | Map; }

/**
 * @description This plugin generates mock fixtures with TypeScript typings.
 */
export interface Config {
    map: Map
}

export interface RawPluginConfig extends RawClientSideBasePluginConfig, Config {}
export interface PluginConfig extends ClientSideBasePluginConfig, Config {}
