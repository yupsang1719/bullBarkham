module.exports = {
  env: { browser: true, es2021: true },
  extends: ["eslint:recommended", "plugin:react/recommended"],
  settings: { react: { version: "detect" } },
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  plugins: ["react"],
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off"
  }
}
