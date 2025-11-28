import {
	EXECUTOR_PLUGINS_KEY,
	GRAPH_PLUGINS_KEY,
	QUOTER_PLUGINS_KEY,
	SNAPSHOT_PLUGINS_KEY,
} from '../constants'

export function pathToSnapshotConfig(pluginConfigKey: string) {
	return `${SNAPSHOT_PLUGINS_KEY}.${pluginConfigKey}`
}

export function pathToGraphConfig(pluginConfigKey: string) {
	return `${GRAPH_PLUGINS_KEY}.${pluginConfigKey}`
}

export function pathToQuoterConfig(pluginConfigKey: string) {
	return `${QUOTER_PLUGINS_KEY}.${pluginConfigKey}`
}

export function pathToExecutorConfig(pluginConfigKey: string) {
	return `${EXECUTOR_PLUGINS_KEY}.${pluginConfigKey}`
}
