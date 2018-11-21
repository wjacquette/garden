/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Garden } from "./garden"
import { keyBy, cloneDeep } from "lodash"
import * as Joi from "joi"
import {
  Provider,
  projectNameSchema,
  projectSourcesSchema,
  environmentSchema,
  providerConfigBaseSchema,
} from "./config/project"
import { joiIdentifier, joiIdentifierMap } from "./config/common"
import { PluginError } from "./exceptions"
import { defaultProvider } from "./config/project"
import { dashboardPagesSchema } from "./config/dashboard"

type WrappedFromGarden = Pick<Garden,
  "environmentName" |
  // TODO: remove this from the interface
  "localConfigStore" |
  "projectName" |
  "projectRoot" |
  "projectSources"
  >

const providerSchema = Joi.object()
  .options({ presence: "required" })
  .keys({
    name: joiIdentifier()
      .description("The name of the provider (plugin)."),
    dashboardPages: dashboardPagesSchema,
    config: providerConfigBaseSchema,
  })

export interface PluginContext extends WrappedFromGarden {
  provider: Provider
  providers: { [name: string]: Provider }
}

// NOTE: this is used more for documentation than validation, outside of internal testing
// TODO: validate the output from createPluginContext against this schema (in tests)
export const pluginContextSchema = Joi.object()
  .options({ presence: "required" })
  .keys({
    projectName: projectNameSchema,
    projectRoot: Joi.string()
      .uri(<any>{ relativeOnly: true })
      .description("The absolute path of the project root."),
    projectSources: projectSourcesSchema,
    localConfigStore: Joi.object()
      .description("Helper class for managing local configuration for plugins."),
    environmentName: environmentSchema,
    provider: providerSchema
      .description("The provider being used for this context."),
    providers: joiIdentifierMap(providerSchema)
      .description(
        "Map of other providers that the current provider depends on (useful for referencing their configuration).",
      ),
  })

export function createPluginContext(garden: Garden, providerName: string): PluginContext {
  const providers = mapValues(garden.providerConfigs, (config, name) => ({ name, config }))
  let provider = providers[providerName]

  if (providerName === "_default") {
    provider = defaultProvider
  }

  if (!provider) {
    throw new PluginError(`Could not find provider '${providerName}'`, { providerName, providers })
  }

  return {
    projectName: garden.projectName,
    projectRoot: garden.projectRoot,
    projectSources: cloneDeep(garden.projectSources),
    environmentName: garden.environmentName,
    localConfigStore: garden.localConfigStore,
    provider,
    providers,
  }
}
