# Spotten

Skydiving exit-point calculator. Hosted on [spotten.nu](https://spotten.nu).

## Installing and running locally

1. Install Node.js v20. (E.g. by first installing
   [Node Version Manager](https://github.com/nvm-sh/nvm) and then running `nvm install 20; nvm use`.)
1. Install dependencies: `npm install`
1. Start the development server: `npm start`
1. Open a web browser at http://localhost:8080/.

## Contributing

1. Fork the repository.
1. Follow the steps under [Installing and running locally](#installing-and-running-locally).
1. Hack away.
1. Run `npm run eslint && npm run prettier` before committing.
1. Write a [good commit message](https://gist.github.com/robertpainsi/b632364184e70900af4ab688decf6f53).
1. Open a pull request.

## Deploying to spotten.nu

Changes are deployed automatically using GitHub Actions when a change is pushed to `master`. See
[build.yaml](.github/workflows/build.yaml) for details.

The site is hosted on GitHub Pages in a
[separate repository](https://github.com/spotten-nu/spotten-nu.github.io). There is no server-side
code - just static contents.
