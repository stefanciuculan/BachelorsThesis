import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";

import App from "./App.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";
import BookDescription from "./pages/BookDescription.jsx";
import Genre from "./pages/Genre.jsx";
import Search from "./pages/Search.jsx";
import Library from "./pages/Library.jsx";
import MyLoans from "./pages/MyLoans.jsx";
import Chat from "./pages/Chat.jsx";

import "./styles/index.css";
import axios from "axios";

axios.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);


const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },

      // auth
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },

      { path: "/home", element: <Home /> },
      { path: "/books/:id", element: <BookDescription /> },
      { path: "/genres/:genre", element: <Genre /> },
      { path: "/wishlist", element: <Library /> },
      { path: "/search", element: <Search /> },
      { path: "/loans", element: <MyLoans /> },
      { path: "/chat/:loanId",  element: <Chat /> }
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
