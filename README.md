<p align="center">
  <a rel="noreferrer noopener" href="https://requestly.io/">
    <img src="https://user-images.githubusercontent.com/16779465/194505910-b6a7be70-df20-4b1a-9730-06a48cdd75ac.png" alt="Requestly Logo" width="40%"/>
  </a>
</p>

<p align="center">
  <img alt="GitHub closed issues" src="https://img.shields.io/github/issues-closed/requestly/requestly"/>
  <a rel="noreferrer noopener" href="https://chrome.google.com/webstore/detail/redirect-url-modify-heade/mdnleldcmiljblolnjhpnblkcekpdkpa/">
    <img alt="Chrome Web Store Rating" src="https://img.shields.io/chrome-web-store/rating/mdnleldcmiljblolnjhpnblkcekpdkpa" />
  </a>
  <a rel="noreferrer noopener" href="https://chrome.google.com/webstore/detail/redirect-url-modify-heade/mdnleldcmiljblolnjhpnblkcekpdkpa/">
    <img alt="Chrome Web Store Reviews" src="https://img.shields.io/chrome-web-store/rating-count/mdnleldcmiljblolnjhpnblkcekpdkpa?label=reviews" />
  </a>
  <a rel="noreferrer noopener" href="https://chrome.google.com/webstore/detail/redirect-url-modify-heade/mdnleldcmiljblolnjhpnblkcekpdkpa/">
    <img alt="Chrome Web Store Downloads" src="https://img.shields.io/chrome-web-store/users/mdnleldcmiljblolnjhpnblkcekpdkpa?label=downloads" />
  </a>
</p>

<p align="center">
  <a href="https://docs.requestly.io">Docs</a> - <a href="https://requestly.io/downloads">Download</a> - <a href="https://app.requestly.io/getting-started">Getting Started</a> - <a href="https://bit.ly/requestly-slack/slack">Support community</a> - <a href="https://github.com/requestly/requestly/issues/new?assignees=&labels=bug&template=bug-report.yml">Bug report</a>
</p>

<h2 align="center">Debug your network request across all platforms and browsers using a single app</h2>
This repo contains the core logic and source code for the <a href="https://requestly.io/desktop">Requestly Desktop App</a>. Download for your platform from <a href="https://requestly.io/desktop">here</a>.
<br/><br/>

- [Getting Started](#getting-started)
- [Development](#development)
  - [Setup](#setup)
  - [Run](#run)
  - [Packaging](#packaging)
- [Contributing](#contributing)
- [Links](#links)

## Getting Started

To get a local copy up and running, please follow these simple steps.

### Prerequisites
Here is what you need to be able to run Requestly Desktop App Locally.

Node.js (Version: 16.15.0)\
Npm (Version: 8.5.5)

## Development
### Setup
1. Clone the repo into a public GitHub repository (or [fork](https://github.com/requestly/requestly-desktop-app/fork)). If you plan to distribute the code, keep the source code public to comply with AGPLv3.

```
git clone https://github.com/requestly/requestly-desktop-app.git
```

2. Go to the project folder & Install packages with npm
```
npm i
```

### Run

1. Start Requestly WebApp server locally. Here are the [steps](https://github.com/requestly/requestly-master/blob/master/app/README.md).

2. Start Requestly Desktop App
```
npm start
```

### Packaging
This app uses electron-builder to package and sign the app. Run this command to build the packaged version of Requestly Deskto App.
```
npm run package
```

## Contributing

Read our [contributing guide](./CONTRIBUTING.md) to learn about how to propose bugfixes and improvements, and how the development process works. 

## Links

- 🏠 Website: [https://www.requestly.io](https://www.requestly.io) 
- 📖 Documentation: [https://docs.requestly.io](https://docs.requestly.io)
- 🖥️ Download Desktop App: [https://requestly.io/desktop/](https://requestly.io/desktop/)

For **payment/billing related issues**, feel free to contact us at [contact@requestly.io](mailto:contact@requestly.io)
