'use strict';

const
	$C = require('collection.js'),
	path = require('path'),
	fs = require('fs-extra'),
	resolver = require('./resolve');

/**
 * Returns the parent of the entry through parsing the specified entry source code
 *
 * @param {string} source
 * @returns {string}
 */
function getParent(source) {
	const parentSearch = /^import\s+'\.\/(.*?)';/m.exec(source);
	return parentSearch && parentSearch[1];
}

/**
 * Returns build config for entries
 * @returns {{entries, dependencies, commons}}
 */
function getBuildConfig() {
	const entries = fs.readdirSync(resolver.entry()).reduce(
		(res, filename) => {
			const
				name = path.basename(filename, '.js'),
				entryPath = resolver.entry(name),
				source = fs.readFileSync(entryPath, 'utf-8'),
				parent = getParent(source);

			res[name] = {
				path: entryPath,
				source,
				parent
			};

			return res;
		},

		{}
	);

	const dependencies = $C(entries).map((entry, name) => {
		const deps = [];

		while (name) {
			deps.unshift(name);
			name = entry.parent;
			entry = entries[name];
		}

		return deps;
	});

	const commons = $C(entries).reduce(
		(res, {parent}) => {
			if (!parent || res[parent]) {
				return res;
			}

			res[parent] = $C(dependencies).reduce((dependents, deps, name) => {
				if (deps.indexOf(parent) !== -1) {
					dependents.push(name);
				}

				return dependents;
			}, []);

			return res;
		},

		{}
	);

	return {
		entries,
		dependencies,
		commons
	};
}

module.exports = {
	getBuildConfig
};