import React from "react";
import { createRoot } from "react-dom/client";
import { Storefront } from "./features/Storefront";
import { Admin } from "./features/Admin";
import adminStyles from "./styles/admin.css?inline";
import storeStyles from "./styles/store.css?inline";
const isAdmin = location.pathname.startsWith("/admin");
const stylesheet = document.createElement("style");
stylesheet.textContent = isAdmin ? adminStyles : storeStyles;
document.head.appendChild(stylesheet);
import "./styles/new.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{isAdmin ? <Admin /> : <Storefront />}</React.StrictMode>,
);
