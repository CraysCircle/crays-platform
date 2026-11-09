import {installViewStability} from './viewStability';
import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/roboto/latin-500.css";
import App from "./App";
import "./styles.css";
import "./prototype.css";
import "./web-design-tokens.css";

installViewStability();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

import "./desktop.css";

import './web-interaction-states.css';
