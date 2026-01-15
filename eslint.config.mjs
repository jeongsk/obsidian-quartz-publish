import { fixupPluginRules } from "@eslint/compat";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				project: "./tsconfig.json",
				sourceType: "module",
			},
			globals: {
				node: true,
			},
		},
		plugins: {
			"@typescript-eslint": tseslint,
			obsidianmd: fixupPluginRules(obsidianmd),
		},
		rules: {
			// obsidianmd recommended rules
			...obsidianmd.configs.recommended,

			// TypeScript rules
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
			"@typescript-eslint/ban-ts-comment": "off",
			"no-prototype-builtins": "off",
			"@typescript-eslint/no-empty-function": "off",

			// Disable sentence-case rule for Korean text support
			"obsidianmd/ui/sentence-case": "off",
		},
	},
	{
		ignores: ["node_modules/**", "main.js", "tests/**", "specs/**"],
	},
];
