import { awscdk } from "projen";

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: "2.8.0",
  defaultReleaseBranch: "main",
  name: "aws-custom-domain",
  projenrcTs: true,

  release: true,
  majorVersion: 1,

  codeCov: true,

  prettier: true,
  eslint: true,
  tsconfig: {
    compilerOptions: {
      lib: ["dom", "es2019"],
    },
  },
});

project.synth();
